const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const jwt = require('jsonwebtoken');
const net = require('net');
const os = require('os');
const path = require('path');

const requestedPort = Number(process.env.API_SMOKE_PORT || 0);
let port = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 0;
let baseUrl = '';
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atherix-api-smoke-'));
const dbPath = path.join(tempDir, 'blog.db');
const allowedOrigin = 'https://example.test';
const smokeAdminPassword = 'ApiSmoke#20260608!';
const smokeJwtSecret = 'ApiSmokeJwtSecret_20260608_7c2f9d8b41a6e5c0';
const traceEnabled = process.env.SMOKE_TRACE === '1';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function trace(label) {
  if (traceEnabled) console.error(`[api-smoke] ${label}`);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const freePort = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(freePort));
    });
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function collectChildOutput(child) {
  let output = '';
  const append = (chunk) => {
    output += chunk.toString();
    if (output.length > 4000) output = output.slice(-4000);
  };
  child.stdout?.on('data', append);
  child.stderr?.on('data', append);
  return () => output.trim();
}

function rawHttpGet(pathname, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${baseUrl}${pathname}`, { headers }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks)
        });
      });
    });
    req.setTimeout(5000, () => {
      req.destroy(new Error(`Timed out fetching ${pathname}`));
    });
    req.on('error', reject);
  });
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/health`);
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

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode) return;
  const exited = new Promise(resolve => child.once('exit', () => resolve(true)));
  child.kill();
  const graceful = await Promise.race([exited, wait(2500).then(() => false)]);
  if (graceful) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGKILL');
  }
  await Promise.race([exited, wait(1500)]);
}

async function expectProductionStartupFailure(envOverrides, message) {
  const failPort = await getFreePort();
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
    await stopChild(child);
    fs.rmSync(failDir, { recursive: true, force: true });
  }
}

async function assertProductionSecretRequired() {
  await expectProductionStartupFailure({ JWT_SECRET: '' }, 'production server without JWT_SECRET');
  await expectProductionStartupFailure({ JWT_SECRET: 'replace-with-a-long-random-secret' }, 'production server with placeholder JWT_SECRET');
  await expectProductionStartupFailure({ ADMIN_PASSWORD: 'replace-with-a-strong-password' }, 'production server with placeholder ADMIN_PASSWORD');
}

async function assertUnhealthyDatabaseReports503() {
  const failPort = await getFreePort();
  const failDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atherix-api-bad-db-'));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(failPort),
      DB_PATH: failDir,
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: smokeAdminPassword,
      JWT_SECRET: smokeJwtSecret
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const getOutput = collectChildOutput(child);
  let childExit = null;
  child.on('exit', (code, signal) => {
    childExit = { code, signal };
  });

  try {
    const deadline = Date.now() + 20000;
    let lastBody = null;
    let lastError = null;
    while (Date.now() < deadline) {
      if (childExit) {
        throw new Error(`unhealthy database server exited before healthcheck: ${JSON.stringify(childExit)}; output=${getOutput()}`);
      }
      try {
        const response = await fetchWithTimeout(`http://127.0.0.1:${failPort}/api/health`);
        lastBody = await response.json().catch(() => null);
        if (response.status === 503) {
          assert(lastBody?.ok === false && lastBody?.database?.ready === false, `unhealthy database health body should expose not-ready status: ${JSON.stringify(lastBody)}`);
          return;
        }
      } catch (error) {
        lastError = error;
        // Server may still be booting.
      }
      await wait(300);
    }
    throw new Error(`unhealthy database healthcheck did not return 503: ${JSON.stringify(lastBody)}; lastError=${lastError?.message || ''}; output=${getOutput()}`);
  } finally {
    await stopChild(child);
    fs.rmSync(failDir, { recursive: true, force: true });
  }
}

async function run() {
  if (!port) port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  trace('secret checks');
  await assertProductionSecretRequired();
  trace('bad database healthcheck');
  await assertUnhealthyDatabaseReports503();
  const staticUploadTestFiles = [];

  trace('spawn main server');
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
    trace('wait for main server');
    await waitForServer();

    trace('health and headers');
    const health = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: allowedOrigin }
    });
    assert(health.status === 200, 'health endpoint should return 200');
    const healthBody = await health.json();
    assert(healthBody.ok === true, 'health body should report ok=true');
    assert(healthBody.database?.connected === true && healthBody.database?.ready === true && healthBody.database?.lastCheckedAt, `health body should expose live SQLite readiness: ${JSON.stringify(healthBody)}`);
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
    assert(!cspHeader.includes('fonts.googleapis.com') && !cspHeader.includes('fonts.gstatic.com'), 'CSP should not allow remote font providers after bundling local fonts');
    assert(cspHeader.includes("font-src 'self' data:"), 'CSP should keep web fonts local-only');
    assert(health.headers.get('strict-transport-security')?.includes('max-age=31536000'), 'HSTS header missing in production');
    assert(health.headers.get('access-control-allow-origin') === allowedOrigin, 'allowed CORS origin not echoed');
    assert(health.headers.get('cache-control') === 'no-store', 'API responses should not be cached');

    trace('static shell and discovery');
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
    assert(serviceWorkerText.includes('atherix-static-v76-quality'), 'service worker should use the latest quality cache version');
    assert(serviceWorkerText.includes('APP_SHELL_ASSETS') && serviceWorkerText.includes('OPTIONAL_STATIC_ASSETS') && serviceWorkerText.includes('Promise.allSettled'), 'service worker install should keep optional assets from breaking the critical app shell cache');
    assert(serviceWorkerText.includes('canRefreshNavigationShell') && serviceWorkerText.includes('!url.search'), 'service worker should avoid caching article deep-link responses as the generic app shell');
    assert(serviceWorkerText.includes('NAVIGATION_FALLBACK_URL') && serviceWorkerText.includes('navigationPreload') && serviceWorkerText.includes('X-Atherix-Offline-Shell'), 'service worker should provide a navigation-preload offline app shell');
    assert(serviceWorkerText.includes('/style.css?v=20260608-quality-v13') && serviceWorkerText.includes('/app.js?v=20260608-quality-v33'), 'service worker should precache the latest versioned app assets');
    assert(serviceWorkerText.includes('/assets/fonts/plus-jakarta-sans-latin-wght-normal.woff2') && serviceWorkerText.includes('/assets/fonts/outfit-latin-wght-normal.woff2') && serviceWorkerText.includes('/assets/fonts/jetbrains-mono-latin-wght-normal.woff2'), 'service worker should precache bundled local font assets');
    assert(serviceWorkerText.includes('networkFirstCacheFallback') && serviceWorkerText.includes('staleWhileRevalidate') && serviceWorkerText.includes('offlineResponseFor') && serviceWorkerText.includes('cacheResponseQuietly'), 'service worker should use explicit offline-safe caching strategies');
    assert(serviceWorkerText.includes('DISCOVERY_ASSET_PATHS') && serviceWorkerText.includes('/feed.xml') && serviceWorkerText.includes('/sitemap.xml') && serviceWorkerText.includes('/robots.txt'), 'service worker should keep discovery metadata network-first before cache fallback');
    assert(serviceWorkerText.includes('X-Atherix-Offline-Asset') && serviceWorkerText.includes('status: 204'), 'service worker should provide a quiet offline image placeholder');

    const indexHtml = await fetch(`${baseUrl}/`);
    const indexText = await indexHtml.text();
    assert(indexText.includes('rel="canonical" href="https://dadaguai6686.github.io/"'), 'index should expose an absolute canonical URL');
    assert(indexText.includes('type="application/rss+xml"'), 'index should link the RSS feed');
    assert(indexText.includes('href="/style.css') && indexText.includes('src="/app.js') && indexText.includes('src="/lucide.min.js"'), 'local app assets should use root-absolute URLs for deep links');
    assert(indexText.includes('href="/style.css?v=20260608-quality-v13"') && indexText.includes('src="/app.js?v=20260608-quality-v33"'), 'index should reference the latest versioned app assets');
    assert(indexText.includes('rel="preload" href="/style.css?v=20260608-quality-v13" as="style"') && indexText.includes('rel="preload" href="/app.js?v=20260608-quality-v33" as="script"') && indexText.includes('rel="preload" href="/lucide.min.js" as="script"'), 'index should preload critical local app assets');
    assert(indexText.includes('href="/assets/fonts/plus-jakarta-sans-latin-wght-normal.woff2" as="font"') && indexText.includes('href="/assets/fonts/outfit-latin-wght-normal.woff2" as="font"') && indexText.includes('href="/assets/fonts/jetbrains-mono-latin-wght-normal.woff2" as="font"'), 'index should preload bundled local font assets');
    assert(indexText.includes('Atherix 高级街机') && indexText.includes('Premium Arcade Suite') && indexText.includes('高级街机生涯实验室'), 'index shell should present the premium arcade suite before runtime hydration');
    assert(indexText.includes('主线跑酷') && indexText.includes('霓虹漂移') && indexText.includes('裂隙战术') && indexText.includes('战术芯片'), 'index shell should advertise the full seven-line arcade career');
    assert(indexText.includes('<strong>29</strong>成就'), 'index shell should expose the current arcade achievement count');
    assert(indexText.includes('arcade-shell-mode-card') && indexText.includes('Cyber Astro-Runner') && indexText.includes('Rift Tactics'), 'index shell should include premium arcade mode cards');
    assert(indexText.includes('class="nav-item active" data-target="home" aria-label="打开首页"') && indexText.includes('data-target="game" aria-label="打开街机游戏"') && indexText.includes('data-target="guestbook" aria-label="打开留言"'), 'mobile nav buttons should keep explicit accessible labels when text is hidden');
    assert(indexText.includes('type="search" class="blog-search-input" id="blog-search"') && indexText.includes('aria-label="搜索文章标题、简介或内容"') && indexText.includes('autocomplete="off"'), 'blog search should be a labelled search input, not placeholder-only text');
    assert(indexText.includes('class="toolbox-sidebar" role="tablist"') && indexText.includes('class="tool-nav-btn active" id="tool-tab-json"') && indexText.includes('role="tab" aria-selected="true" aria-controls="tool-json"') && indexText.includes('role="tabpanel" aria-labelledby="tool-tab-json"') && indexText.includes('id="tool-vault" role="tabpanel" aria-labelledby="tool-tab-vault" tabindex="0" hidden'), 'toolbox shell should expose tablist/tab/tabpanel semantics before hydration');
    assert(!indexText.includes('四个完整街机模式') && !indexText.includes('像素复古街机') && !indexText.includes('经典横版马里奥式'), 'index shell should not regress to the stale prototype arcade copy');
    assert(!indexText.includes('data-mini-game=') && !indexText.includes('id="snake-canvas"') && !indexText.includes('id="breakout-canvas"') && !indexText.includes('id="tile-board"') && !indexText.includes('id="memory-board"'), 'index shell should not ship the old four-mode prototype DOM');
    assert(!indexText.includes('images.unsplash.com'), 'index shell should not depend on Unsplash for default visual assets');
    assert(indexText.includes('id="admin-username"') && indexText.includes('autocomplete="username"') && indexText.includes('id="admin-password"') && indexText.includes('autocomplete="current-password"'), 'admin login inputs should include autocomplete hints');
    assert(indexText.includes('src="/assets/atherix-profile-avatar.png"') && indexText.includes('id="profile-avatar" loading="eager" decoding="async" fetchpriority="high"') && indexText.includes('id="modal-project-img" src="" alt="Project Banner" loading="lazy" decoding="async"'), 'key images should use local assets and expose loading hints');
    assert(indexText.includes('property="og:image" content="https://dadaguai6686.github.io/assets/atherix-og-card.png"'), 'index should expose the local branded Open Graph image');
    assert(indexText.includes('name="twitter:image" content="https://dadaguai6686.github.io/assets/atherix-og-card.png"'), 'index should expose the local Twitter card image');
    assert(indexText.includes('rel="apple-touch-icon" href="/assets/atherix-icon-192.png"'), 'index should expose an Apple touch icon');
    assert(indexText.includes('data-target="home" aria-label="打开首页" title="首页" aria-current="page"'), 'home navigation should expose aria-current on the static shell');

    const styleSheet = await fetch(`${baseUrl}/style.css?v=20260608-quality-v13`);
    const styleCacheControl = styleSheet.headers.get('cache-control') || '';
    assert(styleCacheControl.includes('max-age=31536000') && styleCacheControl.includes('immutable'), 'versioned stylesheet should use long-lived immutable caching');
    const styleText = await styleSheet.text();
    assert(styleSheet.status === 200 && styleText.includes('@media (prefers-reduced-motion: reduce)') && styleText.includes('animation: none !important') && styleText.includes('scroll-behavior: auto !important'), 'stylesheet should include a global reduced-motion safety net');
    assert(styleText.includes('.tool-nav-btn[aria-selected="true"]') && styleText.includes('.tool-panel[hidden]') && styleText.includes('.tool-nav-btn:focus-visible'), 'stylesheet should style toolbox semantic tab states and keyboard focus');
    assert(styleText.includes('.mini-game-tab[aria-selected="true"]') && styleText.includes('.mini-game-panel[hidden]') && styleText.includes('.mini-game-tab:focus-visible'), 'stylesheet should style premium arcade semantic tab states and keyboard focus');
    assert(styleText.includes("@font-face") && styleText.includes('/assets/fonts/plus-jakarta-sans-latin-wght-normal.woff2') && styleText.includes('/assets/fonts/outfit-latin-wght-normal.woff2') && styleText.includes('/assets/fonts/jetbrains-mono-latin-wght-normal.woff2') && !styleText.includes('fonts.googleapis.com') && !styleText.includes('fonts.gstatic.com'), 'stylesheet should self-host fonts without remote imports');
    const unversionedStyleSheet = await fetch(`${baseUrl}/style.css`);
    assert(unversionedStyleSheet.headers.get('cache-control') === 'no-cache', 'unversioned stylesheet should remain revalidatable');
    const bundledFont = await fetch(`${baseUrl}/assets/fonts/plus-jakarta-sans-latin-wght-normal.woff2`);
    const bundledFontBytes = await bundledFont.arrayBuffer();
    assert(bundledFont.status === 200 && bundledFontBytes.byteLength > 10000, 'bundled local web font should be publicly served');
    const appScript = await fetch(`${baseUrl}/app.js?v=20260608-quality-v33`);
    const appScriptCacheControl = appScript.headers.get('cache-control') || '';
    assert(appScriptCacheControl.includes('max-age=31536000') && appScriptCacheControl.includes('immutable'), 'versioned app script should use long-lived immutable caching');
    const appScriptText = await appScript.text();
    const serverText = fs.readFileSync(path.resolve(__dirname, '..', 'server.js'), 'utf8');
    assert(appScript.status === 200 && appScriptText.includes('AbortController') && appScriptText.includes('apiTimeoutFor') && appScriptText.includes('timeoutMs'), 'frontend API helper should enforce request timeouts so fallback paths can run');
    assert(appScriptText.includes('id="premium-tab-survivor" role="tab"') && appScriptText.includes('role="tabpanel" aria-labelledby="premium-tab-tactics"') && appScriptText.includes('window.__atherixSwitchPremiumGame') && appScriptText.includes('focusPremiumGameTabByOffset'), 'premium arcade tabs should expose semantic tabpanel markup and roving keyboard activation');
    assert(appScriptText.includes('premiumRestartConfirmMs') && appScriptText.includes('CONFIRM RESTART') && appScriptText.includes('restartRequest: () =>'), 'premium arcade realtime restarts should require an explicit confirmation step');
    assert(appScriptText.includes('normalizeCareerState') && appScriptText.includes('normalizeCareerRuns') && appScriptText.includes('persistNormalizedCareer'), 'premium arcade career imports should be normalized before use');
    assert(serverText.includes('loginDummyPasswordHash') && serverText.includes('user?.password || loginDummyPasswordHash') && serverText.includes('!user || !passwordIsValid'), 'login should use a dummy bcrypt hash for missing users to reduce username-enumeration timing leaks');
    const compressedStyleSheet = await rawHttpGet('/style.css?v=20260608-quality-v13', { 'Accept-Encoding': 'gzip' });
    assert(compressedStyleSheet.status === 200 && compressedStyleSheet.headers['content-encoding'] === 'gzip', `versioned stylesheet should be gzip-compressed for repeat visits: ${JSON.stringify(compressedStyleSheet.headers)}`);
    assert(compressedStyleSheet.body.length < Buffer.byteLength(styleText, 'utf8') * 0.75, 'compressed stylesheet should be materially smaller than the source CSS');
    const compressedAppScript = await rawHttpGet('/app.js?v=20260608-quality-v33', { 'Accept-Encoding': 'gzip' });
    assert(compressedAppScript.status === 200 && compressedAppScript.headers['content-encoding'] === 'gzip', `versioned app script should be gzip-compressed for repeat visits: ${JSON.stringify(compressedAppScript.headers)}`);
    assert(compressedAppScript.body.length < Buffer.byteLength(appScriptText, 'utf8') * 0.75, 'compressed app script should be materially smaller than the source JS');

    const articleShell = await fetch(`${baseUrl}/?post=post-1`);
    const articleShellText = await articleShell.text();
    assert(articleShell.status === 200 && articleShellText.includes('<title>如何构建一个极速的无框架博客？ - Atherix</title>'), 'article deep links should render an article-specific title');
    assert(articleShellText.includes('rel="canonical" href="https://dadaguai6686.github.io/?post=post-1"'), 'article deep links should render an article canonical URL');
    assert(articleShellText.includes('property="og:type" content="article"') && articleShellText.includes('property="og:url" content="https://dadaguai6686.github.io/?post=post-1"'), 'article deep links should render article Open Graph metadata');
    assert(articleShellText.includes('name="twitter:title" content="如何构建一个极速的无框架博客？ - Atherix"'), 'article deep links should render article Twitter metadata');
    assert(articleShellText.includes('property="article:published_time" content="2026-05-18"') && articleShellText.includes('property="article:tag" content="前端开发"'), 'article deep links should render article publication metadata');

    const invalidArticleShell = await fetch(`${baseUrl}/?post=..%2Fserver`);
    const invalidArticleShellText = await invalidArticleShell.text();
    assert(invalidArticleShell.status === 200 && invalidArticleShellText.includes('<title>Atherix - 个人博客与数字空间</title>') && !invalidArticleShellText.includes('property="og:type" content="article"'), 'invalid article deep links should fall back to the default app shell');

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
    assert(malformedJson.headers.get('cache-control') === 'no-store', 'malformed JSON errors should not be cached');

    const oversizedJson = await fetch(`${baseUrl}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'Payload Tester', content: 'x'.repeat(1024 * 1024 + 32) })
    });
    const oversizedJsonBody = await oversizedJson.json().catch(() => null);
    assert(oversizedJson.status === 413 && /too large/i.test(oversizedJsonBody?.error || ''), 'oversized JSON should return a JSON 413');
    assert(oversizedJson.headers.get('cache-control') === 'no-store', 'oversized JSON errors should not be cached');

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

    trace('validation guards');
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

    trace('comments and public writes');
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

    trace('auth and admin writes');
    const unknownUserLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'missing-admin', password: smokeAdminPassword })
    });
    const unknownUserBody = await unknownUserLogin.json();
    assert(unknownUserLogin.status === 401 && unknownUserBody.error === 'Invalid username or password.', 'unknown usernames should receive the same login failure response as bad credentials');

    const wrongPasswordLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'WrongPassword#2026!' })
    });
    const wrongPasswordBody = await wrongPasswordLogin.json();
    assert(wrongPasswordLogin.status === 401 && wrongPasswordBody.error === unknownUserBody.error, 'wrong passwords and unknown users should share the same login failure response');

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: smokeAdminPassword })
    });
    assert(login.status === 200, 'admin login should succeed in smoke test');
    const loginBody = await login.json();
    assert(typeof loginBody.token === 'string' && loginBody.token.length > 20, 'login should return a JWT');

    const wrongAlgorithmToken = jwt.sign({ username: 'admin' }, smokeJwtSecret, { algorithm: 'HS512', expiresIn: '7d' });
    const wrongAlgorithmVerify = await fetch(`${baseUrl}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${wrongAlgorithmToken}` }
    });
    assert(wrongAlgorithmVerify.status === 403, 'auth verify should reject JWTs signed with unexpected algorithms');

    const invalidDatePost = await fetch(`${baseUrl}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginBody.token}`
      },
      body: JSON.stringify({
        id: `bad-date-${Date.now()}`,
        title: 'Bad Date Draft',
        excerpt: 'invalid date',
        content: '# Bad Date',
        tag: '测试',
        date: '2026-99-99',
        readTime: '1 分钟阅读'
      })
    });
    assert(invalidDatePost.status === 400, 'admin post creation should reject invalid calendar dates');

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

    const duplicatePost = await fetch(`${baseUrl}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginBody.token}`
      },
      body: JSON.stringify({
        id: smokePostId,
        title: 'Duplicate Smoke Test Draft',
        excerpt: 'duplicate draft',
        content: '# Duplicate Smoke Test Draft',
        tag: '测试',
        readTime: '1 分钟阅读'
      })
    });
    const duplicatePostBody = await duplicatePost.json();
    assert(duplicatePost.status === 409 && /already exists/i.test(duplicatePostBody.error || ''), 'duplicate admin post ids should return 409 instead of a database 500');

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

    const invalidDateUpdate = await fetch(`${baseUrl}/api/posts/${encodeURIComponent(smokePostId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginBody.token}`
      },
      body: JSON.stringify({
        title: 'Smoke Test Draft Bad Date',
        excerpt: 'bad date update',
        content: '# Smoke Test Draft Bad Date',
        tag: '测试',
        date: '08/06/2026',
        readTime: '2 分钟阅读'
      })
    });
    assert(invalidDateUpdate.status === 400, 'admin post update should reject non-ISO article dates');
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

    const duplicateProject = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: projectHeaders,
      body: JSON.stringify({
        id: smokeProjectId,
        title: 'Duplicate Smoke Test Project',
        desc: 'duplicate project',
        img: '/uploads/safe-image.png',
        tags: ['测试']
      })
    });
    const duplicateProjectBody = await duplicateProject.json();
    assert(duplicateProject.status === 409 && /already exists/i.test(duplicateProjectBody.error || ''), 'duplicate admin project ids should return 409 instead of a database 500');

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
    trace('projects and uploads');
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

    trace('done');
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
      oversizedJsonStatus: oversizedJson.status,
      versionedAppCacheControl: appScript.headers.get('cache-control'),
      versionedStyleCacheControl: styleSheet.headers.get('cache-control'),
      compressedAppScriptBytes: compressedAppScript.body.length,
      compressedStyleBytes: compressedStyleSheet.body.length,
      longUsernameLoginStatus: longUsernameLogin.status,
      longPasswordLoginStatus: longPasswordLogin.status,
      seededProjectCount: projectRows.length,
      apiCacheControl: health.headers.get('cache-control'),
      cspImagesLocalOnly: cspHeader.includes("img-src 'self' data: blob:") && !/img-src[^;]*https:/i.test(cspHeader),
      sensitiveResults,
      sanitizedAvatar: sanitizedBody.comment.avatar,
      spamTrapStatus: spamTrap.status,
      linkSpamStatus: linkSpam.status,
      unknownUserLoginStatus: unknownUserLogin.status,
      wrongPasswordLoginStatus: wrongPasswordLogin.status,
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
    await stopChild(child);
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
