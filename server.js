// server.js - Atherix Digital Space Node.js Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// Import database and authentication helpers
const db = require('./db');
const { authenticateToken, JWT_SECRET } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const trustProxy = process.env.TRUST_PROXY || '';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' https: data: blob:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "manifest-src 'self'"
].join('; ');

const allowedImageMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp']
]);
const safeUploadUrlPattern = /^\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:jpe?g|png|gif|webp)$/i;
const publicRootFiles = new Set([
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/lucide.min.js',
  '/manifest.webmanifest',
  '/sw.js',
  '/robots.txt',
  '/sitemap.xml',
  '/feed.xml'
]);
const publicPathPrefixes = ['/assets/', '/uploads/'];
const blockedPathPrefixes = [
  '/.git/',
  '/.github/',
  '/.vscode/',
  '/node_modules/',
  '/scripts/',
  '/data/',
  '/coverage/',
  '/dist/',
  '/tmp/'
];
const blockedRootFiles = new Set([
  '/.env',
  '/.env.example',
  '/.gitignore',
  '/.dockerignore',
  '/Dockerfile',
  '/docker-compose.yml',
  '/package.json',
  '/package-lock.json',
  '/server.js',
  '/db.js',
  '/auth.js',
  '/DEPLOYMENT.md',
  '/README.md',
  '/SECURITY.md'
]);
const allowedCommentAvatars = new Set(['👨‍💻', '👩‍💻', '🚀', '🐱', '🦊', '🦄', '🤖', '🎨', '☕', '🐼', '👤']);

function parseTrustProxy(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || raw === 'false' || raw === '0') return false;
  if (raw === 'true') return true;
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 0) return numeric;
  return value;
}

function readTextField(res, label, value, { required = false, max = 1000, fallback = '' } = {}) {
  const text = value == null ? '' : String(value).trim();
  if (required && !text) {
    res.status(400).json({ error: `${label} is required.` });
    return undefined;
  }
  if (text.length > max) {
    res.status(400).json({ error: `${label} must be ${max} characters or fewer.` });
    return undefined;
  }
  return text || fallback;
}

function readUrlField(res, label, value, { max = 2048, allowLocalUploads = false } = {}) {
  const raw = readTextField(res, label, value, { max });
  if (raw === undefined) return undefined;
  if (!raw) return '';
  if (allowLocalUploads && raw.startsWith('/uploads/')) {
    if (safeUploadUrlPattern.test(raw)) return raw;
    res.status(400).json({ error: `${label} must be a safe uploaded image URL.` });
    return undefined;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
  } catch (err) {
    // Fall through to validation error below.
  }
  res.status(400).json({ error: `${label} must be a valid http(s) URL.` });
  return undefined;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map(tag => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 12)
    .map(tag => tag.slice(0, 40));
}

function hasImageSignature(filePath, mimeType) {
  const header = fs.readFileSync(filePath).subarray(0, 16);
  if (mimeType === 'image/png') {
    return header.length >= 8 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a;
  }
  if (mimeType === 'image/jpeg') {
    return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (mimeType === 'image/gif') {
    const signature = header.subarray(0, 6).toString('ascii');
    return signature === 'GIF87a' || signature === 'GIF89a';
  }
  if (mimeType === 'image/webp') {
    return header.length >= 12 &&
      header.subarray(0, 4).toString('ascii') === 'RIFF' &&
      header.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}

function removeUploadedFile(file) {
  if (!file?.path) return;
  try {
    fs.unlinkSync(file.path);
  } catch (err) {
    console.warn(`Failed to remove rejected upload ${file.path}:`, err.message);
  }
}

function sendDatabaseError(res, err, fallback = 'Database operation failed.') {
  console.error('[db]', err?.message || err);
  return res.status(500).json({ error: fallback });
}

function sendApiError(res, status, message) {
  return res.status(status).json({ error: message });
}

// Enable CORS, baseline hardening & JSON Parsing middleware
app.disable('x-powered-by');
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (!isProduction && allowedOrigins.length === 0) return cb(null, true);
    return cb(null, false);
  }
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Origin-Agent-Cluster', '?1');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Content-Security-Policy', contentSecurityPolicy);
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return sendApiError(res, 400, 'Malformed JSON request body.');
  }
  next(err);
});

function createRateLimit({ windowMs, max, message, maxKeys = 5000 }) {
  const hits = new Map();
  const cleanup = () => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetAt) hits.delete(key);
    }
    while (hits.size > maxKeys) {
      const oldestKey = hits.keys().next().value;
      if (oldestKey === undefined) break;
      hits.delete(oldestKey);
    }
  };
  const cleanupTimer = setInterval(cleanup, Math.min(windowMs, 60 * 1000));
  cleanupTimer.unref?.();

  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    if (hits.size > maxKeys) cleanup();
    const record = hits.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }
    record.count += 1;
    hits.set(key, record);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - record.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));
    if (record.count > max) {
      return res.status(429).json({ error: message || 'Too many requests. Please try again later.' });
    }
    next();
  };
}

const authLimiter = createRateLimit({ windowMs: 15 * 60 * 1000, max: 12, maxKeys: 2000, message: 'Too many login attempts. Please wait and try again.' });
const writeLimiter = createRateLimit({ windowMs: 60 * 1000, max: 30, maxKeys: 5000 });

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer Storage Configuration for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;
    const ext = allowedImageMimeTypes.get(file.mimetype) || path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (allowedImageMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, GIF, and WebP images are allowed.'));
    }
  }
});

// Static files hosting
if (trustProxy) {
  app.set('trust proxy', parseTrustProxy(trustProxy));
}
app.use('/uploads', express.static(uploadDir, {
  maxAge: '7d',
  immutable: false,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=604800');
  }
}));
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api/')) return next();
  let requestPath = req.path;
  try {
    requestPath = decodeURIComponent(req.path);
  } catch (err) {
    return res.status(400).send('Bad request');
  }
  if (publicRootFiles.has(requestPath) || publicPathPrefixes.some(prefix => requestPath.startsWith(prefix))) {
    return next();
  }
  if (blockedRootFiles.has(requestPath) ||
      blockedPathPrefixes.some(prefix => requestPath.startsWith(prefix)) ||
      requestPath.split('/').some(part => part.startsWith('.') && part.length > 1)) {
    return res.status(404).send('Not found');
  }
  if (path.extname(requestPath)) {
    return res.status(404).send('Not found');
  }
  next();
});
app.use(express.static(__dirname, {
  etag: true,
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (/\.(?:js|css)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (/\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
    if (/\.html$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
})); // Host index.html, style.css, app.js directly

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    name: 'atherix-digital-space',
    env: isProduction ? 'production' : 'development',
    time: new Date().toISOString()
  });
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// POST: Admin Login
app.post('/api/auth/login', authLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database query error.' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Verify Password
    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Sign Token (Valid for 7 days)
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token });
  });
});

// GET: Auth Status Check
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, username: req.user.username });
});

// ==========================================
// BLOG POSTS API ENDPOINTS
// ==========================================

// GET: All Posts
app.get('/api/posts', (req, res) => {
  db.all('SELECT * FROM posts ORDER BY pinned DESC, date DESC', [], (err, rows) => {
    if (err) {
      return sendDatabaseError(res, err);
    }
    res.json(rows);
  });
});

// POST: Create New Post (Admin Only)
app.post('/api/posts', authenticateToken, writeLimiter, (req, res) => {
  const { id, pinned } = req.body;
  const title = readTextField(res, 'Title', req.body.title, { required: true, max: 160 });
  const excerpt = readTextField(res, 'Excerpt', req.body.excerpt, { max: 500 });
  const content = readTextField(res, 'Content', req.body.content, { required: true, max: 60000 });
  const tag = readTextField(res, 'Tag', req.body.tag, { max: 80, fallback: '未分类' });
  const date = readTextField(res, 'Date', req.body.date, { max: 32 });
  const readTime = readTextField(res, 'Read time', req.body.readTime, { max: 32, fallback: '5 分钟阅读' });
  if ([title, excerpt, content, tag, date, readTime].some(value => value === undefined)) return;

  const rawId = readTextField(res, 'Post id', id, { max: 80 });
  if (rawId === undefined) return;
  const postId = /^[a-zA-Z0-9_-]+$/.test(rawId) ? rawId : 'post-' + Date.now();
  const postDate = date || new Date().toISOString().split('T')[0];
  const postPinned = pinned ? 1 : 0;

  db.run(
    'INSERT INTO posts (id, title, excerpt, content, tag, date, readTime, pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [postId, title, excerpt, content, tag, postDate, readTime, postPinned],
    function(err) {
      if (err) {
        return sendDatabaseError(res, err);
      }
      res.json({ success: true, postId });
    }
  );
});

// PUT: Update Existing Post (Admin Only)
app.put('/api/posts/:id', authenticateToken, writeLimiter, (req, res) => {
  const postId = req.params.id;
  const title = readTextField(res, 'Title', req.body.title, { required: true, max: 160 });
  const excerpt = readTextField(res, 'Excerpt', req.body.excerpt, { max: 500 });
  const content = readTextField(res, 'Content', req.body.content, { required: true, max: 60000 });
  const tag = readTextField(res, 'Tag', req.body.tag, { max: 80, fallback: '未分类' });
  const hasDate = Object.prototype.hasOwnProperty.call(req.body || {}, 'date');
  const date = hasDate ? readTextField(res, 'Date', req.body.date, { max: 32 }) : '';
  const readTime = readTextField(res, 'Read time', req.body.readTime, { max: 32, fallback: '5 分钟阅读' });
  if ([title, excerpt, content, tag, date, readTime].some(value => value === undefined)) return;
  const shouldUpdateDate = Boolean(String(date || '').trim());
  const postPinned = req.body.pinned ? 1 : 0;

  db.run(
    'UPDATE posts SET title = ?, excerpt = ?, content = ?, tag = ?, date = CASE WHEN ? THEN ? ELSE date END, readTime = ?, pinned = ? WHERE id = ?',
    [title, excerpt, content, tag, shouldUpdateDate ? 1 : 0, date, readTime, postPinned, postId],
    function(err) {
      if (err) {
        return sendDatabaseError(res, err);
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Post not found.' });
      }
      res.json({ success: true });
    }
  );
});

// DELETE: Remove Post (Admin Only)
app.delete('/api/posts/:id', authenticateToken, writeLimiter, (req, res) => {
  const postId = req.params.id;

  db.run('DELETE FROM posts WHERE id = ?', [postId], function(err) {
    if (err) {
      return sendDatabaseError(res, err);
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    res.json({ success: true });
  });
});

// ==========================================
// PROJECTS API ENDPOINTS
// ==========================================

// GET: All Projects
app.get('/api/projects', (req, res) => {
  db.all('SELECT * FROM projects', [], (err, rows) => {
    if (err) {
      return sendDatabaseError(res, err);
    }
    // Parse JSON tags string to array
    const projects = rows.map(row => {
      try {
        row.tags = JSON.parse(row.tags);
      } catch (e) {
        row.tags = [];
      }
      return row;
    });
    res.json(projects);
  });
});

// POST: Create New Project (Admin Only)
app.post('/api/projects', authenticateToken, writeLimiter, (req, res) => {
  const title = readTextField(res, 'Title', req.body.title, { required: true, max: 160 });
  const desc = readTextField(res, 'Description', req.body.desc, { max: 800 });
  const tag = readTextField(res, 'Tag', req.body.tag, { max: 80, fallback: '前端开发' });
  const pain = readTextField(res, 'Pain point', req.body.pain, { max: 1200 });
  const solution = readTextField(res, 'Solution', req.body.solution, { max: 1200 });
  const img = readUrlField(res, 'Image URL', req.body.img, { allowLocalUploads: true });
  const github = readUrlField(res, 'GitHub URL', req.body.github);
  const live = readUrlField(res, 'Live URL', req.body.live);
  const rawId = readTextField(res, 'Project id', req.body.id, { max: 80 });
  if ([title, desc, tag, pain, solution, img, github, live, rawId].some(value => value === undefined)) return;

  const projId = /^[a-zA-Z0-9_-]+$/.test(rawId) ? rawId : 'proj-' + Date.now();
  const tagsStr = JSON.stringify(normalizeTags(req.body.tags));

  db.run(
    'INSERT INTO projects (id, title, desc, tag, tags, img, pain, solution, github, live) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [projId, title, desc, tag, tagsStr, img, pain, solution, github, live],
    function(err) {
      if (err) {
        return sendDatabaseError(res, err);
      }
      res.json({ success: true, projId });
    }
  );
});

// PUT: Update Project (Admin Only)
app.put('/api/projects/:id', authenticateToken, writeLimiter, (req, res) => {
  const projId = req.params.id;
  const title = readTextField(res, 'Title', req.body.title, { required: true, max: 160 });
  const desc = readTextField(res, 'Description', req.body.desc, { max: 800 });
  const tag = readTextField(res, 'Tag', req.body.tag, { max: 80, fallback: '前端开发' });
  const pain = readTextField(res, 'Pain point', req.body.pain, { max: 1200 });
  const solution = readTextField(res, 'Solution', req.body.solution, { max: 1200 });
  const img = readUrlField(res, 'Image URL', req.body.img, { allowLocalUploads: true });
  const github = readUrlField(res, 'GitHub URL', req.body.github);
  const live = readUrlField(res, 'Live URL', req.body.live);
  if ([title, desc, tag, pain, solution, img, github, live].some(value => value === undefined)) return;
  const tagsStr = JSON.stringify(normalizeTags(req.body.tags));

  db.run(
    'UPDATE projects SET title = ?, desc = ?, tag = ?, tags = ?, img = ?, pain = ?, solution = ?, github = ?, live = ? WHERE id = ?',
    [title, desc, tag, tagsStr, img, pain, solution, github, live, projId],
    function(err) {
      if (err) {
        return sendDatabaseError(res, err);
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Project not found.' });
      }
      res.json({ success: true });
    }
  );
});

// DELETE: Remove Project (Admin Only)
app.delete('/api/projects/:id', authenticateToken, writeLimiter, (req, res) => {
  const projId = req.params.id;

  db.run('DELETE FROM projects WHERE id = ?', [projId], function(err) {
    if (err) {
      return sendDatabaseError(res, err);
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    res.json({ success: true });
  });
});

// ==========================================
// GUESTBOOK API ENDPOINTS
// ==========================================

// GET: Retrieve comments
app.get('/api/comments', (req, res) => {
  db.all('SELECT * FROM comments ORDER BY date DESC', [], (err, rows) => {
    if (err) {
      return sendDatabaseError(res, err);
    }
    res.json(rows);
  });
});

// POST: Post comments
app.post('/api/comments', writeLimiter, (req, res) => {
  const honeypot = String(req.body.company || '').trim();
  if (honeypot) {
    return res.status(400).json({ error: 'Spam protection triggered.' });
  }
  const nickname = readTextField(res, 'Nickname', req.body.nickname, { required: true, max: 60 });
  const content = readTextField(res, 'Content', req.body.content, { required: true, max: 1000 });
  const website = readUrlField(res, 'Website', req.body.website);
  const rawAvatar = readTextField(res, 'Avatar', req.body.avatar, { max: 8, fallback: '👤' });
  if ([nickname, content, website, rawAvatar].some(value => value === undefined)) return;
  const linkCount = (content.match(/https?:\/\//gi) || []).length;
  if (linkCount > 3) {
    return res.status(400).json({ error: 'Please keep comment links to three or fewer.' });
  }
  const avatar = allowedCommentAvatars.has(rawAvatar) ? rawAvatar : '👤';

  // Generate current timestamp string "YYYY-MM-DD HH:MM"
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  db.run(
    'INSERT INTO comments (nickname, avatar, website, content, date) VALUES (?, ?, ?, ?, ?)',
    [nickname, avatar, website, content, dateStr],
    function(err) {
      if (err) {
        return sendDatabaseError(res, err);
      }
      res.json({
        success: true,
        comment: {
          id: this.lastID,
          nickname,
          avatar,
          website,
          content,
          date: dateStr
        }
      });
    }
  );
});

// DELETE: Delete Comment (Admin Only)
app.delete('/api/comments/:id', authenticateToken, writeLimiter, (req, res) => {
  const commentId = req.params.id;

  db.run('DELETE FROM comments WHERE id = ?', [commentId], function(err) {
    if (err) {
      return sendDatabaseError(res, err);
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    res.json({ success: true });
  });
});

// ==========================================
// MEDIA UPLOAD API ENDPOINTS
// ==========================================

// POST: Upload File (Admin Only)
app.post('/api/upload', authenticateToken, writeLimiter, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    if (!hasImageSignature(req.file.path, req.file.mimetype)) {
      removeUploadedFile(req.file);
      return res.status(400).json({ error: 'Uploaded file content does not match the declared image type.' });
    }
    const relativePath = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: relativePath });
  });
});

app.use('/api', (req, res) => {
  sendApiError(res, 404, 'API endpoint not found.');
});

app.use((err, req, res, next) => {
  console.error('[server]', err?.message || err);
  if (res.headersSent) return next(err);
  sendApiError(res, 500, 'Internal server error.');
});

// Global Fallback for Spa client routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server Listen
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  Atherix Digital Space Server is running!`);
  console.log(`  Local Address: http://localhost:${PORT}`);
  console.log(`  Proxy safe relative paths are active.`);
  console.log(`===================================================`);
});
