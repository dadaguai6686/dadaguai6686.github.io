// server.js - Atherix Digital Space Node.js Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
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
function normalizePublicSiteUrl(value) {
  const fallback = 'https://dadaguai6686.github.io';
  try {
    const url = new URL(String(value || fallback).trim() || fallback);
    if (!['http:', 'https:'].includes(url.protocol)) return fallback;
    if (url.username || url.password || url.search || url.hash) return fallback;
    const pathname = url.pathname.replace(/\/+$/, '');
    return `${url.origin}${pathname}`;
  } catch {
    return fallback;
  }
}

const publicSiteUrl = normalizePublicSiteUrl(process.env.PUBLIC_SITE_URL || 'https://dadaguai6686.github.io');
const defaultPageTitle = 'Atherix - 个人博客与数字空间';
const defaultPageDescription = 'Atherix的个人主页与技术博客。集成精美的Bento Dashboard、数字化工具箱（JSON格式化、图片WebP压缩、Markdown编辑器、番茄钟）以及个人项目展示与留言板。';
const defaultOgImageUrl = `${publicSiteUrl}/assets/atherix-og-card.png`;
const trustProxy = process.env.TRUST_PROXY || '';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const loginUsernameMaxLength = 80;
const loginPasswordMaxLength = 256;
const loginDummyPasswordHash = '$2a$10$nJt2hjnq0YN7EelNOMKyr.gWkw61CHmhvh1xv64F4VMjrJciQYd2m';
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "manifest-src 'self'"
].join('; ');
const permissionsPolicy = [
  'accelerometer=()',
  'autoplay=(self)',
  'camera=()',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=(self)',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'picture-in-picture=()',
  'publickey-credentials-get=()',
  'screen-wake-lock=()',
  'sync-xhr=()',
  'usb=()',
  'web-share=(self)',
  'xr-spatial-tracking=()'
].join(', ');

const allowedImageMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp']
]);
const uploadExtensionMimeTypes = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp']
]);
const safeUploadUrlPattern = /^\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:jpe?g|png|gif|webp)$/i;
const safeAssetImageUrlPattern = /^\/assets\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:jpe?g|png|gif|webp|svg)$/i;
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

function readUrlField(res, label, value, { max = 2048, allowLocalUploads = false, allowLocalAssets = false, allowRemote = true } = {}) {
  const raw = readTextField(res, label, value, { max });
  if (raw === undefined) return undefined;
  if (!raw) return '';
  if (allowLocalUploads && raw.startsWith('/uploads/')) {
    if (safeUploadUrlPattern.test(raw)) return raw;
    res.status(400).json({ error: `${label} must be a safe uploaded image URL.` });
    return undefined;
  }
  if (allowLocalAssets && raw.startsWith('/assets/')) {
    if (safeAssetImageUrlPattern.test(raw)) return raw;
    res.status(400).json({ error: `${label} must be a safe local asset image URL.` });
    return undefined;
  }
  if (allowRemote) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
    } catch (err) {
      // Fall through to validation error below.
    }
  }
  const localTargets = [
    allowLocalAssets ? '/assets/...' : '',
    allowLocalUploads ? '/uploads/...' : ''
  ].filter(Boolean);
  const allowedCopy = localTargets.length && !allowRemote
    ? localTargets.join(' or ')
    : 'a valid http(s) URL';
  res.status(400).json({ error: `${label} must be ${allowedCopy}.` });
  return undefined;
}

function readLoginField(res, label, value, { max, trim = false } = {}) {
  if (typeof value !== 'string') {
    res.status(400).json({ error: `${label} is required.` });
    return undefined;
  }
  const text = trim ? value.trim() : value;
  if (!text) {
    res.status(400).json({ error: `${label} is required.` });
    return undefined;
  }
  if (text.length > max) {
    res.status(400).json({ error: `${label} must be ${max} characters or fewer.` });
    return undefined;
  }
  return text;
}

function readDateField(res, label, value, { required = false } = {}) {
  const raw = value == null ? '' : String(value).trim();
  if (!raw) {
    if (required) {
      res.status(400).json({ error: `${label} is required.` });
      return undefined;
    }
    return '';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    res.status(400).json({ error: `${label} must use YYYY-MM-DD format.` });
    return undefined;
  }
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    res.status(400).json({ error: `${label} must be a valid calendar date.` });
    return undefined;
  }
  return raw;
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

function safeUploadStaticPath(reqPath = '') {
  let decodedPath = '';
  try {
    decodedPath = decodeURIComponent(reqPath);
  } catch {
    return null;
  }
  const candidate = `/uploads${decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}`}`;
  if (!safeUploadUrlPattern.test(candidate)) return null;
  return {
    publicPath: candidate,
    filePath: path.join(uploadDir, path.basename(candidate)),
    mimeType: uploadExtensionMimeTypes.get(path.extname(candidate).toLowerCase()) || ''
  };
}

function guardStaticUpload(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const safePath = safeUploadStaticPath(req.path || '');
  if (!safePath?.mimeType) return res.status(404).send('Not found');
  if (!fs.existsSync(safePath.filePath)) return next();
  try {
    if (!hasImageSignature(safePath.filePath, safePath.mimeType)) {
      return res.status(404).send('Not found');
    }
  } catch (err) {
    console.warn(`[uploads] rejected unreadable file ${safePath.publicPath}:`, err.message);
    return res.status(404).send('Not found');
  }
  next();
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
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return res.status(status).json({ error: message });
}

function isSqliteConstraintError(err) {
  return err?.code === 'SQLITE_CONSTRAINT' || /SQLITE_CONSTRAINT/i.test(err?.message || '');
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripMarkdownText(value) {
  return String(value ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateMetaText(value, max = 180) {
  const text = stripMarkdownText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function replaceHtmlTagContent(html, tagName, value) {
  const safeValue = escapeXml(value);
  return html.replace(new RegExp(`<${tagName}>[\\s\\S]*?<\\/${tagName}>`, 'i'), () => `<${tagName}>${safeValue}</${tagName}>`);
}

function replaceMetaContent(html, attrName, attrValue, value) {
  const safeAttr = escapeXml(value);
  const pattern = new RegExp(`(<meta\\s+${attrName}="${attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content=")[^"]*("\\s*>)`, 'i');
  return html.replace(pattern, (_match, open, close) => `${open}${safeAttr}${close}`);
}

function replaceCanonicalHref(html, value) {
  return html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*("\s*>)/i, (_match, open, close) => `${open}${escapeXml(value)}${close}`);
}

function serializeJsonLd(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildArticleJsonLd(post, url, description) {
  const published = post?.date || undefined;
  const tag = post?.tag || '未分类';
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    },
    headline: truncateMetaText(post?.title || '文章', 110),
    description,
    image: [defaultOgImageUrl],
    url,
    datePublished: published,
    dateModified: published,
    inLanguage: 'zh-CN',
    articleSection: tag,
    keywords: [tag].filter(Boolean),
    author: {
      '@type': 'Person',
      name: 'Atherix',
      url: publicSiteUrl
    },
    publisher: {
      '@type': 'Organization',
      name: 'Atherix Digital Space',
      logo: {
        '@type': 'ImageObject',
        url: `${publicSiteUrl}/assets/atherix-icon-512.png`
      }
    }
  };
}

function cspWithInlineScriptHash(hash) {
  if (!hash) return contentSecurityPolicy;
  return contentSecurityPolicy.replace("script-src 'self'", `script-src 'self' 'sha256-${hash}'`);
}

function appendArticleMeta(html, post, url, jsonLd) {
  const extras = [
    '<meta property="article:author" content="Atherix">',
    post?.date ? `<meta property="article:published_time" content="${escapeXml(post.date)}">` : '',
    post?.date ? `<meta property="og:updated_time" content="${escapeXml(post.date)}">` : '',
    post?.tag ? `<meta property="article:section" content="${escapeXml(post.tag)}">` : '',
    post?.tag ? `<meta property="article:tag" content="${escapeXml(post.tag)}">` : ''
  ].filter(Boolean);
  if (jsonLd) extras.push(`<script type="application/ld+json">${jsonLd}</script>`);
  const block = extras.join('\n  ');
  return block ? html.replace('</head>', () => `  ${block}\n</head>`) : html;
}

function publicArticleUrl(postId = '') {
  return `${publicSiteUrl}/posts/${encodeURIComponent(postId || '')}/`;
}

function postDateValue(post) {
  const parsed = Date.parse(post?.date || '');
  return Number.isFinite(parsed) ? new Date(parsed) : new Date();
}

function sendStaticXmlFallback(res, filename, type) {
  res.type(type);
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, filename));
}

function renderFeedXml(posts) {
  const ordered = [...posts].sort((a, b) => postDateValue(b) - postDateValue(a));
  const lastBuild = ordered[0] ? postDateValue(ordered[0]).toUTCString() : new Date().toUTCString();
  const items = ordered.map(post => {
    const url = publicArticleUrl(post.id);
    return `    <item>
      <title>${escapeXml(post.title || '未命名文章')}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${postDateValue(post).toUTCString()}</pubDate>
      <category>${escapeXml(post.tag || '未分类')}</category>
      <description>${escapeXml(post.excerpt || '')}</description>
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Atherix Digital Space</title>
    <link>${escapeXml(publicSiteUrl)}/</link>
    <atom:link href="${escapeXml(publicSiteUrl)}/feed.xml" rel="self" type="application/rss+xml" />
    <description>个人博客、开发者工具箱、项目展示与互动游戏组成的原生 Web 数字空间。</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <generator>Atherix Vanilla Web Stack</generator>
    <image>
      <url>${escapeXml(publicSiteUrl)}/assets/atherix-og-card.png</url>
      <title>Atherix Digital Space</title>
      <link>${escapeXml(publicSiteUrl)}/</link>
      <width>144</width>
      <height>76</height>
    </image>
${items}
  </channel>
</rss>
`;
}

function renderSitemapXml(posts) {
  const ordered = [...posts].sort((a, b) => postDateValue(b) - postDateValue(a));
  const latest = ordered[0] ? postDateValue(ordered[0]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const articleUrls = ordered.map(post => `  <url>
    <loc>${escapeXml(publicArticleUrl(post.id))}</loc>
    <lastmod>${postDateValue(post).toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${post.pinned ? '0.9' : '0.7'}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(publicSiteUrl)}/</loc>
    <lastmod>${latest}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${articleUrls}
</urlset>
`;
}

function renderIndexHtmlWithArticleMeta(post) {
  const template = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const title = `${truncateMetaText(post?.title || '文章', 90)} - Atherix`;
  const description = truncateMetaText(post?.excerpt || post?.content || defaultPageDescription, 180);
  const url = publicArticleUrl(post?.id || '');
  const jsonLd = serializeJsonLd(buildArticleJsonLd(post, url, description));
  const jsonLdHash = crypto.createHash('sha256').update(jsonLd).digest('base64');
  let html = template;
  html = replaceHtmlTagContent(html, 'title', title);
  html = replaceMetaContent(html, 'name', 'description', description);
  html = replaceMetaContent(html, 'property', 'og:title', title);
  html = replaceMetaContent(html, 'property', 'og:description', description);
  html = replaceMetaContent(html, 'property', 'og:type', 'article');
  html = replaceMetaContent(html, 'property', 'og:url', url);
  html = replaceMetaContent(html, 'property', 'og:image', defaultOgImageUrl);
  html = replaceMetaContent(html, 'property', 'og:image:secure_url', defaultOgImageUrl);
  html = replaceMetaContent(html, 'name', 'twitter:title', title);
  html = replaceMetaContent(html, 'name', 'twitter:description', description);
  html = replaceMetaContent(html, 'name', 'twitter:image', defaultOgImageUrl);
  html = replaceCanonicalHref(html, url);
  html = appendArticleMeta(html, post, url, jsonLd);
  return { html, csp: cspWithInlineScriptHash(jsonLdHash), jsonLdHash };
}

function sendArticleIndexHtml(req, res, next) {
  const postId = String(req.params?.postId || req.query.post || '').trim();
  if (!postId) return next();
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(postId)) return next();
  db.get('SELECT id, title, excerpt, content, tag, date, readTime, pinned FROM posts WHERE id = ?', [postId], (err, post) => {
    if (err || !post) {
      if (err) console.warn('[article-meta]', err.message);
      return next();
    }
    try {
      const rendered = renderIndexHtmlWithArticleMeta(post);
      res.type('html');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Security-Policy', rendered.csp);
      res.send(rendered.html);
    } catch (renderErr) {
      console.warn('[article-meta]', renderErr.message);
      next();
    }
  });
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
  res.setHeader('Permissions-Policy', permissionsPolicy);
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Origin-Agent-Cluster', '?1');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Content-Security-Policy', contentSecurityPolicy);
  res.vary('Origin');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large' || err?.status === 413 || err?.statusCode === 413) {
    return sendApiError(res, 413, 'Request body too large. Keep JSON payloads under 1 MB.');
  }
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

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api/')) return next();
  let requestPath = req.path;
  try {
    requestPath = decodeURIComponent(req.path);
  } catch (err) {
    return res.status(400).send('Bad request');
  }
  const suspiciousPathPart = requestPath
    .split('/')
    .some(part => part === '..' || (part.startsWith('.') && part.length > 1));
  if (suspiciousPathPart) {
    return res.status(404).send('Not found');
  }
  const publicArticlePagePath = /^\/posts\/[A-Za-z0-9_-]{1,80}\/(?:index\.html)?$/.test(requestPath) ||
    /^\/posts\/[A-Za-z0-9_-]{1,80}$/.test(requestPath);
  if (publicRootFiles.has(requestPath) || publicArticlePagePath || publicPathPrefixes.some(prefix => requestPath.startsWith(prefix))) {
    return next();
  }
  if (blockedRootFiles.has(requestPath) ||
      blockedPathPrefixes.some(prefix => requestPath.startsWith(prefix))) {
    return res.status(404).send('Not found');
  }
  if (path.extname(requestPath)) {
    return res.status(404).send('Not found');
  }
  next();
});

app.get('/feed.xml', (req, res) => {
  db.all('SELECT id, title, excerpt, tag, date, pinned FROM posts ORDER BY pinned DESC, date DESC', [], (err, rows) => {
    if (err) {
      console.warn('[feed]', err.message);
      return sendStaticXmlFallback(res, 'feed.xml', 'application/rss+xml');
    }
    res.type('application/rss+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(renderFeedXml(rows || []));
  });
});

app.get('/sitemap.xml', (req, res) => {
  db.all('SELECT id, title, excerpt, tag, date, pinned FROM posts ORDER BY pinned DESC, date DESC', [], (err, rows) => {
    if (err) {
      console.warn('[sitemap]', err.message);
      return sendStaticXmlFallback(res, 'sitemap.xml', 'application/xml');
    }
    res.type('application/xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(renderSitemapXml(rows || []));
  });
});

app.get(['/', '/index.html', '/posts/:postId', '/posts/:postId/', '/posts/:postId/index.html'], sendArticleIndexHtml);

app.use('/uploads', guardStaticUpload, express.static(uploadDir, {
  maxAge: '7d',
  immutable: false,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=604800');
  }
}));

function hasVersionedAssetQuery(res) {
  const version = res.req?.query?.v;
  return typeof version === 'string' && /^[A-Za-z0-9._-]{4,96}$/.test(version);
}

app.use(express.static(__dirname, {
  etag: true,
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (path.basename(filePath) === 'sw.js') {
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Service-Worker-Allowed', '/');
      return;
    }
    if (/\.(?:js|css)$/i.test(filePath)) {
      res.setHeader(
        'Cache-Control',
        hasVersionedAssetQuery(res) ? 'public, max-age=31536000, immutable' : 'no-cache'
      );
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
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  next();
});

app.get('/api/health', (req, res) => {
  db.healthCheck((err, database) => {
    const ok = !err && !!database?.ready;
    res.status(ok ? 200 : 503).json({
      ok,
      name: 'atherix-digital-space',
      env: isProduction ? 'production' : 'development',
      time: new Date().toISOString(),
      database: {
        connected: !!database?.connected,
        ready: !!database?.ready,
        lastCheckedAt: database?.lastCheckedAt || null
      }
    });
  });
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// POST: Admin Login
app.post('/api/auth/login', authLimiter, (req, res) => {
  const username = readLoginField(res, 'Username', req.body?.username, { max: loginUsernameMaxLength, trim: true });
  const password = readLoginField(res, 'Password', req.body?.password, { max: loginPasswordMaxLength });
  if (username === undefined || password === undefined) return;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database query error.' });
    }

    const passwordHash = user?.password || loginDummyPasswordHash;
    const passwordIsValid = bcrypt.compareSync(password, passwordHash);
    if (!user || !passwordIsValid) {
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
  const date = readDateField(res, 'Date', req.body.date);
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
        if (isSqliteConstraintError(err)) {
          return sendApiError(res, 409, 'Post id already exists.');
        }
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
  const date = hasDate ? readDateField(res, 'Date', req.body.date) : '';
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
  const img = readUrlField(res, 'Image URL', req.body.img, { allowLocalUploads: true, allowLocalAssets: true, allowRemote: false });
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
        if (isSqliteConstraintError(err)) {
          return sendApiError(res, 409, 'Project id already exists.');
        }
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
  const img = readUrlField(res, 'Image URL', req.body.img, { allowLocalUploads: true, allowLocalAssets: true, allowRemote: false });
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
const serverSockets = new Set();
const server = app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  Atherix Digital Space Server is running!`);
  console.log(`  Local Address: http://localhost:${PORT}`);
  console.log(`  Proxy safe relative paths are active.`);
  console.log(`===================================================`);
});

server.on('connection', (socket) => {
  serverSockets.add(socket);
  socket.on('close', () => serverSockets.delete(socket));
});

function shutdown(signal) {
  console.log(`[server] ${signal} received, closing HTTP server and SQLite connection...`);
  server.close(() => {
    db.closeGracefully((err) => {
      if (err) console.error('[server] SQLite close error:', err.message);
      process.exit(err ? 1 : 0);
    });
  });
  setTimeout(() => {
    serverSockets.forEach(socket => socket.destroy());
  }, 750);
  setTimeout(() => process.exit(1), 8000);
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
