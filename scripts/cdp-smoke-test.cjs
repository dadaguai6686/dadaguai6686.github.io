const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const appUrl = process.env.SMOKE_URL || `http://127.0.0.1:${process.env.PORT || 3341}`;
const cdpPort = Number(process.env.CDP_PORT || 9480);
const edgePath = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cdpJson(pathname, options) {
  const response = await fetch(`http://127.0.0.1:${cdpPort}${pathname}`, options);
  if (!response.ok) throw new Error(`${pathname} -> ${response.status}`);
  return response.json();
}

async function waitForCdp() {
  const deadline = Date.now() + 15000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await cdpJson('/json/version');
    } catch (error) {
      lastError = error;
      await wait(300);
    }
  }
  throw lastError || new Error('CDP did not become ready');
}

function startHeadlessEdge() {
  if (!fs.existsSync(edgePath)) {
    throw new Error(`Edge not found at ${edgePath}`);
  }
  const profile = path.join(os.tmpdir(), `codex-blog-cdp-${cdpPort}`);
  fs.mkdirSync(profile, { recursive: true });
  const child = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profile}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
  return child;
}

async function run() {
  let launched = false;
  try {
    await waitForCdp();
  } catch {
    startHeadlessEdge();
    launched = true;
    await waitForCdp();
  }

  const target = await cdpJson(`/json/new?${encodeURIComponent(appUrl)}`, { method: 'PUT' });
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('CDP websocket open timeout')), 12000);
    ws.addEventListener('open', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    ws.addEventListener('error', event => {
      clearTimeout(timer);
      reject(event.error || event);
    }, { once: true });
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const slot = pending.get(message.id);
    clearTimeout(slot.timer);
    pending.delete(message.id);
    if (message.error) slot.reject(new Error(message.error.message));
    else slot.resolve(message.result);
  });

  function send(method, params = {}, timeout = 20000) {
    const callId = ++id;
    ws.send(JSON.stringify({ id: callId, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(callId);
        reject(new Error(`${method} timeout`));
      }, timeout);
      pending.set(callId, { resolve, reject, timer });
    });
  }

  async function evaluate(expression, timeout) {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    }, timeout);
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Runtime exception');
    }
    return result.result.value;
  }

  async function click(selector) {
    return evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.click();
      return true;
    })()`);
  }

  async function waitFor(selector, timeout = 8000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const found = await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`);
      if (found) return true;
      await wait(200);
    }
    return false;
  }

  async function key(type, key, code) {
    await send('Input.dispatchKeyEvent', {
      type,
      key,
      code,
      windowsVirtualKeyCode: key === ' ' ? 32 : 0
    });
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await wait(1800);

  await click('.nav-item[data-target="blog"]');
  await waitFor('.blog-post-card');
  await click('.blog-post-card');
  await wait(700);
  const blogState = await evaluate(`(() => ({
    hash: location.hash,
    visibleArticle: document.querySelector('#blog-reader')?.classList.contains('active') && !!document.querySelector('#reader-post-content')?.innerText.trim(),
    articleChars: document.querySelector('#reader-post-content')?.innerText.trim().length || 0
  }))()`);

  await click('.nav-item[data-target="game"]');
  await wait(600);
  const mainOverlayBeforeSpace = await evaluate(`document.querySelector('#game-overlay-screen')?.style.display || ''`);
  await key('keyDown', ' ', 'Space');
  await key('keyUp', ' ', 'Space');
  await wait(250);
  const mainSpaceState = await evaluate(`(() => ({
    overlayBefore: ${JSON.stringify(mainOverlayBeforeSpace)},
    overlayAfter: document.querySelector('#game-overlay-screen')?.style.display || '',
    timer: document.querySelector('#game-timer')?.textContent,
    title: document.querySelector('#game-overlay-title')?.textContent
  }))()`);
  const arcadeInitial = await evaluate(`(() => ({
    premium: !!document.querySelector('#premium-game-stage'),
    oldPrototypeCount: document.querySelectorAll('#snake-canvas,#breakout-canvas,#tile-board,#memory-board').length,
    touchControls: document.querySelectorAll('[data-premium-control]').length,
    chainCells: document.querySelectorAll('#premium-chain-board .chain-cell').length,
    chainTarget: document.querySelector('#premium-chain-target')?.textContent
  }))()`);

  await click('#premium-survivor-start');
  await wait(900);
  await key('keyDown', ' ', 'Space');
  await wait(220);
  await key('keyUp', ' ', 'Space');
  await wait(500);
  const survivorState = await evaluate(`(() => {
    const c = document.querySelector('#premium-survivor-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let colored = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] || d[i + 1] || d[i + 2]) colored++;
    return {
      nonBlank: colored > 1000,
      build: document.querySelector('#premium-survivor-build')?.textContent,
      threat: document.querySelector('#premium-survivor-threat')?.textContent,
      hp: document.querySelector('#premium-survivor-hp')?.textContent
    };
  })()`);

  await click('[data-premium-game="boss"]');
  await wait(200);
  await click('#premium-boss-start');
  await wait(900);
  await key('keyDown', 'ArrowUp', 'ArrowUp');
  await key('keyDown', ' ', 'Space');
  await wait(260);
  await key('keyUp', 'ArrowUp', 'ArrowUp');
  await key('keyUp', ' ', 'Space');
  await wait(400);
  const bossState = await evaluate(`(() => {
    const c = document.querySelector('#premium-boss-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let colored = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] || d[i + 1] || d[i + 2]) colored++;
    return {
      nonBlank: colored > 1000,
      phase: document.querySelector('#premium-boss-phase')?.textContent,
      dash: document.querySelector('#premium-boss-dash')?.textContent,
      hp: document.querySelector('#premium-boss-hp')?.textContent
    };
  })()`);

  await click('[data-premium-game="heist"]');
  await wait(300);
  await key('keyDown', ' ', 'Space');
  await key('keyUp', ' ', 'Space');
  await wait(120);
  await key('keyDown', 'ArrowRight', 'ArrowRight');
  await key('keyUp', 'ArrowRight', 'ArrowRight');
  await wait(260);
  const heistState = await evaluate(`(() => {
    const c = document.querySelector('#premium-heist-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let colored = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] || d[i + 1] || d[i + 2]) colored++;
    return {
      nonBlank: colored > 1000,
      tools: document.querySelector('#premium-heist-tools')?.textContent,
      steps: document.querySelector('#premium-heist-steps')?.textContent,
      alert: document.querySelector('#premium-heist-alert')?.textContent
    };
  })()`);

  await click('[data-premium-game="chain"]');
  await wait(250);
  const chainState = await evaluate(`(() => ({
    cells: document.querySelectorAll('#premium-chain-board .chain-cell').length,
    specials: document.querySelectorAll('.chain-bomb,.chain-prism').length,
    target: document.querySelector('#premium-chain-target')?.textContent
  }))()`);

  await send('Page.close').catch(() => {});
  ws.close();

  return {
    launched,
    blogState,
    mainSpaceState,
    arcadeInitial,
    survivorState,
    bossState,
    heistState,
    chainState
  };
}

run().then(result => {
  console.log(JSON.stringify(result, null, 2));
}).catch(error => {
  console.error(JSON.stringify({ failed: true, message: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});
