// server.js - Atherix Digital Space Node.js Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// Import database and authentication helpers
const db = require('./db');
const { authenticateToken, JWT_SECRET } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
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
const publicRootFiles = new Set([
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/lucide.min.js',
  '/manifest.webmanifest',
  '/robots.txt',
  '/sitemap.xml'
]);
const publicPathPrefixes = ['/assets/', '/uploads/'];
const blockedRootFiles = new Set([
  '/Dockerfile',
  '/docker-compose.yml',
  '/package.json',
  '/package-lock.json',
  '/server.js',
  '/db.js',
  '/auth.js',
  '/DEPLOYMENT.md'
]);

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
  res.setHeader('Content-Security-Policy', contentSecurityPolicy);
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

function createRateLimit({ windowMs, max, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
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

const authLimiter = createRateLimit({ windowMs: 15 * 60 * 1000, max: 12, message: 'Too many login attempts. Please wait and try again.' });
const writeLimiter = createRateLimit({ windowMs: 60 * 1000, max: 30 });

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
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
  if (publicRootFiles.has(req.path) || publicPathPrefixes.some(prefix => req.path.startsWith(prefix))) {
    return next();
  }
  if (blockedRootFiles.has(req.path)) {
    return res.status(404).send('Not found');
  }
  if (path.extname(req.path)) {
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
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST: Create New Post (Admin Only)
app.post('/api/posts', authenticateToken, (req, res) => {
  const { id, title, excerpt, content, tag, date, readTime, pinned } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  const postId = id || 'post-' + Date.now();
  const postDate = date || new Date().toISOString().split('T')[0];
  const postReadTime = readTime || '5 分钟阅读';
  const postPinned = pinned ? 1 : 0;

  db.run(
    'INSERT INTO posts (id, title, excerpt, content, tag, date, readTime, pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [postId, title, excerpt, content, tag || '未分类', postDate, postReadTime, postPinned],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, postId });
    }
  );
});

// PUT: Update Existing Post (Admin Only)
app.put('/api/posts/:id', authenticateToken, (req, res) => {
  const { title, excerpt, content, tag, date, readTime, pinned } = req.body;
  const postId = req.params.id;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  const postPinned = pinned ? 1 : 0;

  db.run(
    'UPDATE posts SET title = ?, excerpt = ?, content = ?, tag = ?, date = ?, readTime = ?, pinned = ? WHERE id = ?',
    [title, excerpt, content, tag, date, readTime, postPinned, postId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Post not found.' });
      }
      res.json({ success: true });
    }
  );
});

// DELETE: Remove Post (Admin Only)
app.delete('/api/posts/:id', authenticateToken, (req, res) => {
  const postId = req.params.id;

  db.run('DELETE FROM posts WHERE id = ?', [postId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
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
      return res.status(500).json({ error: err.message });
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
app.post('/api/projects', authenticateToken, (req, res) => {
  const { id, title, desc, tag, tags, img, pain, solution, github, live } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required.' });
  }

  const projId = id || 'proj-' + Date.now();
  const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : '[]';

  db.run(
    'INSERT INTO projects (id, title, desc, tag, tags, img, pain, solution, github, live) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [projId, title, desc, tag || '前端开发', tagsStr, img || '', pain || '', solution || '', github || '', live || ''],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, projId });
    }
  );
});

// PUT: Update Project (Admin Only)
app.put('/api/projects/:id', authenticateToken, (req, res) => {
  const { title, desc, tag, tags, img, pain, solution, github, live } = req.body;
  const projId = req.params.id;

  const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : '[]';

  db.run(
    'UPDATE projects SET title = ?, desc = ?, tag = ?, tags = ?, img = ?, pain = ?, solution = ?, github = ?, live = ? WHERE id = ?',
    [title, desc, tag, tagsStr, img, pain, solution, github, live, projId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Project not found.' });
      }
      res.json({ success: true });
    }
  );
});

// DELETE: Remove Project (Admin Only)
app.delete('/api/projects/:id', authenticateToken, (req, res) => {
  const projId = req.params.id;

  db.run('DELETE FROM projects WHERE id = ?', [projId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
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
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST: Post comments
app.post('/api/comments', writeLimiter, (req, res) => {
  const { nickname, avatar, website, content } = req.body;

  if (!nickname || !content) {
    return res.status(400).json({ error: 'Nickname and content are required.' });
  }

  // Generate current timestamp string "YYYY-MM-DD HH:MM"
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  db.run(
    'INSERT INTO comments (nickname, avatar, website, content, date) VALUES (?, ?, ?, ?, ?)',
    [nickname, avatar || '👤', website || '', content, dateStr],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        success: true,
        comment: {
          id: this.lastID,
          nickname,
          avatar: avatar || '👤',
          website: website || '',
          content,
          date: dateStr
        }
      });
    }
  );
});

// DELETE: Delete Comment (Admin Only)
app.delete('/api/comments/:id', authenticateToken, (req, res) => {
  const commentId = req.params.id;

  db.run('DELETE FROM comments WHERE id = ?', [commentId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
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
  const relativePath = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: relativePath });
  });
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
