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

async function run() {
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
    assert(health.headers.get('content-security-policy')?.includes("object-src 'none'"), 'CSP object-src guard missing');
    assert(health.headers.get('strict-transport-security')?.includes('max-age=31536000'), 'HSTS header missing in production');
    assert(health.headers.get('access-control-allow-origin') === allowedOrigin, 'allowed CORS origin not echoed');

    const blockedCors = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://evil.example' }
    });
    assert(blockedCors.status === 200, 'blocked-origin non-browser request should still reach health');
    assert(!blockedCors.headers.get('access-control-allow-origin'), 'disallowed origin should not receive CORS allow header');

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

    return {
      ok: true,
      port,
      dbCreated: fs.existsSync(dbPath),
      posts: postList.length,
      corsAllowed: health.headers.get('access-control-allow-origin'),
      corsBlockedHeader: blockedCors.headers.get('access-control-allow-origin') || null
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
