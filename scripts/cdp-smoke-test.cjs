const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const requestedAppUrl = process.env.SMOKE_URL || '';
const managedAppPort = Number(process.env.SMOKE_PORT || (4300 + Math.floor(Math.random() * 700)));
const appUrl = requestedAppUrl || `http://127.0.0.1:${managedAppPort}`;
const usesExternalCdp = Boolean(process.env.CDP_PORT);
const cdpPort = Number(process.env.CDP_PORT || (9400 + Math.floor(Math.random() * 900)));
const edgePath = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
let activeAppServer = null;
let activeAppTempDir = '';
let activeBrowserProcess = null;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], {
    stdio: 'ignore',
    windowsHide: true
  });
  activeBrowserProcess = child;
  return child;
}

function startAppServer() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atherix-game-smoke-'));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(managedAppPort),
      DB_PATH: path.join(tempDir, 'blog.db')
    },
    stdio: 'ignore',
    windowsHide: true
  });
  return { child, tempDir };
}

async function cleanupAppServer() {
  const child = activeAppServer;
  if (child && !child.killed) {
    child.kill();
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      wait(1500)
    ]);
  }
  await wait(300);
  if (activeAppTempDir) {
    try {
      fs.rmSync(activeAppTempDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
    } catch (error) {
      console.warn(`[smoke:games] Could not remove temp directory ${activeAppTempDir}: ${error.message}`);
    }
  }
  activeAppServer = null;
  activeAppTempDir = '';
}

async function cleanupBrowserProcess() {
  const child = activeBrowserProcess;
  activeBrowserProcess = null;
  if (child && !child.killed) {
    child.kill();
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      wait(1500)
    ]);
  }
}

async function waitForAppServer() {
  const deadline = Date.now() + 15000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${appUrl}/api/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await wait(300);
  }
  throw lastError || new Error('App server did not become ready');
}

async function run() {
  let launched = false;
  let appServer = null;
  let appTempDir = '';
  let managedServer = false;
  if (!requestedAppUrl) {
    const started = startAppServer();
    appServer = started.child;
    appTempDir = started.tempDir;
    activeAppServer = appServer;
    activeAppTempDir = appTempDir;
    managedServer = true;
    await waitForAppServer();
  }

  let ws = null;
  if (!usesExternalCdp) {
    startHeadlessEdge();
    launched = true;
    await waitForCdp();
  } else {
    try {
      await waitForCdp();
    } catch {
      startHeadlessEdge();
      launched = true;
      await waitForCdp();
    }
  }

  const target = await cdpJson(`/json/new?${encodeURIComponent(appUrl)}`, { method: 'PUT' });
  ws = new WebSocket(target.webSocketDebuggerUrl);
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
  await waitFor('.nav-item[data-target="blog"]', 12000);
  await evaluate(`localStorage.setItem('admin_token', 'fake-token-for-smoke')`);
  await send('Page.reload');
  await waitFor('.nav-item[data-target="blog"]', 12000);
  await wait(800);
  const adminStartupState = await evaluate(`(() => {
    const blogActions = document.querySelector('#blog-admin-actions');
    const projectActions = document.querySelector('#project-admin-actions');
    return {
      token: localStorage.getItem('admin_token'),
      blogActionsVisible: !!blogActions && getComputedStyle(blogActions).display !== 'none',
      projectActionsVisible: !!projectActions && getComputedStyle(projectActions).display !== 'none'
    };
  })()`);

  await click('#command-palette-trigger');
  await waitFor('#command-palette.active');
  await evaluate(`(() => {
    const input = document.querySelector('#command-search-input');
    input.value = 'tactics';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await wait(200);
  const commandBeforeExecute = await evaluate(`(() => ({
    open: document.querySelector('#command-palette')?.classList.contains('active') || false,
    results: document.querySelectorAll('.command-result-item').length,
    firstTitle: document.querySelector('.command-result-title')?.textContent || '',
    countText: document.querySelector('#command-result-count')?.textContent || ''
  }))()`);
  await evaluate(`document.querySelector('.command-result-item')?.click()`);
  await wait(900);
  const commandState = await evaluate(`(() => ({
    closed: !document.querySelector('#command-palette')?.classList.contains('active'),
    hash: location.hash,
    gameActive: document.querySelector('#game')?.classList.contains('active') || false,
    activeTitle: document.querySelector('#premium-active-title')?.textContent || '',
    tacticsActive: document.querySelector('#premium-tactics')?.classList.contains('active') || false
  }))()`);

  await click('.nav-item[data-target="blog"]');
  await waitFor('.blog-post-card');
  await click('.blog-post-card');
  await waitFor('#reader-post-content h2');
  await click('#reader-bookmark-btn');
  await wait(150);
  await evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
  await wait(250);
  const blogState = await evaluate(`(() => ({
    hash: location.hash,
    visibleArticle: document.querySelector('#blog-reader')?.classList.contains('active') && !!document.querySelector('#reader-post-content')?.innerText.trim(),
    articleChars: document.querySelector('#reader-post-content')?.innerText.trim().length || 0,
    toolbar: !!document.querySelector('#reader-copy-link-btn') && !!document.querySelector('#reader-bookmark-btn'),
    bookmarkPressed: document.querySelector('#reader-bookmark-btn')?.getAttribute('aria-pressed') === 'true',
    progress: document.querySelector('#reader-progress-percent')?.textContent || '',
    tocActive: document.querySelector('#reader-toc')?.classList.contains('active') || false,
    tocLinks: document.querySelectorAll('#reader-toc a').length,
    codeBlocks: document.querySelectorAll('#reader-post-content pre code').length,
    inlineCode: document.querySelectorAll('#reader-post-content p code, #reader-post-content li code').length,
    orderedItems: document.querySelectorAll('#reader-post-content ol li').length,
    unorderedItems: document.querySelectorAll('#reader-post-content ul li').length
  }))()`);

  await click('.nav-item[data-target="projects"]');
  await waitFor('.project-card');
  await wait(650);
  const projectViewportState = await evaluate(`(() => {
    const section = document.querySelector('#projects');
    const rect = section?.getBoundingClientRect();
    return {
      scrollY: Math.round(window.scrollY),
      sectionTop: rect ? Math.round(rect.top) : null,
      sectionVisible: !!rect && rect.bottom > 0 && rect.top < window.innerHeight
    };
  })()`);
  await click('.modal-trigger-btn');
  await wait(250);
  const projectState = await evaluate(`(() => ({
    cards: document.querySelectorAll('.project-card').length,
    disabledLiveButtons: document.querySelectorAll('.project-card .project-btn-disabled[aria-disabled="true"]').length,
    modalOpen: document.querySelector('#project-modal')?.classList.contains('active') || false,
    modalLiveDisabled: document.querySelector('#modal-live-link')?.getAttribute('aria-disabled') === 'true',
    fakeHashLinks: [...document.querySelectorAll('.project-card a[href$="/#"], .project-card a[href="#"]')].length
  }))()`);

  await click('.nav-item[data-target="game"]');
  await wait(600);
  const gameViewportState = await evaluate(`(() => {
    const section = document.querySelector('#game');
    const rect = section?.getBoundingClientRect();
    return {
      scrollY: Math.round(window.scrollY),
      sectionTop: rect ? Math.round(rect.top) : null,
      sectionVisible: !!rect && rect.bottom > 0 && rect.top < window.innerHeight
    };
  })()`);
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
  const jumpButtonIdleState = await evaluate(`(async () => {
    const firePointer = (selector, type) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      el.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 5,
        pointerType: 'touch',
        isPrimary: true
      }));
      return true;
    };
    const overlayBefore = document.querySelector('#game-overlay-screen')?.style.display || '';
    firePointer('#btn-jump-led', 'pointerdown');
    firePointer('#btn-jump-led', 'pointerup');
    await new Promise(resolve => setTimeout(resolve, 160));
    return {
      overlayBefore,
      overlayAfter: document.querySelector('#game-overlay-screen')?.style.display || '',
      running: !!window.__atherixDebug?.gameRunning?.()
    };
  })()`, 3000);
  const runnerTouchState = await evaluate(`(async () => {
    const firePointer = (selector, type) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      el.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 7,
        pointerType: 'touch',
        isPrimary: true
      }));
      return true;
    };
    const controls = document.querySelectorAll('[data-runner-control]').length;
    const beforeX = window.__atherixDebug?.player?.x || 0;
    firePointer('#btn-start-led', 'pointerdown');
    firePointer('#btn-start-led', 'pointerup');
    await new Promise(resolve => setTimeout(resolve, 180));
    firePointer('#btn-right-led', 'pointerdown');
    await new Promise(resolve => setTimeout(resolve, 360));
    firePointer('#btn-right-led', 'pointerup');
    firePointer('#btn-dash-led', 'pointerdown');
    firePointer('#btn-dash-led', 'pointerup');
    await new Promise(resolve => setTimeout(resolve, 220));
    const timerBeforePause = document.querySelector('#game-timer')?.textContent || '';
    firePointer('#btn-pause-led', 'pointerdown');
    firePointer('#btn-pause-led', 'pointerup');
    await new Promise(resolve => setTimeout(resolve, 160));
    const pauseVisible = document.querySelector('#game-pause-screen')?.style.display || '';
    const pausedDuringHold = !!window.__atherixDebug?.gamePaused?.();
    const runningAfterPause = !!window.__atherixDebug?.gameRunning?.();
    const timerAtPause = document.querySelector('#game-timer')?.textContent || '';
    const xAtPause = window.__atherixDebug?.player?.x || 0;
    firePointer('#btn-right-led', 'pointerdown');
    await new Promise(resolve => setTimeout(resolve, 320));
    firePointer('#btn-right-led', 'pointerup');
    const timerAfterPauseWait = document.querySelector('#game-timer')?.textContent || '';
    const xAfterPauseWait = window.__atherixDebug?.player?.x || 0;
    firePointer('#btn-pause-led', 'pointerdown');
    firePointer('#btn-pause-led', 'pointerup');
    await new Promise(resolve => setTimeout(resolve, 180));
    const pausedAfterResume = !!window.__atherixDebug?.gamePaused?.();
    const runningAfterResume = !!window.__atherixDebug?.gameRunning?.();
    const player = window.__atherixDebug?.player || {};
    return {
      controls,
      overlayAfterStart: document.querySelector('#game-overlay-screen')?.style.display || '',
      beforeX,
      afterX: player.x || 0,
      dashReady: !!player.dashReady,
      dashCooldownUntil: player.dashCooldownUntil || 0,
      running: !!window.__atherixDebug?.gameRunning?.(),
      timerBeforePause,
      pauseVisible,
      timerAtPause,
      timerAfterPauseWait,
      xAtPause,
      xAfterPauseWait,
      pausedDuringHold,
      runningAfterPause,
      pausedAfterResume,
      runningAfterResume
    };
  })()`, 7000);
  const arcadeInitial = await evaluate(`(() => ({
    premium: !!document.querySelector('#premium-game-stage'),
    careerPanel: !!document.querySelector('#premium-career-rating'),
    dailyChallenge: document.querySelector('#premium-daily-challenge')?.textContent || '',
    premiumTabs: document.querySelectorAll('[data-premium-game]').length,
    driftPanel: !!document.querySelector('#premium-drift-canvas'),
    tacticsPanel: !!document.querySelector('#premium-tactics-canvas'),
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
  await key('keyDown', 'p', 'KeyP');
  await key('keyUp', 'p', 'KeyP');
  await wait(180);
  const bossPauseState = await evaluate(`(() => ({
    running: !!window.__atherixDebug?.premium?.bossRunning?.(),
    paused: !!window.__atherixDebug?.premium?.bossPaused?.(),
    pauseButton: document.querySelector('#premium-boss-pause')?.textContent || '',
    hpBefore: document.querySelector('#premium-boss-hp')?.textContent || '',
    phaseBefore: document.querySelector('#premium-boss-phase')?.textContent || '',
    scoreBefore: document.querySelector('#premium-boss-score')?.textContent || '',
    dashBefore: document.querySelector('#premium-boss-dash')?.textContent || ''
  }))()`);
  await key('keyDown', 'ArrowUp', 'ArrowUp');
  await key('keyDown', ' ', 'Space');
  await wait(320);
  await key('keyUp', 'ArrowUp', 'ArrowUp');
  await key('keyUp', ' ', 'Space');
  const bossPauseFreezeState = await evaluate(`(() => ({
    running: !!window.__atherixDebug?.premium?.bossRunning?.(),
    paused: !!window.__atherixDebug?.premium?.bossPaused?.(),
    hpAfter: document.querySelector('#premium-boss-hp')?.textContent || '',
    phaseAfter: document.querySelector('#premium-boss-phase')?.textContent || '',
    scoreAfter: document.querySelector('#premium-boss-score')?.textContent || '',
    dashAfter: document.querySelector('#premium-boss-dash')?.textContent || ''
  }))()`);
  await key('keyDown', 'Escape', 'Escape');
  await key('keyUp', 'Escape', 'Escape');
  await wait(180);
  const bossResumeState = await evaluate(`(() => ({
    running: !!window.__atherixDebug?.premium?.bossRunning?.(),
    paused: !!window.__atherixDebug?.premium?.bossPaused?.(),
    pauseButton: document.querySelector('#premium-boss-pause')?.textContent || ''
  }))()`);

  await click('[data-premium-game="drift"]');
  await wait(220);
  await click('#premium-drift-start');
  await wait(250);
  await key('keyDown', 'ArrowUp', 'ArrowUp');
  await key('keyDown', 'ArrowRight', 'ArrowRight');
  await key('keyDown', ' ', 'Space');
  await wait(820);
  await key('keyUp', 'ArrowUp', 'ArrowUp');
  await key('keyUp', 'ArrowRight', 'ArrowRight');
  await key('keyUp', ' ', 'Space');
  await wait(220);
  const driftState = await evaluate(`(() => {
    const c = document.querySelector('#premium-drift-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let colored = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] || d[i + 1] || d[i + 2]) colored++;
    return {
      nonBlank: colored > 1000,
      running: !!window.__atherixDebug?.premium?.driftRunning?.(),
      paused: !!window.__atherixDebug?.premium?.driftPaused?.(),
      gates: Number(document.querySelector('#premium-drift-gates')?.textContent || 0),
      shield: Number(document.querySelector('#premium-drift-shield')?.textContent || 0),
      score: Number(document.querySelector('#premium-drift-score')?.textContent || 0),
      boost: document.querySelector('#premium-drift-boost')?.textContent || '',
      mult: document.querySelector('#premium-drift-mult')?.textContent || '',
      activeTitle: document.querySelector('#premium-active-title')?.textContent || ''
    };
  })()`);
  await key('keyDown', 'p', 'KeyP');
  await key('keyUp', 'p', 'KeyP');
  await wait(180);
  const driftPauseState = await evaluate(`(() => ({
    running: !!window.__atherixDebug?.premium?.driftRunning?.(),
    paused: !!window.__atherixDebug?.premium?.driftPaused?.(),
    pauseButton: document.querySelector('#premium-drift-pause')?.textContent || '',
    scoreBefore: document.querySelector('#premium-drift-score')?.textContent || '',
    gatesBefore: document.querySelector('#premium-drift-gates')?.textContent || '',
    shieldBefore: document.querySelector('#premium-drift-shield')?.textContent || '',
    boostBefore: document.querySelector('#premium-drift-boost')?.textContent || ''
  }))()`);
  await key('keyDown', 'ArrowUp', 'ArrowUp');
  await key('keyDown', ' ', 'Space');
  await wait(360);
  await key('keyUp', 'ArrowUp', 'ArrowUp');
  await key('keyUp', ' ', 'Space');
  const driftPauseFreezeState = await evaluate(`(() => ({
    running: !!window.__atherixDebug?.premium?.driftRunning?.(),
    paused: !!window.__atherixDebug?.premium?.driftPaused?.(),
    scoreAfter: document.querySelector('#premium-drift-score')?.textContent || '',
    gatesAfter: document.querySelector('#premium-drift-gates')?.textContent || '',
    shieldAfter: document.querySelector('#premium-drift-shield')?.textContent || '',
    boostAfter: document.querySelector('#premium-drift-boost')?.textContent || ''
  }))()`);
  await key('keyDown', 'Escape', 'Escape');
  await key('keyUp', 'Escape', 'Escape');
  await wait(180);
  const driftResumeState = await evaluate(`(() => ({
    running: !!window.__atherixDebug?.premium?.driftRunning?.(),
    paused: !!window.__atherixDebug?.premium?.driftPaused?.(),
    pauseButton: document.querySelector('#premium-drift-pause')?.textContent || ''
  }))()`);

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
      alert: document.querySelector('#premium-heist-alert')?.textContent,
      achievementBadges: document.querySelectorAll('#premium-achievement-feed .career-badge').length,
      rating: document.querySelector('#premium-career-rating')?.textContent
    };
  })()`);
  await click('#premium-career-open');
  await wait(220);
  const careerDialogState = await evaluate(`(() => {
    const dialog = document.querySelector('#premium-career-dialog');
    const card = document.querySelector('.premium-career-card');
    const rect = card?.getBoundingClientRect();
    return {
      open: dialog?.classList.contains('active') || false,
      ariaHidden: dialog?.getAttribute('aria-hidden') || '',
      display: dialog ? getComputedStyle(dialog).display : '',
      summary: document.querySelector('#premium-career-summary')?.textContent || '',
      daily: document.querySelector('#premium-career-dialog-daily')?.textContent || '',
      medalCards: document.querySelectorAll('#premium-career-medals .career-medal-card').length,
      achievements: document.querySelectorAll('#premium-career-achievements .career-achievement').length,
      unlocked: document.querySelectorAll('#premium-career-achievements .career-achievement.is-unlocked').length,
      visibleInViewport: dialog ? getComputedStyle(dialog).display !== 'none' : false,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    };
  })()`);
  await click('#premium-career-close');
  await wait(120);
  const careerDialogClosed = await evaluate(`(() => ({
    open: document.querySelector('#premium-career-dialog')?.classList.contains('active') || false,
    ariaHidden: document.querySelector('#premium-career-dialog')?.getAttribute('aria-hidden') || ''
  }))()`);

  await click('[data-premium-game="chain"]');
  await wait(250);
  const chainState = await evaluate(`(() => ({
    cells: document.querySelectorAll('#premium-chain-board .chain-cell').length,
    specials: document.querySelectorAll('.chain-bomb,.chain-prism').length,
    target: document.querySelector('#premium-chain-target')?.textContent
  }))()`);

  await click('[data-premium-game="tactics"]');
  await wait(250);
  await click('#premium-tactics-start');
  await wait(200);
  await key('keyDown', 'ArrowRight', 'ArrowRight');
  await key('keyUp', 'ArrowRight', 'ArrowRight');
  await wait(160);
  await key('keyDown', ' ', 'Space');
  await key('keyUp', ' ', 'Space');
  await wait(240);
  const tacticsState = await evaluate(`(() => {
    const c = document.querySelector('#premium-tactics-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let colored = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] || d[i + 1] || d[i + 2]) colored++;
    return {
      nonBlank: colored > 1000,
      ap: document.querySelector('#premium-tactics-ap')?.textContent,
      turn: document.querySelector('#premium-tactics-turn')?.textContent,
      hp: document.querySelector('#premium-tactics-hp')?.textContent,
      threat: document.querySelector('#premium-tactics-threat')?.textContent,
      action: document.querySelector('#premium-tactics-action')?.textContent
    };
  })()`);

  const pwaState = await evaluate(`(async () => {
    if (!('serviceWorker' in navigator)) return { supported: false, registered: false };
    await new Promise(resolve => setTimeout(resolve, 1200));
    const registration = await navigator.serviceWorker.getRegistration('/');
    return {
      supported: true,
      registered: !!registration,
      scope: registration?.scope || ''
    };
  })()`, 10000);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await send('Page.navigate', { url: `${appUrl}/#game` });
  await waitFor('#runner-touch-controls', 12000);
  await wait(700);
  const runnerMobileState = await evaluate(`(() => {
    const pad = document.querySelector('#runner-touch-controls');
    const rect = pad?.getBoundingClientRect();
    return {
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: document.querySelectorAll('[data-runner-control]').length,
      padTop: rect ? Math.round(rect.top) : null,
      padBottom: rect ? Math.round(rect.bottom) : null,
      visibleInFirstViewport: !!rect && rect.top < window.innerHeight && rect.bottom > 0,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    };
  })()`);
  await send('Emulation.clearDeviceMetricsOverride');

  assert(blogState.visibleArticle && blogState.articleChars > 100, 'blog reader should open a populated article');
  assert(!adminStartupState.token && !adminStartupState.blogActionsVisible && !adminStartupState.projectActionsVisible, 'invalid cached admin token should be cleared on startup');
  assert(commandBeforeExecute.open && commandBeforeExecute.results >= 1 && /Rift Tactics/.test(commandBeforeExecute.firstTitle), `command palette should find tactics mode: ${JSON.stringify(commandBeforeExecute)}`);
  assert(commandState.closed && commandState.gameActive && commandState.tacticsActive && /Rift Tactics/.test(commandState.activeTitle), `command palette should execute game navigation: ${JSON.stringify(commandState)}`);
  assert(blogState.toolbar && blogState.bookmarkPressed, 'blog reader toolbar should render and toggle bookmark state');
  assert(blogState.tocActive && blogState.tocLinks >= 2, 'blog reader should build a table of contents from article headings');
  assert(/^\d+%$/.test(blogState.progress), 'blog reader should report reading progress');
  assert(
    blogState.codeBlocks >= 1,
    `blog markdown should preserve fenced code blocks: ${JSON.stringify(blogState)}`
  );
  assert(
    blogState.orderedItems >= 3 && blogState.unorderedItems >= 3,
    `blog markdown should render ordered and unordered lists: ${JSON.stringify(blogState)}`
  );
  assert(
    projectViewportState.scrollY <= 80 && projectViewportState.sectionVisible,
    `project navigation should reset scroll into visible content: ${JSON.stringify(projectViewportState)}`
  );
  assert(projectState.cards >= 1, 'project cards should render');
  assert(projectState.disabledLiveButtons >= 1 && projectState.modalLiveDisabled, 'projects without demos should render disabled live actions');
  assert(projectState.fakeHashLinks === 0, 'project cards should not convert placeholder live links into fake hash URLs');
  assert(
    gameViewportState.scrollY <= 80 && gameViewportState.sectionVisible,
    `game navigation should reset scroll into visible content: ${JSON.stringify(gameViewportState)}`
  );
  assert(mainSpaceState.overlayBefore === 'flex' && mainSpaceState.overlayAfter === 'flex', 'Space should not start/retry the main game overlay');
  assert(jumpButtonIdleState.overlayBefore === 'flex' && jumpButtonIdleState.overlayAfter === 'flex' && !jumpButtonIdleState.running, 'JUMP touch button should not start the main game overlay');
  assert(runnerTouchState.controls >= 7 && runnerTouchState.overlayAfterStart === 'none', 'runner touch controls should start the main game');
  assert(runnerTouchState.running && runnerTouchState.afterX > runnerTouchState.beforeX, 'runner touch controls should move the player horizontally');
  assert(!runnerTouchState.dashReady && runnerTouchState.dashCooldownUntil > 0, 'runner touch controls should trigger dash cooldown');
  assert(runnerTouchState.pauseVisible === 'flex' && runnerTouchState.pausedDuringHold && !runnerTouchState.runningAfterPause, `runner pause overlay should freeze the game: ${JSON.stringify(runnerTouchState)}`);
  assert(runnerTouchState.timerAtPause === runnerTouchState.timerAfterPauseWait && Math.abs(runnerTouchState.xAfterPauseWait - runnerTouchState.xAtPause) < 0.01, `runner should not advance while paused: ${JSON.stringify(runnerTouchState)}`);
  assert(runnerTouchState.runningAfterResume && !runnerTouchState.pausedAfterResume, `runner should resume from pause: ${JSON.stringify(runnerTouchState)}`);
  assert(runnerMobileState.controls >= 7 && runnerMobileState.visibleInFirstViewport && !runnerMobileState.horizontalOverflow, `runner touch controls should be reachable on mobile: ${JSON.stringify(runnerMobileState)}`);
  assert(arcadeInitial.premium && arcadeInitial.careerPanel, 'premium arcade career panel should render');
  assert(arcadeInitial.oldPrototypeCount === 0, 'old prototype mini-games should be replaced');
  assert(arcadeInitial.premiumTabs >= 6 && arcadeInitial.driftPanel && arcadeInitial.tacticsPanel, 'premium arcade should include drift and tactics modes');
  assert(arcadeInitial.touchControls >= 5, 'premium touch controls should be available');
  assert(survivorState.nonBlank && survivorState.threat, 'survivor canvas should render active state');
  assert(bossState.nonBlank && bossState.dash, 'boss canvas should render active state');
  assert(bossPauseState.running && bossPauseState.paused && bossPauseState.pauseButton === '继续', `boss mode should enter pause with keyboard: ${JSON.stringify(bossPauseState)}`);
  assert(
    bossPauseFreezeState.paused &&
    bossPauseFreezeState.hpAfter === bossPauseState.hpBefore &&
    bossPauseFreezeState.phaseAfter === bossPauseState.phaseBefore &&
    bossPauseFreezeState.scoreAfter === bossPauseState.scoreBefore &&
    bossPauseFreezeState.dashAfter === bossPauseState.dashBefore,
    `boss mode should freeze while paused: ${JSON.stringify({ bossPauseState, bossPauseFreezeState })}`
  );
  assert(bossResumeState.running && !bossResumeState.paused && bossResumeState.pauseButton === '暂停', `boss mode should resume from keyboard pause: ${JSON.stringify(bossResumeState)}`);
  assert(driftState.nonBlank && driftState.running && !driftState.paused && driftState.score > 0 && /Neon Drift/.test(driftState.activeTitle) && driftState.boost !== 'READY', `drift mode should render, move, score, and spend boost: ${JSON.stringify(driftState)}`);
  assert(driftPauseState.running && driftPauseState.paused && driftPauseState.pauseButton === '继续', `drift mode should enter pause with keyboard: ${JSON.stringify(driftPauseState)}`);
  assert(
    driftPauseFreezeState.paused &&
    driftPauseFreezeState.scoreAfter === driftPauseState.scoreBefore &&
    driftPauseFreezeState.gatesAfter === driftPauseState.gatesBefore &&
    driftPauseFreezeState.shieldAfter === driftPauseState.shieldBefore &&
    driftPauseFreezeState.boostAfter === driftPauseState.boostBefore,
    `drift mode should freeze while paused: ${JSON.stringify({ driftPauseState, driftPauseFreezeState })}`
  );
  assert(driftResumeState.running && !driftResumeState.paused && driftResumeState.pauseButton === '暂停', `drift mode should resume from keyboard pause: ${JSON.stringify(driftResumeState)}`);
  assert(heistState.nonBlank && Number(heistState.steps) >= 1, 'heist should accept keyboard movement');
  assert(heistState.achievementBadges >= 1, 'heist cloak should unlock at least one achievement badge');
  assert(careerDialogState.open && careerDialogState.ariaHidden === 'false', `career dialog should open: ${JSON.stringify(careerDialogState)}`);
  assert(careerDialogState.medalCards >= 7 && careerDialogState.achievements >= 16 && careerDialogState.unlocked >= 1, `career dialog should show medals and achievements: ${JSON.stringify(careerDialogState)}`);
  assert(/RANK/.test(careerDialogState.summary) && careerDialogState.daily.length > 10 && careerDialogState.visibleInViewport && !careerDialogState.horizontalOverflow, `career dialog should show readable summary and daily challenge: ${JSON.stringify(careerDialogState)}`);
  assert(!careerDialogClosed.open && careerDialogClosed.ariaHidden === 'true', `career dialog should close cleanly: ${JSON.stringify(careerDialogClosed)}`);
  assert(chainState.cells === 49 && Number(chainState.specials) >= 1, 'chain board should render with special cells');
  assert(tacticsState.nonBlank && Number(tacticsState.ap) < 3 && tacticsState.action, `tactics mode should render and accept actions: ${JSON.stringify(tacticsState)}`);
  assert(pwaState.supported && pwaState.registered, 'service worker should register');

  await send('Page.close').catch(() => {});
  if (launched) await send('Browser.close').catch(() => {});
  ws.close();

  return {
    launched,
    managedServer,
    cdpPort,
    appUrl,
    adminStartupState,
    commandBeforeExecute,
    commandState,
    blogState,
    projectViewportState,
    projectState,
    gameViewportState,
    mainSpaceState,
    runnerTouchState,
    runnerMobileState,
    arcadeInitial,
    survivorState,
    bossState,
    bossPauseState,
    bossPauseFreezeState,
    bossResumeState,
    driftState,
    driftPauseState,
    driftPauseFreezeState,
    driftResumeState,
    heistState,
    careerDialogState,
    careerDialogClosed,
    chainState,
    tacticsState,
    pwaState
  };
}

run().then(async result => {
  await cleanupAppServer();
  await cleanupBrowserProcess();
  console.log(JSON.stringify(result, null, 2));
}).catch(async error => {
  await cleanupAppServer();
  await cleanupBrowserProcess();
  console.error(JSON.stringify({ failed: true, message: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});
