const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = Number(process.env.API_SMOKE_PORT || (3400 + Math.floor(Math.random() * 800)));
const baseUrl = `http://127.0.0.1:${port}`;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atherix-api-smoke-'));
const dbPath = path.join(tempDir, 'blog.db');
const allowedOrigin = 'https://example.test';
const smokeAdminPassword = 'ApiSmoke#20260608!';
const smokeJwtSecret = 'ApiSmokeJwtSecret_20260608_7c2f9d8b41a6e5c0';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await wait(300);
  }
  throw lastError || new Error('Server did not become ready');
}

async function waitForSeededPosts() {
  const deadline = Date.now() + 10000;
  let lastPosts = [];
  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/api/posts`);
    if (response.ok) {
      lastPosts = await response.json();
      if (Array.isArray(lastPosts) && lastPosts.length >= 1) return lastPosts;
    }
    await wait(250);
  }
  return lastPosts;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectProductionStartupFailure(envOverrides, message) {
  const failPort = port + 1;
  const failDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atherix-api-secret-'));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(failPort),
      DB_PATH: path.join(failDir, 'blog.db'),
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: smokeAdminPassword,
      JWT_SECRET: smokeJwtSecret,
      ...envOverrides
    },
    windowsHide: true,
    stdio: 'ignore'
  });

  try {
    const exitCode = await new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 10000);
      child.on('exit', code => {
        clearTimeout(timer);
        resolve(code);
      });
    });
    assert(exitCode !== null, `${message} should exit`);
    assert(exitCode !== 0, `${message} should fail`);
  } finally {
    if (!child.killed) child.kill();
    fs.rmSync(failDir, { recursive: true, force: true });
  }
}

async function assertProductionSecretRequired() {
  await expectProductionStartupFailure({ JWT_SECRET: '' }, 'production server without JWT_SECRET');
  await expectProductionStartupFailure({ JWT_SECRET: 'replace-with-a-long-random-secret' }, 'production server with placeholder JWT_SECRET');
  await expectProductionStartupFailure({ ADMIN_PASSWORD: 'replace-with-a-strong-password' }, 'production server with placeholder ADMIN_PASSWORD');
}

async function run() {
  await assertProductionSecretRequired();
  const staticUploadTestFiles = [];

  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      DB_PATH: dbPath,
      JWT_SECRET: smokeJwtSecret,
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: smokeAdminPassword,
      ALLOWED_ORIGINS: allowedOrigin
    },
    windowsHide: true,
    stdio: 'ignore'
  });

  try {
    await waitForServer();

    const health = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: allowedOrigin }
    });
    assert(health.status === 200, 'health endpoint should return 200');
    const healthBody = await health.json();
    assert(healthBody.ok === true, 'health body should report ok=true');
    assert(health.headers.get('x-content-type-options') === 'nosniff', 'nosniff header missing');
    assert(health.headers.get('x-frame-options') === 'SAMEORIGIN', 'x-frame-options header missing');
    assert(health.headers.get('cross-origin-opener-policy') === 'same-origin', 'COOP header missing');
    assert(health.headers.get('origin-agent-cluster') === '?1', 'origin isolation header missing');
    assert(health.headers.get('x-dns-prefetch-control') === 'off', 'DNS prefetch control header missing');
    assert(health.headers.get('x-permitted-cross-domain-policies') === 'none', 'cross-domain policy header missing');
    assert(health.headers.get('x-download-options') === 'noopen', 'download noopen header missing');
    assert(health.headers.get('x-xss-protection') === '0', 'legacy XSS auditor should be disabled');
    assert(health.headers.get('vary')?.toLowerCase().includes('origin'), 'CORS responses should vary by Origin');
    const permissionsPolicy = health.headers.get('permissions-policy') || '';
    assert(permissionsPolicy.includes('camera=()') && permissionsPolicy.includes('microphone=()') && permissionsPolicy.includes('geolocation=()'), 'Permissions-Policy should block sensitive sensors');
    assert(permissionsPolicy.includes('payment=()') && permissionsPolicy.includes('usb=()') && permissionsPolicy.includes('fullscreen=(self)') && permissionsPolicy.includes('web-share=(self)'), 'Permissions-Policy should define high-risk browser features');
    const cspHeader = health.headers.get('content-security-policy') || '';
    assert(cspHeader.includes("object-src 'none'"), 'CSP object-src guard missing');
    assert(cspHeader.includes("img-src 'self' data: blob:"), 'CSP should keep images local except data/blob previews');
    assert(!/img-src[^;]*https:/i.test(cspHeader), 'CSP should not allow arbitrary remote image tracking pixels');
    assert(cspHeader.includes('https://fonts.googleapis.com'), 'CSP should allow configured web font stylesheet');
    assert(cspHeader.includes('https://fonts.gstatic.com'), 'CSP should allow configured web font files');
    assert(health.headers.get('strict-transport-security')?.includes('max-age=31536000'), 'HSTS header missing in production');
    assert(health.headers.get('access-control-allow-origin') === allowedOrigin, 'allowed CORS origin not echoed');
    assert(health.headers.get('cache-control') === 'no-store', 'API responses should not be cached');

    const blockedCors = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://evil.example' }
    });
    assert(blockedCors.status === 200, 'blocked-origin non-browser request should still reach health');
    assert(!blockedCors.headers.get('access-control-allow-origin'), 'disallowed origin should not receive CORS allow header');

    const serviceWorkerScript = await fetch(`${baseUrl}/sw.js`);
    assert(serviceWorkerScript.status === 200, 'service worker should be publicly served');
    assert((serviceWorkerScript.headers.get('content-type') || '').includes('javascript'), 'service worker should be served as javascript');
    assert(serviceWorkerScript.headers.get('service-worker-allowed') === '/', 'service worker should explicitly scope to the site root');
    const serviceWorkerText = await serviceWorkerScript.text();
    assert(serviceWorkerText.includes('/feed.xml') && serviceWorkerText.includes('/sitemap.xml'), 'service worker should precache discovery metadata');
    assert(serviceWorkerText.includes('/assets/atherix-og-card.png') && serviceWorkerText.includes('/assets/atherix-icon-512.png'), 'service worker should precache branded PWA assets');
    assert(serviceWorkerText.includes('/assets/atherix-profile-avatar.png') && serviceWorkerText.includes('/assets/project-bento-dashboard.webp') && serviceWorkerText.includes('/assets/project-arcade-suite.webp'), 'service worker should precache local profile and portfolio visual assets');
    assert(serviceWorkerText.includes('atherix-static-v52-quality'), 'service worker should use the latest quality cache version');
    assert(serviceWorkerText.includes('NAVIGATION_FALLBACK_URL') && serviceWorkerText.includes('navigationPreload') && serviceWorkerText.includes('X-Atherix-Offline-Shell'), 'service worker should provide a navigation-preload offline app shell');
    assert(serviceWorkerText.includes('/style.css?v=20260608-quality-v7') && serviceWorkerText.includes('/app.js?v=20260608-quality-v11'), 'service worker should precache the latest versioned app assets');
    assert(serviceWorkerText.includes('networkFirstCacheFallback') && serviceWorkerText.includes('staleWhileRevalidate') && serviceWorkerText.includes('offlineResponseFor') && serviceWorkerText.includes('cacheResponseQuietly'), 'service worker should use explicit offline-safe caching strategies');
    assert(serviceWorkerText.includes('DISCOVERY_ASSET_PATHS') && serviceWorkerText.includes('/feed.xml') && serviceWorkerText.includes('/sitemap.xml') && serviceWorkerText.includes('/robots.txt'), 'service worker should keep discovery metadata network-first before cache fallback');
    assert(serviceWorkerText.includes('X-Atherix-Offline-Asset') && serviceWorkerText.includes('status: 204'), 'service worker should provide a quiet offline image placeholder');

    const indexHtml = await fetch(`${baseUrl}/`);
    const indexText = await indexHtml.text();
    assert(indexText.includes('rel="canonical" href="https://dadaguai6686.github.io/"'), 'index should expose an absolute canonical URL');
    assert(indexText.includes('type="application/rss+xml"'), 'index should link the RSS feed');
    assert(indexText.includes('href="/style.css') && indexText.includes('src="/app.js') && indexText.includes('src="/lucide.min.js"'), 'local app assets should use root-absolute URLs for deep links');
    assert(indexText.includes('href="/style.css?v=20260608-quality-v7"') && indexText.includes('src="/app.js?v=20260608-quality-v11"'), 'index should reference the latest versioned app assets');
    assert(indexText.includes('rel="preload" href="/style.css?v=20260608-quality-v7" as="style"') && indexText.includes('rel="preload" href="/app.js?v=20260608-quality-v11" as="script"') && indexText.includes('rel="preload" href="/lucide.min.js" as="script"'), 'index should preload critical local app assets');
    assert(indexText.includes('Atherix 高级街机') && indexText.includes('Premium Arcade Suite') && indexText.includes('高级街机生涯实验室'), 'index shell should present the premium arcade suite before runtime hydration');
    assert(indexText.includes('主线跑酷') && indexText.includes('霓虹漂移') && indexText.includes('裂隙战术') && indexText.includes('战术芯片'), 'index shell should advertise the full seven-line arcade career');
    assert(indexText.includes('<strong>29</strong>成就'), 'index shell should expose the current arcade achievement count');
    assert(indexText.includes('arcade-shell-mode-card') && indexText.includes('Cyber Astro-Runner') && indexText.includes('Rift Tactics'), 'index shell should include premium arcade mode cards');
    assert(!indexText.includes('四个完整街机模式') && !indexText.includes('像素复古街机') && !indexText.includes('经典横版马里奥式'), 'index shell should not regress to the stale prototype arcade copy');
    assert(!indexText.includes('data-mini-game=') && !indexText.includes('id="snake-canvas"') && !indexText.includes('id="breakout-canvas"') && !indexText.includes('id="tile-board"') && !indexText.includes('id="memory-board"'), 'index shell should not ship the old four-mode prototype DOM');
    assert(!indexText.includes('images.unsplash.com'), 'index shell should not depend on Unsplash for default visual assets');
    assert(indexText.includes('id="admin-username"') && indexText.includes('autocomplete="username"') && indexText.includes('id="admin-password"') && indexText.includes('autocomplete="current-password"'), 'admin login inputs should include autocomplete hints');
    assert(indexText.includes('src="/assets/atherix-profile-avatar.png"') && indexText.includes('id="profile-avatar" loading="eager" decoding="async" fetchpriority="high"') && indexText.includes('id="modal-project-img" src="" alt="Project Banner" loading="lazy" decoding="async"'), 'key images should use local assets and expose loading hints');
    assert(indexText.includes('property="og:image" content="https://dadaguai6686.github.io/assets/atherix-og-card.png"'), 'index should expose the local branded Open Graph image');
    assert(indexText.includes('name="twitter:image" content="https://dadaguai6686.github.io/assets/atherix-og-card.png"'), 'index should expose the local Twitter card image');
    assert(indexText.includes('rel="apple-touch-icon" href="/assets/atherix-icon-192.png"'), 'index should expose an Apple touch icon');

    const spaRoute = await fetch(`${baseUrl}/blog/deep-link`);
    const spaRouteText = await spaRoute.text();
    assert(spaRoute.status === 200 && spaRouteText.includes('id="main-content"'), 'SPA fallback should serve index.html for client routes');
    assert(spaRouteText.includes('href="/style.css') && spaRouteText.includes('src="/app.js'), 'SPA fallback should preserve root-absolute app assets');

    const unknownApi = await fetch(`${baseUrl}/api/does-not-exist`);
    const unknownApiBody = await unknownApi.json();
    assert(unknownApi.status === 404 && unknownApiBody.error === 'API endpoint not found.', 'unknown API routes should return a JSON 404');
    assert(unknownApi.headers.get('x-robots-tag')?.includes('noindex'), 'API routes should not be indexed');
    assert(unknownApi.headers.get('cache-control') === 'no-store', 'unknown API routes should not be cached');

    const malformedJson = await fetch(`${baseUrl}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"nickname":'
    });
    const malformedJsonBody = await malformedJson.json();
    assert(malformedJson.status === 400 && /Malformed JSON/.test(malformedJsonBody.error), 'malformed JSON should return a JSON 400');

    const manifest = await fetch(`${baseUrl}/manifest.webmanifest`);
    const manifestBody = await manifest.json();
    assert(manifest.status === 200, 'manifest should be publicly served');
    assert(manifestBody.id === '/' && manifestBody.lang === 'zh-CN', 'manifest should include a stable id and language');
    assert(manifestBody.icons?.some(icon => icon.src === '/assets/atherix-icon-192.png' && icon.purpose.includes('maskable')), 'manifest should include a maskable 192px PNG icon');
    assert(manifestBody.icons?.some(icon => icon.src === '/assets/atherix-icon-512.png' && icon.purpose.includes('maskable')), 'manifest should include a maskable 512px PNG icon');
    assert(Array.isArray(manifestBody.shortcuts) && manifestBody.shortcuts.length >= 3, 'manifest should expose PWA shortcuts');
    assert(manifestBody.screenshots?.some(shot => shot.src === '/assets/atherix-og-card.png' && shot.sizes === '1200x630'), 'manifest should include the branded wide screenshot');

    const ogImage = await fetch(`${baseUrl}/assets/atherix-og-card.png`);
    assert(ogImage.status === 200 && (ogImage.headers.get('content-type') || '').includes('image/png'), 'branded Open Graph image should be publicly served as PNG');
    assert(Number(ogImage.headers.get('content-length') || 0) > 10000, 'branded Open Graph image should not be empty');

    const postList = await waitForSeededPosts();
    assert(Array.isArray(postList) && postList.length >= 1, 'seeded posts should be available');

    const projectList = await fetch(`${baseUrl}/api/projects`);
    const projectRows = await projectList.json();
    assert(projectList.status === 200 && Array.isArray(projectRows) && projectRows.length >= 4, 'seeded projects should expose the expanded portfolio set');
    assert(projectRows.every(project => String(project.img || '').startsWith('/assets/')) && projectRows.every(project => !/images\.unsplash/i.test(String(project.img || ''))), 'seeded projects should use local asset banner images');
    assert(projectRows.some(project => project.id === 'proj-4' && /Arcade Suite/.test(project.title || '')), 'seeded projects should include the premium arcade suite case study');

    const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
    const sitemapText = await sitemap.text();
    assert(sitemap.status === 200 && sitemapText.includes('<loc>https://dadaguai6686.github.io/</loc>'), 'sitemap should expose an absolute public URL');
    assert(sitemapText.includes('<loc>https://dadaguai6686.github.io/?post=post-1</loc>'), 'sitemap should expose article discovery URLs');
    assert(sitemap.headers.get('cache-control')?.includes('max-age=300'), 'dynamic sitemap should have a short public cache window');

    const robots = await fetch(`${baseUrl}/robots.txt`);
    const robotsText = await robots.text();
    assert(robots.status === 200 && robotsText.includes('Sitemap: https://dadaguai6686.github.io/sitemap.xml'), 'robots.txt should point at the absolute sitemap URL');

    const feed = await fetch(`${baseUrl}/feed.xml`);
    const feedText = await feed.text();
    assert(feed.status === 200 && feedText.includes('<rss version="2.0"') && feedText.includes('<link>https://dadaguai6686.github.io/?post=post-1</link>'), 'RSS feed should be publicly served with seeded post links');
    assert(feedText.includes('<guid isPermaLink="true">https://dadaguai6686.github.io/?post=post-1</guid>'), 'RSS feed should use permalink article GUIDs');
    assert(feedText.includes('<url>https://dadaguai6686.github.io/assets/atherix-og-card.png</url>'), 'RSS feed should expose the branded channel image');
    assert(feed.headers.get('cache-control')?.includes('max-age=300'), 'dynamic RSS feed should have a short public cache window');

    const sensitivePaths = [
      '/server.js',
      '/db.js',
      '/auth.js',
      '/package.json',
      '/package-lock.json',
      '/scripts/api-smoke-test.cjs',
      '/Dockerfile',
      '/.env',
      '/.git/config',
      '/.github/workflows/ci.yml',
      '/node_modules/sqlite3/package.json',
      '/data/blog.db',
      '/README.md',
      '/SECURITY.md',
      '/uploads/%2e%2e/server.js',
      '/assets/%2e%2e/server.js',
      '/uploads/.hidden.png',
      '/assets/.hidden.svg'
    ];
    const sensitiveResults = {};
    for (const pathname of sensitivePaths) {
      const response = await fetch(`${baseUrl}${pathname}`);
      sensitiveResults[pathname] = response.status;
      assert(response.status === 404, `${pathname} should not be publicly served`);
    }

    const missingToken = await fetch(`${baseUrl}/api/auth/verify`);
    assert(missingToken.status === 401, 'auth verify without token should return 401');

    const longUsernameLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'a'.repeat(81), password: smokeAdminPassword })
    });
    assert(longUsernameLogin.status === 400, 'overlong login username should be rejected before database lookup');

    const longPasswordLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'P'.repeat(257) })
    });
    assert(longPasswordLogin.status === 400, 'overlong login password should be rejected before bcrypt comparison');

    const badComment = await fetch(`${baseUrl}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: '', content: '' })
    });
    assert(badComment.status === 400, 'invalid comment should return 400');
    assert(badComment.headers.get('ratelimit-limit') === '30', 'write rate-limit header missing');

    const badWebsite = await fetch(`${baseUrl}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'Link Test', content: 'bad link', website: 'javascript:alert(1)' })
    });
    assert(badWebsite.status === 400, 'javascript: website should be rejected');

    const spamTrap = await fetch(`${baseUrl}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'Bot', content: 'looks normal', company: 'filled by bot' })
    });
    assert(spamTrap.status === 400, 'comment honeypot should reject bot-like submissions');

    const linkSpam = await fetch(`${baseUrl}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'Link Bot', content: 'https://a.test https://b.test https://c.test https://d.test' })
    });
    assert(linkSpam.status === 400, 'link-heavy comments should be rejected');

    const sanitizedComment = await fetch(`${baseUrl}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'Clean User', content: 'hello', website: 'https://example.com/profile', avatar: '<svg>' })
    });
    assert(sanitizedComment.status === 200, 'valid comment should be accepted');
    const sanitizedBody = await sanitizedComment.json();
    assert(sanitizedBody.comment.avatar === '👤', 'unsupported avatar should be normalized');
    assert(sanitizedBody.comment.website === 'https://example.com/profile', 'https website should be preserved');

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: smokeAdminPassword })
    });
    assert(login.status === 200, 'admin login should succeed in smoke test');
    const loginBody = await login.json();
    assert(typeof loginBody.token === 'string' && loginBody.token.length > 20, 'login should return a JWT');

    const smokePostId = `smoke-${Date.now()}`;
    const createdPost = await fetch(`${baseUrl}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginBody.token}`
      },
      body: JSON.stringify({
        id: smokePostId,
        title: 'Smoke Test Draft',
        excerpt: 'short draft',
        content: '# Smoke Test Draft\n\nTemporary test content.',
        tag: '测试',
        readTime: '1 分钟阅读'
      })
    });
    assert(createdPost.status === 200, 'admin post creation should succeed');
    assert(createdPost.headers.get('ratelimit-limit') === '30', 'admin post creation should be write rate-limited');
    const createdPostBody = await createdPost.json();
    assert(createdPostBody.postId === smokePostId, 'created smoke post id should be returned');

    const createdPostList = await fetch(`${baseUrl}/api/posts`);
    const createdPostRows = await createdPostList.json();
    const createdSmokePost = createdPostRows.find(post => post.id === smokePostId);
    assert(createdSmokePost?.date, 'created smoke post should receive a date');
    const discoveryCreatedFeed = await fetch(`${baseUrl}/feed.xml`);
    const discoveryCreatedFeedText = await discoveryCreatedFeed.text();
    const discoveryCreatedSitemap = await fetch(`${baseUrl}/sitemap.xml`);
    const discoveryCreatedSitemapText = await discoveryCreatedSitemap.text();
    assert(discoveryCreatedFeedText.includes(`<link>https://dadaguai6686.github.io/?post=${smokePostId}</link>`) && discoveryCreatedFeedText.includes('<title>Smoke Test Draft</title>'), 'dynamic RSS feed should include newly created admin posts');
    assert(discoveryCreatedSitemapText.includes(`<loc>https://dadaguai6686.github.io/?post=${smokePostId}</loc>`), 'dynamic sitemap should include newly created admin posts');

    const updatedPostWithoutDate = await fetch(`${baseUrl}/api/posts/${encodeURIComponent(smokePostId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginBody.token}`
      },
      body: JSON.stringify({
        title: 'Smoke Test Draft Updated',
        excerpt: 'updated draft',
        content: '# Smoke Test Draft Updated\n\nTemporary updated test content.',
        tag: '测试',
        readTime: '2 分钟阅读',
        pinned: false
      })
    });
    assert(updatedPostWithoutDate.status === 200, 'admin post update without date should succeed');
    const updatedPostList = await fetch(`${baseUrl}/api/posts`);
    const updatedPostRows = await updatedPostList.json();
    const updatedSmokePost = updatedPostRows.find(post => post.id === smokePostId);
    assert(updatedSmokePost?.date === createdSmokePost.date, 'admin post update without date should preserve the original date');
    const discoveryUpdatedFeed = await fetch(`${baseUrl}/feed.xml`);
    const discoveryUpdatedFeedText = await discoveryUpdatedFeed.text();
    const discoveryUpdatedSitemap = await fetch(`${baseUrl}/sitemap.xml`);
    const discoveryUpdatedSitemapText = await discoveryUpdatedSitemap.text();
    assert(discoveryUpdatedFeedText.includes('<title>Smoke Test Draft Updated</title>') && discoveryUpdatedFeedText.includes('<description>updated draft</description>'), 'dynamic RSS feed should reflect updated post titles and excerpts');
    assert(discoveryUpdatedSitemapText.includes(`<loc>https://dadaguai6686.github.io/?post=${smokePostId}</loc>`) && discoveryUpdatedSitemapText.includes(`<lastmod>${createdSmokePost.date}</lastmod>`), 'dynamic sitemap should preserve the article URL and original lastmod after date-less edits');

    const deletedPost = await fetch(`${baseUrl}/api/posts/${encodeURIComponent(smokePostId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${loginBody.token}` }
    });
    assert(deletedPost.status === 200, 'admin post deletion should succeed');
    assert(deletedPost.headers.get('ratelimit-limit') === '30', 'admin post deletion should be write rate-limited');
    const discoveryDeletedFeed = await fetch(`${baseUrl}/feed.xml`);
    const discoveryDeletedFeedText = await discoveryDeletedFeed.text();
    const discoveryDeletedSitemap = await fetch(`${baseUrl}/sitemap.xml`);
    const discoveryDeletedSitemapText = await discoveryDeletedSitemap.text();
    assert(!discoveryDeletedFeedText.includes(smokePostId) && !discoveryDeletedSitemapText.includes(smokePostId), 'dynamic discovery metadata should remove deleted posts');

    const projectHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginBody.token}`
    };
    const unsafeProjectPath = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: projectHeaders,
      body: JSON.stringify({
        id: `smoke-unsafe-path-${Date.now()}`,
        title: 'Unsafe Upload Path',
        img: '/uploads/../assets/atherix-og-card.png'
      })
    });
    assert(unsafeProjectPath.status === 400, 'project images should reject upload path traversal');

    const unsafeProjectEncodedPath = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: projectHeaders,
      body: JSON.stringify({
        id: `smoke-unsafe-encoded-${Date.now()}`,
        title: 'Unsafe Encoded Upload Path',
        img: '/uploads/%2e%2e/assets/atherix-og-card.png'
      })
    });
    assert(unsafeProjectEncodedPath.status === 400, 'project images should reject encoded upload path traversal');

    const unsafeProjectAssetPath = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: projectHeaders,
      body: JSON.stringify({
        id: `smoke-unsafe-asset-${Date.now()}`,
        title: 'Unsafe Asset Path',
        img: '/assets/../server.js'
      })
    });
    assert(unsafeProjectAssetPath.status === 400, 'project images should reject asset path traversal');

    const unsafeProjectEncodedAssetPath = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: projectHeaders,
      body: JSON.stringify({
        id: `smoke-unsafe-asset-encoded-${Date.now()}`,
        title: 'Unsafe Encoded Asset Path',
        img: '/assets/%2e%2e/server.js'
      })
    });
    assert(unsafeProjectEncodedAssetPath.status === 400, 'project images should reject encoded asset path traversal');

    const remoteProjectImage = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: projectHeaders,
      body: JSON.stringify({
        id: `smoke-remote-img-${Date.now()}`,
        title: 'Remote Tracking Image',
        img: 'https://example.com/project-tracker.png'
      })
    });
    assert(remoteProjectImage.status === 400, 'project images should reject remote image URLs');

    const smokeProjectId = `smoke-project-${Date.now()}`;
    const createdProject = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: projectHeaders,
      body: JSON.stringify({
        id: smokeProjectId,
        title: 'Smoke Test Project',
        desc: 'temporary project',
        img: '/uploads/safe-image.png',
        tags: ['测试', '安全']
      })
    });
    assert(createdProject.status === 200, 'safe local upload project image should be accepted');

    const smokeAssetProjectId = `smoke-asset-project-${Date.now()}`;
    const createdAssetProject = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: projectHeaders,
      body: JSON.stringify({
        id: smokeAssetProjectId,
        title: 'Smoke Test Local Asset Project',
        desc: 'temporary asset project',
        img: '/assets/project-bento-dashboard.webp',
        tags: ['测试', '本地资源']
      })
    });
    assert(createdAssetProject.status === 200, 'safe local asset project image should be accepted');

    const deletedProject = await fetch(`${baseUrl}/api/projects/${encodeURIComponent(smokeProjectId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${loginBody.token}` }
    });
    assert(deletedProject.status === 200, 'admin project deletion should succeed');

    const deletedAssetProject = await fetch(`${baseUrl}/api/projects/${encodeURIComponent(smokeAssetProjectId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${loginBody.token}` }
    });
    assert(deletedAssetProject.status === 200, 'admin local asset project deletion should succeed');

    const uploadDir = path.resolve(__dirname, '..', 'uploads');
    const beforeUploads = new Set(fs.readdirSync(uploadDir));
    const staticValidUploadName = `smoke-static-${Date.now()}.png`;
    const staticForgedUploadName = `smoke-static-${Date.now()}-forged.png`;
    const staticTextUploadName = `smoke-static-${Date.now()}.txt`;
    const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64');
    fs.writeFileSync(path.join(uploadDir, staticValidUploadName), tinyPng);
    fs.writeFileSync(path.join(uploadDir, staticForgedUploadName), Buffer.from('not really a png'));
    fs.writeFileSync(path.join(uploadDir, staticTextUploadName), Buffer.from('not an upload image'));
    staticUploadTestFiles.push(staticValidUploadName, staticForgedUploadName, staticTextUploadName);
    const staticValidUpload = await fetch(`${baseUrl}/uploads/${staticValidUploadName}`);
    assert(staticValidUpload.status === 200 && (staticValidUpload.headers.get('content-type') || '').includes('image/png'), 'valid static upload image should be served');
    const staticForgedUpload = await fetch(`${baseUrl}/uploads/${staticForgedUploadName}`);
    assert(staticForgedUpload.status === 404, 'forged static upload image should not be publicly served');
    const staticTextUpload = await fetch(`${baseUrl}/uploads/${staticTextUploadName}`);
    assert(staticTextUpload.status === 404, 'non-image files in uploads should not be publicly served');

    const fakeImageForm = new FormData();
    fakeImageForm.append('image', new Blob([Buffer.from('not really a png')], { type: 'image/png' }), 'fake.png');
    const fakeImageUpload = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginBody.token}` },
      body: fakeImageForm
    });
    assert(fakeImageUpload.status === 400, 'forged image upload should be rejected');
    const afterUploads = fs.readdirSync(uploadDir).filter(name => !beforeUploads.has(name) && !staticUploadTestFiles.includes(name));
    assert(afterUploads.length === 0, 'rejected forged upload should be removed from uploads directory');

    return {
      ok: true,
      port,
      dbCreated: fs.existsSync(dbPath),
      posts: postList.length,
      corsAllowed: health.headers.get('access-control-allow-origin'),
      corsBlockedHeader: blockedCors.headers.get('access-control-allow-origin') || null,
      serviceWorkerStatus: serviceWorkerScript.status,
      manifestIcons: manifestBody.icons.length,
      ogImageBytes: Number(ogImage.headers.get('content-length') || 0),
      sitemapStatus: sitemap.status,
      feedStatus: feed.status,
      discoveryCreatedInFeed: discoveryCreatedFeedText.includes(smokePostId),
      discoveryDeletedFromFeed: !discoveryDeletedFeedText.includes(smokePostId),
      unknownApiStatus: unknownApi.status,
      malformedJsonStatus: malformedJson.status,
      longUsernameLoginStatus: longUsernameLogin.status,
      longPasswordLoginStatus: longPasswordLogin.status,
      seededProjectCount: projectRows.length,
      apiCacheControl: health.headers.get('cache-control'),
      cspImagesLocalOnly: cspHeader.includes("img-src 'self' data: blob:") && !/img-src[^;]*https:/i.test(cspHeader),
      sensitiveResults,
      sanitizedAvatar: sanitizedBody.comment.avatar,
      spamTrapStatus: spamTrap.status,
      linkSpamStatus: linkSpam.status,
      adminWriteLimit: createdPost.headers.get('ratelimit-limit'),
      preservedPostDate: updatedSmokePost?.date || '',
      unsafeUploadPathStatus: unsafeProjectPath.status,
      unsafeEncodedUploadPathStatus: unsafeProjectEncodedPath.status,
      unsafeAssetPathStatus: unsafeProjectAssetPath.status,
      unsafeEncodedAssetPathStatus: unsafeProjectEncodedAssetPath.status,
      remoteProjectImageStatus: remoteProjectImage.status,
      safeUploadPathProjectStatus: createdProject.status,
      safeAssetPathProjectStatus: createdAssetProject.status,
      staticValidUploadStatus: staticValidUpload.status,
      staticForgedUploadStatus: staticForgedUpload.status,
      staticTextUploadStatus: staticTextUpload.status,
      forgedUploadStatus: fakeImageUpload.status
    };
  } finally {
    child.kill();
    await wait(300);
    for (const fileName of staticUploadTestFiles) {
      fs.rmSync(path.resolve(__dirname, '..', 'uploads', fileName), { force: true });
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

run().then(result => {
  console.log(JSON.stringify(result, null, 2));
}).catch(error => {
  console.error(JSON.stringify({ ok: false, message: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});
