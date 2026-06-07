const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = Number(process.env.API_SMOKE_PORT || (3400 + Math.floor(Math.random() * 800)));
const baseUrl = `http://127.0.0.1:${port}`;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atherix-api-smoke-'));
const dbPath = path.join(tempDir, 'blog.db');
const allowedOrigin = 'https://example.test';

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

async function assertProductionSecretRequired() {
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
      ADMIN_PASSWORD: 'api-smoke-password',
      JWT_SECRET: ''
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
    assert(exitCode !== null, 'production server without JWT_SECRET should exit');
    assert(exitCode !== 0, 'production server without JWT_SECRET should fail');
  } finally {
    if (!child.killed) child.kill();
    fs.rmSync(failDir, { recursive: true, force: true });
  }
}

async function run() {
  await assertProductionSecretRequired();

  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      DB_PATH: dbPath,
      JWT_SECRET: 'api-smoke-secret-change-me-only-for-test',
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: 'api-smoke-password',
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
    assert(health.headers.get('content-security-policy')?.includes("object-src 'none'"), 'CSP object-src guard missing');
    assert(health.headers.get('content-security-policy')?.includes('https://fonts.googleapis.com'), 'CSP should allow configured web font stylesheet');
    assert(health.headers.get('content-security-policy')?.includes('https://fonts.gstatic.com'), 'CSP should allow configured web font files');
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
    const serviceWorkerText = await serviceWorkerScript.text();
    assert(serviceWorkerText.includes('/feed.xml') && serviceWorkerText.includes('/sitemap.xml'), 'service worker should precache discovery metadata');
    assert(serviceWorkerText.includes('/assets/atherix-og-card.png') && serviceWorkerText.includes('/assets/atherix-icon-512.png'), 'service worker should precache branded PWA assets');

    const indexHtml = await fetch(`${baseUrl}/`);
    const indexText = await indexHtml.text();
    assert(indexText.includes('rel="canonical" href="https://dadaguai6686.github.io/"'), 'index should expose an absolute canonical URL');
    assert(indexText.includes('type="application/rss+xml"'), 'index should link the RSS feed');
    assert(indexText.includes('href="/style.css') && indexText.includes('src="/app.js') && indexText.includes('src="/lucide.min.js"'), 'local app assets should use root-absolute URLs for deep links');
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

    const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
    const sitemapText = await sitemap.text();
    assert(sitemap.status === 200 && sitemapText.includes('<loc>https://dadaguai6686.github.io/</loc>'), 'sitemap should expose an absolute public URL');

    const robots = await fetch(`${baseUrl}/robots.txt`);
    const robotsText = await robots.text();
    assert(robots.status === 200 && robotsText.includes('Sitemap: https://dadaguai6686.github.io/sitemap.xml'), 'robots.txt should point at the absolute sitemap URL');

    const feed = await fetch(`${baseUrl}/feed.xml`);
    const feedText = await feed.text();
    assert(feed.status === 200 && feedText.includes('<rss version="2.0"') && feedText.includes('atherix-post-1'), 'RSS feed should be publicly served with seeded posts');
    assert(feedText.includes('<url>https://dadaguai6686.github.io/assets/atherix-og-card.png</url>'), 'RSS feed should expose the branded channel image');

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
      '/SECURITY.md'
    ];
    const sensitiveResults = {};
    for (const pathname of sensitivePaths) {
      const response = await fetch(`${baseUrl}${pathname}`);
      sensitiveResults[pathname] = response.status;
      assert(response.status === 404, `${pathname} should not be publicly served`);
    }

    const postList = await waitForSeededPosts();
    assert(Array.isArray(postList) && postList.length >= 1, 'seeded posts should be available');

    const missingToken = await fetch(`${baseUrl}/api/auth/verify`);
    assert(missingToken.status === 401, 'auth verify without token should return 401');

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
      body: JSON.stringify({ username: 'admin', password: 'api-smoke-password' })
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

    const deletedPost = await fetch(`${baseUrl}/api/posts/${encodeURIComponent(smokePostId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${loginBody.token}` }
    });
    assert(deletedPost.status === 200, 'admin post deletion should succeed');
    assert(deletedPost.headers.get('ratelimit-limit') === '30', 'admin post deletion should be write rate-limited');

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

    const deletedProject = await fetch(`${baseUrl}/api/projects/${encodeURIComponent(smokeProjectId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${loginBody.token}` }
    });
    assert(deletedProject.status === 200, 'admin project deletion should succeed');

    const uploadDir = path.resolve(__dirname, '..', 'uploads');
    const beforeUploads = new Set(fs.readdirSync(uploadDir));
    const fakeImageForm = new FormData();
    fakeImageForm.append('image', new Blob([Buffer.from('not really a png')], { type: 'image/png' }), 'fake.png');
    const fakeImageUpload = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginBody.token}` },
      body: fakeImageForm
    });
    assert(fakeImageUpload.status === 400, 'forged image upload should be rejected');
    const afterUploads = fs.readdirSync(uploadDir).filter(name => !beforeUploads.has(name));
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
      unknownApiStatus: unknownApi.status,
      malformedJsonStatus: malformedJson.status,
      apiCacheControl: health.headers.get('cache-control'),
      sensitiveResults,
      sanitizedAvatar: sanitizedBody.comment.avatar,
      spamTrapStatus: spamTrap.status,
      linkSpamStatus: linkSpam.status,
      adminWriteLimit: createdPost.headers.get('ratelimit-limit'),
      preservedPostDate: updatedSmokePost?.date || '',
      unsafeUploadPathStatus: unsafeProjectPath.status,
      unsafeEncodedUploadPathStatus: unsafeProjectEncodedPath.status,
      safeUploadPathProjectStatus: createdProject.status,
      forgedUploadStatus: fakeImageUpload.status
    };
  } finally {
    child.kill();
    await wait(300);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

run().then(result => {
  console.log(JSON.stringify(result, null, 2));
}).catch(error => {
  console.error(JSON.stringify({ ok: false, message: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});
