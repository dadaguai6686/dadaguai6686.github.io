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
let activeBrowserTempDir = '';

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
  const deadline = Date.now() + 30000;
  let lastError;
  while (Date.now() < deadline) {
    if (activeBrowserProcess && activeBrowserProcess.exitCode !== null) {
      throw new Error(`Headless browser exited before CDP became ready (exit ${activeBrowserProcess.exitCode})`);
    }
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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `codex-blog-cdp-${cdpPort}-`));
  activeBrowserTempDir = profile;
  fs.mkdirSync(profile, { recursive: true });
  const child = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${profile}`,
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-features=Translate,BackForwardCache,OptimizationHints',
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
  if (activeBrowserTempDir) {
    try {
      fs.rmSync(activeBrowserTempDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
    } catch (error) {
      console.warn(`[smoke:games] Could not remove browser profile ${activeBrowserTempDir}: ${error.message}`);
    }
  }
  activeBrowserTempDir = '';
}

async function waitForAppServer() {
  const deadline = Date.now() + 25000;
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
    const timer = setTimeout(() => reject(new Error('CDP websocket open timeout')), 20000);
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
  let socketClosed = false;
  const diagnostics = {
    console: [],
    exceptions: [],
    networkFailures: [],
    logs: [],
    navigations: []
  };
  let lastFrameNavigated = '';
  let lastLoadEventAt = 0;
  let lastDomContentEventAt = 0;
  function remember(list, item, limit = 12) {
    list.push(item);
    if (list.length > limit) list.splice(0, list.length - limit);
  }
  function diagnosticsSummary() {
    return {
      console: diagnostics.console.slice(-5),
      exceptions: diagnostics.exceptions.slice(-5),
      networkFailures: diagnostics.networkFailures.slice(-5),
      logs: diagnostics.logs.slice(-5),
      navigations: diagnostics.navigations.slice(-5),
      pending: [...pending.values()].map(slot => ({
        id: slot.callId,
        method: slot.method,
        ageMs: Date.now() - slot.startedAt
      })).slice(-8),
      lastFrameNavigated,
      lastLoadEventAt,
      lastDomContentEventAt,
      socketReadyState: ws.readyState
    };
  }
  function rejectPending(reason) {
    for (const [callId, slot] of pending.entries()) {
      clearTimeout(slot.timer);
      slot.reject(new Error(reason));
      pending.delete(callId);
    }
  }
  ws.addEventListener('message', event => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!message.id) {
      if (message.method === 'Runtime.consoleAPICalled') {
        remember(diagnostics.console, {
          type: message.params?.type || '',
          text: (message.params?.args || []).map(arg => arg.value ?? arg.description ?? '').join(' ').slice(0, 240)
        });
      } else if (message.method === 'Runtime.exceptionThrown') {
        remember(diagnostics.exceptions, {
          text: message.params?.exceptionDetails?.text || '',
          description: message.params?.exceptionDetails?.exception?.description || ''
        });
      } else if (message.method === 'Network.loadingFailed') {
        remember(diagnostics.networkFailures, {
          url: message.params?.requestId || '',
          errorText: message.params?.errorText || '',
          type: message.params?.type || ''
        });
      } else if (message.method === 'Page.frameNavigated') {
        lastFrameNavigated = message.params?.frame?.url || '';
        remember(diagnostics.navigations, {
          type: 'frameNavigated',
          url: lastFrameNavigated.slice(0, 240)
        });
      } else if (message.method === 'Page.loadEventFired') {
        lastLoadEventAt = Date.now();
        remember(diagnostics.navigations, { type: 'loadEventFired', at: lastLoadEventAt });
      } else if (message.method === 'Page.domContentEventFired') {
        lastDomContentEventAt = Date.now();
        remember(diagnostics.navigations, { type: 'domContentEventFired', at: lastDomContentEventAt });
      } else if (message.method === 'Log.entryAdded') {
        remember(diagnostics.logs, {
          level: message.params?.entry?.level || '',
          text: String(message.params?.entry?.text || '').slice(0, 240),
          url: message.params?.entry?.url || ''
        });
      }
      return;
    }
    if (!message.id || !pending.has(message.id)) return;
    const slot = pending.get(message.id);
    clearTimeout(slot.timer);
    pending.delete(message.id);
    if (message.error) slot.reject(new Error(message.error.message));
    else slot.resolve(message.result);
  });
  ws.addEventListener('close', () => {
    socketClosed = true;
    rejectPending('CDP websocket closed');
  });
  ws.addEventListener('error', event => {
    socketClosed = true;
    rejectPending(event.error?.message || 'CDP websocket error');
  });

  function send(method, params = {}, timeout = 30000) {
    if (socketClosed || ws.readyState !== 1) {
      return Promise.reject(new Error(`CDP websocket is not open for ${method}`));
    }
    const callId = ++id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(callId);
        reject(new Error(`${method} timeout after ${timeout}ms; diagnostics=${JSON.stringify(diagnosticsSummary())}`));
      }, timeout);
      pending.set(callId, { callId, method, startedAt: Date.now(), resolve, reject, timer });
      try {
        ws.send(JSON.stringify({ id: callId, method, params }));
      } catch (error) {
        clearTimeout(timer);
        pending.delete(callId);
        reject(error);
      }
    });
  }

  async function bestEffortSend(method, params = {}, timeout = 3500) {
    try {
      return await send(method, params, timeout);
    } catch {
      return null;
    }
  }

  async function evaluate(expression, timeout) {
    let result;
    try {
      result = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true
      }, timeout);
    } catch (error) {
      if (!/timeout/i.test(error.message || '')) throw error;
      await wait(250);
      result = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true
      }, Math.max(timeout || 30000, 45000));
    }
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Runtime exception');
    }
    return result.result.value;
  }

  async function waitForPageReady(timeout = 12000) {
    return waitForCondition(`document.readyState === 'interactive' || document.readyState === 'complete'`, timeout);
  }

  async function navigate(url, timeout = 45000) {
    await send('Page.navigate', { url }, timeout);
    const ready = await waitForPageReady(timeout);
    if (!ready) throw new Error(`Page did not become ready after navigation to ${url}; diagnostics=${JSON.stringify(diagnosticsSummary())}`);
  }

  async function reload(timeout = 45000) {
    await send('Page.reload', {}, timeout);
    const ready = await waitForPageReady(timeout);
    if (!ready) throw new Error(`Page did not become ready after reload; diagnostics=${JSON.stringify(diagnosticsSummary())}`);
  }

  async function click(selector) {
    return evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.focus?.({ preventScroll: true });
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

  async function waitForCondition(expression, timeout = 8000) {
    const deadline = Date.now() + timeout;
    let lastError = null;
    while (Date.now() < deadline) {
      try {
        const found = await evaluate(`Boolean(${expression})`);
        if (found) return true;
      } catch (error) {
        lastError = error;
      }
      await wait(200);
    }
    if (lastError) console.warn(`[smoke:games] Condition wait ended after error: ${lastError.message}`);
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

  const smokeHarnessSource = `(() => {
    window.__atherixSmokeCountCanvasPixels = (selector) => {
      const source = document.querySelector(selector);
      if (!source) return { colored: 0, nonBlank: false, width: 0, height: 0 };
      const sample = document.createElement('canvas');
      sample.width = source.width || source.clientWidth || 1;
      sample.height = source.height || source.clientHeight || 1;
      const ctx = sample.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, 0, 0, sample.width, sample.height);
      const data = ctx.getImageData(0, 0, sample.width, sample.height).data;
      let colored = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] || data[i + 1] || data[i + 2]) colored++;
      }
      return { colored, nonBlank: colored > 1000, width: sample.width, height: sample.height };
    };
  })();`;

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: smokeHarnessSource });
  await bestEffortSend('Network.enable');
  await bestEffortSend('Log.enable');
  await navigate(appUrl);
  await waitFor('.nav-item[data-target="blog"]', 12000);
  await evaluate(`localStorage.setItem('admin_token', 'fake-token-for-smoke')`);
  await reload();
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

  const accessibilityBaseline = await evaluate(`(() => ({
    skipHref: document.querySelector('.skip-link')?.getAttribute('href') || '',
    mainTabIndex: document.querySelector('#main-content')?.getAttribute('tabindex') || '',
    buttonsMissingType: document.querySelectorAll('button:not([type])').length,
    commandTriggerLabel: document.querySelector('#command-palette-trigger')?.getAttribute('aria-label') || '',
    adminTriggerLabel: document.querySelector('#admin-login-trigger')?.getAttribute('aria-label') || '',
    adminUsernameAutocomplete: document.querySelector('#admin-username')?.getAttribute('autocomplete') || '',
    adminPasswordAutocomplete: document.querySelector('#admin-password')?.getAttribute('autocomplete') || '',
    preloads: Array.from(document.querySelectorAll('link[rel="preload"]')).map(link => ({
      href: link.getAttribute('href') || '',
      as: link.getAttribute('as') || ''
    })),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  }))()`);

  await click('#command-palette-trigger');
  await waitFor('#command-palette.active');
  await wait(120);
  const commandFocusOpenState = await evaluate(`(() => {
    const palette = document.querySelector('#command-palette');
    return {
      open: palette?.classList.contains('active') || false,
      ariaHidden: palette?.getAttribute('aria-hidden') || '',
      focusId: document.activeElement?.id || '',
      focusInside: palette?.contains(document.activeElement) || false
    };
  })()`);
  await key('keyDown', 'Escape', 'Escape');
  await key('keyUp', 'Escape', 'Escape');
  await wait(180);
  const commandFocusClosedState = await evaluate(`(() => ({
    open: document.querySelector('#command-palette')?.classList.contains('active') || false,
    ariaHidden: document.querySelector('#command-palette')?.getAttribute('aria-hidden') || '',
    focusId: document.activeElement?.id || ''
  }))()`);

  await click('#admin-login-trigger');
  await waitFor('#admin-login-modal.active');
  await wait(160);
  const adminModalOpenState = await evaluate(`(() => {
    const modal = document.querySelector('#admin-login-modal');
    return {
      open: modal?.classList.contains('active') || false,
      role: modal?.getAttribute('role') || '',
      ariaHidden: modal?.getAttribute('aria-hidden') || '',
      focusId: document.activeElement?.id || '',
      focusInside: modal?.contains(document.activeElement) || false
    };
  })()`);
  await key('keyDown', 'Escape', 'Escape');
  await key('keyUp', 'Escape', 'Escape');
  await wait(380);
  const adminModalClosedState = await evaluate(`(() => ({
    open: document.querySelector('#admin-login-modal')?.classList.contains('active') || false,
    ariaHidden: document.querySelector('#admin-login-modal')?.getAttribute('aria-hidden') || '',
    display: getComputedStyle(document.querySelector('#admin-login-modal')).display,
    focusId: document.activeElement?.id || ''
  }))()`);

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

  await click('#command-palette-trigger');
  await waitFor('#command-palette.active');
  await evaluate(`(() => {
    const input = document.querySelector('#command-search-input');
    input.value = '保险库';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await wait(180);
  const vaultCommandBeforeExecute = await evaluate(`(() => ({
    open: document.querySelector('#command-palette')?.classList.contains('active') || false,
    results: document.querySelectorAll('.command-result-item').length,
    firstTitle: document.querySelector('.command-result-title')?.textContent || '',
    firstType: document.querySelector('.command-result-type')?.textContent || ''
  }))()`);
  await evaluate(`document.querySelector('.command-result-item')?.click()`);
  await wait(500);
  const vaultCommandState = await evaluate(`(() => ({
    closed: !document.querySelector('#command-palette')?.classList.contains('active'),
    toolboxActive: document.querySelector('#toolbox')?.classList.contains('active') || false,
    vaultActive: document.querySelector('#tool-vault')?.classList.contains('active') || false,
    navActive: document.querySelector('.tool-nav-btn[data-tool="vault"]')?.classList.contains('active') || false,
    debugReady: !!window.__atherixDebug?.vault,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  }))()`);

  const vaultExportState = await evaluate(`(async () => {
    localStorage.setItem('admin_token', 'vault-secret-should-not-export');
    localStorage.setItem('atherix_reader_progress_vault-smoke', '64');
    localStorage.setItem('atherix_premium_survivor_best', '1234');
    window.__atherixDebug?.vault?.summary?.();

    const clicks = [];
    let blobTextPromise = Promise.resolve('');
    const originalClick = HTMLAnchorElement.prototype.click;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    try {
      HTMLAnchorElement.prototype.click = function () {
        clicks.push({ download: this.download || '', href: this.href || '' });
      };
      URL.createObjectURL = function (blob) {
        blobTextPromise = blob.text();
        return 'blob:atherix-vault-smoke';
      };
      URL.revokeObjectURL = function () {};
      document.querySelector('#vault-export-btn')?.click();
      await new Promise(resolve => setTimeout(resolve, 160));
    } finally {
      HTMLAnchorElement.prototype.click = originalClick;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }

    const blobText = await blobTextPromise;
    const payload = JSON.parse(blobText || '{}');
    return {
      clicks,
      schema: payload.schema || '',
      keys: Object.keys(payload.storage || {}).length,
      hasAdminToken: Object.prototype.hasOwnProperty.call(payload.storage || {}, 'admin_token'),
      readerValue: payload.storage?.['atherix_reader_progress_vault-smoke'] || '',
      survivorBest: payload.storage?.['atherix_premium_survivor_best'] || '',
      keyCountText: document.querySelector('#vault-key-count')?.textContent || '',
      byteText: document.querySelector('#vault-byte-size')?.textContent || '',
      readerText: document.querySelector('#vault-reader-count')?.textContent || '',
      arcadeText: document.querySelector('#vault-arcade-count')?.textContent || '',
      toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || ''
    };
  })()`, 5000);

  const vaultImportState = await evaluate(`(async () => {
    const clearArcadeState = () => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
      keys
        .filter(key => key && (key === 'atherix_premium_arcade_career_v2' || key.startsWith('atherix_premium_') || key.startsWith('atherix_astro_runner_best_lvl_')))
        .forEach(key => localStorage.removeItem(key));
    };
    const payload = {
      schema: 'atherix-vault-v1',
      version: 1,
      storage: {
        theme: 'light',
        admin_token: 'should-not-import',
        outside_key: 'should-not-import',
        'atherix_reader_progress_vault-smoke': '77',
        'atherix_premium_survivor_best': '4321',
        'atherix_todos': JSON.stringify([{ text: 'Vault restored task', completed: false }])
      }
    };
    clearArcadeState();
    localStorage.setItem('admin_token', 'vault-secret-preserved');
    localStorage.removeItem('outside_key');
    localStorage.removeItem('atherix_reader_progress_vault-smoke');
    const result = window.__atherixDebug.vault.importText(JSON.stringify(payload));
    await new Promise(resolve => setTimeout(resolve, 260));
    const state = {
      imported: result.imported,
      ignored: result.ignored,
      progress: localStorage.getItem('atherix_reader_progress_vault-smoke') || '',
      survivorBest: localStorage.getItem('atherix_premium_survivor_best') || '',
      tokenAfter: localStorage.getItem('admin_token') || '',
      outsideKey: localStorage.getItem('outside_key') || '',
      theme: document.documentElement.getAttribute('data-theme') || '',
      keyCountText: document.querySelector('#vault-key-count')?.textContent || '',
      readerText: document.querySelector('#vault-reader-count')?.textContent || '',
      arcadeText: document.querySelector('#vault-arcade-count')?.textContent || '',
      listHasProgress: [...document.querySelectorAll('.vault-preview-copy strong')].some(el => el.textContent === 'atherix_reader_progress_vault-smoke'),
      todoStored: localStorage.getItem('atherix_todos') || '',
      toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || ''
    };
    localStorage.removeItem('admin_token');
    return state;
  })()`, 5000);
  const vaultClearConfirmState = await evaluate(`(async () => {
    localStorage.setItem('atherix_reader_progress_clear-smoke', '31');
    localStorage.setItem('atherix_todos', JSON.stringify([{ text: 'Clear smoke task', completed: false }]));
    window.__atherixDebug.vault.summary();
    document.querySelector('#vault-clear-btn')?.click();
    await new Promise(resolve => setTimeout(resolve, 180));
    const modal = document.querySelector('#site-confirm-modal');
    const openBeforeCancel = modal?.classList.contains('active') || false;
    const role = modal?.getAttribute('role') || '';
    const ariaHiddenBeforeCancel = modal?.getAttribute('aria-hidden') || '';
    const focusedCancel = document.activeElement?.classList.contains('confirm-cancel-btn') || false;
    const title = modal?.querySelector('#site-confirm-title')?.textContent || '';
    const message = modal?.querySelector('#site-confirm-message')?.textContent || '';
    modal?.querySelector('.confirm-cancel-btn')?.click();
    await new Promise(resolve => setTimeout(resolve, 360));
    const stillStoredAfterCancel = localStorage.getItem('atherix_reader_progress_clear-smoke') || '';
    const closedAfterCancel = !(modal?.classList.contains('active'));
    document.querySelector('#vault-clear-btn')?.click();
    await new Promise(resolve => setTimeout(resolve, 180));
    const openBeforeAccept = modal?.classList.contains('active') || false;
    modal?.querySelector('.confirm-accept-btn')?.click();
    await new Promise(resolve => setTimeout(resolve, 420));
    const clearedAfterAccept = !localStorage.getItem('atherix_reader_progress_clear-smoke') && !localStorage.getItem('atherix_todos');
    const clearToast = document.querySelector('.toast-stack .toast:last-child')?.textContent || '';
    window.__atherixDebug.vault.importText(JSON.stringify({
      schema: 'atherix-vault-v1',
      version: 1,
      storage: {
        theme: 'light',
        'atherix_reader_progress_vault-smoke': '77',
        'atherix_premium_survivor_best': '4321',
        'atherix_todos': JSON.stringify([{ text: 'Vault restored task', completed: false }])
      }
    }));
    await new Promise(resolve => setTimeout(resolve, 260));
    return {
      openBeforeCancel,
      role,
      ariaHiddenBeforeCancel,
      focusedCancel,
      title,
      message,
      stillStoredAfterCancel,
      closedAfterCancel,
      openBeforeAccept,
      clearedAfterAccept,
      ariaHiddenAfterAccept: modal?.getAttribute('aria-hidden') || '',
      clearToast,
      restoreToast: document.querySelector('.toast-stack .toast:last-child')?.textContent || ''
    };
  })()`, 5000);
  const legacyVaultHydrationState = await evaluate(`(() => {
    const leaderboard = window.__atherixDebug?.premium?.leaderboard?.() || {};
    const profile = window.__atherixDebug?.premium?.profile?.() || {};
    const mastery = window.__atherixDebug?.premium?.mastery?.() || [];
    const prize = window.__atherixDebug?.premium?.prizeTrack?.() || {};
    const stored = JSON.parse(localStorage.getItem('atherix_premium_arcade_career_v2') || '{}');
    const state = {
      survivorBest: Number(stored.best?.survivor || 0),
      survivorMedal: stored.medals?.survivor || '',
      totalScore: Number(stored.totalScore || 0),
      leaderboardTopGame: leaderboard.entries?.[0]?.game || '',
      leaderboardTopScore: Number(leaderboard.entries?.[0]?.score || 0),
      profileTopGame: profile.top?.game || '',
      profileMedals: profile.medalCount || 0,
      masterySurvivorScore: Number(mastery.find(item => item.game === 'survivor')?.score || 0),
      prizeTotal: Number(prize.total || 0),
      prizeProgress: Number(prize.progress || 0),
      prizeUnlocked: Number(prize.unlocked || 0),
      totalText: document.querySelector('#premium-career-total')?.textContent || ''
    };
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
    keys
      .filter(key => key && (key === 'atherix_premium_arcade_career_v2' || key.startsWith('atherix_premium_') || key.startsWith('atherix_astro_runner_best_lvl_')))
      .forEach(key => localStorage.removeItem(key));
    document.dispatchEvent(new CustomEvent('atherix:vault-imported', { detail: { keys: [] } }));
    window.__atherixDebug?.vault?.summary?.();
    return state;
  })()`);

  await click('.nav-item[data-target="blog"]');
  await waitFor('.blog-post-card');
  const blogHubBefore = await evaluate(`(() => {
    const firstCard = document.querySelector('.blog-post-card');
    const firstPostId = firstCard?.dataset.postId || '';
    if (firstPostId) {
      localStorage.setItem(\`atherix_reader_progress_\${firstPostId}\`, '42');
      document.querySelector('#blog-search')?.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return {
      firstPostId,
      panel: !!document.querySelector('#blog-insight-panel'),
      total: Number(document.querySelector('#blog-total-count')?.textContent || 0),
      filters: document.querySelectorAll('[data-reader-filter]').length,
      cards: document.querySelectorAll('.blog-post-card').length,
      cardLinks: document.querySelectorAll('.blog-post-card a[data-post-link]').length,
      firstCardHref: document.querySelector('.blog-post-card a[data-post-link]')?.getAttribute('href') || '',
      pinnedLinks: document.querySelectorAll('[data-pinned-post-link]').length,
      quickRole: document.querySelector('#quick-blog-card')?.getAttribute('role') || '',
      quickTabIndex: document.querySelector('#quick-blog-card')?.getAttribute('tabindex') || '',
      progressCards: document.querySelectorAll('.post-state-chip.is-progress').length,
      progressText: document.querySelector('.post-state-chip.is-progress')?.textContent || '',
      average: document.querySelector('#blog-average-progress')?.textContent || '',
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    };
  })()`);
  await click('.blog-post-card');
  await waitFor('#reader-post-content h2');
  await click('#reader-bookmark-btn');
  await wait(150);
  await click('#reader-mark-read-btn');
  await wait(150);
  const readerCompletionState = await evaluate(`(() => {
    const postId = new URLSearchParams(location.search).get('post') || location.hash.replace(/^#post\\//, '');
    return {
      postId,
      search: location.search,
      stored: localStorage.getItem(\`atherix_reader_progress_\${postId}\`) || '',
      label: document.querySelector('#reader-mark-read-btn')?.textContent.trim() || '',
      pressed: document.querySelector('#reader-mark-read-btn')?.getAttribute('aria-pressed') === 'true',
      progress: document.querySelector('#reader-progress-percent')?.textContent || ''
    };
  })()`);
  await click('#reader-mark-read-btn');
  await wait(150);
  const readerResetState = await evaluate(`(() => {
    const postId = new URLSearchParams(location.search).get('post') || location.hash.replace(/^#post\\//, '');
    return {
      postId,
      search: location.search,
      stored: localStorage.getItem(\`atherix_reader_progress_\${postId}\`) || '',
      label: document.querySelector('#reader-mark-read-btn')?.textContent.trim() || '',
      pressed: document.querySelector('#reader-mark-read-btn')?.getAttribute('aria-pressed') === 'true',
      progress: document.querySelector('#reader-progress-percent')?.textContent || ''
    };
  })()`);
  await wait(1550);
  await evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
  await wait(250);
  await waitFor('#reader-next-panel.active [data-reader-next-open]', 5000);
  const blogState = await evaluate(`(() => ({
    hash: location.hash,
    search: location.search,
    visibleArticle: document.querySelector('#blog-reader')?.classList.contains('active') && !!document.querySelector('#reader-post-content')?.innerText.trim(),
    articleChars: document.querySelector('#reader-post-content')?.innerText.trim().length || 0,
    toolbar: [
      '#reader-copy-link-btn',
      '#reader-share-btn',
      '#reader-bookmark-btn',
      '#reader-mark-read-btn',
      '#reader-mode-btn',
      '#reader-export-md-btn'
    ].every(selector => !!document.querySelector(selector)),
    bookmarkPressed: document.querySelector('#reader-bookmark-btn')?.getAttribute('aria-pressed') === 'true',
    progress: document.querySelector('#reader-progress-percent')?.textContent || '',
    tocActive: document.querySelector('#reader-toc')?.classList.contains('active') || false,
    tocLinks: document.querySelectorAll('#reader-toc a').length,
    nextPanel: document.querySelector('#reader-next-panel')?.classList.contains('active') || false,
    nextCards: document.querySelectorAll('#reader-next-panel .reader-next-item').length,
    nextReasons: [...document.querySelectorAll('#reader-next-panel .reader-next-reason')].map(el => el.textContent.trim()),
    nextProgress: document.querySelector('#reader-next-panel .reader-next-progress-fill')?.style.width || '',
    nextFirstTitle: document.querySelector('#reader-next-panel .reader-next-title')?.textContent.trim() || '',
    nextFirstPostId: document.querySelector('#reader-next-panel .reader-next-item')?.dataset.readerNextId || '',
    codeBlocks: document.querySelectorAll('#reader-post-content pre code').length,
    inlineCode: document.querySelectorAll('#reader-post-content p code, #reader-post-content li code').length,
    orderedItems: document.querySelectorAll('#reader-post-content ol li').length,
    unorderedItems: document.querySelectorAll('#reader-post-content ul li').length
  }))()`);
  const readerNextClicked = await click('#reader-next-panel [data-reader-next-open]');
  if (blogState.nextFirstTitle) {
    await waitForCondition(`document.querySelector('#reader-post-title')?.textContent.trim() === ${JSON.stringify(blogState.nextFirstTitle)}`, 5000);
  }
  await wait(180);
  const readerNextOpenState = await evaluate(`(() => ({
    clicked: ${JSON.stringify(readerNextClicked)},
    hash: location.hash,
    search: location.search,
    route: location.pathname + location.search + location.hash,
    title: document.querySelector('#reader-post-title')?.textContent.trim() || '',
    expectedTitle: ${JSON.stringify(blogState.nextFirstTitle)},
    expectedPostId: ${JSON.stringify(blogState.nextFirstPostId)},
    visibleArticle: document.querySelector('#blog-reader')?.classList.contains('active') && !!document.querySelector('#reader-post-content')?.innerText.trim(),
    nextPanel: document.querySelector('#reader-next-panel')?.classList.contains('active') || false,
    nextCards: document.querySelectorAll('#reader-next-panel .reader-next-item').length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  }))()`);
  await click('#reader-mode-btn');
  await wait(150);
  const readerToolState = await evaluate(`(() => ({
    shareButton: !!document.querySelector('#reader-share-btn'),
    exportButton: !!document.querySelector('#reader-export-md-btn'),
    modePressed: document.querySelector('#reader-mode-btn')?.getAttribute('aria-pressed') === 'true',
    focusClass: document.querySelector('#blog-reader-card')?.classList.contains('reader-focus-mode') || false,
    storedMode: localStorage.getItem('atherix_reader_focus_mode') || '',
    label: document.querySelector('#reader-mode-btn')?.textContent.trim() || '',
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  }))()`);
  const readerExportState = await evaluate(`(async () => {
    const clicks = [];
    let blobInfo = null;
    const originalClick = HTMLAnchorElement.prototype.click;
    const originalCreateObjectURL = URL.createObjectURL;
    HTMLAnchorElement.prototype.click = function () {
      clicks.push({ download: this.download || '', href: this.href || '' });
    };
    URL.createObjectURL = function (blob) {
      blobInfo = { type: blob.type || '', size: blob.size || 0 };
      return originalCreateObjectURL.call(URL, blob);
    };
    document.querySelector('#reader-export-md-btn')?.click();
    await new Promise(resolve => setTimeout(resolve, 120));
    HTMLAnchorElement.prototype.click = originalClick;
    URL.createObjectURL = originalCreateObjectURL;
    return {
      clicks,
      blobInfo,
      toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || ''
    };
  })()`, 3000);
  await click('#reader-back-btn');
  await wait(220);
  await click('[data-reader-filter="bookmarked"]');
  await wait(180);
  const blogHubAfterBookmark = await evaluate(`(() => ({
    activeFilter: document.querySelector('[data-reader-filter="bookmarked"]')?.classList.contains('active') || false,
    bookmarkCount: Number(document.querySelector('#blog-bookmark-count')?.textContent || 0),
    cards: document.querySelectorAll('.blog-post-card').length,
    bookmarkedCards: document.querySelectorAll('.post-state-chip.is-bookmarked').length,
    progressCards: document.querySelectorAll('.post-state-chip.is-progress').length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  }))()`);
  const badPostRouteState = await evaluate(`(async () => {
    const fireHash = hash => {
      history.pushState(null, '', \`/\${hash}\`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    };
    fireHash('#post/not-found-smoke');
    await new Promise(resolve => setTimeout(resolve, 180));
    const missing = {
      hash: location.hash,
      blogActive: document.querySelector('#blog')?.classList.contains('active') || false,
      readerActive: document.querySelector('#blog-reader')?.classList.contains('active') || false
    };
    fireHash('#post/%E0%A4%A');
    await new Promise(resolve => setTimeout(resolve, 180));
    const malformed = {
      hash: location.hash,
      blogActive: document.querySelector('#blog')?.classList.contains('active') || false,
      readerActive: document.querySelector('#blog-reader')?.classList.contains('active') || false,
      toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || ''
    };
    history.pushState(null, '', '/?post=not-found-query-smoke');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await new Promise(resolve => setTimeout(resolve, 180));
    const badQuery = {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      blogActive: document.querySelector('#blog')?.classList.contains('active') || false,
      readerActive: document.querySelector('#blog-reader')?.classList.contains('active') || false
    };
    history.pushState(null, '', '/?post=post-1');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await new Promise(resolve => setTimeout(resolve, 220));
    const queryOpen = {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      readerActive: document.querySelector('#blog-reader')?.classList.contains('active') || false,
      title: document.querySelector('#reader-post-title')?.textContent.trim() || ''
    };
    return { missing, malformed, badQuery, queryOpen };
  })()`);

  await click('.nav-item[data-target="guestbook"]');
  await waitFor('#guestbook-form');
  await wait(180);
  const guestbookA11yState = await evaluate(`(() => {
    const content = document.querySelector('#gb-content');
    if (content) content.value = '';
    const avatars = [...document.querySelectorAll('.avatar-option')];
    avatars[1]?.click();
    const trigger = document.querySelector('#emoji-trigger');
    trigger?.click();
    const firstEmoji = document.querySelector('.emoji-item');
    firstEmoji?.focus();
    const focusedEmoji = document.activeElement === firstEmoji;
    firstEmoji?.click();
    return {
      avatarButtons: avatars.length,
      avatarButtonTypes: avatars.filter(btn => btn.tagName === 'BUTTON' && btn.getAttribute('type') === 'button').length,
      activeAvatar: document.querySelector('.avatar-option.active')?.dataset.avatar || '',
      activePressed: document.querySelector('.avatar-option.active')?.getAttribute('aria-pressed') || '',
      inactivePressed: document.querySelector('.avatar-option:not(.active)')?.getAttribute('aria-pressed') || '',
      hiddenAvatar: document.querySelector('#gb-avatar-val')?.value || '',
      emojiButtons: document.querySelectorAll('.emoji-item[role="menuitem"]').length,
      triggerExpandedAfterClose: trigger?.getAttribute('aria-expanded') || '',
      focusedEmoji,
      contentValue: content?.value || '',
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    };
  })()`);

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
  const projectState = await evaluate(`(() => {
    const isLocalAsset = value => {
      try {
        const url = new URL(value || '', location.href);
        return url.origin === location.origin && url.pathname.startsWith('/assets/');
      } catch {
        return false;
      }
    };
    const projectImageSources = [...document.querySelectorAll('.project-banner-img')]
      .map(img => img.getAttribute('src') || img.currentSrc || img.src || '');
    const modalImage = document.querySelector('#modal-project-img')?.getAttribute('src') || document.querySelector('#modal-project-img')?.currentSrc || '';
    return {
      cards: document.querySelectorAll('.project-card').length,
      disabledLiveButtons: document.querySelectorAll('.project-card .project-btn-disabled[aria-disabled="true"]').length,
      modalOpen: document.querySelector('#project-modal')?.classList.contains('active') || false,
      modalAriaHidden: document.querySelector('#project-modal')?.getAttribute('aria-hidden') || '',
      modalRole: document.querySelector('#project-modal')?.getAttribute('role') || '',
      modalFocusInside: document.querySelector('#project-modal')?.contains(document.activeElement) || false,
      modalFocusId: document.activeElement?.id || '',
      modalLiveDisabled: document.querySelector('#modal-live-link')?.getAttribute('aria-disabled') === 'true',
      fakeHashLinks: [...document.querySelectorAll('.project-card a[href$="/#"], .project-card a[href="#"]')].length,
      projectImageSources,
      localProjectImages: projectImageSources.filter(isLocalAsset).length,
      externalProjectImages: projectImageSources.filter(src => /images\\.unsplash/i.test(src)).length,
      arcadeProjectCard: [...document.querySelectorAll('.project-card')].some(card => /Premium Arcade Suite/.test(card.textContent || '')),
      modalImage,
      modalImageLocal: isLocalAsset(modalImage)
    };
  })()`);
  await key('keyDown', 'Escape', 'Escape');
  await key('keyUp', 'Escape', 'Escape');
  await wait(380);
  const projectModalClosedState = await evaluate(`(() => ({
    open: document.querySelector('#project-modal')?.classList.contains('active') || false,
    ariaHidden: document.querySelector('#project-modal')?.getAttribute('aria-hidden') || '',
    display: getComputedStyle(document.querySelector('#project-modal')).display,
    focusClass: document.activeElement?.className || ''
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
    const scoreBefore = Number(document.querySelector('#game-score')?.textContent || 0);
    const initialDebug = window.__atherixDebug?.runnerState?.() || {};
    firePointer('#btn-start-led', 'pointerdown');
    firePointer('#btn-start-led', 'pointerup');
    await new Promise(resolve => setTimeout(resolve, 180));
    firePointer('#btn-right-led', 'pointerdown');
    await new Promise(resolve => setTimeout(resolve, 360));
    firePointer('#btn-right-led', 'pointerup');
    firePointer('#btn-dash-led', 'pointerdown');
    firePointer('#btn-dash-led', 'pointerup');
    await new Promise(resolve => setTimeout(resolve, 220));
    const scoreAfterDash = Number(document.querySelector('#game-score')?.textContent || 0);
    const comboAfterDash = document.querySelector('#game-combo')?.textContent || '';
    const contractAfterDash = document.querySelector('#game-contract')?.textContent || '';
    const debugAfterDash = window.__atherixDebug?.runnerState?.() || {};
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
    const forceContract = window.__atherixDebug?.forceRunnerContract?.() || {};
    await new Promise(resolve => setTimeout(resolve, 120));
    const debug = window.__atherixDebug?.runnerState?.() || {};
    const player = window.__atherixDebug?.player || {};
    return {
      controls,
      overlayAfterStart: document.querySelector('#game-overlay-screen')?.style.display || '',
      beforeX,
      afterX: player.x || 0,
      dashReady: !!player.dashReady,
      dashCooldownUntil: player.dashCooldownUntil || 0,
      running: !!window.__atherixDebug?.gameRunning?.(),
      scoreBefore,
      scoreAfterDash,
      comboAfterDash,
      contractAfterDash,
      initialDebug,
      debugAfterDash,
      forceContract,
      debug,
      scoreHud: document.querySelector('#game-score')?.textContent || '',
      comboHud: document.querySelector('#game-combo')?.textContent || '',
      contractHud: document.querySelector('#game-contract')?.textContent || '',
      statusHud: document.querySelector('#game-status')?.textContent || '',
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
  const runnerGamepadState = await evaluate(`(async () => {
    const api = window.__atherixDebug;
    const before = api?.player || {};
    const beforePad = api?.runnerGamepad?.() || {};
    api?.simulateRunnerGamepad?.({ right: true }, 520);
    await new Promise(resolve => setTimeout(resolve, 320));
    const afterMove = api?.player || {};
    const movingPad = api?.runnerGamepad?.() || {};
    api?.simulateRunnerGamepad?.({ right: false }, 120);
    await new Promise(resolve => setTimeout(resolve, 80));
    const releasedPad = api?.runnerGamepad?.() || {};
    return {
      beforeX: before.x || 0,
      afterX: afterMove.x || 0,
      running: !!api?.gameRunning?.(),
      beforePad,
      movingPad,
      releasedPad,
      statusText: document.querySelector('#runner-gamepad-status')?.textContent || '',
      statusTone: document.querySelector('#runner-gamepad-status')?.dataset.tone || '',
      debug: api?.runnerState?.() || {}
    };
  })()`, 3000);
  await evaluate(`window.__atherixDebug?.premium?.resetFeedback?.(false)`);
  const arcadeInitial = await evaluate(`(() => ({
    premium: !!document.querySelector('#premium-game-stage'),
    careerPanel: !!document.querySelector('#premium-career-rating'),
    dailyChallenge: document.querySelector('#premium-daily-challenge')?.textContent || '',
    cockpitPanel: !!document.querySelector('#premium-cockpit-panel'),
    cockpitTitle: document.querySelector('#premium-cockpit-title')?.textContent || '',
    cockpitSummary: document.querySelector('#premium-cockpit-summary')?.textContent || '',
    cockpitMode: document.querySelector('#premium-cockpit-mode')?.textContent || '',
    cockpitDifficulty: document.querySelector('#premium-cockpit-difficulty')?.textContent || '',
    cockpitLoadout: document.querySelector('#premium-cockpit-loadout')?.textContent || '',
    cockpitSeason: document.querySelector('#premium-cockpit-season')?.textContent || '',
    cockpitTarget: document.querySelector('#premium-cockpit-target')?.dataset.cockpitTargetGame || '',
    cockpitActionLabel: document.querySelector('#premium-cockpit-play')?.getAttribute('aria-label') || '',
    debugCockpit: window.__atherixDebug?.premium?.cockpit?.() || {},
    directorPanel: !!document.querySelector('#premium-arcade-director'),
    directorTarget: document.querySelector('#premium-director-start')?.dataset.targetGame || '',
    directorTitle: document.querySelector('#premium-director-title')?.textContent || '',
    directorReason: document.querySelector('#premium-director-reason')?.textContent || '',
    directorMedals: document.querySelector('#premium-director-medals')?.textContent || '',
    directorAchievements: document.querySelector('#premium-director-achievements')?.textContent || '',
    directorCompletion: document.querySelector('#premium-director-completion')?.textContent || '',
    profilePanel: !!document.querySelector('#premium-profile-panel'),
    profileTitle: document.querySelector('#premium-profile-title')?.textContent || '',
    profileCompletion: document.querySelector('#premium-profile-completion')?.textContent || '',
    profileMedals: document.querySelector('#premium-profile-medals')?.textContent || '',
    profileAchievements: document.querySelector('#premium-profile-achievements')?.textContent || '',
    profileTarget: document.querySelector('#premium-profile-target')?.dataset.profileTargetGame || '',
    profileProgressRole: document.querySelector('#premium-profile-progressbar')?.getAttribute('role') || '',
    profileProgressNow: document.querySelector('#premium-profile-progressbar')?.getAttribute('aria-valuenow') || '',
    debugProfile: window.__atherixDebug?.premium?.profile?.() || {},
    prizePanel: !!document.querySelector('#premium-prize-track'),
    prizeTitle: document.querySelector('#premium-prize-title')?.textContent || '',
    prizeSummary: document.querySelector('#premium-prize-summary')?.textContent || '',
    prizeNodes: document.querySelectorAll('.arcade-prize-node').length,
    prizeClaimedNodes: document.querySelectorAll('.arcade-prize-node[data-state="claimed"]').length,
    prizeNextNodes: document.querySelectorAll('.arcade-prize-node[data-state="next"]').length,
    prizeTarget: document.querySelector('#premium-prize-target')?.dataset.prizeTargetGame || '',
    prizeProgressRole: document.querySelector('#premium-prize-progressbar')?.getAttribute('role') || '',
    prizeProgressNow: document.querySelector('#premium-prize-progressbar')?.getAttribute('aria-valuenow') || '',
    debugPrize: window.__atherixDebug?.premium?.prizeTrack?.() || {},
    masteryPanel: !!document.querySelector('#premium-mastery-panel'),
    masteryCards: document.querySelectorAll('.arcade-mastery-card').length,
    debugMastery: window.__atherixDebug?.premium?.mastery?.().length || 0,
    masteryTitle: document.querySelector('#premium-mastery-title')?.textContent || '',
    masterySummary: document.querySelector('#premium-mastery-summary')?.textContent || '',
    contractBoard: !!document.querySelector('#premium-contract-board'),
    contractCards: document.querySelectorAll('.arcade-contract-card').length,
    debugContracts: window.__atherixDebug?.premium?.contracts?.().length || 0,
    firstContractProgress: window.__atherixDebug?.premium?.contracts?.()[0]?.progress ?? -1,
    leaguePanel: !!document.querySelector('#premium-league-panel'),
    leagueCards: document.querySelectorAll('.arcade-league-stage').length,
    leagueTitle: document.querySelector('#premium-league-title')?.textContent || '',
    leagueSummary: document.querySelector('#premium-league-summary')?.textContent || '',
    leagueProgress: document.querySelector('#premium-league-progress')?.textContent || '',
    leagueReward: document.querySelector('#premium-league-reward')?.textContent || '',
    leagueTarget: document.querySelector('#premium-league-start')?.dataset.leagueTargetGame || '',
    debugLeague: window.__atherixDebug?.premium?.league?.() || {},
    runLogPanel: !!document.querySelector('#premium-run-log-panel'),
    runLogEmpty: document.querySelector('#premium-run-log-panel')?.dataset.empty || '',
    runLogCards: document.querySelectorAll('.arcade-run-log-item').length,
    debugRuns: window.__atherixDebug?.premium?.runs?.().length || 0,
    leaderboardPanel: !!document.querySelector('#premium-leaderboard-panel'),
    leaderboardEmpty: document.querySelector('#premium-leaderboard-panel')?.dataset.empty || '',
    leaderboardCards: document.querySelectorAll('.arcade-leaderboard-card').length,
    leaderboardTitle: document.querySelector('#premium-leaderboard-title')?.textContent || '',
    leaderboardTotal: document.querySelector('#premium-leaderboard-total')?.textContent || '',
    debugLeaderboard: window.__atherixDebug?.premium?.leaderboard?.() || {},
    rivalPanel: !!document.querySelector('#premium-rival-panel'),
    rivalTitle: document.querySelector('#premium-rival-title')?.textContent || '',
    rivalTarget: document.querySelector('#premium-rival-target')?.textContent || '',
    rivalGap: document.querySelector('#premium-rival-gap')?.textContent || '',
    rivalPressure: document.querySelector('#premium-rival-pressure')?.textContent || '',
    rivalActionTarget: document.querySelector('#premium-rival-start')?.dataset.rivalTargetGame || '',
    debugRival: window.__atherixDebug?.premium?.rival?.() || {},
    coachPanel: !!document.querySelector('#premium-run-coach-panel'),
    coachEmpty: document.querySelector('#premium-run-coach-panel')?.dataset.empty || '',
    coachLaunchDisabled: !!document.querySelector('#premium-coach-launch')?.disabled,
    coachDifficultyDisabled: !!document.querySelector('#premium-coach-difficulty')?.disabled,
    coachLoadoutDisabled: !!document.querySelector('#premium-coach-loadout')?.disabled,
    difficultyPanel: !!document.querySelector('#premium-difficulty-panel'),
    difficultyCards: document.querySelectorAll('.arcade-difficulty-card').length,
    activeDifficulty: window.__atherixDebug?.premium?.difficulty?.().active || '',
    loadoutPanel: !!document.querySelector('#premium-loadout-panel'),
    loadoutCards: document.querySelectorAll('.arcade-loadout-card').length,
    activeLoadout: window.__atherixDebug?.premium?.loadout?.().active || '',
    loadoutUnlocked: window.__atherixDebug?.premium?.loadout?.().unlocked?.length || 0,
    premiumTabs: document.querySelectorAll('[data-premium-game]').length,
    tabBadges: document.querySelectorAll('.mini-game-medal-chip').length,
    driftPanel: !!document.querySelector('#premium-drift-canvas'),
    tacticsPanel: !!document.querySelector('#premium-tactics-canvas'),
    oldPrototypeCount: document.querySelectorAll('#snake-canvas,#breakout-canvas,#tile-board,#memory-board').length,
    touchControls: document.querySelectorAll('[data-premium-control]').length,
    gamepadStatus: document.querySelector('#premium-gamepad-status')?.textContent || '',
    chainCells: document.querySelectorAll('#premium-chain-board .chain-cell').length,
    chainTarget: document.querySelector('#premium-chain-target')?.textContent,
    feedbackPanel: !!document.querySelector('#premium-feedback-console'),
    feedbackStage: !!document.querySelector('#premium-stage-feedback'),
    feedbackStatus: document.querySelector('#premium-feedback-status')?.textContent || '',
    feedbackTogglePressed: document.querySelector('#premium-feedback-toggle')?.getAttribute('aria-pressed') || '',
    feedbackDebug: window.__atherixDebug?.premium?.feedback?.() || {}
  }))()`);
  const premiumGamepadState = await evaluate(`(() => {
    const api = window.__atherixDebug?.premium;
    document.querySelector('[data-premium-game="tactics"]')?.click();
    document.querySelector('#premium-tactics-start')?.click();
    const before = api?.tacticsState?.() || {};
    const applied = api?.simulateGamepad?.({ left: true }) || {};
    const after = api?.tacticsState?.() || {};
    const held = api?.gamepadState?.() || {};
    const released = api?.simulateGamepad?.({ left: false }) || {};
    return {
      before,
      after,
      applied,
      held,
      released,
      statusText: document.querySelector('#premium-gamepad-status')?.textContent || '',
      statusTone: document.querySelector('#premium-gamepad-status')?.dataset.tone || ''
    };
  })()`);
  const premiumPauseHookState = await evaluate(`(() => {
    document.querySelector('[data-premium-game="boss"]')?.click();
    document.querySelector('#premium-boss-start')?.click();
    const before = {
      active: window.__atherixDebug?.premium?.active?.() || '',
      running: !!window.__atherixDebug?.premium?.bossRunning?.(),
      paused: !!window.__atherixDebug?.premium?.bossPaused?.()
    };
    const result = window.__atherixPausePremiumRealtimeGames?.('smoke') || {};
    return {
      before,
      result,
      after: {
        running: !!window.__atherixDebug?.premium?.bossRunning?.(),
        paused: !!window.__atherixDebug?.premium?.bossPaused?.(),
        pauseButton: document.querySelector('#premium-boss-pause')?.textContent || ''
      }
    };
  })()`);
  const contractProgressState = await evaluate(`(() => {
    const before = window.__atherixDebug?.premium?.contracts?.() || [];
    window.atherixArcadeCareer?.recordResult?.('survivor', 900, { smoke: true });
    const after = window.__atherixDebug?.premium?.contracts?.() || [];
    return {
      beforeFirst: before[0]?.progress ?? -1,
      afterFirst: after[0]?.progress ?? -1,
      afterContracts: after.length,
      completed: after.filter(contract => contract.claimed).length,
      cards: document.querySelectorAll('.arcade-contract-card').length,
      runCards: document.querySelectorAll('.arcade-run-log-item').length,
      debugRuns: window.__atherixDebug?.premium?.runs?.().length || 0,
      latestRunGame: window.__atherixDebug?.premium?.runs?.()[0]?.game || '',
      latestRunScore: Number(window.__atherixDebug?.premium?.runs?.()[0]?.score || 0),
      latestRunDifficulty: window.__atherixDebug?.premium?.runs?.()[0]?.difficulty || '',
      runTitle: document.querySelector('#premium-run-log-title')?.textContent || '',
      runLastScore: document.querySelector('#premium-run-last-score')?.textContent || '',
      runAverage: document.querySelector('#premium-run-average')?.textContent || '',
      runBestMode: document.querySelector('#premium-run-best-mode')?.textContent || '',
      leaderboard: window.__atherixDebug?.premium?.leaderboard?.() || {},
      leaderboardCards: document.querySelectorAll('.arcade-leaderboard-card').length,
      leaderboardTopGame: window.__atherixDebug?.premium?.leaderboard?.().entries?.[0]?.game || '',
      leaderboardTitle: document.querySelector('#premium-leaderboard-title')?.textContent || '',
      leaderboardTotal: document.querySelector('#premium-leaderboard-total')?.textContent || '',
      leaderboardLatest: document.querySelector('#premium-leaderboard-latest')?.textContent || '',
      rival: window.__atherixDebug?.premium?.rival?.() || {},
      rivalTitle: document.querySelector('#premium-rival-title')?.textContent || '',
      rivalTarget: document.querySelector('#premium-rival-target')?.textContent || '',
      rivalGap: document.querySelector('#premium-rival-gap')?.textContent || '',
      rivalActionTarget: document.querySelector('#premium-rival-start')?.dataset.rivalTargetGame || '',
      masteryAfter: window.__atherixDebug?.premium?.mastery?.().find(item => item.game === 'survivor') || {},
      masteryCardText: document.querySelector('[data-mastery-game="survivor"]')?.textContent || '',
      coach: window.__atherixDebug?.premium?.coach?.() || null,
      coachTitle: document.querySelector('#premium-coach-title')?.textContent || '',
      coachSummary: document.querySelector('#premium-coach-summary')?.textContent || '',
      coachMedal: document.querySelector('#premium-coach-medal')?.textContent || '',
      coachDelta: document.querySelector('#premium-coach-delta')?.textContent || '',
      coachTarget: document.querySelector('#premium-coach-target')?.textContent || '',
      coachLaunchTarget: document.querySelector('#premium-coach-launch')?.dataset.coachTargetGame || '',
      coachDifficulty: document.querySelector('#premium-coach-difficulty')?.dataset.coachDifficulty || '',
      coachLoadout: document.querySelector('#premium-coach-loadout')?.dataset.coachLoadout || '',
      profile: window.__atherixDebug?.premium?.profile?.() || {},
      profileTitle: document.querySelector('#premium-profile-title')?.textContent || '',
      profileCompletion: document.querySelector('#premium-profile-completion')?.textContent || '',
      profileMedals: document.querySelector('#premium-profile-medals')?.textContent || '',
      profileAchievements: document.querySelector('#premium-profile-achievements')?.textContent || '',
      profileLatest: document.querySelector('#premium-profile-latest')?.textContent || '',
      profileTarget: document.querySelector('#premium-profile-target')?.dataset.profileTargetGame || '',
      prizeTrack: window.__atherixDebug?.premium?.prizeTrack?.() || {},
      prizeTitle: document.querySelector('#premium-prize-title')?.textContent || '',
      prizeSummary: document.querySelector('#premium-prize-summary')?.textContent || '',
      prizeNodes: document.querySelectorAll('.arcade-prize-node').length,
      prizeClaimedNodes: document.querySelectorAll('.arcade-prize-node[data-state="claimed"]').length,
      prizeNextNodes: document.querySelectorAll('.arcade-prize-node[data-state="next"]').length,
      prizeTarget: document.querySelector('#premium-prize-target')?.dataset.prizeTargetGame || '',
      prizeProgressNow: document.querySelector('#premium-prize-progressbar')?.getAttribute('aria-valuenow') || '',
      toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || '',
      total: document.querySelector('#premium-career-total')?.textContent || ''
    };
  })()`);
  await click('#premium-coach-launch');
  await wait(220);
  const coachLaunchState = await evaluate(`(() => ({
    target: document.querySelector('#premium-coach-launch')?.dataset.coachTargetGame || '',
    active: window.__atherixDebug?.premium?.active?.() || '',
    activeTitle: document.querySelector('#premium-active-title')?.textContent || '',
    difficulty: window.__atherixDebug?.premium?.difficulty?.().active || '',
    loadout: window.__atherixDebug?.premium?.loadout?.().active || '',
    equippedCards: document.querySelectorAll('.arcade-loadout-card.is-equipped').length,
    selectedDifficultyCards: document.querySelectorAll('.arcade-difficulty-card.is-selected').length,
    toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || '',
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  }))()`);
  await click('#premium-profile-target');
  await wait(180);
  const profileLaunchState = await evaluate(`(() => ({
    target: document.querySelector('#premium-profile-target')?.dataset.profileTargetGame || '',
    active: window.__atherixDebug?.premium?.active?.() || '',
    activeTitle: document.querySelector('#premium-active-title')?.textContent || '',
    toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || '',
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  }))()`);
  await click('#premium-prize-target');
  await wait(180);
  const prizeLaunchState = await evaluate(`(() => ({
    target: document.querySelector('#premium-prize-target')?.dataset.prizeTargetGame || '',
    active: window.__atherixDebug?.premium?.active?.() || '',
    activeTitle: document.querySelector('#premium-active-title')?.textContent || '',
    toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || '',
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  }))()`);
  const leagueProgressState = await evaluate(`(() => {
    const before = window.__atherixDebug?.premium?.league?.() || {};
    const active = before.activeStage || {};
    if (active.game && active.target) {
      window.atherixArcadeCareer?.recordResult?.(active.game, Number(active.target || 0), { smokeLeague: true });
    }
    const after = window.__atherixDebug?.premium?.league?.() || {};
    return {
      before,
      after,
      cards: document.querySelectorAll('.arcade-league-stage').length,
      activeCards: document.querySelectorAll('.arcade-league-stage[data-state="active"]').length,
      completeCards: document.querySelectorAll('.arcade-league-stage[data-state="complete"]').length,
      progressText: document.querySelector('#premium-league-progress')?.textContent || '',
      title: document.querySelector('#premium-league-title')?.textContent || '',
      summary: document.querySelector('#premium-league-summary')?.textContent || '',
      target: document.querySelector('#premium-league-start')?.dataset.leagueTargetGame || '',
      toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || ''
    };
  })()`);
  const loadoutProgressState = await evaluate(`(() => {
    window.atherixArcadeCareer?.equipLoadout?.('aegis');
    const loadout = window.__atherixDebug?.premium?.loadout?.() || {};
    return {
      active: loadout.active || '',
      label: loadout.label || '',
      unlocked: loadout.unlocked || [],
      equippedCards: document.querySelectorAll('.arcade-loadout-card.is-equipped').length,
      activeLabel: document.querySelector('#premium-loadout-active')?.textContent || '',
      summary: document.querySelector('#premium-loadout-summary')?.textContent || '',
      toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || ''
    };
  })()`);
  const difficultyProgressState = await evaluate(`(() => {
    const readCareer = () => JSON.parse(localStorage.getItem('atherix_premium_arcade_career_v2') || '{}');
    const beforeTotal = Number(readCareer().totalScore || 0);
    window.atherixArcadeCareer?.setDifficulty?.('elite');
    const difficulty = window.__atherixDebug?.premium?.difficulty?.() || {};
    window.atherixArcadeCareer?.recordResult?.('boss', 1000, { smoke: true });
    const afterCareer = readCareer();
    return {
      active: difficulty.active || '',
      label: difficulty.label || '',
      pressure: Number(difficulty.pressure || 0),
      scoreBoost: Number(difficulty.scoreBoost || 0),
      selectedCards: document.querySelectorAll('.arcade-difficulty-card.is-selected').length,
      activeLabel: document.querySelector('#premium-difficulty-active')?.textContent || '',
      summary: document.querySelector('#premium-difficulty-summary')?.textContent || '',
      totalDelta: Number(afterCareer.totalScore || 0) - beforeTotal,
      bossBest: Number(afterCareer.best?.boss || 0),
      leaderboard: window.__atherixDebug?.premium?.leaderboard?.() || {},
      leaderboardCards: document.querySelectorAll('.arcade-leaderboard-card').length,
      leaderboardTopGame: window.__atherixDebug?.premium?.leaderboard?.().entries?.[0]?.game || '',
      leaderboardTitle: document.querySelector('#premium-leaderboard-title')?.textContent || '',
      leaderboardTotal: document.querySelector('#premium-leaderboard-total')?.textContent || '',
      rival: window.__atherixDebug?.premium?.rival?.() || {},
      rivalTitle: document.querySelector('#premium-rival-title')?.textContent || '',
      rivalTarget: document.querySelector('#premium-rival-target')?.textContent || '',
      rivalGap: document.querySelector('#premium-rival-gap')?.textContent || '',
      rivalActionTarget: document.querySelector('#premium-rival-start')?.dataset.rivalTargetGame || '',
      totalText: document.querySelector('#premium-career-total')?.textContent || '',
      toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || ''
    };
  })()`);
  await click('#premium-rival-start');
  await wait(220);
  const rivalLaunchState = await evaluate(`(() => ({
    target: document.querySelector('#premium-rival-start')?.dataset.rivalTargetGame || '',
    active: window.__atherixDebug?.premium?.active?.() || '',
    activeTitle: document.querySelector('#premium-active-title')?.textContent || '',
    toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || '',
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  }))()`);
  await click('#premium-director-start');
  await wait(220);
  const directorLaunchState = await evaluate(`(() => ({
    target: document.querySelector('#premium-director-start')?.dataset.targetGame || '',
    active: window.__atherixDebug?.premium?.active?.() || '',
    activeTitle: document.querySelector('#premium-active-title')?.textContent || '',
    gameScrollY: Math.round(window.scrollY),
    toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || '',
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  }))()`);
  await click('#premium-cockpit-target');
  await wait(180);
  const cockpitTargetState = await evaluate(`(() => ({
    target: document.querySelector('#premium-cockpit-target')?.dataset.cockpitTargetGame || '',
    active: window.__atherixDebug?.premium?.active?.() || '',
    activeTitle: document.querySelector('#premium-active-title')?.textContent || '',
    mode: document.querySelector('#premium-cockpit-mode')?.textContent || '',
    difficulty: document.querySelector('#premium-cockpit-difficulty')?.textContent || '',
    loadout: document.querySelector('#premium-cockpit-loadout')?.textContent || '',
    season: document.querySelector('#premium-cockpit-season')?.textContent || '',
    toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || '',
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  }))()`);
  await click('[data-premium-game="survivor"]');
  await wait(120);
  await click('#premium-cockpit-play');
  await wait(260);
  const cockpitPlayState = await evaluate(`(() => ({
    active: window.__atherixDebug?.premium?.active?.() || '',
    running: !!window.__atherixDebug?.premium?.survivorRunning?.(),
    paused: !!window.__atherixDebug?.premium?.survivorPaused?.(),
    actionLabel: document.querySelector('[data-premium-control="action"]')?.textContent || '',
    toolDisabled: !!document.querySelector('[data-premium-control="tool"]')?.disabled,
    toast: document.querySelector('.toast-stack .toast:last-child')?.textContent || '',
    feedback: window.__atherixDebug?.premium?.feedback?.() || {}
  }))()`);

  await click('#premium-survivor-start');
  await wait(900);
  await key('keyDown', ' ', 'Space');
  await wait(220);
  await key('keyUp', ' ', 'Space');
  await wait(500);
  const survivorState = await evaluate(`(() => {
    const pixels = window.__atherixSmokeCountCanvasPixels?.('#premium-survivor-canvas') || {};
    return {
      nonBlank: !!pixels.nonBlank,
      build: document.querySelector('#premium-survivor-build')?.textContent,
      chain: document.querySelector('#premium-survivor-chain')?.textContent,
      overdrive: document.querySelector('#premium-survivor-overdrive')?.textContent,
      threat: document.querySelector('#premium-survivor-threat')?.textContent,
      bounty: document.querySelector('#premium-survivor-bounty')?.textContent,
      hp: document.querySelector('#premium-survivor-hp')?.textContent,
      debug: window.__atherixDebug?.premium?.survivorState?.() || {},
      feedback: window.__atherixDebug?.premium?.feedback?.() || {},
      feedbackTone: document.querySelector('#premium-game-stage')?.dataset.feedbackTone || '',
      feedbackLabel: document.querySelector('#premium-game-stage')?.dataset.feedback || ''
    };
  })()`);
  const feedbackMuteState = await evaluate(`(() => {
    const api = window.__atherixDebug?.premium;
    const before = api?.feedback?.() || {};
    api?.setFeedbackMuted?.(true);
    const muted = api?.feedback?.() || {};
    api?.triggerFeedback?.('special');
    const afterSuppressed = api?.feedback?.() || {};
    api?.setFeedbackMuted?.(false);
    const unmuted = api?.feedback?.() || {};
    return {
      before,
      muted,
      afterSuppressed,
      unmuted,
      panelMuted: document.querySelector('#premium-feedback-console')?.dataset.muted || '',
      status: document.querySelector('#premium-feedback-status')?.textContent || '',
      togglePressed: document.querySelector('#premium-feedback-toggle')?.getAttribute('aria-pressed') || ''
    };
  })()`);
  const survivorDraftOpenState = await evaluate(`(() => {
    const choices = window.__atherixDebug?.premium?.openSurvivorDraft?.() || [];
    const beforeElapsed = Number(window.__atherixDebug?.premium?.survivorElapsed?.() || 0);
    const beforeScore = Number(window.__atherixDebug?.premium?.survivorScore?.() || 0);
    return {
      open: !!window.__atherixDebug?.premium?.survivorDraftOpen?.(),
      ariaHidden: document.querySelector('#premium-survivor-draft')?.getAttribute('aria-hidden') || '',
      optionCards: document.querySelectorAll('.survivor-upgrade-option').length,
      choices,
      beforeElapsed,
      beforeScore,
      running: !!window.__atherixDebug?.premium?.survivorRunning?.(),
      paused: !!window.__atherixDebug?.premium?.survivorPaused?.(),
      title: document.querySelector('#premium-survivor-draft-title')?.textContent || ''
    };
  })()`);
  await wait(320);
  const survivorDraftFreezeState = await evaluate(`(() => ({
    open: !!window.__atherixDebug?.premium?.survivorDraftOpen?.(),
    elapsedAfter: Number(window.__atherixDebug?.premium?.survivorElapsed?.() || 0),
    scoreAfter: Number(window.__atherixDebug?.premium?.survivorScore?.() || 0)
  }))()`);
  await key('keyDown', '1', 'Digit1');
  await key('keyUp', '1', 'Digit1');
  await wait(220);
  const survivorDraftChosenState = await evaluate(`(() => ({
    open: !!window.__atherixDebug?.premium?.survivorDraftOpen?.(),
    ariaHidden: document.querySelector('#premium-survivor-draft')?.getAttribute('aria-hidden') || '',
    optionCards: document.querySelectorAll('.survivor-upgrade-option').length,
    running: !!window.__atherixDebug?.premium?.survivorRunning?.(),
    build: window.__atherixDebug?.premium?.survivorBuild?.() || '',
    buildText: document.querySelector('#premium-survivor-build')?.textContent || '',
    level: document.querySelector('#premium-survivor-level')?.textContent || '',
    score: Number(window.__atherixDebug?.premium?.survivorScore?.() || 0)
  }))()`);
  const survivorOverdriveState = await evaluate(`(() => window.__atherixDebug?.premium?.forceSurvivorOverdrive?.() || {})()`);
  const survivorAnomalyState = await evaluate(`(() => {
    const result = window.__atherixDebug?.premium?.forceSurvivorAnomaly?.('meteor') || {};
    const pixels = window.__atherixSmokeCountCanvasPixels?.('#premium-survivor-canvas') || {};
    return {
      ...result,
      nonBlank: !!pixels.nonBlank,
      eventText: document.querySelector('#premium-survivor-event')?.textContent || '',
      achieved: (window.__atherixDebug?.premium?.achievements?.() || []).some(item => item.id === 'survivor_anomaly' && item.unlocked)
    };
  })()`);
  const survivorBountyState = await evaluate(`(() => {
    const result = window.__atherixDebug?.premium?.forceSurvivorBounty?.() || {};
    const pixels = window.__atherixSmokeCountCanvasPixels?.('#premium-survivor-canvas') || {};
    return {
      ...result,
      nonBlank: !!pixels.nonBlank,
      bountyText: document.querySelector('#premium-survivor-bounty')?.textContent || '',
      achieved: (window.__atherixDebug?.premium?.achievements?.() || []).some(item => item.id === 'survivor_bounty' && item.unlocked)
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
    const pixels = window.__atherixSmokeCountCanvasPixels?.('#premium-boss-canvas') || {};
    return {
      nonBlank: !!pixels.nonBlank,
      phase: document.querySelector('#premium-boss-phase')?.textContent,
      dash: document.querySelector('#premium-boss-dash')?.textContent,
      pattern: document.querySelector('#premium-boss-pattern')?.textContent,
      hp: document.querySelector('#premium-boss-hp')?.textContent,
      weak: document.querySelector('#premium-boss-weak')?.textContent,
      focus: document.querySelector('#premium-boss-focus')?.textContent,
      breaks: Number(document.querySelector('#premium-boss-break')?.textContent || 0),
      counter: document.querySelector('#premium-boss-counter')?.textContent || '',
      lives: Number(document.querySelector('#premium-boss-lives')?.textContent || 0)
    };
  })()`);
  const bossTelegraphState = await evaluate(`(() => {
    const before = window.__atherixDebug?.premium?.forceBossTelegraph?.('snipe') || {};
    return {
      ...before,
      patternText: document.querySelector('#premium-boss-pattern')?.textContent || '',
      running: !!window.__atherixDebug?.premium?.bossRunning?.(),
      paused: !!window.__atherixDebug?.premium?.bossPaused?.()
    };
  })()`);
  await wait(220);
  const bossTelegraphHoldState = await evaluate(`(() => ({
    ...(window.__atherixDebug?.premium?.bossPattern?.() || {}),
    patternText: document.querySelector('#premium-boss-pattern')?.textContent || ''
  }))()`);
  const bossCounterState = await evaluate(`(() => {
    const result = window.__atherixDebug?.premium?.forceBossCounter?.('snipe') || {};
    const chainResult = window.__atherixDebug?.premium?.forceBossCounter?.('ring') || {};
    return {
      ...result,
      chain: chainResult,
      patternText: document.querySelector('#premium-boss-pattern')?.textContent || '',
      weakText: document.querySelector('#premium-boss-weak')?.textContent || '',
      breakText: document.querySelector('#premium-boss-break')?.textContent || '',
      counterText: document.querySelector('#premium-boss-counter')?.textContent || '',
      scoreText: document.querySelector('#premium-boss-score')?.textContent || '',
      achievedCounterChain: (window.__atherixDebug?.premium?.achievements?.() || []).some(item => item.id === 'boss_counter_chain' && item.unlocked)
    };
  })()`);
  const bossFocusSurgeState = await evaluate(`(() => {
    const result = window.__atherixDebug?.premium?.forceBossFocusSurge?.() || {};
    return {
      ...result,
      focusText: document.querySelector('#premium-boss-focus')?.textContent || '',
      scoreText: document.querySelector('#premium-boss-score')?.textContent || '',
      achieved: (window.__atherixDebug?.premium?.achievements?.() || []).some(item => item.id === 'boss_focus_surge' && item.unlocked)
    };
  })()`);
  const bossReleaseTelegraphState = await evaluate(`(() => {
    const before = window.__atherixDebug?.premium?.forceBossTelegraph?.('snipe') || {};
    return {
      ...before,
      patternText: document.querySelector('#premium-boss-pattern')?.textContent || ''
    };
  })()`);
  let bossPatternReleasedState = {};
  for (let i = 0; i < 24; i++) {
    await wait(160);
    bossPatternReleasedState = await evaluate(`(() => ({
      ...(window.__atherixDebug?.premium?.bossPattern?.() || {}),
      patternText: document.querySelector('#premium-boss-pattern')?.textContent || ''
    }))()`);
    if (!bossPatternReleasedState.queued && bossPatternReleasedState.current === 'snipe' && bossPatternReleasedState.bullets >= 7) break;
  }
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
    const pixels = window.__atherixSmokeCountCanvasPixels?.('#premium-drift-canvas') || {};
    return {
      nonBlank: !!pixels.nonBlank,
      running: !!window.__atherixDebug?.premium?.driftRunning?.(),
      paused: !!window.__atherixDebug?.premium?.driftPaused?.(),
      gates: Number(document.querySelector('#premium-drift-gates')?.textContent || 0),
      shield: Number(document.querySelector('#premium-drift-shield')?.textContent || 0),
      score: Number(document.querySelector('#premium-drift-score')?.textContent || 0),
      boost: document.querySelector('#premium-drift-boost')?.textContent || '',
      mult: document.querySelector('#premium-drift-mult')?.textContent || '',
      line: document.querySelector('#premium-drift-line')?.textContent || '',
      combo: document.querySelector('#premium-drift-combo')?.textContent || '',
      rival: document.querySelector('#premium-drift-rival')?.textContent || '',
      overtake: document.querySelector('#premium-drift-overtake')?.textContent || '',
      contract: document.querySelector('#premium-drift-contract')?.textContent || '',
      heat: document.querySelector('#premium-drift-heat')?.textContent || '',
      phase: document.querySelector('#premium-drift-phase')?.textContent || '',
      phaseReady: document.querySelector('#premium-drift-phase-btn')?.dataset.ready || '',
      debug: window.__atherixDebug?.premium?.driftLineState?.() || {},
      activeTitle: document.querySelector('#premium-active-title')?.textContent || ''
    };
  })()`);
  const driftApexState = await evaluate(`(() => {
    const before = window.__atherixDebug?.premium?.driftLineState?.() || {};
    const after = window.__atherixDebug?.premium?.forceDriftApex?.() || {};
    return {
      before,
      after,
      line: document.querySelector('#premium-drift-line')?.textContent || '',
      combo: document.querySelector('#premium-drift-combo')?.textContent || '',
      rival: document.querySelector('#premium-drift-rival')?.textContent || '',
      overtake: document.querySelector('#premium-drift-overtake')?.textContent || '',
      gates: Number(document.querySelector('#premium-drift-gates')?.textContent || 0),
      score: Number(document.querySelector('#premium-drift-score')?.textContent || 0)
    };
  })()`);
  const driftPhaseState = await evaluate(`(() => window.__atherixDebug?.premium?.forceDriftPhaseBrake?.() || {})()`);
  const driftSponsorState = await evaluate(`(() => window.__atherixDebug?.premium?.forceDriftSponsor?.() || {})()`);
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
  const heistIntelBefore = await evaluate(`(() => window.__atherixDebug?.premium?.heistIntel?.() || {})()`);
  await key('keyDown', ' ', 'Space');
  await key('keyUp', ' ', 'Space');
  await wait(120);
  await key('keyDown', 'ArrowRight', 'ArrowRight');
  await key('keyUp', 'ArrowRight', 'ArrowRight');
  await wait(160);
  const heistRouteStepState = await evaluate(`(() => window.__atherixDebug?.premium?.stepHeistRoute?.() || {})()`);
  const heistDecoyState = await evaluate(`(() => window.__atherixDebug?.premium?.forceHeistDecoy?.() || {})()`);
  const heistCacheState = await evaluate(`(() => window.__atherixDebug?.premium?.forceHeistCache?.() || {})()`);
  await wait(260);
  const heistState = await evaluate(`(() => {
    const pixels = window.__atherixSmokeCountCanvasPixels?.('#premium-heist-canvas') || {};
    const debug = window.__atherixDebug?.premium?.heistIntel?.() || {};
    return {
      nonBlank: !!pixels.nonBlank,
      tools: document.querySelector('#premium-heist-tools')?.textContent,
      steps: document.querySelector('#premium-heist-steps')?.textContent,
      alert: document.querySelector('#premium-heist-alert')?.textContent,
      route: document.querySelector('#premium-heist-route')?.textContent,
      chain: document.querySelector('#premium-heist-chain')?.textContent,
      security: document.querySelector('#premium-heist-security')?.textContent,
      decoys: document.querySelector('#premium-heist-decoys')?.textContent,
      loot: document.querySelector('#premium-heist-loot')?.textContent,
      debug,
      before: ${JSON.stringify(heistIntelBefore)},
      routeStep: ${JSON.stringify(heistRouteStepState)},
      decoyState: ${JSON.stringify(heistDecoyState)},
      cacheState: ${JSON.stringify(heistCacheState)},
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
  const chainState = await evaluate(`(() => {
    const debugBefore = window.__atherixDebug?.premium?.chainState?.() || {};
    const initialDom = {
      cells: document.querySelectorAll('#premium-chain-board .chain-cell').length,
      specials: document.querySelectorAll('#premium-chain-board .chain-bomb,#premium-chain-board .chain-prism,#premium-chain-board .chain-wild').length,
      wilds: document.querySelectorAll('#premium-chain-board .chain-wild').length,
      hinted: document.querySelectorAll('#premium-chain-board .chain-hint').length,
      previewed: document.querySelectorAll('#premium-chain-board .chain-preview').length
    };
    const forced = window.__atherixDebug?.premium?.forceChainCombo?.() || {};
    const recipeForced = window.__atherixDebug?.premium?.forceChainRecipe?.() || {};
    const catalystForced = window.__atherixDebug?.premium?.forceChainCatalyst?.() || {};
    const debugAfter = window.__atherixDebug?.premium?.chainState?.() || {};
    return {
      ...initialDom,
      target: document.querySelector('#premium-chain-target')?.textContent,
      mult: document.querySelector('#premium-chain-mult')?.textContent,
      phase: document.querySelector('#premium-chain-phase')?.textContent,
      goal: document.querySelector('#premium-chain-goal')?.textContent,
      hint: document.querySelector('#premium-chain-hint')?.textContent,
      essence: document.querySelector('#premium-chain-essence')?.textContent,
      recipe: document.querySelector('#premium-chain-recipe')?.textContent,
      overcharge: document.querySelector('#premium-chain-overcharge')?.textContent,
      catalystReady: document.querySelector('#premium-chain-catalyst')?.dataset.ready || '',
      recipeDetail: document.querySelector('#premium-chain-board')?.dataset.recipe || '',
      feedback: document.querySelector('#premium-chain-board')?.dataset.feedback || '',
      debugBefore,
      forced,
      recipeForced,
      catalystForced,
      debugAfter
    };
  })()`);

  await click('[data-premium-game="tactics"]');
  await wait(250);
  await click('#premium-tactics-start');
  await wait(200);
  const tacticsForecastStart = await evaluate(`(() => window.__atherixDebug?.premium?.tacticsForecast?.() || {})()`);
  const tacticsRouteState = await evaluate(`(() => window.__atherixDebug?.premium?.forceTacticsRoute?.() || {})()`);
  const tacticsBlastState = await evaluate(`(() => window.__atherixDebug?.premium?.forceTacticsBlast?.() || {})()`);
  const tacticsForecastAfterAction = await evaluate(`(() => window.__atherixDebug?.premium?.tacticsForecast?.() || {})()`);
  const tacticsState = await evaluate(`(() => {
    const pixels = window.__atherixSmokeCountCanvasPixels?.('#premium-tactics-canvas') || {};
    return {
      nonBlank: !!pixels.nonBlank,
      ap: document.querySelector('#premium-tactics-ap')?.textContent,
      turn: document.querySelector('#premium-tactics-turn')?.textContent,
      hp: document.querySelector('#premium-tactics-hp')?.textContent,
      threat: document.querySelector('#premium-tactics-threat')?.textContent,
      intel: document.querySelector('#premium-tactics-intel')?.textContent,
      danger: document.querySelector('#premium-tactics-danger')?.textContent,
      cover: document.querySelector('#premium-tactics-cover')?.textContent,
      momentum: document.querySelector('#premium-tactics-momentum')?.textContent,
      route: document.querySelector('#premium-tactics-route')?.textContent,
      action: document.querySelector('#premium-tactics-action')?.textContent,
      debug: window.__atherixDebug?.premium?.tacticsState?.() || {}
    };
  })()`);

  const pwaState = await evaluate(`(async () => {
    if (!('serviceWorker' in navigator)) return { supported: false, registered: false };
    await new Promise(resolve => setTimeout(resolve, 1200));
    const registration = await navigator.serviceWorker.getRegistration('/');
    const cacheKeys = 'caches' in window ? await caches.keys() : [];
    const shell = 'caches' in window ? await caches.match('/index.html') : null;
    const swText = await fetch('/sw.js', { cache: 'no-store' }).then(response => response.text()).catch(() => '');
    return {
      supported: true,
      registered: !!registration,
      scope: registration?.scope || '',
      cacheKeys,
      shellCached: !!shell,
      swHasNavigationPreload: swText.includes('navigationPreload'),
      swHasOfflineShellHeader: swText.includes('X-Atherix-Offline-Shell'),
      swHasFallbackUrl: swText.includes('NAVIGATION_FALLBACK_URL'),
      swHasConfirmCdpVersion: swText.includes('atherix-static-v30-confirm-cdp') && swText.includes('/style.css?v=20260608-confirm-cdp-v1') && swText.includes('/app.js?v=20260608-confirm-cdp-v1'),
      swHasLocalProjectAssets: swText.includes('/assets/project-bento-dashboard.webp') && swText.includes('/assets/project-arcade-suite.webp')
    };
  })()`, 10000);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await navigate(`${appUrl}/#game`);
  await waitFor('#runner-touch-controls', 12000);
  await wait(700);
  const premiumMobileState = await evaluate(`(() => {
    const cockpit = document.querySelector('#premium-cockpit-panel');
    const tabs = document.querySelector('.arcade-library .mini-game-tabs');
    const stage = document.querySelector('#premium-game-stage');
    const controls = document.querySelector('.premium-touch-controls');
    const career = document.querySelector('.arcade-career-panel');
    const controlButtons = Array.from(document.querySelectorAll('[data-premium-control]'));
    const rectFor = el => {
      const rect = el?.getBoundingClientRect();
      return rect ? {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        visible: rect.bottom > 0 && rect.top < window.innerHeight
      } : null;
    };
    const controlRects = controlButtons.map(btn => {
      const rect = btn.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    });
    return {
      width: document.documentElement.clientWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      cockpit: rectFor(cockpit),
      tabs: rectFor(tabs),
      stage: rectFor(stage),
      controls: rectFor(controls),
      controlsPosition: controls ? getComputedStyle(controls).position : '',
      controlsCount: controlButtons.length,
      minControlWidth: Math.min(...controlRects.map(rect => rect.width)),
      minControlHeight: Math.min(...controlRects.map(rect => rect.height)),
      career: rectFor(career),
      actionText: document.querySelector('[data-premium-control="action"]')?.textContent || '',
      toolText: document.querySelector('[data-premium-control="tool"]')?.textContent || '',
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    };
  })()`);
  const runnerMobileState = await evaluate(`(() => {
    const pad = document.querySelector('#runner-touch-controls');
    pad?.scrollIntoView({ block: 'center' });
    const rect = pad?.getBoundingClientRect();
    return {
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: document.querySelectorAll('[data-runner-control]').length,
      padTop: rect ? Math.round(rect.top) : null,
      padBottom: rect ? Math.round(rect.bottom) : null,
      visibleAfterScroll: !!rect && rect.top < window.innerHeight && rect.bottom > 0,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    };
  })()`);
  await send('Emulation.clearDeviceMetricsOverride');

  assert(blogState.visibleArticle && blogState.articleChars > 100, 'blog reader should open a populated article');
  assert(!adminStartupState.token && !adminStartupState.blogActionsVisible && !adminStartupState.projectActionsVisible, 'invalid cached admin token should be cleared on startup');
  assert(accessibilityBaseline.skipHref === '#main-content' && accessibilityBaseline.mainTabIndex === '-1' && accessibilityBaseline.buttonsMissingType === 0 && !accessibilityBaseline.horizontalOverflow, `core accessibility affordances should be present: ${JSON.stringify(accessibilityBaseline)}`);
  assert(accessibilityBaseline.commandTriggerLabel && accessibilityBaseline.adminTriggerLabel, `icon-only header actions should have labels: ${JSON.stringify(accessibilityBaseline)}`);
  assert(accessibilityBaseline.adminUsernameAutocomplete === 'username' && accessibilityBaseline.adminPasswordAutocomplete === 'current-password', `admin login fields should expose browser autocomplete hints: ${JSON.stringify(accessibilityBaseline)}`);
  assert(accessibilityBaseline.preloads.some(link => /style\.css/.test(link.href) && link.as === 'style') && accessibilityBaseline.preloads.some(link => /lucide\.min\.js/.test(link.href) && link.as === 'script') && accessibilityBaseline.preloads.some(link => /app\.js/.test(link.href) && link.as === 'script'), `critical app assets should be preloaded: ${JSON.stringify(accessibilityBaseline.preloads)}`);
  assert(commandFocusOpenState.open && commandFocusOpenState.ariaHidden === 'false' && commandFocusOpenState.focusId === 'command-search-input' && commandFocusOpenState.focusInside, `command palette should focus search input on open: ${JSON.stringify(commandFocusOpenState)}`);
  assert(!commandFocusClosedState.open && commandFocusClosedState.ariaHidden === 'true' && commandFocusClosedState.focusId === 'command-palette-trigger', `command palette should close and restore focus: ${JSON.stringify(commandFocusClosedState)}`);
  assert(adminModalOpenState.open && adminModalOpenState.role === 'dialog' && adminModalOpenState.ariaHidden === 'false' && adminModalOpenState.focusId === 'admin-username' && adminModalOpenState.focusInside, `admin modal should expose dialog semantics and focus first field: ${JSON.stringify(adminModalOpenState)}`);
  assert(!adminModalClosedState.open && adminModalClosedState.ariaHidden === 'true' && adminModalClosedState.display === 'none' && adminModalClosedState.focusId === 'admin-login-trigger', `admin modal should close on Escape and restore focus: ${JSON.stringify(adminModalClosedState)}`);
  assert(commandBeforeExecute.open && commandBeforeExecute.results >= 1 && /Rift Tactics/.test(commandBeforeExecute.firstTitle), `command palette should find tactics mode: ${JSON.stringify(commandBeforeExecute)}`);
  assert(commandState.closed && commandState.gameActive && commandState.tacticsActive && /Rift Tactics/.test(commandState.activeTitle), `command palette should execute game navigation: ${JSON.stringify(commandState)}`);
  assert(vaultCommandBeforeExecute.open && vaultCommandBeforeExecute.results >= 1 && /数据保险库/.test(vaultCommandBeforeExecute.firstTitle), `command palette should find the data vault: ${JSON.stringify(vaultCommandBeforeExecute)}`);
  assert(vaultCommandState.closed && vaultCommandState.toolboxActive && vaultCommandState.vaultActive && vaultCommandState.navActive && vaultCommandState.debugReady && !vaultCommandState.horizontalOverflow, `data vault command should open the vault panel: ${JSON.stringify(vaultCommandState)}`);
  assert(vaultExportState.clicks.length === 1 && /atherix-vault-\d{8}-\d{6}\.json/.test(vaultExportState.clicks[0].download), `data vault should trigger a dated JSON export: ${JSON.stringify(vaultExportState)}`);
  assert(vaultExportState.schema === 'atherix-vault-v1' && vaultExportState.keys >= 2 && !vaultExportState.hasAdminToken && vaultExportState.readerValue === '64' && vaultExportState.survivorBest === '1234', `data vault export should include allowed state without leaking admin token: ${JSON.stringify(vaultExportState)}`);
  assert(/\d/.test(vaultExportState.keyCountText) && /\d/.test(vaultExportState.readerText) && /\d/.test(vaultExportState.arcadeText), `data vault should refresh summary after export: ${JSON.stringify(vaultExportState)}`);
  assert(vaultImportState.progress === '77' && vaultImportState.survivorBest === '4321' && vaultImportState.theme === 'light' && vaultImportState.listHasProgress, `data vault import should restore whitelisted state and refresh UI: ${JSON.stringify(vaultImportState)}`);
  assert(vaultImportState.tokenAfter === 'vault-secret-preserved' && !vaultImportState.outsideKey && vaultImportState.ignored.includes('admin_token') && vaultImportState.ignored.includes('outside_key'), `data vault import should ignore unsafe or unknown keys: ${JSON.stringify(vaultImportState)}`);
  assert(/Vault restored task/.test(vaultImportState.todoStored), `data vault import should restore local tool state: ${JSON.stringify(vaultImportState)}`);
  assert(vaultClearConfirmState.openBeforeCancel && vaultClearConfirmState.role === 'dialog' && vaultClearConfirmState.ariaHiddenBeforeCancel === 'false' && vaultClearConfirmState.focusedCancel && /清空本地状态/.test(vaultClearConfirmState.title) && /Atherix/.test(vaultClearConfirmState.message), `data vault clear should use the accessible in-app confirmation dialog: ${JSON.stringify(vaultClearConfirmState)}`);
  assert(vaultClearConfirmState.stillStoredAfterCancel === '31' && vaultClearConfirmState.closedAfterCancel && vaultClearConfirmState.openBeforeAccept && vaultClearConfirmState.clearedAfterAccept && vaultClearConfirmState.ariaHiddenAfterAccept === 'true' && /本地状态已清空/.test(vaultClearConfirmState.clearToast), `data vault clear confirmation should cancel safely and only clear after explicit accept: ${JSON.stringify(vaultClearConfirmState)}`);
  assert(legacyVaultHydrationState.survivorBest === 4321 && legacyVaultHydrationState.survivorMedal === 'gold' && legacyVaultHydrationState.totalScore >= 4321 && legacyVaultHydrationState.leaderboardTopGame === 'survivor' && legacyVaultHydrationState.leaderboardTopScore === 4321 && legacyVaultHydrationState.profileTopGame === 'survivor' && legacyVaultHydrationState.profileMedals >= 1 && legacyVaultHydrationState.masterySurvivorScore === 4321 && legacyVaultHydrationState.prizeTotal >= 4321 && legacyVaultHydrationState.prizeProgress > 0 && legacyVaultHydrationState.prizeUnlocked >= 3 && /4321/.test(legacyVaultHydrationState.totalText), `legacy arcade best imports should hydrate the premium career profile and season track: ${JSON.stringify(legacyVaultHydrationState)}`);
  assert(blogHubBefore.panel && blogHubBefore.total >= 1 && blogHubBefore.filters >= 3 && blogHubBefore.cards >= 1, `blog reading hub should render stats and filters: ${JSON.stringify(blogHubBefore)}`);
  assert(blogHubBefore.cardLinks >= blogHubBefore.cards && /^\/\?post=/.test(blogHubBefore.firstCardHref) && blogHubBefore.pinnedLinks >= 1 && blogHubBefore.quickRole === 'link' && blogHubBefore.quickTabIndex === '0', `blog cards and featured entry should expose native article links: ${JSON.stringify(blogHubBefore)}`);
  assert(blogHubBefore.progressCards >= 1 && /42/.test(blogHubBefore.progressText) && !blogHubBefore.horizontalOverflow, `blog reading hub should show resumable progress without overflow: ${JSON.stringify(blogHubBefore)}`);
  assert(blogState.toolbar && blogState.bookmarkPressed, 'blog reader toolbar should render and toggle bookmark state');
  assert(readerCompletionState.stored === '100' && readerCompletionState.pressed && /重新阅读/.test(readerCompletionState.label) && readerCompletionState.progress === '100%', `blog reader should support explicit completion: ${JSON.stringify(readerCompletionState)}`);
  assert(readerResetState.stored === '0' && !readerResetState.pressed && /标记读完/.test(readerResetState.label) && readerResetState.progress === '0%', `blog reader should support reread reset: ${JSON.stringify(readerResetState)}`);
  assert(blogState.nextPanel && blogState.nextCards >= 1 && blogState.nextFirstTitle && blogState.nextFirstPostId, `blog reader should recommend a next article: ${JSON.stringify(blogState)}`);
  assert(blogState.nextReasons.some(reason => /同主题延伸|拓展视角|未开始|读到|稍后读|精选|适合复盘/.test(reason)) && /^\d+%$/.test(blogState.nextProgress), `blog reader recommendations should explain ranking and progress: ${JSON.stringify(blogState)}`);
  assert(readerNextOpenState.clicked && readerNextOpenState.visibleArticle && readerNextOpenState.title === readerNextOpenState.expectedTitle && readerNextOpenState.route.includes(`post=${encodeURIComponent(readerNextOpenState.expectedPostId)}`) && readerNextOpenState.nextPanel && readerNextOpenState.nextCards >= 1 && !readerNextOpenState.horizontalOverflow, `blog reader recommendation should open another article cleanly: ${JSON.stringify(readerNextOpenState)}`);
  assert(readerToolState.shareButton && readerToolState.exportButton && readerToolState.modePressed && readerToolState.focusClass && readerToolState.storedMode === 'enabled' && !readerToolState.horizontalOverflow, `blog reader tools should support focus mode without overflow: ${JSON.stringify(readerToolState)}`);
  assert(readerExportState.clicks.length === 1 && /\.md$/i.test(readerExportState.clicks[0].download) && readerExportState.blobInfo?.size > 100 && /markdown/i.test(readerExportState.blobInfo.type), `blog reader should export the current article as markdown: ${JSON.stringify(readerExportState)}`);
  assert(blogState.tocActive && blogState.tocLinks >= 2, 'blog reader should build a table of contents from article headings');
  assert(/^\d+%$/.test(blogState.progress), 'blog reader should report reading progress');
  assert(blogHubAfterBookmark.activeFilter && blogHubAfterBookmark.bookmarkCount >= 1 && blogHubAfterBookmark.bookmarkedCards >= 1 && !blogHubAfterBookmark.horizontalOverflow, `blog reading hub should filter bookmarked articles: ${JSON.stringify(blogHubAfterBookmark)}`);
  assert(badPostRouteState.missing.hash === '#blog' && badPostRouteState.missing.blogActive && !badPostRouteState.missing.readerActive && badPostRouteState.malformed.hash === '#blog' && badPostRouteState.malformed.blogActive && !badPostRouteState.malformed.readerActive && badPostRouteState.badQuery.pathname === '/' && badPostRouteState.badQuery.search === '' && badPostRouteState.badQuery.hash === '#blog' && badPostRouteState.badQuery.blogActive && !badPostRouteState.badQuery.readerActive && badPostRouteState.queryOpen.search === '?post=post-1' && badPostRouteState.queryOpen.readerActive && badPostRouteState.queryOpen.title, `bad blog routes should recover and query article routes should open: ${JSON.stringify(badPostRouteState)}`);
  assert(guestbookA11yState.avatarButtons >= 10 && guestbookA11yState.avatarButtonTypes === guestbookA11yState.avatarButtons && guestbookA11yState.activeAvatar === guestbookA11yState.hiddenAvatar && guestbookA11yState.activePressed === 'true' && guestbookA11yState.inactivePressed === 'false' && guestbookA11yState.emojiButtons >= 12 && guestbookA11yState.focusedEmoji && guestbookA11yState.triggerExpandedAfterClose === 'false' && guestbookA11yState.contentValue.length > 0 && !guestbookA11yState.horizontalOverflow, `guestbook avatar and emoji controls should be keyboard-accessible buttons: ${JSON.stringify(guestbookA11yState)}`);
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
  assert(projectState.cards >= 4, 'expanded project cards should render');
  assert(projectState.localProjectImages === projectState.cards && projectState.externalProjectImages === 0 && projectState.arcadeProjectCard, `project cards should use local asset banners and include the arcade suite: ${JSON.stringify(projectState)}`);
  assert(projectState.disabledLiveButtons >= 1 && projectState.modalLiveDisabled, 'projects without demos should render disabled live actions');
  assert(projectState.modalOpen && projectState.modalAriaHidden === 'false' && projectState.modalRole === 'dialog' && projectState.modalFocusInside, `project details modal should open with focus inside: ${JSON.stringify(projectState)}`);
  assert(projectState.modalImageLocal, `project modal should use a local asset banner: ${JSON.stringify(projectState)}`);
  assert(!projectModalClosedState.open && projectModalClosedState.ariaHidden === 'true' && projectModalClosedState.display === 'none', `project details modal should close on Escape: ${JSON.stringify(projectModalClosedState)}`);
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
  assert(runnerTouchState.scoreAfterDash > runnerTouchState.scoreBefore && runnerTouchState.debugAfterDash?.score === runnerTouchState.scoreAfterDash, `runner dash should award synced route score: ${JSON.stringify(runnerTouchState)}`);
  assert(/^\d+x$/.test(runnerTouchState.comboAfterDash) && runnerTouchState.debugAfterDash?.comboHud === runnerTouchState.comboAfterDash, `runner combo HUD should use a stable Nx format and sync with debug state: ${JSON.stringify(runnerTouchState)}`);
  assert(runnerTouchState.contractAfterDash && runnerTouchState.debugAfterDash?.contractHud === runnerTouchState.contractAfterDash, `runner contract HUD should sync with debug state: ${JSON.stringify(runnerTouchState)}`);
  assert(runnerTouchState.forceContract?.after?.contract?.completed > runnerTouchState.forceContract?.before?.contract?.completed && runnerTouchState.forceContract?.after?.score > runnerTouchState.forceContract?.before?.score && runnerTouchState.forceContract?.achieved, `runner route contract should complete, score, and unlock achievement: ${JSON.stringify(runnerTouchState)}`);
  assert(Number(runnerTouchState.scoreHud) === runnerTouchState.debug?.score && runnerTouchState.comboHud === runnerTouchState.debug?.comboHud && runnerTouchState.contractHud === runnerTouchState.debug?.contractHud && runnerTouchState.statusHud === runnerTouchState.debug?.statusHud, `runner HUD should remain synchronized after forced contract: ${JSON.stringify(runnerTouchState)}`);
  assert(runnerGamepadState.running && runnerGamepadState.afterX > runnerGamepadState.beforeX && runnerGamepadState.movingPad?.keys?.right && /PAD/.test(runnerGamepadState.statusText), `runner gamepad bridge should move the player and update PAD status: ${JSON.stringify(runnerGamepadState)}`);
  assert(runnerMobileState.controls >= 7 && runnerMobileState.visibleAfterScroll && !runnerMobileState.horizontalOverflow, `runner touch controls should remain reachable on mobile after premium-first layout: ${JSON.stringify(runnerMobileState)}`);
  assert(premiumMobileState.cockpit?.visible && premiumMobileState.tabs?.top >= premiumMobileState.cockpit?.bottom - 8 && premiumMobileState.stage?.top >= premiumMobileState.tabs?.bottom - 8 && premiumMobileState.career?.top >= premiumMobileState.stage?.bottom - 8 && !premiumMobileState.horizontalOverflow, `premium arcade cockpit, tabs, and stage should be prioritized before meta panels on mobile: ${JSON.stringify(premiumMobileState)}`);
  assert(premiumMobileState.controls?.visible && premiumMobileState.controlsPosition === 'sticky' && premiumMobileState.controls.bottom <= premiumMobileState.height && premiumMobileState.controlsCount >= 5 && premiumMobileState.minControlWidth >= 44 && premiumMobileState.minControlHeight >= 44 && premiumMobileState.actionText && premiumMobileState.toolText, `premium arcade touch controls should stay visible and tappable on mobile: ${JSON.stringify(premiumMobileState)}`);
  assert(arcadeInitial.premium && arcadeInitial.careerPanel, 'premium arcade career panel should render');
  assert(arcadeInitial.oldPrototypeCount === 0, 'old prototype mini-games should be replaced');
  assert(arcadeInitial.premiumTabs >= 6 && arcadeInitial.driftPanel && arcadeInitial.tacticsPanel, 'premium arcade should include drift and tactics modes');
  assert(arcadeInitial.feedbackPanel && arcadeInitial.feedbackStage && arcadeInitial.feedbackTogglePressed === 'true' && arcadeInitial.feedbackDebug?.muted === false && arcadeInitial.feedbackDebug?.total === 0 && /沉浸反馈/.test(arcadeInitial.feedbackStatus), `premium arcade feedback console should start enabled and observable: ${JSON.stringify(arcadeInitial)}`);
  assert(arcadeInitial.cockpitPanel && arcadeInitial.cockpitTarget === arcadeInitial.debugCockpit?.targetGame && arcadeInitial.cockpitMode === arcadeInitial.debugCockpit?.activeLabel && arcadeInitial.cockpitDifficulty && arcadeInitial.cockpitLoadout && (arcadeInitial.cockpitSeason === '完成' || /^\d+%$/.test(arcadeInitial.cockpitSeason)) && arcadeInitial.cockpitActionLabel.includes(arcadeInitial.cockpitMode), `premium arcade cockpit should summarize the next playable run: ${JSON.stringify(arcadeInitial)}`);
  assert(arcadeInitial.runLogPanel && arcadeInitial.runLogEmpty === 'true' && arcadeInitial.runLogCards === 0 && arcadeInitial.debugRuns === 0, `premium arcade run telemetry should start empty: ${JSON.stringify(arcadeInitial)}`);
  assert(arcadeInitial.leaderboardPanel && arcadeInitial.leaderboardEmpty === 'true' && arcadeInitial.leaderboardCards === 0 && arcadeInitial.debugLeaderboard?.entries?.length === 0 && arcadeInitial.leaderboardTotal === '0', `premium arcade hall of fame should start empty: ${JSON.stringify(arcadeInitial)}`);
  assert(arcadeInitial.rivalPanel && arcadeInitial.debugRival?.game && arcadeInitial.rivalActionTarget === arcadeInitial.debugRival.game && Number(arcadeInitial.rivalTarget) === Number(arcadeInitial.debugRival.target) && Number(arcadeInitial.rivalTarget) > 0 && /·/.test(arcadeInitial.rivalTitle), `premium arcade rival intel should render an actionable opening rival: ${JSON.stringify(arcadeInitial)}`);
  assert(arcadeInitial.coachPanel && arcadeInitial.coachEmpty === 'true' && arcadeInitial.coachLaunchDisabled && arcadeInitial.coachDifficultyDisabled && arcadeInitial.coachLoadoutDisabled, `premium arcade post-run coach should start empty with disabled stale actions: ${JSON.stringify(arcadeInitial)}`);
  assert(arcadeInitial.directorPanel && arcadeInitial.directorTarget && arcadeInitial.directorTitle.length > 5 && arcadeInitial.directorReason.length > 10 && /^\d+%$/.test(arcadeInitial.directorCompletion) && arcadeInitial.tabBadges >= 6, `premium arcade director should render actionable progression guidance: ${JSON.stringify(arcadeInitial)}`);
  assert(arcadeInitial.profilePanel && /RANK/.test(arcadeInitial.profileTitle) && /^\d+%$/.test(arcadeInitial.profileCompletion) && /^\d+\/7$/.test(arcadeInitial.profileMedals) && /^\d+\/\d+$/.test(arcadeInitial.profileAchievements) && arcadeInitial.profileProgressRole === 'progressbar' && arcadeInitial.profileProgressNow === String(arcadeInitial.debugProfile?.completion) && arcadeInitial.profileTarget && arcadeInitial.debugProfile?.targetGame === arcadeInitial.profileTarget, `premium arcade command profile should summarize player progress: ${JSON.stringify(arcadeInitial)}`);
  assert(arcadeInitial.prizePanel && /入站许可/.test(arcadeInitial.prizeTitle) && arcadeInitial.prizeNodes === 6 && arcadeInitial.prizeClaimedNodes === 1 && arcadeInitial.prizeNextNodes === 1 && arcadeInitial.prizeProgressRole === 'progressbar' && arcadeInitial.prizeProgressNow === String(arcadeInitial.debugPrize?.progress) && arcadeInitial.prizeTarget === arcadeInitial.debugPrize?.targetGame, `premium arcade season track should render long-term rewards: ${JSON.stringify(arcadeInitial)}`);
  assert(arcadeInitial.masteryPanel && arcadeInitial.masteryCards === 7 && arcadeInitial.debugMastery === 7 && /奖牌路线/.test(arcadeInitial.masteryTitle) && arcadeInitial.masterySummary.length > 10, `premium arcade mastery map should render all mode goals: ${JSON.stringify(arcadeInitial)}`);
  assert(arcadeInitial.contractBoard && arcadeInitial.contractCards === 3 && arcadeInitial.debugContracts === 3 && arcadeInitial.firstContractProgress === 0, `premium arcade contracts should render as daily progression goals: ${JSON.stringify(arcadeInitial)}`);
  assert(arcadeInitial.leaguePanel && arcadeInitial.leagueCards === 3 && arcadeInitial.debugLeague?.stages?.length === 3 && arcadeInitial.debugLeague?.activeStage?.game && /^\d+\/3$/.test(arcadeInitial.leagueProgress) && /^\+\d+$/.test(arcadeInitial.leagueReward), `premium arcade challenge league should render a 3-stage daily route: ${JSON.stringify(arcadeInitial)}`);
  assert(arcadeInitial.difficultyPanel && arcadeInitial.difficultyCards === 4 && arcadeInitial.activeDifficulty === 'standard', `premium arcade difficulty matrix should render with standard default: ${JSON.stringify(arcadeInitial)}`);
  assert(arcadeInitial.loadoutPanel && arcadeInitial.loadoutCards === 4 && arcadeInitial.activeLoadout === 'pulse' && arcadeInitial.loadoutUnlocked >= 1, `premium arcade loadout chips should render with a default build: ${JSON.stringify(arcadeInitial)}`);
  assert(contractProgressState.afterContracts === 3 && contractProgressState.cards === 3 && contractProgressState.afterFirst > contractProgressState.beforeFirst && /总声望/.test(contractProgressState.total), `premium arcade contracts should advance after a scored run: ${JSON.stringify(contractProgressState)}`);
  assert(contractProgressState.runCards >= 1 && contractProgressState.debugRuns === 1 && contractProgressState.latestRunGame === 'survivor' && contractProgressState.latestRunScore >= 900 && contractProgressState.latestRunDifficulty === 'standard', `premium arcade should record a replayable run log after scoring: ${JSON.stringify(contractProgressState)}`);
  assert(contractProgressState.leaderboardCards >= 1 && contractProgressState.leaderboard?.entries?.[0]?.game === 'survivor' && contractProgressState.leaderboardTopGame === 'survivor' && /幸存者/.test(contractProgressState.leaderboardTitle) && Number(contractProgressState.leaderboardTotal) >= contractProgressState.latestRunScore && /幸存者/.test(contractProgressState.leaderboardLatest), `premium arcade hall of fame should rank and summarize the first personal best: ${JSON.stringify(contractProgressState)}`);
  assert(contractProgressState.rival?.game === 'survivor' && contractProgressState.rivalActionTarget === 'survivor' && Number(contractProgressState.rivalTarget) === Number(contractProgressState.rival.target) && Number(contractProgressState.rival.gap) > 0 && /NOVA-9/.test(contractProgressState.rivalTitle), `premium arcade rival intel should pivot to the latest scored mode: ${JSON.stringify(contractProgressState)}`);
  assert(contractProgressState.coach?.game === 'survivor' && /星核幸存者/.test(contractProgressState.coachTitle) && /铜牌/.test(contractProgressState.coachMedal) && /^\+/.test(contractProgressState.coachDelta) && /银牌/.test(contractProgressState.coachTarget) && contractProgressState.coachLaunchTarget === 'survivor' && contractProgressState.coachDifficulty === 'elite' && contractProgressState.coachLoadout === 'overdrive', `premium arcade coach should provide actionable post-run guidance: ${JSON.stringify(contractProgressState)}`);
  assert(coachLaunchState.target === 'survivor' && coachLaunchState.active === 'survivor' && coachLaunchState.difficulty === 'elite' && coachLaunchState.loadout === 'overdrive' && coachLaunchState.equippedCards === 1 && coachLaunchState.selectedDifficultyCards === 1 && /复盘计划已应用/.test(coachLaunchState.toast) && !coachLaunchState.horizontalOverflow, `premium arcade coach launch should apply recommended plan and enter target mode: ${JSON.stringify(coachLaunchState)}`);
  assert(contractProgressState.profile?.latest?.game === 'survivor' && /RANK/.test(contractProgressState.profileTitle) && /幸存者/.test(contractProgressState.profileLatest) && contractProgressState.profileCompletion === `${contractProgressState.profile.completion}%` && contractProgressState.profileLatest.includes(String(contractProgressState.latestRunScore)) && contractProgressState.profileTarget === contractProgressState.profile.targetGame, `premium arcade command profile should update after scored runs: ${JSON.stringify(contractProgressState)}`);
  assert(contractProgressState.prizeTrack?.total >= contractProgressState.latestRunScore && contractProgressState.prizeTrack?.progress > arcadeInitial.debugPrize?.progress && contractProgressState.prizeProgressNow === String(contractProgressState.prizeTrack?.progress) && contractProgressState.prizeNodes === contractProgressState.prizeTrack?.totalNodes && contractProgressState.prizeTarget === contractProgressState.prizeTrack?.targetGame, `premium arcade season track should advance after scored runs: ${JSON.stringify(contractProgressState)}`);
  assert(
    contractProgressState.masteryAfter.score >= 900 &&
    contractProgressState.masteryAfter.progress > 0 &&
    contractProgressState.masteryCardText.includes(String(contractProgressState.latestRunScore)),
    `premium arcade mastery map should update after scored runs: ${JSON.stringify(contractProgressState)}`
  );
  assert(/幸存者/.test(contractProgressState.runTitle) && /\d+/.test(contractProgressState.runLastScore) && /\d+/.test(contractProgressState.runAverage) && contractProgressState.runBestMode, `premium arcade run telemetry should render last score, average, and best mode: ${JSON.stringify(contractProgressState)}`);
  assert(leagueProgressState.before?.activeStage?.game && (leagueProgressState.after?.stageIndex > leagueProgressState.before?.stageIndex || leagueProgressState.after?.completed) && leagueProgressState.cards === 3 && leagueProgressState.completeCards >= 1 && /^\d+\/3$/.test(leagueProgressState.progressText) && leagueProgressState.target, `premium arcade challenge league should advance after clearing the active stage: ${JSON.stringify(leagueProgressState)}`);
  assert(loadoutProgressState.active === 'aegis' && loadoutProgressState.equippedCards === 1 && loadoutProgressState.unlocked.includes('aegis') && /棱镜护盾/.test(loadoutProgressState.activeLabel), `premium arcade loadouts should unlock and equip after career progress: ${JSON.stringify(loadoutProgressState)}`);
  assert(difficultyProgressState.active === 'elite' && difficultyProgressState.selectedCards === 1 && /精英/.test(difficultyProgressState.activeLabel) && difficultyProgressState.pressure > 1 && difficultyProgressState.scoreBoost > 0.15, `premium arcade difficulty should switch to elite with visible pressure and score boost: ${JSON.stringify(difficultyProgressState)}`);
  assert(difficultyProgressState.totalDelta >= 1180 && difficultyProgressState.bossBest >= 1180 && /难度 精英/.test(difficultyProgressState.totalText), `premium arcade difficulty should affect scoring and career summary: ${JSON.stringify(difficultyProgressState)}`);
  assert(difficultyProgressState.leaderboardCards >= 2 && difficultyProgressState.leaderboard?.entries?.some(entry => entry.game === 'boss' && entry.score >= 1180) && difficultyProgressState.leaderboard?.latestBest?.game === 'boss' && difficultyProgressState.leaderboard?.latestBest?.score >= difficultyProgressState.bossBest && Number(difficultyProgressState.leaderboardTotal) >= difficultyProgressState.bossBest, `premium arcade hall of fame should include elite boss record after scoring: ${JSON.stringify(difficultyProgressState)}`);
  assert(difficultyProgressState.rival?.game === 'boss' && difficultyProgressState.rivalActionTarget === 'boss' && Number(difficultyProgressState.rivalTarget) === Number(difficultyProgressState.rival.target) && /PRISM-0/.test(difficultyProgressState.rivalTitle), `premium arcade rival intel should follow the latest elite boss result: ${JSON.stringify(difficultyProgressState)}`);
  assert(rivalLaunchState.target === 'boss' && rivalLaunchState.active === 'boss' && /Boss/.test(rivalLaunchState.activeTitle) && /宿敌挑战/.test(rivalLaunchState.toast) && !rivalLaunchState.horizontalOverflow, `premium arcade rival action should launch the current rival mode: ${JSON.stringify(rivalLaunchState)}`);
  assert(profileLaunchState.target && (profileLaunchState.target === 'runner' || profileLaunchState.active === profileLaunchState.target) && /档案目标/.test(profileLaunchState.toast) && !profileLaunchState.horizontalOverflow, `premium arcade command profile action should launch the profiled target: ${JSON.stringify(profileLaunchState)}`);
  assert(prizeLaunchState.target && (prizeLaunchState.target === 'runner' || prizeLaunchState.active === prizeLaunchState.target) && /赛季奖励目标/.test(prizeLaunchState.toast) && !prizeLaunchState.horizontalOverflow, `premium arcade season track action should launch the reward target: ${JSON.stringify(prizeLaunchState)}`);
  assert(['runner', 'survivor', 'boss', 'drift', 'heist', 'chain', 'tactics'].includes(directorLaunchState.target) && (directorLaunchState.target === 'runner' || directorLaunchState.active === directorLaunchState.target) && !directorLaunchState.horizontalOverflow, `premium arcade director should launch the recommended target: ${JSON.stringify(directorLaunchState)}`);
  assert(arcadeInitial.touchControls >= 5, 'premium touch controls should be available');
  assert(/PAD/.test(arcadeInitial.gamepadStatus) && premiumGamepadState.after?.player?.x < premiumGamepadState.before?.player?.x && premiumGamepadState.held?.keys?.left && /PAD/.test(premiumGamepadState.statusText), `premium arcade gamepad bridge should drive tactics movement and status: ${JSON.stringify(premiumGamepadState)}`);
  assert(premiumPauseHookState.before.running && premiumPauseHookState.result?.paused?.includes('boss') && premiumPauseHookState.after.running && premiumPauseHookState.after.paused && premiumPauseHookState.after.pauseButton === '继续', `premium realtime pause hook should freeze active realtime games: ${JSON.stringify(premiumPauseHookState)}`);
  assert(cockpitTargetState.target && (cockpitTargetState.target === 'runner' || cockpitTargetState.active === cockpitTargetState.target) && /驾驶舱推荐/.test(cockpitTargetState.toast) && !cockpitTargetState.horizontalOverflow, `premium cockpit target should launch the recommended mode: ${JSON.stringify(cockpitTargetState)}`);
  assert(cockpitPlayState.active === 'survivor' && cockpitPlayState.running && !cockpitPlayState.paused && /星爆/.test(cockpitPlayState.actionLabel) && cockpitPlayState.toolDisabled && /开局/.test(cockpitPlayState.toast), `premium cockpit play should start the active mode and refresh touch labels: ${JSON.stringify(cockpitPlayState)}`);
  assert(cockpitPlayState.feedback?.tones?.start >= 1 && cockpitPlayState.feedback?.visualTriggers >= 1 && /START|开局/.test(cockpitPlayState.feedback?.status || ''), `premium arcade feedback should respond to cockpit start: ${JSON.stringify(cockpitPlayState)}`);
  assert(survivorState.nonBlank && survivorState.threat && /\dx$/.test(survivorState.chain) && survivorState.overdrive && survivorState.bounty && survivorState.debug?.hud?.chain === survivorState.chain && survivorState.debug?.hud?.bounty === survivorState.bounty, `survivor canvas should render active state with chain, overdrive, and bounty HUD: ${JSON.stringify(survivorState)}`);
  assert(survivorState.feedback?.tones?.action >= 1 && survivorState.feedback?.visualTriggers >= 1 && survivorState.feedbackTone === 'action' && /ACTION|NOVA/.test(survivorState.feedbackLabel), `premium arcade feedback should treat Space as an action signal, not restart: ${JSON.stringify(survivorState)}`);
  assert(feedbackMuteState.muted?.muted === true && feedbackMuteState.muted?.togglePressed === 'false' && feedbackMuteState.afterSuppressed?.suppressed > feedbackMuteState.muted?.suppressed && feedbackMuteState.afterSuppressed?.total === feedbackMuteState.muted?.total && feedbackMuteState.unmuted?.muted === false && feedbackMuteState.unmuted?.togglePressed === 'true' && feedbackMuteState.panelMuted === 'false', `premium arcade feedback mute should suppress events and restore cleanly: ${JSON.stringify(feedbackMuteState)}`);
  assert(survivorDraftOpenState.open && survivorDraftOpenState.ariaHidden === 'false' && survivorDraftOpenState.optionCards === 3 && survivorDraftOpenState.choices.length === 3 && survivorDraftOpenState.running && !survivorDraftOpenState.paused, `survivor roguelite draft should open three upgrade choices without using pause state: ${JSON.stringify(survivorDraftOpenState)}`);
  assert(survivorDraftFreezeState.open && Math.abs(survivorDraftFreezeState.elapsedAfter - survivorDraftOpenState.beforeElapsed) < 1 && Math.abs(survivorDraftFreezeState.scoreAfter - survivorDraftOpenState.beforeScore) < 1, `survivor roguelite draft should freeze the run clock and score until a choice is made: ${JSON.stringify({ survivorDraftOpenState, survivorDraftFreezeState })}`);
  assert(!survivorDraftChosenState.open && survivorDraftChosenState.ariaHidden === 'true' && survivorDraftChosenState.optionCards === 0 && survivorDraftChosenState.running && Number(survivorDraftChosenState.level) >= 2 && survivorDraftChosenState.score > survivorDraftOpenState.beforeScore && survivorDraftChosenState.buildText.length > 2, `survivor roguelite draft should apply a chosen upgrade and resume the run: ${JSON.stringify(survivorDraftChosenState)}`);
  assert(survivorOverdriveState.before?.overdrive >= 100 && survivorOverdriveState.before?.hud?.overdrive === 'READY' && survivorOverdriveState.after?.overdrive === 0 && survivorOverdriveState.after?.overdriveFlash > 0 && survivorOverdriveState.after?.score > survivorOverdriveState.before?.score && survivorOverdriveState.after?.slowed >= 1 && survivorOverdriveState.after?.enemies < survivorOverdriveState.before?.enemies && survivorOverdriveState.after?.chain >= survivorOverdriveState.before?.chain, `survivor overdrive should consume a full meter, slow enemies, kill targets, and score: ${JSON.stringify(survivorOverdriveState)}`);
  assert(survivorAnomalyState.started && survivorAnomalyState.nonBlank && survivorAnomalyState.state?.anomaly?.type === 'meteor' && survivorAnomalyState.state?.hazards?.length >= 3 && survivorAnomalyState.state?.hud?.event === 'METEOR' && survivorAnomalyState.eventText === 'METEOR' && survivorAnomalyState.achieved, `survivor anomaly events should create a readable deep-space crisis with hazards and achievement credit: ${JSON.stringify(survivorAnomalyState)}`);
  assert(survivorBountyState.nonBlank && survivorBountyState.after?.bounty?.completed > survivorBountyState.before?.bounty?.completed && survivorBountyState.after?.score > survivorBountyState.before?.score && survivorBountyState.after?.bounty?.last === 'ELITE CLEAR' && survivorBountyState.after?.bounty?.flash > 0 && survivorBountyState.after?.hud?.bounty === survivorBountyState.bountyText && survivorBountyState.achieved, `survivor elite bounty should complete deterministically, reward score, sync HUD, and unlock achievement: ${JSON.stringify(survivorBountyState)}`);
  assert(bossState.nonBlank && bossState.dash && bossState.weak && bossState.breaks === 0 && bossState.counter === '0x' && bossState.lives >= 4, `boss canvas should render active state and apply equipped loadout: ${JSON.stringify(bossState)}`);
  assert(bossTelegraphState.running && !bossTelegraphState.paused && bossTelegraphState.queued === 'snipe' && bossTelegraphState.current === 'snipe' && bossTelegraphState.bullets === 0 && bossTelegraphState.weak?.active && bossTelegraphState.weak.remaining >= 1 && /^\d+\/\d+$/.test(bossTelegraphState.weakHud) && /预警/.test(bossTelegraphState.patternText) && /锁定狙击/.test(bossTelegraphState.patternText), `boss mode should surface a readable weakpoint telegraph before spawning bullets: ${JSON.stringify(bossTelegraphState)}`);
  assert(bossTelegraphHoldState.queued === 'snipe' && bossTelegraphHoldState.bullets === 0 && bossTelegraphHoldState.telegraphMs > 0 && bossTelegraphHoldState.weak?.active && bossTelegraphHoldState.weak.timer > 0 && /预警/.test(bossTelegraphHoldState.patternText), `boss telegraph should hold a reaction window before release: ${JSON.stringify(bossTelegraphHoldState)}`);
  assert(
    bossCounterState.before?.weak?.active &&
    !bossCounterState.after?.weak?.active &&
    bossCounterState.after?.breakCount >= bossCounterState.before?.breakCount + 1 &&
    bossCounterState.after?.bullets === 0 &&
    !bossCounterState.after?.queued &&
    bossCounterState.after?.weak?.breakChain >= 1 &&
    bossCounterState.after?.weak?.counterWindow > 0 &&
    /^\d+x$/.test(bossCounterState.counterText) &&
    bossCounterState.after?.weak?.hudCounter === '1x' &&
    bossCounterState.chain?.after?.weak?.breakChain >= 2 &&
    bossCounterState.chain?.after?.weak?.counterWindow > 0 &&
    bossCounterState.chain?.after?.weak?.hudCounter === '2x' &&
    bossCounterState.counterText === '2x' &&
    bossCounterState.achievedCounterChain &&
    Number(bossCounterState.after?.weak?.score || 0) > Number(bossCounterState.before?.weak?.score || 0) &&
    Number(bossCounterState.chain?.after?.weak?.score || 0) > Number(bossCounterState.after?.weak?.score || 0) &&
    (/BROKEN|LOCKED/.test(bossCounterState.weakText)) &&
    Number(bossCounterState.breakText || 0) >= 2,
    `boss weakpoint counter should break queued attacks, chain counters, score, and update HUD: ${JSON.stringify(bossCounterState)}`
  );
  assert(
    bossFocusSurgeState.after?.focusSurge > 0 &&
    bossFocusSurgeState.after?.focusSurges >= 1 &&
    bossFocusSurgeState.after?.graze >= 6 &&
    bossFocusSurgeState.after?.bestGrazeStreak >= bossFocusSurgeState.after?.grazeStreak &&
    bossFocusSurgeState.after?.focus === 0 &&
    bossFocusSurgeState.focusText === 'SURGE' &&
    Number(bossFocusSurgeState.after?.score || 0) > Number(bossFocusSurgeState.before?.score || 0) &&
    bossFocusSurgeState.achieved,
    `boss focus surge should reward graze chains with a timed damage state and achievement: ${JSON.stringify(bossFocusSurgeState)}`
  );
  assert(bossReleaseTelegraphState.queued === 'snipe' && bossReleaseTelegraphState.weak?.active && bossReleaseTelegraphState.bullets === 0 && /预警/.test(bossReleaseTelegraphState.patternText), `boss should be able to queue a fresh telegraph after a counter break: ${JSON.stringify(bossReleaseTelegraphState)}`);
  assert(!bossPatternReleasedState.queued && bossPatternReleasedState.current === 'snipe' && bossPatternReleasedState.bullets >= 7 && /锁定狙击/.test(bossPatternReleasedState.patternText), `boss pattern should release bullets only after the telegraph window: ${JSON.stringify(bossPatternReleasedState)}`);
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
  assert(driftState.nonBlank && driftState.running && !driftState.paused && driftState.score > 0 && /Neon Drift/.test(driftState.activeTitle) && driftState.boost !== 'READY' && /G$/.test(driftState.rival) && /^\d+%$/.test(driftState.heat) && driftState.phase && driftState.contract && driftState.overtake && driftState.debug?.rivalHud === driftState.rival && driftState.debug?.contractHud === driftState.contract && driftState.debug?.heatHud === driftState.heat && driftState.debug?.phaseHud === driftState.phase, `drift mode should render, move, score, spend boost, and expose synced rival/contract/heat/phase HUD: ${JSON.stringify(driftState)}`);
  assert(driftApexState.after.running && driftApexState.after.gates >= driftApexState.before.gates + 1 && driftApexState.after.label === 'PERFECT' && driftApexState.after.quality >= 86 && driftApexState.after.combo >= 1 && driftApexState.after.bestCombo >= driftApexState.after.combo && driftApexState.after.splits?.length >= 1 && driftApexState.after.lineBank > driftApexState.before.lineBank && driftApexState.after.overtakes > driftApexState.before.overtakes && driftApexState.after.rival?.flash > 0 && driftApexState.after.contract?.progress > driftApexState.before.contract?.progress && driftApexState.after.heat <= driftApexState.before.heat && /PERFECT/.test(driftApexState.line) && /\dx/.test(driftApexState.combo) && driftApexState.rival && driftApexState.overtake, `drift mode should grade clean apex gates with combo, split, rival overtake, sponsor progress, heat control, and HUD feedback: ${JSON.stringify(driftApexState)}`);
  assert(driftPhaseState.triggered && driftPhaseState.before?.phaseCharge === 100 && driftPhaseState.before?.phaseReady === 'true' && driftPhaseState.after?.phaseCharge === 0 && driftPhaseState.after?.phaseBrake > 0 && driftPhaseState.after?.phaseUses === driftPhaseState.before?.phaseUses + 1 && driftPhaseState.after?.heat < driftPhaseState.before?.heat && driftPhaseState.after?.phaseHud === 'BRAKE' && driftPhaseState.after?.phaseReady === 'false', `drift phase brake should consume READY charge, lower heat, and expose BRAKE HUD: ${JSON.stringify(driftPhaseState)}`);
  assert(driftSponsorState.after?.contract?.completed > driftSponsorState.before?.contract?.completed && driftSponsorState.after?.score > driftSponsorState.before?.score && driftSponsorState.after?.lineBank > driftSponsorState.before?.lineBank && driftSponsorState.after?.lastContract === 'APEX' && driftSponsorState.achieved, `drift sponsor contract should complete, reward score/line bank, and unlock achievement: ${JSON.stringify(driftSponsorState)}`);
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
  assert(heistState.nonBlank && Number(heistState.steps) >= 2, 'heist should accept keyboard movement and debug route stepping');
  assert(heistState.achievementBadges >= 1, 'heist cloak should unlock at least one achievement badge');
  assert(/^(KEY|EXIT|TERMINAL|CACHE)\s+\d+\s+(SAFE|R\d+)$/.test(heistState.route), `heist route HUD should expose a readable objective and risk: ${JSON.stringify(heistState)}`);
  assert(Array.isArray(heistState.before.route) && heistState.before.route.length > 0 && Array.isArray(heistState.before.heatCells) && heistState.before.heatCells.length > 0 && Array.isArray(heistState.before.cameras) && heistState.before.cameras.length >= 3 && Array.isArray(heistState.before.caches) && heistState.before.caches.length >= 3, `heist debug intel should expose route, cameras, caches, and heat map: ${JSON.stringify(heistState.before)}`);
  assert(heistState.routeStep.steps >= 2 && heistState.routeStep.chain > heistState.before.chain && Array.isArray(heistState.routeStep.route), `heist route stepping should advance chain and refresh route: ${JSON.stringify(heistState.routeStep)}`);
  assert(heistState.decoyState.after?.decoy?.timer > 0 && heistState.decoyState.after?.decoys < heistState.decoyState.before?.decoys && heistState.decoyState.after?.guards?.some(guard => Number(guard.distracted || 0) > 0) && /DECOY/.test(heistState.decoyState.after?.lastTactic || ''), `heist decoy should distract guards and consume a tool: ${JSON.stringify(heistState.decoyState)}`);
  assert(heistState.cacheState.after?.loot > heistState.cacheState.before?.loot && heistState.cacheState.after?.securityPeak >= heistState.cacheState.before?.securityPeak && heistState.cacheState.after?.caches?.some(cache => cache.taken) && heistState.cacheState.achieved, `heist cache should add loot, raise security pressure, and unlock achievement: ${JSON.stringify(heistState.cacheState)}`);
  assert(/^\d+x$/.test(heistState.chain) && /^\d+%$/.test(heistState.security) && /^\d+$/.test(heistState.loot) && heistState.debug.chainHud === heistState.chain && heistState.debug.routeHud === heistState.route && heistState.debug.securityHud === heistState.security && heistState.debug.lootHud === heistState.loot, `heist HUD should stay in sync with debug state: ${JSON.stringify(heistState)}`);
  assert(careerDialogState.open && careerDialogState.ariaHidden === 'false', `career dialog should open: ${JSON.stringify(careerDialogState)}`);
  assert(careerDialogState.medalCards >= 7 && careerDialogState.achievements >= 16 && careerDialogState.unlocked >= 1, `career dialog should show medals and achievements: ${JSON.stringify(careerDialogState)}`);
  assert(/RANK/.test(careerDialogState.summary) && careerDialogState.daily.length > 10 && careerDialogState.visibleInViewport && !careerDialogState.horizontalOverflow, `career dialog should show readable summary and daily challenge: ${JSON.stringify(careerDialogState)}`);
  assert(!careerDialogClosed.open && careerDialogClosed.ariaHidden === 'true', `career dialog should close cleanly: ${JSON.stringify(careerDialogClosed)}`);
  assert(chainState.cells === 49 && Number(chainState.specials) >= 1 && Number(chainState.wilds) >= 1, `chain board should render enhanced special cells: ${JSON.stringify(chainState)}`);
  assert(chainState.debugBefore.bestMove?.cleared >= 3 && chainState.hinted === 1 && chainState.previewed >= 2, `chain should expose a highlighted best move and preview: ${JSON.stringify(chainState)}`);
  assert(chainState.forced.before.bestMove?.cleared >= 12 && chainState.forced.after.combo >= 12 && chainState.forced.after.score > chainState.forced.before.score, `chain debug combo should clear a large deterministic cluster: ${JSON.stringify(chainState.forced)}`);
  assert(chainState.forced.after.phaseIndex >= 1 && chainState.forced.after.lastSpecial && chainState.forced.after.mult > 1, `chain combo should advance phase, create a core, and raise multiplier: ${JSON.stringify(chainState.forced.after)}`);
  assert(chainState.recipeForced.after?.recipesCompleted > chainState.recipeForced.before?.recipesCompleted && chainState.recipeForced.after?.score > chainState.recipeForced.before?.score && chainState.recipeForced.after?.overcharge > chainState.recipeForced.before?.overcharge && chainState.recipeForced.after?.achieved, `chain recipe contract should complete, score, charge overdrive, and unlock achievement: ${JSON.stringify(chainState.recipeForced)}`);
  assert(chainState.catalystForced.before?.overcharge === 100 && chainState.catalystForced.before?.hud?.overcharge === 'READY' && chainState.catalystForced.after?.catalystUsed > chainState.catalystForced.before?.catalystUsed && chainState.catalystForced.after?.combo >= 12 && chainState.catalystForced.after?.score > chainState.catalystForced.before?.score && chainState.catalystForced.after?.overcharge < 100, `chain catalyst should consume READY overcharge and perform a major clear: ${JSON.stringify(chainState.catalystForced)}`);
  assert(/^x\d+(\.\d)?$/.test(chainState.mult) && /^C\d+ V\d+ P\d+ G\d+ N\d+$/.test(chainState.essence) && /%$/.test(chainState.recipe) && (/^\d+%$/.test(chainState.overcharge) || chainState.overcharge === 'READY') && chainState.debugAfter.hud.mult === chainState.mult && chainState.debugAfter.hud.phase === chainState.phase && chainState.debugAfter.hud.hint === chainState.hint && chainState.debugAfter.hud.essence === chainState.essence && chainState.debugAfter.hud.recipe === chainState.recipe && chainState.debugAfter.hud.overcharge === chainState.overcharge, `chain HUD should stay in sync with debug state, recipe, essence, and overcharge: ${JSON.stringify(chainState)}`);
  assert(chainState.recipeDetail && chainState.debugAfter.recipe?.detail === chainState.recipeDetail && chainState.catalystReady === 'false', `chain recipe detail and catalyst readiness should be exposed to the DOM: ${JSON.stringify(chainState)}`);
  const tacticsRouteNext = tacticsRouteState.before?.route?.next;
  const tacticsBlastBeforeTargets = tacticsBlastState.before?.forecast?.blastTargets || [];
  const tacticsBlastAfterEnemies = tacticsBlastState.after?.enemies || [];
  const tacticsJammedAfterBlast = tacticsBlastAfterEnemies.some(enemy => Number(enemy.disrupted || 0) > 0);
  const tacticsKilledDuringBlast = Number(tacticsBlastState.after?.kills || 0) > Number(tacticsBlastState.before?.kills || 0)
    || tacticsBlastAfterEnemies.length < (tacticsBlastState.before?.enemies || []).length;
  const tacticsJammedIntent = (tacticsForecastAfterAction.intents || []).some(intent => intent.label === 'JAM' || intent.mode === 'disrupted');
  assert(tacticsForecastStart.dangerCount > 0 && tacticsForecastStart.intents?.length >= 4 && tacticsForecastStart.blastTargets?.length >= 1 && /目标/.test(tacticsForecastStart.action) && tacticsForecastStart.route?.route?.length > 0 && tacticsForecastStart.routeHud === tacticsForecastStart.route?.label && tacticsForecastStart.coverHud && tacticsForecastStart.momentumHud !== undefined, `tactics mode should forecast enemy intent, blast windows, cover, momentum, and route intel: ${JSON.stringify(tacticsForecastStart)}`);
  assert(tacticsRouteNext && tacticsRouteState.after?.player?.x === tacticsRouteNext.x && tacticsRouteState.after?.player?.y === tacticsRouteNext.y && Number(tacticsRouteState.after?.momentum || 0) > Number(tacticsRouteState.before?.momentum || 0) && tacticsRouteState.after?.route?.label && tacticsRouteState.after?.hud?.route === tacticsRouteState.after?.route?.label, `tactics route debug should move along the recommended path and reward momentum: ${JSON.stringify(tacticsRouteState)}`);
  assert(tacticsBlastBeforeTargets.length >= 2 && Number(tacticsBlastState.after?.player?.ap || 0) >= Number(tacticsBlastState.before?.player?.ap || 0) && Number(tacticsBlastState.after?.momentum || 0) > Number(tacticsBlastState.before?.momentum || 0) && Number(tacticsBlastState.after?.combo || 0) >= 1 && tacticsJammedAfterBlast && tacticsKilledDuringBlast, `tactics phase blast should pierce targets, refund AP, build combo/momentum, kill, and jam survivors: ${JSON.stringify(tacticsBlastState)}`);
  assert(tacticsForecastAfterAction.dangerCount > 0 && tacticsForecastAfterAction.coverHud && tacticsForecastAfterAction.momentumHud !== undefined && tacticsForecastAfterAction.routeHud && tacticsJammedIntent, `tactics mode should expose post-action JAM, cover, momentum, and route forecast: ${JSON.stringify(tacticsForecastAfterAction)}`);
  assert(tacticsState.nonBlank && Number(tacticsState.ap) >= 0 && tacticsState.action && tacticsState.cover && tacticsState.momentum !== undefined && tacticsState.route && tacticsState.debug?.route?.length > 0, `tactics mode should render and accept enhanced actions: ${JSON.stringify(tacticsState)}`);
  assert(Number(tacticsState.danger) > 0 && tacticsState.intel && tacticsState.debug?.hud?.route === tacticsState.route && tacticsState.debug?.hud?.cover === tacticsState.cover && tacticsState.debug?.hud?.momentum === tacticsState.momentum, `tactics HUD should stay in sync with enhanced debug state: ${JSON.stringify(tacticsState)}`);
  assert(pwaState.supported && pwaState.registered && pwaState.shellCached && pwaState.cacheKeys.some(key => /confirm-cdp/.test(key)) && pwaState.swHasConfirmCdpVersion, `service worker should register and cache the latest app shell: ${JSON.stringify(pwaState)}`);
  assert(pwaState.swHasLocalProjectAssets, `service worker should precache local portfolio assets: ${JSON.stringify(pwaState)}`);
  assert(pwaState.swHasNavigationPreload && pwaState.swHasOfflineShellHeader && pwaState.swHasFallbackUrl, `service worker should include robust offline navigation fallback: ${JSON.stringify(pwaState)}`);
  const diagnosticText = JSON.stringify(diagnostics);
  assert(!/willReadFrequently|Multiple readback operations/i.test(diagnosticText), `canvas diagnostics should stay quiet after smoke readback hardening: ${diagnosticText}`);
  assert(!/autocomplete attributes|current-password/i.test(diagnosticText), `admin autocomplete diagnostics should stay quiet: ${diagnosticText}`);
  assert(!/Blocked aria-hidden|retained focus/i.test(diagnosticText), `modal focus should move before aria-hidden changes: ${diagnosticText}`);

  await bestEffortSend('Page.close');
  if (launched) await bestEffortSend('Browser.close');
  ws.close();

  return {
    launched,
    managedServer,
    cdpPort,
    appUrl,
    adminStartupState,
    accessibilityBaseline,
    commandFocusOpenState,
    commandFocusClosedState,
    adminModalOpenState,
    adminModalClosedState,
    commandBeforeExecute,
    commandState,
    vaultCommandBeforeExecute,
    vaultCommandState,
    vaultExportState,
    vaultImportState,
    vaultClearConfirmState,
    legacyVaultHydrationState,
    blogHubBefore,
    blogState,
    readerCompletionState,
    readerResetState,
    readerNextOpenState,
    readerToolState,
    readerExportState,
    blogHubAfterBookmark,
    badPostRouteState,
    guestbookA11yState,
    projectViewportState,
    projectState,
    projectModalClosedState,
    gameViewportState,
    mainSpaceState,
    runnerTouchState,
    runnerGamepadState,
    runnerMobileState,
    premiumMobileState,
    arcadeInitial,
    premiumGamepadState,
    premiumPauseHookState,
    contractProgressState,
    coachLaunchState,
    leagueProgressState,
    loadoutProgressState,
    difficultyProgressState,
    rivalLaunchState,
    profileLaunchState,
    prizeLaunchState,
    directorLaunchState,
    cockpitTargetState,
    cockpitPlayState,
    survivorState,
    survivorDraftOpenState,
    survivorDraftFreezeState,
    survivorDraftChosenState,
    survivorOverdriveState,
    survivorAnomalyState,
    survivorBountyState,
    bossState,
    bossTelegraphState,
    bossTelegraphHoldState,
    bossFocusSurgeState,
    bossPatternReleasedState,
    bossPauseState,
    bossPauseFreezeState,
    bossResumeState,
    driftState,
    driftApexState,
    driftPhaseState,
    driftSponsorState,
    driftPauseState,
    driftPauseFreezeState,
    driftResumeState,
    heistState,
    careerDialogState,
    careerDialogClosed,
    chainState,
    tacticsForecastStart,
    tacticsRouteState,
    tacticsBlastState,
    tacticsForecastAfterAction,
    tacticsState,
    pwaState,
    diagnostics: diagnosticsSummary()
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
