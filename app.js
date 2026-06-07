// app.js - Atherix Digital Space Frontend Logic (Integrated API & Premium UI Version)

function init() {
  let iconRenderQueued = false;

  // Safe helper to create icons without throwing ReferenceError
  function normalizeButtonTypes(scope = document) {
    const root = scope && typeof scope.querySelectorAll === 'function' ? scope : document;
    root.querySelectorAll('button:not([type])').forEach(button => {
      button.type = 'button';
    });
  }

  function safeCreateIcons(scope = document) {
    normalizeButtonTypes(scope);
    if (typeof lucide === 'undefined' || iconRenderQueued) return;
    iconRenderQueued = true;

    requestAnimationFrame(() => {
      normalizeButtonTypes(scope);
      iconRenderQueued = false;
      try {
        lucide.createIcons();
      } catch (e) {
        console.error('Error rendering Lucide icons:', e);
      }
    });
  }

  // Initialize Lucide Icons
  safeCreateIcons();

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => registration.update?.().catch(err => console.warn('Service worker update check failed:', err.message)))
        .catch(err => console.warn('Service worker registration failed:', err.message));
    });
  }

  // Hide loader after loading completes
  const loader = document.getElementById('loading-overlay');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 250);
  }

  // Global game controller placeholders for SPA navigation switching
  let gameRunning = false;
  let gamePaused = false;
  let gameLoopId = null;
  let deathAnimationId = null;
  let runnerEngineReady = false;
  let stopMusic = () => {};
  let initLevelData = () => {};
  let drawGame = () => {};
  let clearRunnerPauseState = () => {};

  // Global Page Scroll Progress Bar Indicator
  window.addEventListener('scroll', () => {
    const scrollProgress = document.getElementById('scroll-progress');
    if (scrollProgress) {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      scrollProgress.style.width = scrolled + '%';
    }
  });

  // ==========================================
  // DATA MODELS & MOCKS FALLBACKS
  // ==========================================
  let blogPosts = [];
  let projectsData = [];

  const defaultMockPosts = [
    {
      id: 'post-1',
      title: '如何构建一个极速的无框架博客？',
      excerpt: '探索现代原生 Web API 的潜能，摆脱重度前端框架依赖，打造秒开的个人网站性能体验。',
      content: `# 如何构建一个极速的无框架博客？\n\n在现代 Web 开发中，我们经常陷入“框架过载”的境地。为了展示几篇文字和几个交互组件，我们常常打包数百 KB 甚至数 MB 的 JavaScript 代码。\n\n本篇文章将探讨如何回归初心，利用原生 Web 技术的卓越性能，打造极致速度的个人数字花园。\n\n## 为什么选择无框架？\n\n1. **零构建步骤**：你可以直接用文本编辑器编写 HTML、CSS 和 JS，在任何浏览器中双击即可运行。\n2. **瞬时加载 (Instant Load)**：没有复杂的运行时加载、虚拟 DOM 对比或巨大的第三方库。Lighthouse 性能评分轻松拉满 100 分。\n3. **极佳的可读性与复古情怀**：代码干净纯粹，对搜索引擎爬虫极度友好，维护生命周期几乎是无限的。\n\n## 核心技术选型\n\n要实现极致的无框架体验，我们可以依赖以下现代 Web 标准：\n\n- **CSS Grid & Custom Properties (变量)**：轻松解决复杂布局 and 暗黑模式切换。\n- **Vanilla ES6 JavaScript**：用于局部路由管理、交互式小工具及数据同步。\n- **Lucide Icons**：矢量化、轻量级的图标管理方案。\n\n\`\`\`javascript\n// 极简的原生路由实现\nfunction navigateTo(routeId) {\n  document.querySelectorAll('.view-section').forEach(sec => {\n    sec.classList.remove('active');\n  });\n  const target = document.getElementById(routeId);\n  if (target) target.classList.add('active');\n}\n\`\`\`\n\n## 结论\n\n无框架并不是逆行，而是一种对性能、掌控力以及环保编码（Green Coding）的追求。欢迎你在我的工具箱里尝试这些纯原生开发的实用组件！`,
      tag: '前端开发',
      date: '2026-05-18',
      readTime: '6 分钟阅读',
      pinned: true
    },
    {
      id: 'post-2',
      title: '基于 Web Audio API 实现沉浸式白噪音生成器',
      excerpt: '深入了解浏览器音频接口，不依赖音频文件也能实时合成雨声、风声和 Lofi 合成器背景音。',
      content: `# 基于 Web Audio API 实现沉浸式白噪音生成器\n\n在我们的番茄钟和音乐播放器中，你可能会注意到好听的雨声和伴奏。其实，这些音效很多不需要通过加载大型 MP3 文件来播放。我们可以直接在浏览器中利用 Web Audio API 合成它们！\n\n## 什么是 Web Audio API？\n\nWeb Audio API 是浏览器提供的一个高级音频处理系统，允许开发者在音频上下文中创建音频源、添加音效节点（如滤波器、延迟器、空间化器），并将最终音轨输出到扬声器。\n\n## 如何生成“雨声”（粉色噪音 + 滤波器）\n\n雨声本质上接近于**粉色噪音 (Pink Noise)**，并辅以随机的低频振荡来模拟雷声或大雨滴。\n\n### 1. 粉色噪音的合成算法\n\n粉色噪音的频谱随着频率的增加而衰减（每倍频程衰减3分贝）。我们可以用一段白噪音，通过特殊滤波器进行处理：\n\n\`\`\`javascript\nconst audioCtx = new (window.AudioContext || window.webkitAudioContext)();\nconst bufferSize = 2 * audioCtx.sampleRate;\nconst noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);\nconst output = noiseBuffer.getChannelData(0);\n\nlet b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;\nfor (let i = 0; i < bufferSize; i++) {\n  const white = Math.random() * 2 - 1;\n  b0 = 0.99886 * b0 + white * 0.0555179;\n  b1 = 0.99332 * b1 + white * 0.0750759;\n  b2 = 0.96900 * b2 + white * 0.1538520;\n  b3 = 0.86650 * b3 + white * 0.3104856;\n  b4 = 0.55000 * b4 + white * 0.5329522;\n  b5 = -0.7616 * b5 - white * 0.0168980;\n  output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;\n  output[i] *= 0.11; // 调整音量平衡\n  b6 = white * 0.115926;\n}\n\`\`\`\n\n有了这段噪音缓存，我们只需用 \`AudioBufferSourceNode\` 循环播放它，并用 \`BiquadFilterNode\` 设置一个低通滤波，就能模仿出雨滴击打在窗户上的柔和声音。\n\n## 总结\n\n利用 Web API 合成声音不仅节省带宽，还能让声音产生无穷的变化而不重复。在我的番茄钟里，我已经内置了这种合成机制，快去体验一下吧！`,
      tag: '黑客技术',
      date: '2026-05-15',
      readTime: '8 分钟阅读',
      pinned: true
    }
  ];

  const defaultMockProjects = [
    {
      id: 'proj-1',
      title: 'Atherix System Bento Dashboard',
      desc: '基于微光玻璃态风格设计的个人主页看板，包含系统指标可视化、白噪音播放器等丰富微交互。',
      tag: 'UI/UX设计',
      tags: ['Vanilla JS', 'Bento Grid', 'CSS variables', 'SVG Graph'],
      img: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=500',
      pain: '传统个人主页流于形式，缺乏直观、高颜值的即时交互以及实用的极客感监视工具。',
      solution: '设计以 Bento Grid（便当盒栅格）为核心架构，利用 CSS 毛玻璃结合后台波形图生成器，打造出富有生命感的极客式数字仪表盘。',
      github: 'https://github.com',
      live: '#'
    },
    {
      id: 'proj-2',
      title: 'Browser Client WebP Converter',
      desc: '纯客户端实现的图片压缩和 WebP 格式转换工具，具有实时预览和压缩比例比对功能。',
      tag: '前端开发',
      tags: ['HTML5 Canvas', 'WebP encoder', 'Drag & Drop API'],
      img: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=500',
      pain: '常用图片压缩网站要么限制上传大小，要么需要将敏感图片上传到第三方服务器，存在泄露隐私隐患。',
      solution: '在浏览器中使用 Canvas API 完成无损/有损缩放，并以 image/webp 进行二次编码，全程在用户本地沙箱环境内运行，隐私安全率 100%。',
      github: 'https://github.com',
      live: '#'
    }
  ];

  const ambientTracks = [
    { title: 'Forest Rain', artist: 'Ambient Synth', src: 'rain_synth' },
    { title: 'Lofi Focus Beats', artist: 'Retro Osc', src: 'lofi_synth' },
    { title: 'Deep Space Drone', artist: 'Cosmo Sweep', src: 'space_synth' }
  ];

  // ==========================================
  // STATE VARIABLES
  // ==========================================
  let currentTrackIndex = 0;
  let isPlaying = false;
  let audioContext = null;
  let synthNodes = null;
  let visualizerTimer = null;
  let cpuHistory = Array(20).fill(12);

  // Pomodoro timer state
  let timerInterval = null;
  let timeRemaining = 25 * 60;
  let currentTimerMode = 'focus';
  let isTimerRunning = false;
  let pomoAudioCtx = null;
  let pomoNoiseSource = null;

  // Admin authentication state
  let isAdmin = false;

  function showToast(message, type = 'info') {
    const stack = document.getElementById('toast-stack');
    if (!stack) {
      console.log(message);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.textContent = message;
    stack.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3200);
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const safeUploadUrlPattern = /^\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:jpe?g|png|gif|webp)$/i;

  function normalizeUrl(value, { allowRelativeUpload = false } = {}) {
    const raw = String(value || '').trim();
    if (!raw || raw === '#') return '';
    if (allowRelativeUpload && raw.startsWith('/uploads/')) {
      return safeUploadUrlPattern.test(raw) ? raw : '';
    }
    if (raw.startsWith('/') || raw.startsWith('#')) return '';
    try {
      const url = new URL(raw, window.location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (err) {
      return '';
    }
  }

  function setOptionalExternalLink(anchor, url, fallbackLabel) {
    if (!anchor) return;
    const normalized = normalizeUrl(url);
    if (normalized) {
      anchor.href = normalized;
      anchor.removeAttribute('aria-disabled');
      anchor.classList.remove('project-btn-disabled');
      anchor.tabIndex = 0;
      return;
    }
    anchor.href = '#';
    anchor.setAttribute('aria-disabled', 'true');
    anchor.classList.add('project-btn-disabled');
    anchor.tabIndex = -1;
    if (fallbackLabel) anchor.dataset.fallbackLabel = fallbackLabel;
  }

  function copyText(text, successMessage = '已复制到剪贴板') {
    if (!text) {
      showToast('没有可复制的内容', 'warning');
      return Promise.resolve(false);
    }

    if (!navigator.clipboard?.writeText) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.select();
      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch (err) {
        copied = false;
      } finally {
        textarea.remove();
      }
      showToast(copied ? successMessage : '复制失败，请手动选择文本复制', copied ? 'success' : 'error');
      return Promise.resolve(copied);
    }

    return navigator.clipboard.writeText(text)
      .then(() => {
        showToast(successMessage, 'success');
        return true;
      })
      .catch((err) => {
        showToast(`复制失败: ${err.message}`, 'error');
        return false;
      });
  }

  const focusableSelector = [
    'a[href]:not([aria-disabled="true"])',
    'button:not([disabled])',
    'input:not([type="hidden"]):not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  const modalFocusOrigins = new WeakMap();
  const modalCloseTimers = new WeakMap();
  let commandPaletteFocusOrigin = null;

  function isVisibleFocusableElement(element) {
    if (!element || element.getAttribute('aria-hidden') === 'true' || element.getAttribute('aria-disabled') === 'true') {
      return false;
    }
    const style = window.getComputedStyle(element);
    return style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      element.getClientRects().length > 0;
  }

  function getFocusableElements(container) {
    if (!container) return [];
    return [...container.querySelectorAll(focusableSelector)]
      .filter(element => element.tabIndex !== -1 && isVisibleFocusableElement(element));
  }

  function restoreFocusTo(element) {
    if (!element || !document.contains(element) || typeof element.focus !== 'function') return false;
    try {
      element.focus({ preventScroll: true });
    } catch (err) {
      element.focus();
    }
    return document.activeElement === element;
  }

  function focusInitialElement(container) {
    if (!container) return;
    const preferred = container.querySelector('[data-autofocus], input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])');
    if (preferred && isVisibleFocusableElement(preferred)) {
      restoreFocusTo(preferred);
      return;
    }
    const firstFocusable = getFocusableElements(container)[0];
    if (firstFocusable) restoreFocusTo(firstFocusable);
  }

  function trapFocus(event, container) {
    if (event.key !== 'Tab' || !container) return;
    const focusable = getFocusableElements(container);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !container.contains(active))) {
      event.preventDefault();
      restoreFocusTo(last);
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      restoreFocusTo(first);
    }
  }

  const skipLink = document.querySelector('.skip-link');
  const mainContent = document.getElementById('main-content');
  if (skipLink && mainContent) {
    skipLink.addEventListener('click', () => {
      requestAnimationFrame(() => restoreFocusTo(mainContent));
    });
  }

  // ==========================================
  // API CALL HANDLING (TUN / PROXY SAFE RELATIVE PATHS)
  // ==========================================
  async function fetchAPI(url, options = {}) {
    // Add bearer authorization token if admin is logged in
    const token = localStorage.getItem('admin_token');
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      };
    }
    // Set headers for json bodies
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json'
      };
      options.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn(`API call to ${url} failed. Offline fallback in action:`, err.message);
      throw err;
    }
  }

  function getLocalArray(key, fallback = []) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (err) {
      console.warn(`Ignoring invalid local cache for ${key}:`, err.message);
      localStorage.removeItem(key);
      return fallback;
    }
  }

  // ==========================================
  // SPA ROUTING
  // ==========================================
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');
  let navigationVersion = 0;
  let currentRoute = 'home';
  let currentPostId = '';
  let suppressHashSync = false;

  function syncLocationHash(targetId, postId = '') {
    if (suppressHashSync) return;
    const nextHash = targetId === 'blog-reader' && postId
      ? `#post/${encodeURIComponent(postId)}`
      : `#${targetId}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
  }

  function resetRouteScroll() {
    const snapToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    snapToTop();
    requestAnimationFrame(snapToTop);
    setTimeout(snapToTop, 120);
    setTimeout(snapToTop, 460);
  }

  function navigateTo(targetId, options = {}) {
    const version = ++navigationVersion;
    closeAllProjectModals({ restoreFocus: false });
    currentRoute = targetId;
    if (targetId !== 'blog-reader') currentPostId = '';
    if (targetId !== 'blog-reader') {
      document.title = 'Atherix - 个人博客与数字空间';
    }
    const activeNavTarget = targetId === 'blog-reader' ? 'blog' : targetId;
    navItems.forEach(item => {
      if (item.getAttribute('data-target') === activeNavTarget) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    viewSections.forEach(section => {
      if (section.id === targetId) {
        section.style.display = 'block';
        setTimeout(() => {
          if (version !== navigationVersion) return;
          section.classList.add('active');
        }, 50);
      } else {
        section.classList.remove('active');
        setTimeout(() => {
          if (version !== navigationVersion) return;
          if (!section.classList.contains('active')) {
            section.style.display = 'none';
          }
        }, 400);
      }
    });

    // Stop game and music if switching away from game tab, initialize if entering
    if (targetId !== 'game') {
      gameRunning = false;
      cancelAnimationFrame(gameLoopId);
      cancelAnimationFrame(deathAnimationId);
      stopMusic();
      if (runnerEngineReady) {
        resetGameKeyState();
        clearRunnerPauseState();
      }
      releaseArcadeButtonFocus();
    } else {
      initLevelData();
      drawGame();
    }

    if (!options.skipHash) {
      syncLocationHash(targetId, options.postId || '');
    }
    if (targetId !== 'blog-reader' && !options.preserveScroll) {
      resetRouteScroll();
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      navigateTo(target);
    });
  });

  document.querySelectorAll('.profile-actions [data-target]').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      navigateTo(target);
    });
  });

  // Featured Blog Card click route
  const quickBlogCard = document.getElementById('quick-blog-card');
  if (quickBlogCard) {
    quickBlogCard.addEventListener('click', () => {
      const featPost = blogPosts.find(p => p.pinned) || blogPosts[0];
      if (featPost) {
        readArticle(featPost.id);
      } else {
        navigateTo('blog');
      }
    });
  }

  // ==========================================
  // GLOBAL COMMAND PALETTE
  // ==========================================
  const commandPalette = document.getElementById('command-palette');
  const commandTrigger = document.getElementById('command-palette-trigger');
  const commandCloseBtn = document.getElementById('command-palette-close');
  const commandSearchInput = document.getElementById('command-search-input');
  const commandResults = document.getElementById('command-results');
  const commandResultCount = document.getElementById('command-result-count');
  let commandItems = [];
  let commandMatches = [];
  let commandActiveIndex = 0;

  function normalizeCommandText(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function escapeCommandSelectorValue(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value || '').replace(/["\\]/g, '\\$&');
  }

  function activateToolPanel(toolId) {
    navigateTo('toolbox');
    setTimeout(() => {
      const btn = document.querySelector(`.tool-nav-btn[data-tool="${escapeCommandSelectorValue(toolId)}"]`);
      if (btn) btn.click();
    }, 120);
  }

  function activatePremiumGame(gameId) {
    navigateTo('game');
    setTimeout(() => {
      const btn = document.querySelector(`[data-premium-game="${escapeCommandSelectorValue(gameId)}"]`);
      if (btn) btn.click();
    }, 160);
  }

  function buildCommandItems() {
    const routeItems = [
      { type: '导航', icon: 'layout-grid', title: '首页', desc: '返回 Bento 数字仪表盘', keywords: 'home dashboard bento 首页', action: () => navigateTo('home') },
      { type: '导航', icon: 'book-open', title: '博客', desc: '浏览文章列表与推荐阅读', keywords: 'blog article post 博客 文章', action: () => navigateTo('blog') },
      {
        type: '导航',
        icon: 'bookmark-check',
        title: '稍后读',
        desc: '查看已收藏的待读文章',
        keywords: 'bookmark reading later 稍后读 收藏 阅读',
        action: () => {
          navigateTo('blog');
          setTimeout(() => document.querySelector('[data-reader-filter="bookmarked"]')?.click(), 180);
        }
      },
      {
        type: '导航',
        icon: 'book-marked',
        title: '继续阅读',
        desc: '回到已有阅读进度的文章',
        keywords: 'continue reading progress 继续阅读 进度',
        action: () => {
          navigateTo('blog');
          setTimeout(() => document.querySelector('[data-reader-filter="in-progress"]')?.click(), 180);
        }
      },
      { type: '导航', icon: 'wrench', title: '工具箱', desc: '打开本地开发与创作工具', keywords: 'toolbox tools 工具 json markdown', action: () => navigateTo('toolbox') },
      { type: '导航', icon: 'gamepad-2', title: '街机游戏', desc: '进入主线跑酷与高级街机实验室', keywords: 'game arcade runner 游戏 街机', action: () => navigateTo('game') },
      { type: '导航', icon: 'folder-git-2', title: '项目', desc: '查看项目卡片与技术亮点', keywords: 'project portfolio 项目', action: () => navigateTo('projects') },
      { type: '导航', icon: 'message-square', title: '留言', desc: '打开留言板与访客互动墙', keywords: 'guestbook comments message 留言', action: () => navigateTo('guestbook') }
    ];
    const toolItems = [
      { id: 'json', icon: 'file-json', title: 'JSON 格式化树', desc: '校验、格式化、折叠 JSON 数据', keywords: 'json formatter tree 格式化' },
      { id: 'markdown', icon: 'edit-3', title: 'Markdown 预览', desc: '实时预览、复制 HTML、导出文档', keywords: 'markdown md preview editor' },
      { id: 'image', icon: 'image', title: '图片转换压缩', desc: '本地压缩图片并导出 WebP / JPEG / PNG', keywords: 'image webp compress 图片 压缩' },
      { id: 'pomodoro', icon: 'timer', title: '番茄工作钟', desc: '专注计时与合成白噪音', keywords: 'pomodoro timer focus 番茄钟' },
      { id: 'codec', icon: 'hash', title: '哈希与编解码', desc: 'Base64、URL、MD5、SHA-256 处理', keywords: 'hash base64 url md5 sha256 codec' },
      { id: 'devkit', icon: 'square-terminal', title: '开发速查工具', desc: '时间戳、UUID、JWT 解码', keywords: 'devkit uuid jwt timestamp 开发' },
      { id: 'piano', icon: 'music-4', title: '极客合成器琴', desc: 'Web Audio 合成器与节奏挑战', keywords: 'piano synth rhythm audio 音乐 节奏' },
      { id: 'vault', icon: 'database-backup', title: '数据保险库', desc: '导出、导入、恢复阅读进度与街机档案', keywords: 'vault backup restore export import data 备份 导出 导入 恢复 存档 保险库' }
    ].map(item => ({ ...item, type: '工具', action: () => activateToolPanel(item.id) }));
    const gameItems = [
      { id: 'runner', icon: 'rocket', title: 'Cyber Astro-Runner', desc: '8 关主线街机远征', keywords: 'runner platform main astro 跑酷 主线', action: () => navigateTo('game') },
      { id: 'survivor', icon: 'sparkles', title: 'Starcore Survivor', desc: '生存构筑与自动射击', keywords: 'survivor starcore roguelite 生存' },
      { id: 'boss', icon: 'crosshair', title: 'Prism Boss Rush', desc: '三阶段 Boss 弹幕战', keywords: 'boss bullet prism 弹幕' },
      { id: 'drift', icon: 'route', title: 'Neon Drift', desc: '检查点漂移、加速与无人机追逐', keywords: 'drift neon racing boost checkpoint 漂移 竞速' },
      { id: 'heist', icon: 'scan-eye', title: 'Cyber Heist', desc: '潜入、隐身、终端与撤离', keywords: 'heist stealth cloak 潜入' },
      { id: 'chain', icon: 'gem', title: 'Alchemy Chain', desc: '大连锁消除与特殊核心', keywords: 'chain alchemy puzzle 消除 连锁' },
      { id: 'tactics', icon: 'shield', title: 'Rift Tactics', desc: '行动点、敌人 AI 与核心撤离', keywords: 'tactics rift strategy turn 战术 回合' },
      {
        id: 'career',
        icon: 'trophy',
        title: '街机生涯档案',
        desc: '查看奖牌、每日挑战和全部成就',
        keywords: 'career achievements medals arcade rank 生涯 成就 奖牌',
        action: () => {
          navigateTo('game');
          setTimeout(() => document.getElementById('premium-career-open')?.click(), 220);
        }
      },
      {
        id: 'director',
        icon: 'target',
        title: '推荐街机挑战',
        desc: '由街机导演根据每日任务与奖牌缺口推荐下一局',
        keywords: 'arcade director next challenge 推荐 街机 每日 挑战',
        action: () => {
          navigateTo('game');
          setTimeout(() => document.getElementById('premium-director-start')?.click(), 260);
        }
      },
      {
        id: 'run-log',
        icon: 'activity',
        title: '街机战报',
        desc: '查看最近战斗记录、强项模式与平均声望',
        keywords: 'arcade run log replay telemetry stats 战报 复盘 记录 数据',
        action: () => {
          navigateTo('game');
          setTimeout(() => document.getElementById('premium-run-log-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 220);
        }
      }
    ].map(item => ({
      ...item,
      type: '游戏',
      action: item.action || (() => activatePremiumGame(item.id))
    }));
    const postItems = blogPosts.map(post => ({
      type: '文章',
      icon: 'file-text',
      title: post.title || '未命名文章',
      desc: post.excerpt || post.tag || '打开文章阅读器',
      keywords: `${post.title || ''} ${post.excerpt || ''} ${post.content || ''} ${post.tag || ''}`,
      action: () => readArticle(post.id)
    }));
    const projectItems = projectsData.map(project => ({
      type: '项目',
      icon: 'folder-open',
      title: project.title || '未命名项目',
      desc: project.desc || project.tag || '打开项目详情',
      keywords: `${project.title || ''} ${project.desc || ''} ${project.tag || ''} ${Array.isArray(project.tags) ? project.tags.join(' ') : ''}`,
      action: () => {
        navigateTo('projects');
        setTimeout(() => openProjectDetails(project.id), 160);
      }
    }));
    commandItems = [...routeItems, ...gameItems, ...toolItems, ...postItems, ...projectItems]
      .map((item, index) => ({ ...item, id: `command-${index}`, haystack: normalizeCommandText(`${item.title} ${item.desc} ${item.keywords}`) }));
  }

  function filterCommandItems() {
    const query = normalizeCommandText(commandSearchInput?.value || '');
    commandMatches = commandItems
      .map(item => {
        if (!query) return { item, score: item.type === '导航' ? 4 : 1 };
        const title = normalizeCommandText(item.title);
        let score = 0;
        if (title === query) score += 12;
        if (title.includes(query)) score += 8;
        if (item.haystack.includes(query)) score += 4;
        query.split(' ').filter(Boolean).forEach(part => {
          if (item.haystack.includes(part)) score += 1;
        });
        return { item, score };
      })
      .filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'zh-Hans-CN'))
      .slice(0, 18)
      .map(match => match.item);
    commandActiveIndex = Math.min(commandActiveIndex, Math.max(0, commandMatches.length - 1));
  }

  function renderCommandResults() {
    if (!commandResults) return;
    filterCommandItems();
    if (commandResultCount) commandResultCount.textContent = `${commandMatches.length} 项结果`;
    commandResults.innerHTML = '';
    if (!commandMatches.length) {
      const empty = document.createElement('div');
      empty.className = 'command-empty-state';
      empty.textContent = '没有找到匹配内容。';
      commandResults.appendChild(empty);
      return;
    }
    commandMatches.forEach((item, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `command-result-item${index === commandActiveIndex ? ' active' : ''}`;
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', index === commandActiveIndex ? 'true' : 'false');

      const iconWrap = document.createElement('span');
      iconWrap.className = 'command-result-icon';
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', item.icon || 'search');
      iconWrap.appendChild(icon);

      const copy = document.createElement('span');
      copy.className = 'command-result-copy';
      const title = document.createElement('span');
      title.className = 'command-result-title';
      title.textContent = item.title;
      const desc = document.createElement('span');
      desc.className = 'command-result-desc';
      desc.textContent = item.desc;
      copy.append(title, desc);

      const type = document.createElement('span');
      type.className = 'command-result-type';
      type.textContent = item.type;

      btn.append(iconWrap, copy, type);
      btn.addEventListener('mouseenter', () => {
        commandActiveIndex = index;
        renderCommandResults();
      });
      btn.addEventListener('click', () => executeCommandItem(index));
      commandResults.appendChild(btn);
    });
    safeCreateIcons();
  }

  function openCommandPalette(initialQuery = '') {
    if (!commandPalette || !commandSearchInput) return;
    if (!commandPalette.classList.contains('active')) {
      commandPaletteFocusOrigin = document.activeElement || commandTrigger;
    }
    buildCommandItems();
    commandSearchInput.value = initialQuery;
    commandActiveIndex = 0;
    commandPalette.classList.add('active');
    commandPalette.setAttribute('aria-hidden', 'false');
    document.body.classList.add('command-open');
    renderCommandResults();
    restoreFocusTo(commandSearchInput);
    requestAnimationFrame(() => restoreFocusTo(commandSearchInput));
    setTimeout(() => restoreFocusTo(commandSearchInput), 80);
  }

  function closeCommandPalette(options = {}) {
    if (!commandPalette) return;
    const { restoreFocus = true } = options;
    const focusTarget = commandPaletteFocusOrigin || commandTrigger;
    commandPalette.classList.remove('active');
    commandPalette.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('command-open');
    commandPaletteFocusOrigin = null;
    if (restoreFocus) {
      requestAnimationFrame(() => restoreFocusTo(focusTarget || commandTrigger));
    }
  }

  function executeCommandItem(index = commandActiveIndex) {
    const item = commandMatches[index];
    if (!item) return;
    closeCommandPalette({ restoreFocus: false });
    setTimeout(() => item.action?.(), 40);
  }

  if (commandTrigger) {
    commandTrigger.addEventListener('click', () => openCommandPalette());
  }
  if (commandCloseBtn) {
    commandCloseBtn.addEventListener('click', closeCommandPalette);
  }
  if (commandPalette) {
    commandPalette.addEventListener('click', (event) => {
      if (event.target === commandPalette) closeCommandPalette();
    });
  }
  if (commandSearchInput) {
    commandSearchInput.addEventListener('input', () => {
      commandActiveIndex = 0;
      renderCommandResults();
    });
    commandSearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        commandActiveIndex = Math.min(commandActiveIndex + 1, commandMatches.length - 1);
        renderCommandResults();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        commandActiveIndex = Math.max(commandActiveIndex - 1, 0);
        renderCommandResults();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        executeCommandItem();
      }
    });
  }
  window.addEventListener('keydown', (event) => {
    const wantsCommand = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    if (wantsCommand) {
      event.preventDefault();
      openCommandPalette();
      return;
    }
    if (event.key === 'Escape' && commandPalette?.classList.contains('active')) {
      event.preventDefault();
      closeCommandPalette();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (!commandPalette?.classList.contains('active')) return;
    trapFocus(event, commandPalette);
  }, true);

  // ==========================================
  // THEME SWITCHER
  // ==========================================
  const themeToggle = document.getElementById('theme-toggle');
  let themeIcon = document.getElementById('theme-icon');

  function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  }

  function updateThemeIcon(theme) {
    if (theme === 'light') {
      themeToggle.innerHTML = '<i data-lucide="moon" id="theme-icon" style="font-style: normal;">🌙</i>';
    } else {
      themeToggle.innerHTML = '<i data-lucide="sun" id="theme-icon" style="font-style: normal;">☀️</i>';
    }
    themeIcon = document.getElementById('theme-icon');
    safeCreateIcons();
  }

  themeToggle.addEventListener('click', toggleTheme);
  initTheme();

  // ==========================================
  // ADMIN CONTROL MANAGEMENT
  // ==========================================
  const adminLoginTrigger = document.getElementById('admin-login-trigger');
  const adminLoginModal = document.getElementById('admin-login-modal');
  const adminLoginClose = document.getElementById('admin-login-close');
  const adminLoginForm = document.getElementById('admin-login-form');
  const loginErrorMsg = document.getElementById('login-error-msg');

  const blogAdminActions = document.getElementById('blog-admin-actions');
  const projectAdminActions = document.getElementById('project-admin-actions');

  function setAdminMode(active) {
    isAdmin = active;
    const lockIcon = document.getElementById('admin-lock-icon');
    
    if (active) {
      if (lockIcon) lockIcon.setAttribute('data-lucide', 'unlock');
      if (blogAdminActions) blogAdminActions.style.display = 'flex';
      if (projectAdminActions) projectAdminActions.style.display = 'flex';
      console.log('Admin Mode enabled.');
    } else {
      if (lockIcon) lockIcon.setAttribute('data-lucide', 'lock');
      if (blogAdminActions) blogAdminActions.style.display = 'none';
      if (projectAdminActions) projectAdminActions.style.display = 'none';
      console.log('Admin Mode disabled.');
    }
    
    safeCreateIcons();
    // Re-render views with edit triggers
    renderBlogList();
    renderPinnedBlogs();
    renderProjectsList();
    loadComments();
  }

  // Key combination to trigger admin login modal (Ctrl + Shift + A)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      openModal(adminLoginModal);
    }
  });

  if (adminLoginTrigger) {
    adminLoginTrigger.addEventListener('click', () => {
      if (isAdmin) {
        // Logout directly if already logged in
        localStorage.removeItem('admin_token');
        setAdminMode(false);
        showToast('管理员已安全退出管理模式', 'success');
      } else {
        openModal(adminLoginModal);
      }
    });
  }

  if (adminLoginClose) {
    adminLoginClose.addEventListener('click', () => closeModal(adminLoginModal));
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('admin-username').value.trim();
      const password = document.getElementById('admin-password').value.trim();

      try {
        const data = await fetchAPI('/api/auth/login', {
          method: 'POST',
          body: { username, password }
        });

        if (data.success && data.token) {
          localStorage.setItem('admin_token', data.token);
          setAdminMode(true);
          closeModal(adminLoginModal);
          adminLoginForm.reset();
          loginErrorMsg.style.display = 'none';
        }
      } catch (err) {
        loginErrorMsg.textContent = `登录错误: ${err.message}`;
        loginErrorMsg.style.display = 'block';
      }
    });
  }

  async function checkAdminTokenOnStartup() {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    try {
      const data = await fetchAPI('/api/auth/verify');
      if (data.valid) {
        setAdminMode(true);
      } else {
        localStorage.removeItem('admin_token');
        setAdminMode(false);
      }
    } catch (e) {
      localStorage.removeItem('admin_token');
      setAdminMode(false);
    }
  }

  // Logout button triggers
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('admin_token');
      setAdminMode(false);
      showToast('已退出管理模式', 'success');
    });
  }

  // Modal Open/Close helpers
  function openModal(modalEl) {
    if (!modalEl) return;
    const previousTimer = modalCloseTimers.get(modalEl);
    if (previousTimer) {
      clearTimeout(previousTimer);
      modalCloseTimers.delete(modalEl);
    }
    if (!modalEl.classList.contains('active') && document.activeElement && !modalEl.contains(document.activeElement)) {
      modalFocusOrigins.set(modalEl, document.activeElement);
    }
    modalEl.setAttribute('role', modalEl.getAttribute('role') || 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-hidden', 'false');
    modalEl.style.display = 'flex';
    setTimeout(() => {
      modalEl.classList.add('active');
      focusInitialElement(modalEl);
    }, 50);
  }

  function closeModal(modalEl, options = {}) {
    if (!modalEl) return;
    const { restoreFocus = true } = options;
    const focusTarget = modalFocusOrigins.get(modalEl);
    modalEl.classList.remove('active');
    modalEl.setAttribute('aria-hidden', 'true');
    if (restoreFocus) {
      requestAnimationFrame(() => restoreFocusTo(focusTarget));
    }
    modalFocusOrigins.delete(modalEl);
    const timer = setTimeout(() => {
      modalEl.style.display = 'none';
      modalCloseTimers.delete(modalEl);
    }, 300);
    modalCloseTimers.set(modalEl, timer);
  }

  function getActiveProjectModal() {
    const activeModals = [...document.querySelectorAll('.project-modal.active')];
    return activeModals[activeModals.length - 1] || null;
  }

  function closeAllProjectModals(options = {}) {
    document.querySelectorAll('.project-modal.active').forEach(modal => closeModal(modal, options));
  }

  // Close modals on clicking outside content card
  document.querySelectorAll('.project-modal').forEach(modal => {
    modal.setAttribute('aria-hidden', modal.classList.contains('active') ? 'false' : 'true');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  window.addEventListener('keydown', (event) => {
    if (commandPalette?.classList.contains('active')) return;
    const activeModal = getActiveProjectModal();
    if (!activeModal) return;
    if (event.key === 'Tab') {
      trapFocus(event, activeModal);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeModal(activeModal);
    }
  }, true);

  // ==========================================
  // DASHBOARD WIDGETS
  // ==========================================

  // Live Clock & Date
  const liveClock = document.getElementById('live-clock');
  const liveDate = document.getElementById('live-date');

  function updateClock() {
    if (document.hidden) return;

    const now = new Date();
    let h = now.getHours().toString().padStart(2, '0');
    let m = now.getMinutes().toString().padStart(2, '0');
    let s = now.getSeconds().toString().padStart(2, '0');
    if (liveClock) liveClock.textContent = `${h}:${m}:${s}`;

    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    let year = now.getFullYear();
    let month = (now.getMonth() + 1).toString().padStart(2, '0');
    let date = now.getDate().toString().padStart(2, '0');
    let day = days[now.getDay()];
    if (liveDate) liveDate.textContent = `${year}年${month}月${date}日 ${day}`;
  }

  setInterval(updateClock, 1000);
  updateClock();

  // Simulated System Monitor Graph
  const cpuLoadElement = document.getElementById('cpu-load');
  const ramLoadElement = document.getElementById('ram-load');
  const chartPath = document.getElementById('cpu-chart-path');
  const chartFill = document.getElementById('cpu-chart-fill');

  function updateSystemMetrics() {
    const homeSection = document.getElementById('home');
    if (document.hidden || (homeSection && !homeSection.classList.contains('active'))) return;

    const cpuDelta = Math.floor(Math.random() * 15) - 7;
    let cpuVal = cpuHistory[cpuHistory.length - 1] + cpuDelta;
    cpuVal = Math.max(5, Math.min(cpuVal, 85));
    cpuHistory.shift();
    cpuHistory.push(cpuVal);

    const ramVal = Math.floor(40 + Math.random() * 8);

    if (cpuLoadElement) cpuLoadElement.textContent = `${cpuVal}%`;
    if (ramLoadElement) ramLoadElement.textContent = `${ramVal}%`;

    if (chartPath && chartFill) {
      const points = cpuHistory.map((val, index) => {
        const x = (index / (cpuHistory.length - 1)) * 200;
        const y = 60 - (val / 100) * 50 - 5;
        return { x, y };
      });

      let pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
      }

      let fillD = `${pathD} L 200 60 L 0 60 Z`;
      chartPath.setAttribute('d', pathD);
      chartFill.setAttribute('d', fillD);
    }
  }

  setInterval(updateSystemMetrics, 1500);
  updateSystemMetrics();

  // Scratchpad Autosave
  const scratchpad = document.getElementById('scratchpad');
  const scratchpadCount = document.getElementById('scratchpad-count');

  if (scratchpad) {
    scratchpad.value = localStorage.getItem('scratchpad_data') || '';
    if (scratchpadCount) scratchpadCount.textContent = scratchpad.value.length;

    scratchpad.addEventListener('input', (e) => {
      const txt = e.target.value;
      localStorage.setItem('scratchpad_data', txt);
      if (scratchpadCount) scratchpadCount.textContent = txt.length;
    });
  }

  // ==========================================
  // WEB AUDIO MUSIC PLAYER SYNTHESIZER
  // ==========================================
  const playPauseBtn = document.getElementById('play-pause-btn');
  const prevTrackBtn = document.getElementById('prev-track-btn');
  const nextTrackBtn = document.getElementById('next-track-btn');
  const trackTitle = document.getElementById('track-title');
  const trackArtist = document.getElementById('track-artist');
  const disc = document.getElementById('music-disc');
  const waveformViz = document.getElementById('waveform-visualizer');

  const barCount = 18;
  if (waveformViz) {
    waveformViz.innerHTML = '';
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'wave-bar';
      waveformViz.appendChild(bar);
    }
  }
  const waveBars = document.querySelectorAll('.wave-bar');

  function initAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function startSynthTracks() {
    initAudioContext();
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    stopSynthTracks();

    synthNodes = [];
    const mainVolume = audioContext.createGain();
    mainVolume.gain.setValueAtTime(0.12, audioContext.currentTime);
    mainVolume.connect(audioContext.destination);

    const type = ambientTracks[currentTrackIndex].src;

    if (type === 'rain_synth') {
      const bufferSize = 2 * audioContext.sampleRate;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11;
        b6 = white * 0.115926;
      }
      const noiseNode = audioContext.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      const rainFilter = audioContext.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.setValueAtTime(900, audioContext.currentTime);

      noiseNode.connect(rainFilter);
      rainFilter.connect(mainVolume);
      noiseNode.start();

      synthNodes.push(noiseNode, rainFilter, mainVolume);
    } 
    else if (type === 'lofi_synth') {
      const chords = [130.81, 164.81, 196.00, 246.94];
      chords.forEach(freq => {
        const osc = audioContext.createOscillator();
        const oscGain = audioContext.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioContext.currentTime);
        
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        lfo.frequency.value = 0.2;
        lfoGain.gain.value = 0.02;
        
        lfo.connect(oscGain.gain);
        oscGain.gain.setValueAtTime(0.04, audioContext.currentTime);
        
        osc.connect(oscGain);
        oscGain.connect(mainVolume);
        
        osc.start();
        lfo.start();
        synthNodes.push(osc, oscGain, lfo, lfoGain);
      });
      synthNodes.push(mainVolume);
    } 
    else if (type === 'space_synth') {
      const osc = audioContext.createOscillator();
      const filter = audioContext.createBiquadFilter();
      
      osc.type = 'sawtooth';
      osc.frequency.value = 65.41;
      
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      filter.Q.value = 5;

      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      lfo.frequency.value = 0.1;
      lfoGain.gain.value = 150;

      lfo.connect(filter.frequency);
      osc.connect(filter);
      filter.connect(mainVolume);
      
      osc.start();
      lfo.start();
      synthNodes.push(osc, filter, lfo, lfoGain, mainVolume);
    }
  }

  function stopSynthTracks() {
    if (synthNodes) {
      synthNodes.forEach(node => {
        try { node.stop(); } catch(e) {}
        try { node.disconnect(); } catch(e) {}
      });
      synthNodes = null;
    }
  }

  function animateWaveform() {
    if (!isPlaying) {
      waveBars.forEach(bar => {
        bar.style.height = '10%';
      });
      return;
    }

    waveBars.forEach(bar => {
      const randHeight = Math.floor(20 + Math.random() * 80);
      bar.style.height = `${randHeight}%`;
    });

    visualizerTimer = setTimeout(animateWaveform, 120);
  }

  function togglePlay() {
    initAudioContext();
    if (!isPlaying) {
      isPlaying = true;
      if (playPauseBtn) playPauseBtn.innerHTML = '<i data-lucide="pause" id="play-icon" style="font-style: normal;">⏸️</i>';
      if (disc) disc.classList.add('playing');
      startSynthTracks();
      animateWaveform();
    } else {
      isPlaying = false;
      if (playPauseBtn) playPauseBtn.innerHTML = '<i data-lucide="play" id="play-icon" style="font-style: normal;">▶️</i>';
      if (disc) disc.classList.remove('playing');
      stopSynthTracks();
      clearTimeout(visualizerTimer);
      animateWaveform();
    }
    safeCreateIcons();
  }

  function loadTrack(index) {
    currentTrackIndex = index;
    if (trackTitle) trackTitle.textContent = ambientTracks[currentTrackIndex].title;
    if (trackArtist) trackArtist.textContent = ambientTracks[currentTrackIndex].artist;
    
    if (isPlaying) {
      startSynthTracks();
    }
  }

  if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlay);
  if (prevTrackBtn) {
    prevTrackBtn.addEventListener('click', () => {
      let newIndex = currentTrackIndex - 1;
      if (newIndex < 0) newIndex = ambientTracks.length - 1;
      loadTrack(newIndex);
    });
  }
  if (nextTrackBtn) {
    nextTrackBtn.addEventListener('click', () => {
      let newIndex = (currentTrackIndex + 1) % ambientTracks.length;
      loadTrack(newIndex);
    });
  }

  loadTrack(0);

  // ==========================================
  // BLOG LOGIC & INTEGRATED CRUD
  // ==========================================
  const blogPostsContainer = document.getElementById('blog-posts-container');
  const pinnedPostsContainer = document.getElementById('pinned-posts-container');
  const blogTagCloud = document.getElementById('blog-tag-cloud');
  const blogSearch = document.getElementById('blog-search');
  const blogTotalCount = document.getElementById('blog-total-count');
  const blogBookmarkCount = document.getElementById('blog-bookmark-count');
  const blogProgressCount = document.getElementById('blog-progress-count');
  const blogAverageProgress = document.getElementById('blog-average-progress');
  const blogReaderFilterButtons = document.querySelectorAll('[data-reader-filter]');
  const blogReader = document.getElementById('blog-reader');
  const blogReaderCard = document.getElementById('blog-reader-card');
  const blogListSection = document.getElementById('blog');
  const readerBackBtn = document.getElementById('reader-back-btn');
  const readerContentEl = document.getElementById('reader-post-content');
  const readerToc = document.getElementById('reader-toc');
  const readerNextPanel = document.getElementById('reader-next-panel');
  const readerProgressPercent = document.getElementById('reader-progress-percent');
  const readerCopyLinkBtn = document.getElementById('reader-copy-link-btn');
  const readerShareBtn = document.getElementById('reader-share-btn');
  const readerBookmarkBtn = document.getElementById('reader-bookmark-btn');
  const readerMarkReadBtn = document.getElementById('reader-mark-read-btn');
  const readerModeBtn = document.getElementById('reader-mode-btn');
  const readerExportMdBtn = document.getElementById('reader-export-md-btn');
  const readerFocusModeKey = 'atherix_reader_focus_mode';
  let readerProgressFrame = 0;
  let readerManualProgressLockUntil = 0;

  // Blog creation modals and controls
  const addPostBtn = document.getElementById('add-post-btn');
  const blogEditModal = document.getElementById('blog-edit-modal');
  const blogEditClose = document.getElementById('blog-edit-close');
  const blogEditForm = document.getElementById('blog-edit-form');

  let selectedTag = 'all';
  let readerFilter = 'all';

  async function loadBlogPosts() {
    try {
      const data = await fetchAPI('/api/posts');
      blogPosts = data;
    } catch (e) {
      // Fallback
      blogPosts = getLocalArray('fallback_posts', defaultMockPosts);
    }
    
    // Save locally for fallback
    localStorage.setItem('fallback_posts', JSON.stringify(blogPosts));

    // Seed recommended reading in bento grid
    const featuredPostTitle = document.getElementById('featured-post-title');
    const featuredPostExcerpt = document.getElementById('featured-post-excerpt');
    const pinnedPost = blogPosts.find(p => p.pinned) || blogPosts[0];
    if (pinnedPost) {
      if (featuredPostTitle) featuredPostTitle.textContent = pinnedPost.title;
      if (featuredPostExcerpt) featuredPostExcerpt.textContent = pinnedPost.excerpt;
    }

    renderBlogList();
    renderPinnedBlogs();
    renderTagCloud();
    suppressHashSync = true;
    resolveInitialRoute();
    suppressHashSync = false;
  }

  function renderMarkdown(mdText) {
    const codeBlocks = [];
    const source = String(mdText ?? '')
      .replace(/\r\n?/g, '\n')
      .replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const language = String(lang || '').trim().replace(/[^\w-]/g, '').slice(0, 32);
        const className = language ? ` class="language-${escapeHTML(language)}"` : '';
        const normalizedCode = String(code || '').replace(/^\n|\n$/g, '');
        const token = `@@ATHERIX_CODE_BLOCK_${codeBlocks.length}@@`;
        codeBlocks.push(`<pre><code${className}>${escapeHTML(normalizedCode)}</code></pre>`);
        return `\n\n${token}\n\n`;
      });

    function formatInline(text) {
      return escapeHTML(text)
        .replace(/`([^`\n]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, href) => {
          const safeHref = normalizeUrl(href);
          return safeHref
            ? `<a href="${escapeHTML(safeHref)}" target="_blank" rel="noopener noreferrer">${label}</a>`
            : label;
        });
    }

    return source
      .split(/\n{2,}/)
      .map(block => block.trim())
      .filter(Boolean)
      .map(block => {
        const codeMatch = block.match(/^@@ATHERIX_CODE_BLOCK_(\d+)@@$/);
        if (codeMatch) return codeBlocks[Number(codeMatch[1])] || '';

        const headingMatch = block.match(/^(#{1,3})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          return `<h${level}>${formatInline(headingMatch[2])}</h${level}>`;
        }

        const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.length && lines.every(line => /^[-*]\s+/.test(line))) {
          return `<ul>${lines.map(line => `<li>${formatInline(line.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`;
        }
        if (lines.length && lines.every(line => /^\d+\.\s+/.test(line))) {
          return `<ol>${lines.map(line => `<li>${formatInline(line.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
        }
        if (lines.length && lines.every(line => /^>\s?/.test(line))) {
          const quote = lines.map(line => formatInline(line.replace(/^>\s?/, ''))).join('<br>');
          return `<blockquote>${quote}</blockquote>`;
        }

        return `<p>${lines.map(formatInline).join('<br>')}</p>`;
      })
      .join('');
  }

  function readerProgressKey(postId) {
    return `atherix_reader_progress_${postId}`;
  }

  function normalizeReaderProgress(value) {
    const numeric = Number(value);
    return Math.max(0, Math.min(100, Number.isFinite(numeric) ? Math.round(numeric) : 0));
  }

  function getReaderProgressValue(postId) {
    return normalizeReaderProgress(localStorage.getItem(readerProgressKey(postId)) || 0);
  }

  function updateReaderMarkReadState(progress = currentPostId ? getReaderProgressValue(currentPostId) : 0) {
    if (!readerMarkReadBtn) return;
    const completed = progress >= 100;
    readerMarkReadBtn.setAttribute('aria-pressed', completed ? 'true' : 'false');
    readerMarkReadBtn.innerHTML = completed
      ? '<i data-lucide="rotate-ccw"></i> 重新阅读'
      : '<i data-lucide="check-circle-2"></i> 标记读完';
    safeCreateIcons(readerMarkReadBtn);
  }

  function setReaderProgressValue(postId, value, { refreshInsights = true } = {}) {
    const progress = normalizeReaderProgress(value);
    if (postId) {
      try {
        localStorage.setItem(readerProgressKey(postId), String(progress));
      } catch (err) {
        console.warn('Could not save reader progress:', err.message);
      }
    }
    if (!postId || postId === currentPostId) {
      if (readerProgressPercent) readerProgressPercent.textContent = `${progress}%`;
      updateReaderMarkReadState(progress);
    }
    if (refreshInsights) updateBlogInsightPanel();
    return progress;
  }

  function readerAnchorPrefix(postId) {
    return String(postId || 'post').replace(/[^\w-]/g, '-');
  }

  function getReaderBookmarks() {
    return getLocalArray('atherix_reader_bookmarks', []).filter(id => typeof id === 'string');
  }

  function saveReaderBookmarks(ids) {
    try {
      localStorage.setItem('atherix_reader_bookmarks', JSON.stringify([...new Set(ids.filter(Boolean))]));
    } catch (err) {
      console.warn('Could not save reader bookmarks:', err.message);
    }
  }

  function getCurrentReaderPost() {
    return blogPosts.find(post => post.id === currentPostId) || null;
  }

  function currentArticleLink(postId = currentPostId) {
    return `${window.location.origin}${window.location.pathname}#post/${encodeURIComponent(postId || '')}`;
  }

  function getReaderFocusMode() {
    try {
      return localStorage.getItem(readerFocusModeKey) === 'enabled';
    } catch {
      return false;
    }
  }

  function setReaderFocusMode(enabled, { persist = true } = {}) {
    const active = Boolean(enabled);
    if (blogReaderCard) blogReaderCard.classList.toggle('reader-focus-mode', active);
    if (readerModeBtn) {
      readerModeBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
      readerModeBtn.innerHTML = active
        ? '<i data-lucide="minimize-2"></i> 标准阅读'
        : '<i data-lucide="maximize-2"></i> 沉浸阅读';
    }
    if (persist) {
      try {
        localStorage.setItem(readerFocusModeKey, active ? 'enabled' : 'disabled');
      } catch (err) {
        console.warn('Could not save reader focus mode:', err.message);
      }
    }
    safeCreateIcons();
  }

  function getArticleFilename(post) {
    const slug = String(post?.title || post?.id || 'atherix-article')
      .trim()
      .replace(/[\\/:*?"<>|#%{}^~\[\]`]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 72);
    return `${slug || 'atherix-article'}.md`;
  }

  function buildArticleMarkdown(post) {
    const title = post?.title || '未命名文章';
    const metadata = [
      post?.tag || '未分类',
      post?.date || '',
      post?.readTime || ''
    ].filter(Boolean).join(' · ');
    const content = String(post?.content || '').replace(/^#\s+.+\n+/, '').trim();
    return [
      `# ${title}`,
      '',
      metadata ? `> ${metadata}` : '',
      `> 原文链接: ${currentArticleLink(post?.id || currentPostId)}`,
      '',
      content
    ].filter((line, index, lines) => line || lines[index - 1] !== '').join('\n');
  }

  function exportCurrentArticleMarkdown() {
    const post = getCurrentReaderPost();
    if (!post) {
      showToast('没有可导出的文章', 'warning');
      return;
    }
    const blob = new Blob([buildArticleMarkdown(post)], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = getArticleFilename(post);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Markdown 已导出', 'success');
  }

  async function shareCurrentArticle() {
    const post = getCurrentReaderPost();
    if (!post) {
      showToast('没有可分享的文章', 'warning');
      return;
    }
    const link = currentArticleLink(post.id);
    const shareData = {
      title: post.title || 'Atherix 文章',
      text: post.excerpt || `${post.tag || 'Atherix'} · ${post.readTime || '阅读'}`,
      url: link
    };

    if (navigator.share) {
      try {
        if (!navigator.canShare || navigator.canShare(shareData)) {
          await navigator.share(shareData);
          showToast('分享面板已打开', 'success');
          return;
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('Native share failed, falling back to copy:', err.message);
      }
    }
    copyText(link, '分享链接已复制');
  }

  function updateReaderBookmarkState() {
    if (!readerBookmarkBtn || !currentPostId) return;
    const isSaved = getReaderBookmarks().includes(currentPostId);
    readerBookmarkBtn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
    readerBookmarkBtn.innerHTML = isSaved
      ? '<i data-lucide="bookmark-check"></i> 已稍后读'
      : '<i data-lucide="bookmark"></i> 稍后读';
    safeCreateIcons();
  }

  function updateBlogInsightPanel() {
    const bookmarks = new Set(getReaderBookmarks());
    const progressValues = blogPosts.map(post => getReaderProgressValue(post.id));
    const inProgress = progressValues.filter(value => value > 0 && value < 100).length;
    const average = progressValues.length
      ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
      : 0;
    if (blogTotalCount) blogTotalCount.textContent = String(blogPosts.length);
    if (blogBookmarkCount) blogBookmarkCount.textContent = String(blogPosts.filter(post => bookmarks.has(post.id)).length);
    if (blogProgressCount) blogProgressCount.textContent = String(inProgress);
    if (blogAverageProgress) blogAverageProgress.textContent = `${average}%`;
    blogReaderFilterButtons.forEach(btn => {
      const active = btn.dataset.readerFilter === readerFilter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function matchesReaderFilter(post, bookmarks) {
    if (readerFilter === 'bookmarked') return bookmarks.has(post.id);
    if (readerFilter === 'in-progress') {
      const progress = getReaderProgressValue(post.id);
      return progress > 0 && progress < 100;
    }
    return true;
  }

  function plainTextFromMarkdown(value) {
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

  function getReaderProgressLabel(progress) {
    if (progress >= 100) return '已读完';
    if (progress > 0) return `已读 ${progress}%`;
    return '未开始';
  }

  function getReaderRecommendationReason(post, currentPost, progress, bookmarks) {
    const reasons = [];
    const tag = post?.tag || '未分类';
    const currentTag = currentPost?.tag || '未分类';
    if (tag === currentTag) reasons.push('同主题延伸');
    else reasons.push('拓展视角');
    if (progress > 0 && progress < 100) reasons.push(`读到 ${progress}%`);
    else if (progress >= 100) reasons.push('适合复盘');
    else reasons.push('未开始');
    if (bookmarks.has(post.id)) reasons.push('稍后读');
    if (post.pinned) reasons.push('精选');
    return reasons.slice(0, 4).join(' · ');
  }

  function getReadingRecommendations(currentPost, limit = 3) {
    if (!currentPost || !Array.isArray(blogPosts) || blogPosts.length < 2) return [];
    const bookmarks = new Set(getReaderBookmarks());
    const currentTag = currentPost.tag || '未分类';

    return blogPosts
      .filter(post => post?.id && post.id !== currentPost.id)
      .map((post, index) => {
        const progress = getReaderProgressValue(post.id);
        const sameTag = (post.tag || '未分类') === currentTag;
        const inProgress = progress > 0 && progress < 100;
        const unread = progress === 0;
        const completed = progress >= 100;
        const postDate = Date.parse(post.date || '') || 0;
        let score = 0;
        if (sameTag) score += 80;
        if (inProgress) score += 45;
        else if (unread) score += 34;
        else if (completed) score += 6;
        if (bookmarks.has(post.id)) score += 22;
        if (post.pinned) score += 10;
        score += Math.max(0, 14 - index);

        return {
          post,
          progress,
          score,
          postDate,
          reason: getReaderRecommendationReason(post, currentPost, progress, bookmarks)
        };
      })
      .sort((a, b) => b.score - a.score || b.postDate - a.postDate || String(a.post.title || '').localeCompare(String(b.post.title || '')))
      .slice(0, limit);
  }

  function renderReaderNextPanel(currentPost) {
    if (!readerNextPanel) return;
    const recommendations = getReadingRecommendations(currentPost);
    readerNextPanel.innerHTML = '';
    readerNextPanel.hidden = recommendations.length === 0;
    readerNextPanel.classList.toggle('active', recommendations.length > 0);
    if (!recommendations.length) return;

    const heading = document.createElement('div');
    heading.className = 'reader-next-heading';
    heading.innerHTML = `
      <div>
        <span class="reader-next-kicker">阅读路径</span>
        <h2>继续读点更顺手的</h2>
      </div>
      <p>下一站已经排好</p>
    `;

    const list = document.createElement('div');
    list.className = 'reader-next-list';

    recommendations.forEach(({ post, progress, reason }) => {
      const item = document.createElement('article');
      item.className = 'reader-next-item';
      item.dataset.readerNextId = post.id;
      const title = post.title || '未命名文章';
      const snippet = plainTextFromMarkdown(post.excerpt || post.content || '').slice(0, 96);
      const progressLabel = getReaderProgressLabel(progress);
      const actionLabel = progress > 0 && progress < 100 ? '继续读' : '阅读';

      item.innerHTML = `
        <div class="reader-next-copy">
          <div class="reader-next-meta">
            <span>${escapeHTML(post.tag || '未分类')}</span>
            <span>${escapeHTML(post.readTime || '阅读')}</span>
            <span class="reader-next-reason">${escapeHTML(reason)}</span>
          </div>
          <h3 class="reader-next-title">${escapeHTML(title)}</h3>
          <p>${escapeHTML(snippet || '这篇文章可以作为下一站，继续补齐你的阅读路径。')}</p>
          <div class="reader-next-progress-row">
            <span>${escapeHTML(progressLabel)}</span>
            <div class="reader-next-progress" aria-label="阅读进度 ${progress}%">
              <span class="reader-next-progress-fill" style="width: ${progress}%"></span>
            </div>
          </div>
        </div>
        <button class="reader-next-open" data-reader-next-open type="button" aria-label="打开 ${escapeHTML(title)}">
          <span>${actionLabel}</span>
          <i data-lucide="arrow-right"></i>
        </button>
      `;

      item.querySelector('[data-reader-next-open]')?.addEventListener('click', () => {
        readArticle(post.id);
      });
      list.appendChild(item);
    });

    readerNextPanel.append(heading, list);
    safeCreateIcons(readerNextPanel);
  }

  function buildReaderToc(postId) {
    if (!readerToc || !readerContentEl) return;
    readerToc.innerHTML = '';
    const headings = [...readerContentEl.querySelectorAll('h2, h3')];
    readerToc.classList.toggle('active', headings.length > 0);
    const prefix = readerAnchorPrefix(postId);
    headings.forEach((heading, index) => {
      heading.id = `post-${prefix}-heading-${index + 1}`;
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent || `章节 ${index + 1}`;
      link.className = heading.tagName === 'H3' ? 'toc-subitem' : '';
      link.addEventListener('click', (event) => {
        event.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      readerToc.appendChild(link);
    });
  }

  function calculateReaderProgress() {
    if (!readerContentEl || !readerProgressPercent || currentRoute !== 'blog-reader') return;
    const rect = readerContentEl.getBoundingClientRect();
    const articleTop = window.scrollY + rect.top;
    const total = Math.max(1, readerContentEl.offsetHeight - window.innerHeight * 0.65);
    const scrolled = window.scrollY - articleTop + 120;
    const calculatedPercent = normalizeReaderProgress(scrolled / total * 100);
    const savedProgress = currentPostId ? getReaderProgressValue(currentPostId) : 0;
    const percent = currentPostId && Date.now() < readerManualProgressLockUntil
      ? savedProgress
      : Math.max(savedProgress, calculatedPercent);
    setReaderProgressValue(currentPostId, percent, { refreshInsights: false });
    updateBlogInsightPanel();

    if (!readerToc?.classList.contains('active')) return;
    let activeId = '';
    readerContentEl.querySelectorAll('h2, h3').forEach(heading => {
      if (heading.getBoundingClientRect().top <= 140) activeId = heading.id;
    });
    readerToc.querySelectorAll('a').forEach(link => {
      link.classList.toggle('active', activeId && link.getAttribute('href') === `#${activeId}`);
    });
  }

  function updateReaderProgress() {
    if (readerProgressFrame) return;
    readerProgressFrame = requestAnimationFrame(() => {
      readerProgressFrame = 0;
      calculateReaderProgress();
    });
  }

  function readArticle(postId) {
    const post = blogPosts.find(p => p.id === postId);
    if (!post || !blogReader || !readerContentEl) {
      showToast('没有找到这篇文章，已返回博客列表', 'warning');
      navigateTo('blog');
      return;
    }

    const readerTag = document.getElementById('reader-post-tag');
    const readerDate = document.getElementById('reader-post-date');
    const readerReadTime = document.getElementById('reader-post-readtime');
    const readerTitle = document.getElementById('reader-post-title');
    if (readerTag) readerTag.textContent = post.tag || '未分类';
    if (readerDate) readerDate.textContent = post.date || '';
    if (readerReadTime) readerReadTime.textContent = post.readTime || '';
    if (readerTitle) readerTitle.textContent = post.title || '未命名文章';
    readerContentEl.innerHTML = renderMarkdown(post.content || '');
    document.title = `${post.title || '文章'} - Atherix`;
    currentPostId = post.id;
    buildReaderToc(post.id);
    updateReaderBookmarkState();
    updateReaderMarkReadState(getReaderProgressValue(post.id));
    renderReaderNextPanel(post);
    setReaderFocusMode(getReaderFocusMode(), { persist: false });
    navigateTo('blog-reader', { postId: post.id });

    if (blogReaderCard) {
      blogReaderCard.classList.add('active');
    }

    safeCreateIcons();
    const savedProgress = Number(localStorage.getItem(readerProgressKey(post.id)) || 0);
    setTimeout(() => {
      if (savedProgress > 8 && savedProgress < 92 && readerContentEl) {
        const rect = readerContentEl.getBoundingClientRect();
        const articleTop = window.scrollY + rect.top;
        const total = Math.max(1, readerContentEl.offsetHeight - window.innerHeight * 0.65);
        window.scrollTo({ top: articleTop + total * savedProgress / 100, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      calculateReaderProgress();
    }, 80);
  }

  if (readerCopyLinkBtn) {
    readerCopyLinkBtn.addEventListener('click', () => {
      if (!currentPostId) return;
      copyText(currentArticleLink(), '文章链接已复制');
    });
  }

  if (readerShareBtn) {
    readerShareBtn.addEventListener('click', shareCurrentArticle);
  }

  if (readerBookmarkBtn) {
    readerBookmarkBtn.addEventListener('click', () => {
      if (!currentPostId) return;
      const bookmarks = getReaderBookmarks();
      if (bookmarks.includes(currentPostId)) {
        saveReaderBookmarks(bookmarks.filter(id => id !== currentPostId));
        showToast('已从稍后读移除', 'info');
      } else {
        bookmarks.push(currentPostId);
        saveReaderBookmarks(bookmarks);
        showToast('已加入稍后读', 'success');
      }
      updateReaderBookmarkState();
      updateBlogInsightPanel();
      renderBlogList();
    });
  }

  if (readerMarkReadBtn) {
    readerMarkReadBtn.addEventListener('click', () => {
      if (!currentPostId) return;
      const currentProgress = getReaderProgressValue(currentPostId);
      const isCompleted = currentProgress >= 100;
      readerManualProgressLockUntil = Date.now() + 1400;

      if (isCompleted) {
        setReaderProgressValue(currentPostId, 0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('已重置阅读进度', 'info');
      } else {
        setReaderProgressValue(currentPostId, 100);
        showToast('已标记为读完', 'success');
      }

      renderBlogList();
      renderReaderNextPanel(getCurrentReaderPost());
    });
  }

  if (readerModeBtn) {
    setReaderFocusMode(getReaderFocusMode(), { persist: false });
    readerModeBtn.addEventListener('click', () => {
      setReaderFocusMode(readerModeBtn.getAttribute('aria-pressed') !== 'true');
    });
  }

  if (readerExportMdBtn) {
    readerExportMdBtn.addEventListener('click', exportCurrentArticleMarkdown);
  }

  window.addEventListener('scroll', updateReaderProgress, { passive: true });

  if (readerBackBtn) {
    readerBackBtn.addEventListener('click', () => {
      if (blogReaderCard) blogReaderCard.classList.remove('active');
      if (readerNextPanel) readerNextPanel.hidden = true;
      document.title = 'Atherix - 个人博客与数字空间';
      navigateTo('blog');
      renderBlogList();
    });
  }

  function resolveInitialRoute() {
    const rawHash = decodeURIComponent(window.location.hash || '').replace(/^#/, '');
    if (!rawHash) return;

    if (rawHash.startsWith('post/')) {
      const postId = rawHash.slice(5);
      if (postId) {
        readArticle(postId);
        return;
      }
    }

    const target = document.getElementById(rawHash);
    if (target && target.classList.contains('view-section')) {
      navigateTo(rawHash, { skipHash: true });
    }
  }

  window.addEventListener('hashchange', () => {
    suppressHashSync = true;
    resolveInitialRoute();
    suppressHashSync = false;
  });

  function renderBlogList() {
    if (!blogPostsContainer) return;
    blogPostsContainer.innerHTML = '';
    updateBlogInsightPanel();

    const query = blogSearch ? blogSearch.value.trim().toLowerCase() : '';
    const bookmarks = new Set(getReaderBookmarks());
    const filtered = blogPosts.filter(post => {
      const title = String(post.title || '').toLowerCase();
      const excerpt = String(post.excerpt || '').toLowerCase();
      const content = String(post.content || '').toLowerCase();
      const tag = post.tag || '未分类';
      const matchQuery = title.includes(query) ||
                         excerpt.includes(query) ||
                         content.includes(query);
      const matchTag = selectedTag === 'all' || tag === selectedTag;
      return matchQuery && matchTag && matchesReaderFilter(post, bookmarks);
    });

    if (filtered.length === 0) {
      const emptyCopy = readerFilter === 'bookmarked'
        ? '稍后读还没有文章。打开一篇文章并点击「稍后读」即可加入。'
        : readerFilter === 'in-progress'
          ? '还没有可继续阅读的文章。读到一半离开后，这里会自动出现。'
          : '没有找到匹配的文章。';
      blogPostsContainer.innerHTML = `<div class="glass-card" style="text-align: center; color: var(--text-secondary); padding: 3rem 1rem;">${emptyCopy}</div>`;
      return;
    }

    filtered.forEach(post => {
      const card = document.createElement('div');
      card.className = 'glass-card blog-post-card glow-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.dataset.postId = post.id || '';
      const postId = escapeHTML(post.id || '');
      const title = escapeHTML(post.title || '未命名文章');
      const tag = escapeHTML(post.tag || '未分类');
      const date = escapeHTML(post.date || '');
      const readTime = escapeHTML(post.readTime || '');
      const excerpt = escapeHTML(post.excerpt || '');
      const progress = getReaderProgressValue(post.id);
      const bookmarked = bookmarks.has(post.id);
      const progressLabel = progress >= 100 ? '已读完' : progress > 0 ? `已读 ${progress}%` : '未开始';
      const stateChips = [
        bookmarked ? '<span class="post-state-chip is-bookmarked">稍后读</span>' : '',
        progress > 0 ? `<span class="post-state-chip is-progress">${progressLabel}</span>` : '<span class="post-state-chip">新文章</span>'
      ].filter(Boolean).join('');
      
      // Inject admin controls if logged in
      let adminControls = '';
      if (isAdmin) {
        adminControls = `
          <div class="card-admin-controls">
            <button class="card-admin-btn btn-edit" data-id="${postId}" title="编辑文章"><i data-lucide="edit-3"></i></button>
            <button class="card-admin-btn btn-delete" data-id="${postId}" title="删除文章"><i data-lucide="trash-2"></i></button>
          </div>
        `;
      }

      card.innerHTML = `
        ${adminControls}
        <div class="post-meta">
          <span class="post-tag">${tag}</span>
          <span>${date}</span>
          <span>&bull;</span>
          <span>${readTime}</span>
        </div>
        <h3>${title}</h3>
        <p class="post-excerpt">${excerpt}</p>
        <div class="post-state-row">${stateChips}</div>
        <div class="post-card-footer">
          <span class="post-read-more">阅读全文 <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i></span>
          <div class="post-progress-cluster" aria-label="阅读进度 ${progress}%">
            <div class="post-progress-label">
              <span>进度</span>
              <span>${progressLabel}</span>
            </div>
            <div class="post-progress-track"><span class="post-progress-fill" style="width: ${progress}%"></span></div>
          </div>
        </div>
      `;
      
      // Card click reads, except if control was clicked
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-admin-btn')) return;
        readArticle(post.id);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          readArticle(post.id);
        }
      });

      blogPostsContainer.appendChild(card);
    });

    // Add listeners to edit/delete buttons
    if (isAdmin) {
      blogPostsContainer.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => openBlogEditor(btn.getAttribute('data-id')));
      });
      blogPostsContainer.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteBlogPost(btn.getAttribute('data-id')));
      });
    }

    safeCreateIcons();
  }

  function renderPinnedBlogs() {
    if (!pinnedPostsContainer) return;
    pinnedPostsContainer.innerHTML = '';
    
    const pinned = blogPosts.filter(p => p.pinned);
    pinned.forEach(post => {
      const div = document.createElement('div');
      div.className = 'pinned-item';
      div.innerHTML = `
        <h4>${escapeHTML(post.title || '未命名文章')}</h4>
        <span class="pinned-date">${escapeHTML(post.date || '')}</span>
      `;
      div.addEventListener('click', () => readArticle(post.id));
      pinnedPostsContainer.appendChild(div);
    });
  }

  function renderTagCloud() {
    if (!blogTagCloud) return;
    blogTagCloud.innerHTML = '';
    
    const tags = ['all', ...new Set(blogPosts.map(p => p.tag || '未分类'))];
    
    tags.forEach(tag => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tag-cloud-btn ${selectedTag === tag ? 'active' : ''}`;
      btn.textContent = tag === 'all' ? '全部文章' : tag;
      
      btn.addEventListener('click', () => {
        selectedTag = tag;
        document.querySelectorAll('.tag-cloud-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderBlogList();
      });
      blogTagCloud.appendChild(btn);
    });
  }

  if (blogSearch) {
    blogSearch.addEventListener('input', renderBlogList);
  }

  blogReaderFilterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      readerFilter = btn.dataset.readerFilter || 'all';
      renderBlogList();
    });
  });

  // Add/Edit Blog Form actions
  if (addPostBtn) {
    addPostBtn.addEventListener('click', () => openBlogEditor(null));
  }
  if (blogEditClose) {
    blogEditClose.addEventListener('click', () => closeModal(blogEditModal));
  }

  function openBlogEditor(postId) {
    const titleEl = document.getElementById('blog-editor-modal-title');
    const idInput = document.getElementById('blog-id-input');
    const titleInput = document.getElementById('blog-title-input');
    const tagInput = document.getElementById('blog-tag-input');
    const readtimeInput = document.getElementById('blog-readtime-input');
    const pinnedInput = document.getElementById('blog-pinned-input');
    const excerptInput = document.getElementById('blog-excerpt-input');
    const contentInput = document.getElementById('blog-content-input');

    if (postId) {
      // Edit mode
      const post = blogPosts.find(p => p.id === postId);
      if (!post) return;
      titleEl.textContent = '编辑文章';
      idInput.value = post.id;
      titleInput.value = post.title;
      tagInput.value = post.tag;
      readtimeInput.value = post.readTime;
      pinnedInput.checked = !!post.pinned;
      excerptInput.value = post.excerpt;
      contentInput.value = post.content;
    } else {
      // Add mode
      titleEl.textContent = '撰写新博客文章';
      blogEditForm.reset();
      idInput.value = '';
      readtimeInput.value = '5 分钟阅读';
    }

    openModal(blogEditModal);
  }

  if (blogEditForm) {
    blogEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('blog-id-input').value;
      const title = document.getElementById('blog-title-input').value.trim();
      const tag = document.getElementById('blog-tag-input').value.trim() || '未分类';
      const readTime = document.getElementById('blog-readtime-input').value.trim();
      const pinned = document.getElementById('blog-pinned-input').checked;
      const excerpt = document.getElementById('blog-excerpt-input').value.trim();
      const content = document.getElementById('blog-content-input').value.trim();

      const payload = { title, tag, readTime, pinned, excerpt, content };

      try {
        if (id) {
          // Update
          await fetchAPI(`/api/posts/${id}`, {
            method: 'PUT',
            body: payload
          });
          showToast('博客文章已更新成功', 'success');
        } else {
          // Create
          await fetchAPI('/api/posts', {
            method: 'POST',
            body: { ...payload, id: 'post-' + Date.now() }
          });
          showToast('博客文章已发布成功', 'success');
        }
        closeModal(blogEditModal);
        loadBlogPosts();
      } catch (err) {
        showToast(`保存文章失败: ${err.message}`, 'error');
      }
    });
  }

  async function deleteBlogPost(postId) {
    if (!confirm('您确定要永久删除这篇博客文章吗？')) return;
    try {
      await fetchAPI(`/api/posts/${postId}`, {
        method: 'DELETE'
      });
      showToast('文章删除成功', 'success');
      loadBlogPosts();
    } catch (err) {
      showToast(`删除文章失败: ${err.message}`, 'error');
    }
  }

  // ==========================================
  // PROJECTS LOGIC & CRUD
  // ==========================================
  const projectsContainer = document.getElementById('projects-container');
  const projectModal = document.getElementById('project-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  // Edit/Add projects
  const addProjectBtn = document.getElementById('add-project-btn');
  const projectEditModal = document.getElementById('project-edit-modal');
  const projectEditClose = document.getElementById('project-edit-close');
  const projectEditForm = document.getElementById('project-edit-form');

  let activeProjectFilter = 'all';

  async function loadProjects() {
    try {
      const data = await fetchAPI('/api/projects');
      projectsData = data;
    } catch (e) {
      projectsData = getLocalArray('fallback_projects', defaultMockProjects);
    }
    
    localStorage.setItem('fallback_projects', JSON.stringify(projectsData));
    renderProjectsList();
  }

  function renderProjectsList() {
    if (!projectsContainer) return;
    projectsContainer.innerHTML = '';

    const filtered = projectsData.filter(p => activeProjectFilter === 'all' || p.tag === activeProjectFilter);

    if (filtered.length === 0) {
      projectsContainer.innerHTML = '<div class="glass-card col-span-4" style="text-align: center; color: var(--text-secondary); padding: 3rem 1rem; width: 100%;">当前类别下没有发布任何项目。</div>';
      return;
    }

    filtered.forEach(proj => {
      const card = document.createElement('div');
      card.className = 'glass-card project-card glow-card';
      const projectTags = Array.isArray(proj.tags) ? proj.tags : [];
      const projId = escapeHTML(proj.id || '');
      const title = escapeHTML(proj.title || '未命名项目');
      const tag = escapeHTML(proj.tag || '未分类');
      const desc = escapeHTML(proj.desc || '暂无项目简介。');
      const imgUrl = escapeHTML(normalizeUrl(proj.img, { allowRelativeUpload: true }) || 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=500');
      const liveUrl = normalizeUrl(proj.live);
      const liveAction = liveUrl
        ? `<a href="${escapeHTML(liveUrl)}" class="project-btn project-btn-primary" target="_blank" rel="noopener noreferrer"><i data-lucide="external-link"></i> Live Demo</a>`
        : '<button type="button" class="project-btn project-btn-disabled" aria-disabled="true"><i data-lucide="external-link"></i> 暂无演示</button>';
      
      let adminControls = '';
      if (isAdmin) {
        adminControls = `
          <div class="card-admin-controls">
            <button class="card-admin-btn btn-edit-proj" data-id="${projId}" title="编辑项目"><i data-lucide="edit-3"></i></button>
            <button class="card-admin-btn btn-delete-proj" data-id="${projId}" title="删除项目"><i data-lucide="trash-2"></i></button>
          </div>
        `;
      }

      card.innerHTML = `
        ${adminControls}
        <div class="project-banner">
          <img src="${imgUrl}" alt="${title}" class="project-banner-img">
          <div class="project-banner-overlay"></div>
        </div>
        <div class="project-body">
          <div class="project-info">
            <span class="post-tag" style="background: rgba(139, 92, 246, 0.1); color: var(--accent); margin-bottom:0.5rem; display:inline-block;">${tag}</span>
            <h3>${title}</h3>
            <p class="project-desc">${desc}</p>
            <div class="project-tags">
              ${projectTags.map(t => `<span class="project-tag-item">${escapeHTML(t)}</span>`).join('')}
            </div>
          </div>
          <div class="project-actions">
            <button class="project-btn modal-trigger-btn" data-proj-id="${projId}"><i data-lucide="info"></i> 项目详情</button>
            ${liveAction}
          </div>
        </div>
      `;

      projectsContainer.appendChild(card);
    });

    // Info click triggers modal
    projectsContainer.querySelectorAll('.modal-trigger-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openProjectDetails(btn.getAttribute('data-proj-id'));
      });
    });

    // Admin edit/delete binds
    if (isAdmin) {
      projectsContainer.querySelectorAll('.btn-edit-proj').forEach(btn => {
        btn.addEventListener('click', () => openProjectEditor(btn.getAttribute('data-id')));
      });
      projectsContainer.querySelectorAll('.btn-delete-proj').forEach(btn => {
        btn.addEventListener('click', () => deleteProject(btn.getAttribute('data-id')));
      });
    }

    safeCreateIcons();
  }

  function openProjectDetails(projId) {
    const proj = projectsData.find(p => p.id === projId);
    if (!proj) return;

    document.getElementById('modal-project-tag').textContent = proj.tag || '未分类';
    document.getElementById('modal-project-title').textContent = proj.title || '未命名项目';
    document.getElementById('modal-project-img').src = normalizeUrl(proj.img, { allowRelativeUpload: true }) || 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=500';
    document.getElementById('modal-project-desc').textContent = proj.desc || '暂无项目简介。';
    document.getElementById('modal-project-pain').textContent = proj.pain || '暂无详细描述。';
    document.getElementById('modal-project-solution').textContent = proj.solution || '暂无详细描述。';
    setOptionalExternalLink(document.getElementById('modal-github-link'), proj.github, '暂无代码仓库');
    setOptionalExternalLink(document.getElementById('modal-live-link'), proj.live, '暂无在线演示');

    openModal(projectModal);
  }

  document.querySelectorAll('#modal-github-link, #modal-live-link').forEach(link => {
    link.addEventListener('click', (e) => {
      if (link.getAttribute('aria-disabled') === 'true') {
        e.preventDefault();
        showToast(link.dataset.fallbackLabel || '当前项目暂未提供外链', 'warning');
      }
    });
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => closeModal(projectModal));
  }

  // Category filter tabs
  document.querySelectorAll('.project-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.project-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeProjectFilter = btn.getAttribute('data-tab');
      renderProjectsList();
    });
  });

  // Project Editor Actions
  if (addProjectBtn) {
    addProjectBtn.addEventListener('click', () => openProjectEditor(null));
  }
  if (projectEditClose) {
    projectEditClose.addEventListener('click', () => closeModal(projectEditModal));
  }

  function openProjectEditor(projId) {
    const modalTitle = document.getElementById('project-editor-modal-title');
    const idInput = document.getElementById('proj-id-input');
    const titleInput = document.getElementById('proj-title-input');
    const tagInput = document.getElementById('proj-tag-input');
    const tagsInput = document.getElementById('proj-tags-input');
    const imgInput = document.getElementById('proj-img-input');
    const descInput = document.getElementById('proj-desc-input');
    const painInput = document.getElementById('proj-pain-input');
    const solutionInput = document.getElementById('proj-solution-input');
    const githubInput = document.getElementById('proj-github-input');
    const liveInput = document.getElementById('proj-live-input');

    if (projId) {
      const proj = projectsData.find(p => p.id === projId);
      if (!proj) return;
      modalTitle.textContent = '编辑项目卡片';
      idInput.value = proj.id || '';
      titleInput.value = proj.title || '';
      tagInput.value = proj.tag || '';
      tagsInput.value = Array.isArray(proj.tags) ? proj.tags.join(', ') : '';
      imgInput.value = proj.img || '';
      descInput.value = proj.desc || '';
      painInput.value = proj.pain || '';
      solutionInput.value = proj.solution || '';
      githubInput.value = proj.github || '';
      liveInput.value = proj.live || '';
    } else {
      modalTitle.textContent = '添加新项目卡片';
      projectEditForm.reset();
      idInput.value = '';
    }

    openModal(projectEditModal);
  }

  if (projectEditForm) {
    projectEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('proj-id-input').value;
      const title = document.getElementById('proj-title-input').value.trim();
      const tag = document.getElementById('proj-tag-input').value.trim();
      const tagsStr = document.getElementById('proj-tags-input').value.trim();
      const img = document.getElementById('proj-img-input').value.trim();
      const desc = document.getElementById('proj-desc-input').value.trim();
      const pain = document.getElementById('proj-pain-input').value.trim();
      const solution = document.getElementById('proj-solution-input').value.trim();
      const github = document.getElementById('proj-github-input').value.trim();
      const live = document.getElementById('proj-live-input').value.trim();

      const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()) : [];
      const payload = { title, tag, tags, img, desc, pain, solution, github, live };

      try {
        if (id) {
          await fetchAPI(`/api/projects/${id}`, {
            method: 'PUT',
            body: payload
          });
          showToast('项目修改成功', 'success');
        } else {
          await fetchAPI('/api/projects', {
            method: 'POST',
            body: { ...payload, id: 'proj-' + Date.now() }
          });
          showToast('成功创建新项目卡片', 'success');
        }
        closeModal(projectEditModal);
        loadProjects();
      } catch (err) {
        showToast(`保存项目失败: ${err.message}`, 'error');
      }
    });
  }

  async function deleteProject(projId) {
    if (!confirm('您确认要永久删除这个项目卡片吗？')) return;
    try {
      await fetchAPI(`/api/projects/${projId}`, {
        method: 'DELETE'
      });
      showToast('项目删除成功', 'success');
      loadProjects();
    } catch (err) {
      showToast(`删除项目失败: ${err.message}`, 'error');
    }
  }

  // ==========================================
  // GUESTBOOK COMMENT WALL
  // ==========================================
  const guestbookForm = document.getElementById('guestbook-form');
  const guestbookComments = document.getElementById('guestbook-comments');
  const emojiTrigger = document.getElementById('emoji-trigger');
  const emojiPopover = document.getElementById('emoji-popover');
  const gbContent = document.getElementById('gb-content');
  const gbCompany = document.getElementById('gb-company');
  const guestbookCounter = document.getElementById('guestbook-counter');
  const guestbookStatus = document.getElementById('guestbook-status');
  const guestbookSubmitBtn = document.getElementById('guestbook-submit-btn');
  const avatarOptions = document.querySelectorAll('.avatar-option');
  const guestbookDefaultStatus = '支持友链、建议和反馈；请避免一次塞太多链接。';

  function setGuestbookStatus(message = guestbookDefaultStatus, type = 'info') {
    if (!guestbookStatus) return;
    guestbookStatus.textContent = message;
    guestbookStatus.classList.toggle('is-error', type === 'error');
    guestbookStatus.classList.toggle('is-success', type === 'success');
  }

  function updateGuestbookCounter() {
    if (!gbContent || !guestbookCounter) return;
    const length = gbContent.value.length;
    guestbookCounter.textContent = `${length} / 1000`;
    guestbookCounter.classList.toggle('is-near-limit', length >= 850 && length < 1000);
    guestbookCounter.classList.toggle('is-limit', length >= 1000);
  }

  function setGuestbookSubmitting(isSubmitting) {
    if (!guestbookSubmitBtn) return;
    guestbookSubmitBtn.disabled = isSubmitting;
    guestbookSubmitBtn.innerHTML = isSubmitting
      ? '<i data-lucide="loader-circle"></i> 发送中...'
      : '<i data-lucide="send"></i> 发送留言';
    safeCreateIcons();
  }

  function renderCommentEmpty(message) {
    if (!guestbookComments) return;
    const empty = document.createElement('div');
    empty.className = 'comment-empty';
    empty.textContent = message;
    guestbookComments.replaceChildren(empty);
  }

  // Handle avatar select
  avatarOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      avatarOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      document.getElementById('gb-avatar-val').value = opt.getAttribute('data-avatar');
    });
  });

  async function loadComments() {
    if (!guestbookComments) return;
    let comments = [];
    renderCommentEmpty('正在同步留言...');

    try {
      comments = await fetchAPI('/api/comments');
    } catch (e) {
      comments = getLocalArray('fallback_comments', [
        { id: 1, nickname: 'GeekLover', avatar: '👨‍💻', website: 'https://github.com', content: '这个Bento看板设计得也太酷炫了吧！毛玻璃的模糊度和系统CPU波形图太搭配了。', date: '2026-05-19 12:30' }
      ]);
    }
    
    localStorage.setItem('fallback_comments', JSON.stringify(comments));

    guestbookComments.innerHTML = '';
    if (comments.length === 0) {
      renderCommentEmpty('还没有留言。你可以成为第一位留下足迹的人。');
      return;
    }

    comments.forEach(c => {
      const nickname = escapeHTML(c.nickname || '匿名');
      const avatar = escapeHTML(c.avatar || '👤');
      const content = escapeHTML(c.content || '');
      const date = escapeHTML(c.date || '');
      const safeWebsite = normalizeUrl(c.website);
      const websiteAttr = safeWebsite ? `href="${escapeHTML(safeWebsite)}" target="_blank" rel="noopener noreferrer"` : 'style="cursor:default; text-decoration:none;"';
      const div = document.createElement('div');
      div.className = 'comment-node';

      // Inject admin delete action if verified
      let deleteBtn = '';
      if (isAdmin) {
        deleteBtn = `
          <button class="card-admin-btn btn-delete-comment" data-id="${escapeHTML(c.id)}" style="position:static; margin-left:1rem; width:1.6rem; height:1.6rem;" title="删除留言">
            <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
          </button>
        `;
      }

      div.innerHTML = `
        <div class="comment-avatar" style="font-size: 1.4rem; background: var(--glass-bg); border: 1px solid var(--glass-border);">${avatar}</div>
        <div class="comment-body">
          <div class="comment-header">
            <div style="display:flex; align-items:center;">
              <a class="comment-author" ${websiteAttr}>${nickname}</a>
              ${deleteBtn}
            </div>
            <span class="comment-date">${date}</span>
          </div>
          <p class="comment-msg">${content}</p>
        </div>
      `;
      guestbookComments.appendChild(div);
    });

    if (isAdmin) {
      guestbookComments.querySelectorAll('.btn-delete-comment').forEach(btn => {
        btn.addEventListener('click', () => deleteComment(btn.getAttribute('data-id')));
      });
    }

    safeCreateIcons();
  }

  async function deleteComment(id) {
    if (!confirm('确定要删除这笔留言吗？')) return;
    try {
      await fetchAPI(`/api/comments/${id}`, {
        method: 'DELETE'
      });
      showToast('删除留言成功', 'success');
      loadComments();
    } catch (err) {
      showToast(`删除留言失败: ${err.message}`, 'error');
    }
  }

  if (guestbookForm) {
    guestbookForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nickname = document.getElementById('gb-nickname').value.trim();
      const website = document.getElementById('gb-website').value.trim();
      const avatar = document.getElementById('gb-avatar-val').value;
      const content = gbContent.value.trim();
      const company = gbCompany?.value.trim() || '';

      if (!nickname || !content) {
        setGuestbookStatus('昵称和留言内容都需要填写。', 'error');
        return;
      }
      if (content.length > 1000) {
        setGuestbookStatus('留言内容不能超过 1000 字。', 'error');
        return;
      }

      try {
        setGuestbookSubmitting(true);
        setGuestbookStatus('正在发送留言...', 'info');
        const data = await fetchAPI('/api/comments', {
          method: 'POST',
          body: { nickname, website, avatar, content, company }
        });
        
        guestbookForm.reset();
        // Reset avatar status
        avatarOptions.forEach(o => o.classList.remove('active'));
        avatarOptions[0].classList.add('active');
        document.getElementById('gb-avatar-val').value = '👨‍💻';
        updateGuestbookCounter();

        loadComments();
        setGuestbookStatus(data?.comment ? '留言已发布，感谢你的反馈。' : '留言发表成功。', 'success');
        showToast('留言发表成功', 'success');
      } catch (err) {
        setGuestbookStatus(err.message || '留言发表失败，请稍后再试。', 'error');
        showToast(`留言发表失败: ${err.message}`, 'error');
      } finally {
        setGuestbookSubmitting(false);
      }
    });
  }

  if (gbContent) {
    gbContent.addEventListener('input', () => {
      updateGuestbookCounter();
      if (guestbookStatus?.classList.contains('is-error')) {
        setGuestbookStatus();
      }
    });
    updateGuestbookCounter();
  }

  // Emoji Popover
  if (emojiTrigger) {
    emojiTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (emojiPopover) emojiPopover.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      if (emojiPopover) emojiPopover.classList.remove('active');
    });

    document.querySelectorAll('.emoji-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (gbContent) {
          gbContent.value += item.textContent;
          updateGuestbookCounter();
          gbContent.focus();
        }
        if (emojiPopover) emojiPopover.classList.remove('active');
      });
    });
  }

  // Load and render comments
  loadComments();

  // ==========================================
  // WEB TOOLBOX SUB-ROUTING & CORE TOOLS
  // ==========================================
  const toolNavBtns = document.querySelectorAll('.tool-nav-btn');
  const toolPanels = document.querySelectorAll('.tool-panel');

  toolNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const toolId = btn.getAttribute('data-tool');
      
      toolNavBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      toolPanels.forEach(panel => {
        if (panel.id === `tool-${toolId}`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
      if (toolId === 'vault') refreshVaultSummary();
    });
  });

  // TOOL 0: Local Data Vault (export/import trusted client-side state)
  const vaultExportBtn = document.getElementById('vault-export-btn');
  const vaultImportTrigger = document.getElementById('vault-import-trigger');
  const vaultImportFile = document.getElementById('vault-import-file');
  const vaultRefreshBtn = document.getElementById('vault-refresh-btn');
  const vaultClearBtn = document.getElementById('vault-clear-btn');
  const vaultKeyCount = document.getElementById('vault-key-count');
  const vaultByteSize = document.getElementById('vault-byte-size');
  const vaultReaderCount = document.getElementById('vault-reader-count');
  const vaultArcadeCount = document.getElementById('vault-arcade-count');
  const vaultPreviewList = document.getElementById('vault-preview-list');
  const vaultLastUpdated = document.getElementById('vault-last-updated');
  const vaultSchema = 'atherix-vault-v1';
  const vaultMaxValueBytes = 1024 * 1024;
  const vaultAllowedExactKeys = new Set([
    'theme',
    'scratchpad_data',
    'fallback_posts',
    'fallback_projects',
    'fallback_comments',
    'atherix_reader_bookmarks',
    'atherix_reader_focus_mode',
    'atherix_todos',
    'atherix_premium_arcade_career_v2',
    'atherix_premium_survivor_best',
    'atherix_premium_boss_best',
    'atherix_premium_drift_best',
    'atherix_premium_heist_best',
    'atherix_premium_chain_best',
    'atherix_premium_tactics_best'
  ]);
  const vaultAllowedPrefixes = [
    'atherix_reader_progress_',
    'atherix_astro_runner_best_lvl_'
  ];

  function vaultTextBytes(value) {
    return new Blob([String(value ?? '')]).size;
  }

  function formatVaultBytes(bytes) {
    const size = Math.max(0, Number(bytes) || 0);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB`;
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }

  function isVaultAllowedKey(key) {
    const name = String(key || '');
    if (!name || name === 'admin_token') return false;
    return vaultAllowedExactKeys.has(name) || vaultAllowedPrefixes.some(prefix => name.startsWith(prefix));
  }

  function vaultCategory(key) {
    if (key === 'theme') return '偏好设置';
    if (key.startsWith('atherix_reader_')) return '阅读状态';
    if (key.startsWith('atherix_premium_') || key.startsWith('atherix_astro_runner_')) return '街机档案';
    if (key === 'scratchpad_data' || key === 'atherix_todos') return '工具草稿';
    if (key.startsWith('fallback_')) return '离线缓存';
    return '站点状态';
  }

  function normalizeVaultImportValue(value) {
    if (typeof value === 'string') return value;
    if (value === null || typeof value === 'undefined') return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function getVaultEntries() {
    const entries = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!isVaultAllowedKey(key)) continue;
      const value = localStorage.getItem(key);
      if (value !== null) entries.push([key, value]);
    }
    return entries.sort((a, b) => a[0].localeCompare(b[0], 'zh-Hans-CN'));
  }

  function buildVaultPayload(entries = getVaultEntries()) {
    const storage = Object.fromEntries(entries);
    const payload = {
      schema: vaultSchema,
      version: 1,
      app: 'Atherix Digital Space',
      exportedAt: new Date().toISOString(),
      origin: window.location.origin,
      storage
    };
    payload.summary = getVaultSummary(entries);
    return payload;
  }

  function getVaultSummary(entries = getVaultEntries()) {
    const json = JSON.stringify(Object.fromEntries(entries));
    const readerKeys = entries.filter(([key]) => key.startsWith('atherix_reader_progress_')).length;
    let bookmarks = 0;
    try {
      bookmarks = JSON.parse(localStorage.getItem('atherix_reader_bookmarks') || '[]').length || 0;
    } catch {
      bookmarks = 0;
    }
    const arcadeKeys = entries.filter(([key]) => key.startsWith('atherix_premium_') || key.startsWith('atherix_astro_runner_')).length;
    return {
      keys: entries.length,
      bytes: vaultTextBytes(json),
      reader: readerKeys + bookmarks,
      arcade: arcadeKeys
    };
  }

  function renderVaultPreview(entries = getVaultEntries()) {
    if (!vaultPreviewList) return;
    vaultPreviewList.innerHTML = '';
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'vault-empty-state';
      empty.textContent = '暂无可备份的本地状态。阅读文章、添加待办或游玩街机后这里会自动出现记录。';
      vaultPreviewList.appendChild(empty);
      return;
    }

    entries.forEach(([key, value]) => {
      const item = document.createElement('article');
      item.className = 'vault-preview-item';

      const copy = document.createElement('div');
      copy.className = 'vault-preview-copy';
      const label = document.createElement('strong');
      label.textContent = key;
      const meta = document.createElement('span');
      meta.textContent = `${vaultCategory(key)} · ${formatVaultBytes(vaultTextBytes(value))}`;
      copy.append(label, meta);

      const chip = document.createElement('span');
      chip.className = 'vault-preview-chip';
      chip.textContent = vaultCategory(key);

      item.append(copy, chip);
      vaultPreviewList.appendChild(item);
    });
  }

  function refreshVaultSummary() {
    const entries = getVaultEntries();
    const summary = getVaultSummary(entries);
    if (vaultKeyCount) vaultKeyCount.textContent = String(summary.keys);
    if (vaultByteSize) vaultByteSize.textContent = formatVaultBytes(summary.bytes);
    if (vaultReaderCount) vaultReaderCount.textContent = String(summary.reader);
    if (vaultArcadeCount) vaultArcadeCount.textContent = String(summary.arcade);
    if (vaultLastUpdated) {
      vaultLastUpdated.textContent = `最后扫描 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    renderVaultPreview(entries);
    return summary;
  }

  function refreshImportedViews(importedKeys = []) {
    const imported = new Set(importedKeys);
    if (imported.has('theme')) initTheme();
    if ([...imported].some(key => key.startsWith('atherix_reader_') || key === 'fallback_posts')) {
      blogPosts = getLocalArray('fallback_posts', blogPosts.length ? blogPosts : defaultMockPosts);
      renderBlogList();
      renderPinnedBlogs();
      renderTagCloud();
    }
    if (imported.has('fallback_projects')) {
      projectsData = getLocalArray('fallback_projects', projectsData.length ? projectsData : defaultMockProjects);
      renderProjectsList();
    }
    if (imported.has('fallback_comments')) loadComments();
    if (imported.has('atherix_todos')) {
      todos = getLocalArray('atherix_todos', []);
      renderTodos();
    }
    document.dispatchEvent(new CustomEvent('atherix:vault-imported', { detail: { keys: importedKeys } }));
    refreshVaultSummary();
  }

  function exportVault() {
    const payload = buildVaultPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `atherix-vault-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast(`已导出 ${payload.summary.keys} 项本地状态`, 'success');
    refreshVaultSummary();
    return payload;
  }

  function importVaultPayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('存档格式无效');
    }
    if (payload.schema !== vaultSchema || !payload.storage || typeof payload.storage !== 'object' || Array.isArray(payload.storage)) {
      throw new Error('不是 Atherix 数据保险库存档');
    }

    const importedKeys = [];
    const ignoredKeys = [];
    Object.entries(payload.storage).forEach(([key, value]) => {
      if (!isVaultAllowedKey(key)) {
        ignoredKeys.push(key);
        return;
      }
      const normalized = normalizeVaultImportValue(value);
      if (vaultTextBytes(normalized) > vaultMaxValueBytes) {
        ignoredKeys.push(key);
        return;
      }
      localStorage.setItem(key, normalized);
      importedKeys.push(key);
    });

    refreshImportedViews(importedKeys);
    showToast(`已导入 ${importedKeys.length} 项状态${ignoredKeys.length ? `，忽略 ${ignoredKeys.length} 项未知字段` : ''}`, 'success');
    return { imported: importedKeys, ignored: ignoredKeys };
  }

  function importVaultText(text) {
    const payload = JSON.parse(String(text || ''));
    return importVaultPayload(payload);
  }

  if (vaultExportBtn) {
    vaultExportBtn.addEventListener('click', exportVault);
  }
  if (vaultImportTrigger && vaultImportFile) {
    vaultImportTrigger.addEventListener('click', () => vaultImportFile.click());
  }
  if (vaultImportFile) {
    vaultImportFile.addEventListener('change', () => {
      const file = vaultImportFile.files?.[0];
      if (!file) return;
      if (!/\.json$/i.test(file.name) && !/json/i.test(file.type || '')) {
        showToast('请选择 JSON 格式的 Atherix 存档', 'warning');
        vaultImportFile.value = '';
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        try {
          importVaultText(reader.result);
        } catch (err) {
          showToast(`导入失败: ${err.message}`, 'error');
        } finally {
          vaultImportFile.value = '';
        }
      });
      reader.addEventListener('error', () => {
        showToast('读取存档文件失败', 'error');
        vaultImportFile.value = '';
      });
      reader.readAsText(file);
    });
  }
  if (vaultRefreshBtn) {
    vaultRefreshBtn.addEventListener('click', () => {
      refreshVaultSummary();
      showToast('已重新扫描本地状态', 'info');
    });
  }
  if (vaultClearBtn) {
    vaultClearBtn.addEventListener('click', () => {
      const entries = getVaultEntries();
      if (!entries.length) {
        showToast('没有可清理的本地状态', 'info');
        return;
      }
      if (!window.confirm(`确认清空 ${entries.length} 项 Atherix 本地状态？此操作不会影响服务器数据。`)) return;
      entries.forEach(([key]) => localStorage.removeItem(key));
      refreshImportedViews(entries.map(([key]) => key));
      showToast('本地状态已清空', 'warning');
    });
  }
  refreshVaultSummary();

  if (['127.0.0.1', 'localhost'].includes(window.location.hostname)) {
    window.__atherixDebug = {
      ...(window.__atherixDebug || {}),
      vault: {
        exportPayload: () => buildVaultPayload(),
        importText: importVaultText,
        summary: () => refreshVaultSummary(),
        allowed: key => isVaultAllowedKey(key)
      }
    };
  }

  // TOOL 1: JSON Formatter (Advanced Syntax Tree View)
  const jsonInput = document.getElementById('json-input');
  const jsonOutput = document.getElementById('json-output');
  const jsonFmtBtn = document.getElementById('json-fmt-btn');
  const jsonMinifyBtn = document.getElementById('json-minify-btn');
  const jsonCopyBtn = document.getElementById('json-copy-btn');
  const jsonClearBtn = document.getElementById('json-clear-btn');
  const jsonErrorMsg = document.getElementById('json-error-msg');

  // Renders interactive syntax tree
  function renderJSONTree(val) {
    const container = document.createElement('div');
    container.className = 'json-tree';
    
    function buildNode(key, value, isLast) {
      const node = document.createElement('div');
      node.className = 'json-node';
      
      if (key !== null) {
        const keySpan = document.createElement('span');
        keySpan.className = 'json-key';
        keySpan.textContent = `"${key}": `;
        node.appendChild(keySpan);
      }
      
      if (typeof value === 'object' && value !== null) {
        node.classList.add('json-expandable');
        const isArray = Array.isArray(value);
        const startChar = isArray ? '[' : '{';
        const endChar = isArray ? ']' : '}';
        
        const startSpan = document.createElement('span');
        startSpan.textContent = startChar;
        node.appendChild(startSpan);
        
        const toggle = document.createElement('span');
        toggle.className = 'json-toggle';
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          node.classList.toggle('json-collapsed');
        });
        node.appendChild(toggle);
        
        const collapsible = document.createElement('span');
        collapsible.className = 'json-collapsible';
        
        const keys = Object.keys(value);
        keys.forEach((k, idx) => {
          const itemVal = value[k];
          const lastItem = idx === keys.length - 1;
          const childNode = buildNode(isArray ? null : k, itemVal, lastItem);
          collapsible.appendChild(childNode);
        });
        node.appendChild(collapsible);
        
        const ellipsis = document.createElement('span');
        ellipsis.className = 'json-ellipsis';
        ellipsis.textContent = '...';
        node.appendChild(ellipsis);
        
        const endSpan = document.createElement('span');
        endSpan.textContent = endChar + (isLast ? '' : ',');
        node.appendChild(endSpan);
      } else {
        const valSpan = document.createElement('span');
        if (typeof value === 'string') {
          valSpan.className = 'json-string';
          valSpan.textContent = `"${value}"`;
        } else if (typeof value === 'number') {
          valSpan.className = 'json-number';
          valSpan.textContent = value;
        } else if (typeof value === 'boolean') {
          valSpan.className = 'json-boolean';
          valSpan.textContent = value;
        } else if (value === null) {
          valSpan.className = 'json-null';
          valSpan.textContent = 'null';
        }
        node.appendChild(valSpan);
        
        if (!isLast) {
          const comma = document.createTextNode(',');
          node.appendChild(comma);
        }
      }
      return node;
    }
    
    container.appendChild(buildNode(null, val, true));
    return container;
  }

  function formatJSON() {
    const rawVal = jsonInput.value.trim();
    if (!rawVal) return;

    try {
      const parsed = JSON.parse(rawVal);
      jsonOutput.innerHTML = '';
      jsonOutput.appendChild(renderJSONTree(parsed));
      if (jsonErrorMsg) jsonErrorMsg.style.display = 'none';
    } catch (err) {
      jsonOutput.innerHTML = '';
      if (jsonErrorMsg) {
        jsonErrorMsg.textContent = `解析错误: ${err.message}`;
        jsonErrorMsg.style.display = 'block';
      }
    }
  }

  function minifyJSON() {
    const rawVal = jsonInput.value.trim();
    if (!rawVal) return;

    try {
      const parsed = JSON.parse(rawVal);
      jsonOutput.innerText = JSON.stringify(parsed);
      jsonOutput.style.color = 'var(--text-secondary)';
      if (jsonErrorMsg) jsonErrorMsg.style.display = 'none';
    } catch (err) {
      jsonOutput.innerText = '';
      if (jsonErrorMsg) {
        jsonErrorMsg.textContent = `解析错误: ${err.message}`;
        jsonErrorMsg.style.display = 'block';
      }
    }
  }

  if (jsonFmtBtn) jsonFmtBtn.addEventListener('click', formatJSON);
  if (jsonMinifyBtn) jsonMinifyBtn.addEventListener('click', minifyJSON);
  if (jsonClearBtn) {
    jsonClearBtn.addEventListener('click', () => {
      jsonInput.value = '';
      jsonOutput.innerHTML = '';
      if (jsonErrorMsg) jsonErrorMsg.style.display = 'none';
    });
  }

  if (jsonCopyBtn) {
    jsonCopyBtn.addEventListener('click', () => {
      const txt = jsonOutput.innerText || jsonOutput.textContent;
      copyText(txt, 'JSON 结果已复制').then((ok) => {
        if (!ok) return;
        const origText = jsonCopyBtn.innerHTML;
        jsonCopyBtn.innerHTML = '<i data-lucide="check">✨</i> 已复制';
        safeCreateIcons();
        setTimeout(() => {
          jsonCopyBtn.innerHTML = origText;
          safeCreateIcons();
        }, 1500);
      });
    });
  }

  // TOOL 2: Markdown Editor & Premium Exports
  const mdInput = document.getElementById('markdown-input');
  const mdPreview = document.getElementById('markdown-preview');
  const mdWordsCount = document.getElementById('md-words-count');
  const mdCopyHtmlBtn = document.getElementById('md-copy-html-btn');
  const mdExportBtn = document.getElementById('md-export-btn');
  const mdClearBtn = document.getElementById('md-clear-btn');

  function updateMarkdownPreview() {
    if (!mdInput || !mdPreview) return;
    const txt = mdInput.value;
    mdPreview.innerHTML = renderMarkdown(txt);
    if (mdWordsCount) mdWordsCount.textContent = txt.length;
  }

  if (mdInput) {
    mdInput.addEventListener('input', updateMarkdownPreview);
    updateMarkdownPreview();
  }

  if (mdClearBtn) {
    mdClearBtn.addEventListener('click', () => {
      mdInput.value = '';
      updateMarkdownPreview();
    });
  }

  if (mdCopyHtmlBtn) {
    mdCopyHtmlBtn.addEventListener('click', () => {
      if (!mdPreview) return;
      const html = mdPreview.innerHTML;
      copyText(html, 'HTML 代码已复制');
    });
  }

  if (mdExportBtn) {
    mdExportBtn.addEventListener('click', () => {
      if (!mdInput) return;
      const blob = new Blob([mdInput.value], { type: 'text/markdown;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Atherix_Doc_${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // TOOL 3: Image Compressor & Conversion (Updated)
  const fileInput = document.getElementById('file-input');
  const dropZone = document.getElementById('drop-zone');
  const compressorControls = document.getElementById('compressor-controls');
  const imagePreviewPanel = document.getElementById('image-preview-panel');
  
  const qualitySlider = document.getElementById('quality-slider');
  const qualityVal = document.getElementById('quality-val');
  const compressFormat = document.getElementById('compress-format');
  const resizeWidth = document.getElementById('resize-width');
  const downloadWebpBtn = document.getElementById('download-webp-btn');

  const origImgPreview = document.getElementById('orig-img-preview');
  const compImgPreview = document.getElementById('comp-img-preview');
  const origImgDetails = document.getElementById('orig-img-details').querySelector('span');
  const compImgDetails = document.getElementById('comp-img-details');

  let currentImageFile = null;
  let compressedDataUrl = null;

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--accent)';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'var(--border-color)';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--border-color)';
      if (e.dataTransfer.files.length > 0) {
        handleImageSelect(e.dataTransfer.files[0]);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleImageSelect(e.target.files[0]);
      }
    });
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function handleImageSelect(file) {
    if (!file.type.startsWith('image/')) {
      showToast('请上传有效的图片格式文件', 'warning');
      return;
    }
    currentImageFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (origImgPreview) {
        origImgPreview.src = e.target.result;
        origImgDetails.textContent = formatBytes(file.size);
      }
      
      if (compressorControls) compressorControls.style.display = 'grid';
      if (imagePreviewPanel) imagePreviewPanel.style.display = 'grid';

      compressImage();
    };
    reader.readAsDataURL(file);
  }

  if (qualitySlider) {
    qualitySlider.addEventListener('input', (e) => {
      const q = e.target.value;
      if (qualityVal) qualityVal.textContent = `${q}%`;
      compressImage();
    });
  }

  if (compressFormat) {
    compressFormat.addEventListener('change', compressImage);
  }
  if (resizeWidth) {
    resizeWidth.addEventListener('input', compressImage);
  }

  function compressImage() {
    if (!currentImageFile || !origImgPreview) return;

    const q = qualitySlider ? qualitySlider.value / 100 : 0.8;
    const format = compressFormat ? compressFormat.value : 'image/webp';
    const targetWidth = resizeWidth ? parseInt(resizeWidth.value) || 0 : 0;

    const img = new Image();
    img.src = origImgPreview.src;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      
      if (targetWidth > 0 && targetWidth < w) {
        const ratio = targetWidth / w;
        w = targetWidth;
        h = Math.round(h * ratio);
      }
      
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob((blob) => {
        if (!blob) return;
        if (compressedDataUrl) {
          URL.revokeObjectURL(compressedDataUrl);
        }
        compressedDataUrl = URL.createObjectURL(blob);
        if (compImgPreview) compImgPreview.src = compressedDataUrl;

        const savedPct = Math.round(((currentImageFile.size - blob.size) / currentImageFile.size) * 100);
        const color = savedPct >= 0 ? 'var(--success)' : 'var(--danger)';
        const text = savedPct >= 0 ? `节约: ${savedPct}%` : `增加: ${-savedPct}% (由于格式原因)`;

        if (compImgDetails) {
          compImgDetails.innerHTML = `文件大小: <span>${formatBytes(blob.size)}</span> (<span style="color:${color}; font-weight:700;">${text}</span>)`;
        }
      }, format, q);
    };
  }

  if (downloadWebpBtn) {
    downloadWebpBtn.addEventListener('click', () => {
      if (!compressedDataUrl || !currentImageFile) return;
      const format = compressFormat ? compressFormat.value : 'image/webp';
      const ext = format.split('/')[1];

      const a = document.createElement('a');
      a.href = compressedDataUrl;
      const origName = currentImageFile.name.substring(0, currentImageFile.name.lastIndexOf('.'));
      a.download = `${origName}_converted.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // TOOL 4: Pomodoro Clock & Synthesized Noise presets
  const timerTime = document.getElementById('timer-time');
  const timerStatusLabel = document.getElementById('timer-status-label');
  const pomoStartPauseBtn = document.getElementById('pomo-start-pause');
  const pomoResetBtn = document.getElementById('pomo-reset');
  const pomoSkipBtn = document.getElementById('pomo-skip');
  const timerProgress = document.getElementById('timer-progress');
  const noiseSelect = document.getElementById('pomo-noise-select');
  const pomoModeBtns = document.querySelectorAll('.pomodoro-modes .mode-btn');

  const pomoSettings = {
    focus: 25 * 60,
    short: 5 * 60,
    long: 15 * 60
  };

  function updateTimerDisplay() {
    if (!timerTime) return;
    const mins = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const secs = (timeRemaining % 60).toString().padStart(2, '0');
    timerTime.textContent = `${mins}:${secs}`;

    const totalDuration = pomoSettings[currentTimerMode];
    const pct = timeRemaining / totalDuration;
    const offset = 628 * pct;
    if (timerProgress) timerProgress.style.strokeDashoffset = offset;
  }

  function startPomoAudioNoise() {
    if (!pomoAudioCtx) {
      pomoAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (pomoAudioCtx.state === 'suspended') {
      pomoAudioCtx.resume();
    }
    stopPomoAudioNoise();

    const sound = noiseSelect ? noiseSelect.value : 'none';
    if (sound === 'none') return;

    pomoNoiseSource = pomoAudioCtx.createGain();
    pomoNoiseSource.gain.setValueAtTime(0.08, pomoAudioCtx.currentTime);
    pomoNoiseSource.connect(pomoAudioCtx.destination);

    if (sound === 'rain') {
      const bufferSize = 2 * pomoAudioCtx.sampleRate;
      const noiseBuffer = pomoAudioCtx.createBuffer(1, bufferSize, pomoAudioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11;
        b6 = white * 0.115926;
      }
      const noiseNode = pomoAudioCtx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      const filter = pomoAudioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      noiseNode.connect(filter);
      filter.connect(pomoNoiseSource);
      noiseNode.start();
      
      pomoNoiseSource.audioSourceNode = noiseNode;
    } 
    else if (sound === 'forest') {
      const osc = pomoAudioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, pomoAudioCtx.currentTime);
      
      const filter = pomoAudioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, pomoAudioCtx.currentTime);
      
      const lfo = pomoAudioCtx.createOscillator();
      lfo.frequency.value = 0.06;
      const lfoGain = pomoAudioCtx.createGain();
      lfoGain.gain.value = 200;

      lfo.connect(filter.frequency);
      osc.connect(filter);
      filter.connect(pomoNoiseSource);

      osc.start();
      lfo.start();

      pomoNoiseSource.audioSourceNode = osc;
      pomoNoiseSource.lfo = lfo;
    }
    else if (sound === 'lofi') {
      const osc = pomoAudioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 110;
      osc.connect(pomoNoiseSource);
      osc.start();
      pomoNoiseSource.audioSourceNode = osc;
    }
    else if (sound === 'fireplace') {
      // Fire Crackle simulation
      const bufferSize = 2 * pomoAudioCtx.sampleRate;
      const noiseBuffer = pomoAudioCtx.createBuffer(1, bufferSize, pomoAudioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        // Fire crackle noise
        let crackle = Math.random() > 0.9995 ? (Math.random() * 2 - 1) * 3.5 : 0;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.33 + crackle;
        output[i] *= 0.12;
        b6 = white * 0.115926;
      }
      const noiseNode = pomoAudioCtx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      const filter = pomoAudioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 450;

      noiseNode.connect(filter);
      filter.connect(pomoNoiseSource);
      noiseNode.start();

      pomoNoiseSource.audioSourceNode = noiseNode;
    }
    else if (sound === 'ocean') {
      // Ocean wave low frequency volume modulation sweep
      const bufferSize = 2 * pomoAudioCtx.sampleRate;
      const noiseBuffer = pomoAudioCtx.createBuffer(1, bufferSize, pomoAudioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.1;
        b6 = white * 0.115926;
      }
      const noiseNode = pomoAudioCtx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      const filter = pomoAudioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 350;

      // Sweeper Gain Node
      const sweepGain = pomoAudioCtx.createGain();
      sweepGain.gain.setValueAtTime(0.05, pomoAudioCtx.currentTime);

      // Modulator LFO
      const lfo = pomoAudioCtx.createOscillator();
      lfo.frequency.value = 0.08; // 12 seconds per wave cycle
      const lfoGain = pomoAudioCtx.createGain();
      lfoGain.gain.value = 0.04;

      lfo.connect(lfoGain);
      lfoGain.connect(sweepGain.gain);

      noiseNode.connect(filter);
      filter.connect(sweepGain);
      sweepGain.connect(pomoNoiseSource);

      noiseNode.start();
      lfo.start();

      pomoNoiseSource.audioSourceNode = noiseNode;
      pomoNoiseSource.lfo = lfo;
    }
  }

  function stopPomoAudioNoise() {
    if (pomoNoiseSource) {
      try { pomoNoiseSource.audioSourceNode.stop(); } catch(e) {}
      try { pomoNoiseSource.lfo.stop(); } catch(e) {}
      try { pomoNoiseSource.disconnect(); } catch(e) {}
      pomoNoiseSource = null;
    }
  }

  function toggleTimer() {
    if (isTimerRunning) {
      isTimerRunning = false;
      if (pomoStartPauseBtn) pomoStartPauseBtn.innerHTML = '<i data-lucide="play" id="pomo-play-icon" style="font-style: normal;">▶️</i>';
      clearInterval(timerInterval);
      stopPomoAudioNoise();
    } else {
      isTimerRunning = true;
      if (pomoStartPauseBtn) pomoStartPauseBtn.innerHTML = '<i data-lucide="pause" id="pomo-play-icon" style="font-style: normal;">⏸️</i>';
      startPomoAudioNoise();
      
      timerInterval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining <= 0) {
          clearInterval(timerInterval);
          isTimerRunning = false;
          if (pomoStartPauseBtn) pomoStartPauseBtn.innerHTML = '<i data-lucide="play" id="pomo-play-icon" style="font-style: normal;">▶️</i>';
          stopPomoAudioNoise();
          showToast('专注时间到，记得稍作休息', 'success');
          skipTimerMode();
        }
        updateTimerDisplay();
      }, 1000);
    }
    safeCreateIcons();
  }

  function setTimerMode(mode) {
    currentTimerMode = mode;
    timeRemaining = pomoSettings[mode];
    
    let label = '正在专注';
    if (mode === 'short') label = '短途休息';
    if (mode === 'long') label = '长途休息';
    if (timerStatusLabel) timerStatusLabel.textContent = label;

    pomoModeBtns.forEach(btn => {
      if (btn.getAttribute('data-mode') === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      if (pomoStartPauseBtn) pomoStartPauseBtn.innerHTML = '<i data-lucide="play" id="pomo-play-icon" style="font-style: normal;">▶️</i>';
      safeCreateIcons();
    }
    stopPomoAudioNoise();
    updateTimerDisplay();
  }

  function skipTimerMode() {
    if (currentTimerMode === 'focus') {
      setTimerMode('short');
    } else {
      setTimerMode('focus');
    }
  }

  pomoModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      setTimerMode(mode);
    });
  });

  if (pomoStartPauseBtn) pomoStartPauseBtn.addEventListener('click', toggleTimer);
  if (pomoResetBtn) {
    pomoResetBtn.addEventListener('click', () => {
      setTimerMode(currentTimerMode);
    });
  }
  if (pomoSkipBtn) pomoSkipBtn.addEventListener('click', skipTimerMode);
  if (noiseSelect) {
    noiseSelect.addEventListener('change', () => {
      if (isTimerRunning) {
        startPomoAudioNoise();
      }
    });
  }

  setTimerMode('focus');

  // ==========================================
  // TOOL 5: Codec & Hash Generator (NEW)
  // ==========================================
  const codecInput = document.getElementById('codec-input');
  const codecOutput = document.getElementById('codec-output');
  const codecB64Enc = document.getElementById('codec-b64-enc-btn');
  const codecB64Dec = document.getElementById('codec-b64-dec-btn');
  const codecUrlEnc = document.getElementById('codec-url-enc-btn');
  const codecUrlDec = document.getElementById('codec-url-dec-btn');
  const codecSha256 = document.getElementById('codec-sha256-btn');
  const codecMd5 = document.getElementById('codec-md5-btn');
  const codecClear = document.getElementById('codec-clear-btn');

  // Local Cryptographic helper algorithms
  async function sha256Hash(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function md5Hash(str) {
    var k = [], i = 0;
    for (; i < 64;) {
      k[i] = Math.sin(++i) * 4294967296 | 0;
    }
    var h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476],
      s = [7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
           5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
           4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
           6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21];
    
    var words = [];
    var byteLength = str.length;
    for (i = 0; i < byteLength; i++) {
      words[i >> 2] |= (str.charCodeAt(i) & 0xff) << ((i % 4) * 8);
    }
    words[byteLength >> 2] |= 0x80 << ((byteLength % 4) * 8);
    words[(((byteLength + 8) >> 6) + 1) * 16 - 2] = byteLength * 8;
    
    for (var j = 0; j < words.length; j += 16) {
      var a = h[0], b = h[1], c = h[2], d = h[3];
      for (i = 0; i < 64; i++) {
        var f, g;
        if (i < 16) {
          f = (b & c) | (~b & d);
          g = i;
        } else if (i < 32) {
          f = (d & b) | (~d & c);
          g = (5 * i + 1) % 16;
        } else if (i < 48) {
          f = b ^ c ^ d;
          g = (3 * i + 5) % 16;
        } else {
          f = c ^ (b | ~d);
          g = (7 * i) % 16;
        }
        var temp = d;
        d = c;
        c = b;
        b = b + RotateLeft(a + f + k[i] + (words[j + g] || 0), s[i]);
        a = temp;
      }
      h[0] = h[0] + a | 0;
      h[1] = h[1] + b | 0;
      h[2] = h[2] + c | 0;
      h[3] = h[3] + d | 0;
    }
    
    function RotateLeft(n, shift) {
      return (n << shift) | (n >>> (32 - shift));
    }
    
    var hex = "";
    for (i = 0; i < 4; i++) {
      for (var l = 0; l < 4; l++) {
        var val = (h[i] >> (l * 8)) & 0xff;
        hex += (val < 16 ? "0" : "") + val.toString(16);
      }
    }
    return hex;
  }

  if (codecB64Enc) {
    codecB64Enc.addEventListener('click', () => {
      try {
        const val = codecInput.value;
        codecOutput.value = btoa(unescape(encodeURIComponent(val)));
      } catch (e) {
        codecOutput.value = `Base64 编码出错: ${e.message}`;
      }
    });
  }

  if (codecB64Dec) {
    codecB64Dec.addEventListener('click', () => {
      try {
        const val = codecInput.value;
        codecOutput.value = decodeURIComponent(escape(atob(val)));
      } catch (e) {
        codecOutput.value = `Base64 解码出错: ${e.message}`;
      }
    });
  }

  if (codecUrlEnc) {
    codecUrlEnc.addEventListener('click', () => {
      codecOutput.value = encodeURIComponent(codecInput.value);
    });
  }

  if (codecUrlDec) {
    codecUrlDec.addEventListener('click', () => {
      try {
        codecOutput.value = decodeURIComponent(codecInput.value);
      } catch (e) {
        codecOutput.value = `URL 解码出错: ${e.message}`;
      }
    });
  }

  if (codecSha256) {
    codecSha256.addEventListener('click', async () => {
      const hash = await sha256Hash(codecInput.value);
      codecOutput.value = hash;
    });
  }

  if (codecMd5) {
    codecMd5.addEventListener('click', () => {
      codecOutput.value = md5Hash(codecInput.value);
    });
  }

  if (codecClear) {
    codecClear.addEventListener('click', () => {
      codecInput.value = '';
      codecOutput.value = '';
    });
  }

  // ==========================================
  // TOOL 6: Developer Quick Kit
  // ==========================================
  const devkitTimestampInput = document.getElementById('devkit-timestamp-input');
  const devkitTimestampOutput = document.getElementById('devkit-timestamp-output');
  const devkitTsNowBtn = document.getElementById('devkit-ts-now-btn');
  const devkitTsParseBtn = document.getElementById('devkit-ts-parse-btn');
  const devkitTsCopyBtn = document.getElementById('devkit-ts-copy-btn');
  const devkitUuidCount = document.getElementById('devkit-uuid-count');
  const devkitUuidOutput = document.getElementById('devkit-uuid-output');
  const devkitUuidGenerateBtn = document.getElementById('devkit-uuid-generate-btn');
  const devkitUuidCopyBtn = document.getElementById('devkit-uuid-copy-btn');
  const devkitJwtInput = document.getElementById('devkit-jwt-input');
  const devkitJwtOutput = document.getElementById('devkit-jwt-output');
  const devkitJwtDecodeBtn = document.getElementById('devkit-jwt-decode-btn');
  const devkitJwtCopyBtn = document.getElementById('devkit-jwt-copy-btn');
  const devkitJwtClearBtn = document.getElementById('devkit-jwt-clear-btn');

  function formatTimestamp(date) {
    return [
      `本地时间: ${date.toLocaleString()}`,
      `ISO 时间: ${date.toISOString()}`,
      `Unix 秒: ${Math.floor(date.getTime() / 1000)}`,
      `Unix 毫秒: ${date.getTime()}`
    ].join('\n');
  }

  function parseTimestampInput(rawValue) {
    const raw = String(rawValue || '').trim();
    if (!raw) return new Date();

    if (/^\d+$/.test(raw)) {
      const num = Number(raw);
      if (!Number.isSafeInteger(num)) throw new Error('时间戳数字过大');
      return new Date(raw.length <= 10 ? num * 1000 : num);
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('无法识别该时间格式');
    }
    return parsed;
  }

  function updateTimestampOutput(date) {
    if (!devkitTimestampOutput) return;
    devkitTimestampOutput.value = formatTimestamp(date);
  }

  function createUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const rand = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
      const val = char === 'x' ? rand : (rand & 3) | 8;
      return val.toString(16);
    });
  }

  function generateUUIDs() {
    if (!devkitUuidOutput) return;
    const count = Math.max(1, Math.min(50, Number(devkitUuidCount?.value) || 1));
    if (devkitUuidCount) devkitUuidCount.value = count;
    devkitUuidOutput.value = Array.from({ length: count }, createUUID).join('\n');
  }

  function decodeBase64UrlJson(part) {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
  }

  function decodeJwt() {
    if (!devkitJwtInput || !devkitJwtOutput) return;
    const token = devkitJwtInput.value.trim();
    const parts = token.split('.');
    if (parts.length < 2) {
      showToast('JWT 至少需要包含 Header 和 Payload 两段', 'warning');
      return;
    }

    try {
      const header = decodeBase64UrlJson(parts[0]);
      const payload = decodeBase64UrlJson(parts[1]);
      devkitJwtOutput.value = JSON.stringify({
        header,
        payload,
        signature: parts[2] ? '存在，未验证' : '无'
      }, null, 2);
      showToast('JWT 已解码，仅供查看，未验证签名', 'success');
    } catch (err) {
      devkitJwtOutput.value = '';
      showToast(`JWT 解码失败: ${err.message}`, 'error');
    }
  }

  if (devkitTsNowBtn) {
    devkitTsNowBtn.addEventListener('click', () => {
      const now = new Date();
      if (devkitTimestampInput) devkitTimestampInput.value = String(now.getTime());
      updateTimestampOutput(now);
    });
  }

  if (devkitTsParseBtn) {
    devkitTsParseBtn.addEventListener('click', () => {
      try {
        updateTimestampOutput(parseTimestampInput(devkitTimestampInput?.value));
      } catch (err) {
        showToast(`时间转换失败: ${err.message}`, 'error');
      }
    });
  }

  if (devkitTimestampInput) {
    devkitTimestampInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        devkitTsParseBtn?.click();
      }
    });
  }

  if (devkitTsCopyBtn) {
    devkitTsCopyBtn.addEventListener('click', () => copyText(devkitTimestampOutput?.value, '时间戳结果已复制'));
  }

  if (devkitUuidGenerateBtn) {
    devkitUuidGenerateBtn.addEventListener('click', generateUUIDs);
  }

  if (devkitUuidCopyBtn) {
    devkitUuidCopyBtn.addEventListener('click', () => copyText(devkitUuidOutput?.value, 'UUID 已复制'));
  }

  if (devkitJwtDecodeBtn) {
    devkitJwtDecodeBtn.addEventListener('click', decodeJwt);
  }

  if (devkitJwtCopyBtn) {
    devkitJwtCopyBtn.addEventListener('click', () => copyText(devkitJwtOutput?.value, 'JWT 解码结果已复制'));
  }

  if (devkitJwtClearBtn) {
    devkitJwtClearBtn.addEventListener('click', () => {
      if (devkitJwtInput) devkitJwtInput.value = '';
      if (devkitJwtOutput) devkitJwtOutput.value = '';
    });
  }

  if (devkitUuidOutput) {
    generateUUIDs();
  }
  if (devkitTimestampOutput) {
    updateTimestampOutput(new Date());
  }

  // ==========================================
  // Phase 2: Interactive Components Controllers
  // ==========================================

  // 1. Cursor Particle Trail System (optimized & performance throttled)
  (function initCursorTrails() {
    if (navigator.webdriver) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981'];
    let lastSpawnTime = 0;
    let lastX = 0;
    let lastY = 0;
    let activeParticles = 0;

    document.addEventListener('mousemove', (e) => {
      if (document.hidden || activeParticles > 18) return;

      const now = Date.now();
      const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      
      // Throttle mouse moves to avoid high CPU load
      if (now - lastSpawnTime > 70 && dist > 24) {
        lastSpawnTime = now;
        lastX = e.clientX;
        lastY = e.clientY;

        const p = document.createElement('div');
        p.className = 'cursor-particle';
        p.style.left = e.clientX + 'px';
        p.style.top = e.clientY + 'px';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        const size = Math.random() * 5 + 4;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        
        document.body.appendChild(p);
        activeParticles++;

        // Visual fade out transition
        setTimeout(() => {
          p.style.opacity = '0';
          p.style.transform = 'translate(-50%, -50%) scale(0.1)';
          setTimeout(() => {
            p.remove();
            activeParticles = Math.max(0, activeParticles - 1);
          }, 500);
        }, 80);
      }
    });
  })();

  // 2. Bento Card Todo Dual-Tab & Checklist System
  const noteTabBtn = document.getElementById('note-tab-btn');
  const todoTabBtn = document.getElementById('todo-tab-btn');
  const tabNoteContent = document.getElementById('tab-note-content');
  const tabTodoContent = document.getElementById('tab-todo-content');
  const todoInput = document.getElementById('todo-input');
  const todoAddBtn = document.getElementById('todo-add-btn');
  const todoListContainer = document.getElementById('todo-list-container');

  let todos = getLocalArray('atherix_todos', []);

  function saveTodos() {
    localStorage.setItem('atherix_todos', JSON.stringify(todos));
  }

  function renderTodos() {
    if (!todoListContainer) return;
    todoListContainer.innerHTML = '';
    
    if (todos.length === 0) {
      todoListContainer.innerHTML = `<li style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding: 1.2rem 0; width:100%;">暂无待办，去新建一个吧！</li>`;
      return;
    }
    
    todos.forEach((todo, idx) => {
      const li = document.createElement('li');
      li.className = `todo-list-item ${todo.completed ? 'completed' : ''}`;
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.gap = '0.4rem';
      li.style.padding = '0.3rem 0.5rem';
      li.style.borderRadius = '6px';
      li.style.border = '1px solid var(--border-color)';
      li.style.background = 'rgba(255,255,255,0.01)';
      li.style.fontSize = '0.78rem';

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'todo-item-check';
      check.checked = todo.completed;
      check.style.cursor = 'pointer';
      check.addEventListener('change', () => {
        todos[idx].completed = check.checked;
        saveTodos();
        renderTodos();
      });

      const span = document.createElement('span');
      span.textContent = todo.text;
      span.style.flex = '1';
      span.style.overflow = 'hidden';
      span.style.textOverflow = 'ellipsis';
      span.style.whiteSpace = 'nowrap';
      if (todo.completed) {
        span.style.textDecoration = 'line-through';
        span.style.color = 'var(--text-muted)';
        span.style.opacity = '0.6';
      }

      const delBtn = document.createElement('button');
      delBtn.className = 'todo-item-del';
      delBtn.innerHTML = '✕';
      delBtn.style.marginLeft = 'auto';
      delBtn.style.border = 'none';
      delBtn.style.background = 'transparent';
      delBtn.style.color = 'var(--text-muted)';
      delBtn.style.cursor = 'pointer';
      delBtn.style.fontSize = '0.8rem';
      delBtn.addEventListener('click', () => {
        todos.splice(idx, 1);
        saveTodos();
        renderTodos();
      });

      li.appendChild(check);
      li.appendChild(span);
      li.appendChild(delBtn);
      todoListContainer.appendChild(li);
    });
  }

  if (noteTabBtn && todoTabBtn) {
    noteTabBtn.addEventListener('click', () => {
      noteTabBtn.classList.add('active');
      todoTabBtn.classList.remove('active');
      tabNoteContent.style.display = 'block';
      tabTodoContent.style.display = 'none';
    });
    todoTabBtn.addEventListener('click', () => {
      todoTabBtn.classList.add('active');
      noteTabBtn.classList.remove('active');
      tabTodoContent.style.display = 'block';
      tabNoteContent.style.display = 'none';
      renderTodos();
    });
  }

  if (todoAddBtn && todoInput) {
    const handleAdd = () => {
      const val = todoInput.value.trim();
      if (!val) return;
      todos.push({ text: val, completed: false });
      saveTodos();
      todoInput.value = '';
      renderTodos();
    };
    todoAddBtn.addEventListener('click', handleAdd);
    todoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
    });
  }

  // 3. Web Audio Synthesizer Piano Keyboard
  let pianoAudioCtx = null;
  const pianoWaveSelect = document.getElementById('piano-wave-select');
  const pianoDelayToggle = document.getElementById('piano-delay-toggle');
  const pianoKeys = document.querySelectorAll('.piano-key');

  const noteFreqs = {
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
    'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
    'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25
  };

  function playPianoNote(note) {
    // Lazy load audio context upon interaction
    if (!pianoAudioCtx) {
      pianoAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (pianoAudioCtx.state === 'suspended') {
      pianoAudioCtx.resume();
    }

    const freq = noteFreqs[note];
    if (!freq) return;

    const osc = pianoAudioCtx.createOscillator();
    const gain = pianoAudioCtx.createGain();

    osc.type = pianoWaveSelect ? pianoWaveSelect.value : 'sine';
    osc.frequency.setValueAtTime(freq, pianoAudioCtx.currentTime);

    // ADSR volume envelope
    const now = pianoAudioCtx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.04); // Attack
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.18); // Decay
    gain.gain.setValueAtTime(0.12, now + 0.5); // Sustain
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1); // Release

    let outputNode = gain;

    // Optional delay lines for espacial space reverb
    if (pianoDelayToggle && pianoDelayToggle.checked) {
      const delay = pianoAudioCtx.createDelay();
      const feedback = pianoAudioCtx.createGain();
      
      delay.delayTime.value = 0.3;
      feedback.gain.value = 0.35;

      gain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);

      const merge = pianoAudioCtx.createGain();
      merge.gain.value = 0.65;
      gain.connect(merge);
      delay.connect(merge);
      outputNode = merge;
    }

    outputNode.connect(pianoAudioCtx.destination);
    osc.connect(gain);

    osc.start(now);
    osc.stop(now + 1.2);
  }

  pianoKeys.forEach(key => {
    key.addEventListener('mousedown', () => {
      const note = key.getAttribute('data-note');
      playPianoNote(note);
      key.classList.add('active');
      const keyChar = key.getAttribute('data-key');
      if (keyChar) triggerRhythmHit(keyChar);
    });
    const release = () => key.classList.remove('active');
    key.addEventListener('mouseup', release);
    key.addEventListener('mouseleave', release);
  });

  const pianoKeyMap = {
    'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4',
    'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4',
    'u': 'A#4', 'j': 'B4', 'k': 'C5'
  };

  const pressedPianoKeys = {};

  window.addEventListener('keydown', (e) => {
    // Do not trigger piano keys when writing comments/inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Do not trigger piano notes if user is inside the game section tab
    const gameSection = document.getElementById('game');
    if (gameSection && gameSection.classList.contains('active')) return;

    const letter = e.key.toLowerCase();
    const note = pianoKeyMap[letter];
    if (note && !pressedPianoKeys[letter]) {
      pressedPianoKeys[letter] = true;
      playPianoNote(note);
      const keyEl = document.querySelector(`.piano-key[data-note="${note}"]`);
      if (keyEl) keyEl.classList.add('active');
      triggerRhythmHit(letter);
    }
  });

  window.addEventListener('keyup', (e) => {
    // Do not trigger piano release if user is inside the game section tab
    const gameSection = document.getElementById('game');
    if (gameSection && gameSection.classList.contains('active')) return;

    const letter = e.key.toLowerCase();
    if (pressedPianoKeys[letter]) {
      pressedPianoKeys[letter] = false;
      const note = pianoKeyMap[letter];
      const keyEl = document.querySelector(`.piano-key[data-note="${note}"]`);
      if (keyEl) keyEl.classList.remove('active');
    }
  });

  // Rhythm Beat Game Engine
  function compileTrack(notesStr, interval) {
    const keys = notesStr.split(/\s+/);
    return keys.map((key, index) => {
      const char = key.toLowerCase();
      return {
        lane: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'].indexOf(char),
        note: pianoKeyMap[char],
        time: (index + 2) * interval, // Give 2 intervals prep time
        hit: false,
        missed: false
      };
    });
  }

  let rhythmGameActive = false;
  let rhythmStartTime = 0;
  let rhythmScore = 0;
  let rhythmCombo = 0;
  let rhythmNotes = [];
  let activeRatings = [];
  let rhythmAnimationId = null;

  const rhythmSongTracks = {
    twinkle: () => compileTrack("a a g g h h g f f d d s s a h h g g f f d h h g g f f d a a g g h h g f f d d s s a", 550),
    ode: () => compileTrack("d d f g g f d s a a s d d s s d d f g g f d s a a s d s a a s s d a s d f d s a s g d d f g g f d s a a s d s a a", 450),
    canon: () => compileTrack("d s a j h g h j a j h g f d f g d s a j h g h j a j h g f d f g d d j j h h g g f f d d f f g g a a s s d d f f", 320)
  };

  function showRhythmRating(text, lane) {
    activeRatings.push({
      text,
      lane,
      y: 110,
      opacity: 1,
      color: text === 'PERFECT' ? '#10B981' : (text === 'GREAT' ? '#8B5CF6' : (text === 'GOOD' ? '#3B82F6' : '#EF4444'))
    });
  }

  function updateRhythmStats() {
    const scoreVal = document.getElementById('rhythm-score-val');
    const comboVal = document.getElementById('rhythm-combo-val');
    if (scoreVal) scoreVal.textContent = rhythmScore;
    if (comboVal) comboVal.textContent = rhythmCombo;
  }

  const rhythmCanvas = document.getElementById('rhythm-canvas');
  const rhythmCtx = rhythmCanvas ? rhythmCanvas.getContext('2d') : null;

  function runRhythmGameLoop() {
    if (!rhythmGameActive || !rhythmCtx) return;

    rhythmCtx.fillStyle = 'rgba(10, 8, 20, 0.95)';
    rhythmCtx.fillRect(0, 0, 520, 160);

    // 1. Draw grid lanes
    rhythmCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    rhythmCtx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      rhythmCtx.beginPath();
      rhythmCtx.moveTo(i * 65, 0);
      rhythmCtx.lineTo(i * 65, 160);
      rhythmCtx.stroke();
    }

    // 2. Draw hitline
    rhythmCtx.strokeStyle = 'rgba(139, 92, 246, 0.7)';
    rhythmCtx.lineWidth = 3;
    rhythmCtx.shadowColor = 'rgba(139, 92, 246, 0.9)';
    rhythmCtx.shadowBlur = 8;
    rhythmCtx.beginPath();
    rhythmCtx.moveTo(0, 140);
    rhythmCtx.lineTo(520, 140);
    rhythmCtx.stroke();
    rhythmCtx.shadowBlur = 0; // reset shadow

    // 3. Update & Draw falling notes
    const elapsed = Date.now() - rhythmStartTime;
    rhythmNotes.forEach(note => {
      if (note.hit || note.missed) return;

      const y = 140 - (note.time - elapsed) * 0.2; // 0.2px per millisecond

      if (y > 155) {
        note.missed = true;
        rhythmCombo = 0;
        showRhythmRating('MISS', note.lane);
        updateRhythmStats();
        return;
      }

      if (y >= -15 && y <= 160) {
        const x = note.lane * 65 + 32.5;
        // Neon color gradient for notes
        const grad = rhythmCtx.createRadialGradient(x, y, 2, x, y, 10);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.3, '#A78BFA');
        grad.addColorStop(1, '#8B5CF6');
        
        rhythmCtx.fillStyle = grad;
        rhythmCtx.shadowColor = '#8B5CF6';
        rhythmCtx.shadowBlur = 12;
        rhythmCtx.beginPath();
        rhythmCtx.arc(x, y, 9, 0, Math.PI * 2);
        rhythmCtx.fill();
        rhythmCtx.shadowBlur = 0;
      }
    });

    // 4. Update & Draw active ratings text
    for (let i = activeRatings.length - 1; i >= 0; i--) {
      const r = activeRatings[i];
      rhythmCtx.fillStyle = r.color;
      rhythmCtx.font = 'bold 12px "JetBrains Mono", monospace';
      rhythmCtx.textAlign = 'center';
      rhythmCtx.shadowColor = r.color;
      rhythmCtx.shadowBlur = 6;
      rhythmCtx.fillText(r.text, r.lane * 65 + 32.5, r.y);
      rhythmCtx.shadowBlur = 0;
      r.y -= 0.6;
      r.opacity -= 0.035;
      if (r.opacity <= 0) {
        activeRatings.splice(i, 1);
      }
    }

    // 5. Check if finished
    const finished = rhythmNotes.every(n => n.hit || n.missed);
    if (finished && rhythmNotes.length > 0) {
      rhythmGameActive = false;
      cancelAnimationFrame(rhythmAnimationId);
      // Victory screen
      rhythmCtx.fillStyle = 'rgba(10, 8, 20, 0.88)';
      rhythmCtx.fillRect(0, 0, 520, 160);
      rhythmCtx.fillStyle = '#fff';
      rhythmCtx.font = 'bold 16px "Inter", sans-serif';
      rhythmCtx.textAlign = 'center';
      rhythmCtx.fillText('挑战完成！🎉', 260, 55);
      rhythmCtx.fillStyle = 'var(--accent)';
      rhythmCtx.font = 'bold 20px "JetBrains Mono", monospace';
      rhythmCtx.fillText(`最终得分: ${rhythmScore}`, 260, 90);
      rhythmCtx.font = '12px "Inter", sans-serif';
      rhythmCtx.fillStyle = 'var(--text-secondary)';
      rhythmCtx.fillText('点击 [开始挑战] 重新开始', 260, 125);
      const playBtn = document.getElementById('rhythm-play-btn');
      if (playBtn) playBtn.textContent = '重新挑战';
      return;
    }

    rhythmAnimationId = requestAnimationFrame(runRhythmGameLoop);
  }

  function startRhythmGame() {
    if (rhythmAnimationId) {
      cancelAnimationFrame(rhythmAnimationId);
    }
    const songSelect = document.getElementById('rhythm-song-select');
    const songKey = songSelect ? songSelect.value : 'twinkle';
    rhythmNotes = rhythmSongTracks[songKey]();
    rhythmScore = 0;
    rhythmCombo = 0;
    activeRatings = [];
    updateRhythmStats();

    rhythmGameActive = true;
    rhythmStartTime = Date.now();
    
    const playBtn = document.getElementById('rhythm-play-btn');
    if (playBtn) playBtn.textContent = '重新开始';

    runRhythmGameLoop();
  }

  function triggerRhythmHit(char) {
    if (!rhythmGameActive) return;
    const laneIndex = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'].indexOf(char.toLowerCase());
    if (laneIndex === -1) return;

    // Lane Flash Overlay
    const whiteKeys = document.querySelectorAll('#piano-keyboard-container .white-key');
    if (whiteKeys[laneIndex]) {
      const flash = document.createElement('div');
      flash.className = 'rhythm-hit-flash';
      whiteKeys[laneIndex].style.position = 'relative';
      whiteKeys[laneIndex].appendChild(flash);
      setTimeout(() => flash.remove(), 250);
    }

    const elapsed = Date.now() - rhythmStartTime;
    // Find the first unhit, not-yet-missed note in this lane
    const note = rhythmNotes.find(n => n.lane === laneIndex && !n.hit && !n.missed);
    if (!note) return;

    const y = 140 - (note.time - elapsed) * 0.2;
    const diff = Math.abs(y - 140);

    if (diff <= 16) {
      note.hit = true;
      showRhythmRating('PERFECT', laneIndex);
      rhythmScore += 100 + rhythmCombo * 5;
      rhythmCombo++;
      updateRhythmStats();
    } else if (diff <= 32) {
      note.hit = true;
      showRhythmRating('GREAT', laneIndex);
      rhythmScore += 50 + rhythmCombo * 2;
      rhythmCombo++;
      updateRhythmStats();
    } else if (diff <= 48) {
      note.hit = true;
      showRhythmRating('GOOD', laneIndex);
      rhythmScore += 20;
      rhythmCombo++;
      updateRhythmStats();
    }
  }

  const modeFreeBtn = document.getElementById('piano-mode-free');
  const modeGameBtn = document.getElementById('piano-mode-game');
  const gameBar = document.getElementById('rhythm-game-bar');
  const freestyleControls = document.getElementById('piano-freestyle-controls');
  const pianoWrapper = document.getElementById('piano-wrapper');
  const pianoTipsText = document.getElementById('piano-tips-text');
  const rhythmPlayBtn = document.getElementById('rhythm-play-btn');

  if (modeFreeBtn && modeGameBtn) {
    modeFreeBtn.addEventListener('click', () => {
      modeGameBtn.classList.remove('action-btn-primary');
      modeFreeBtn.classList.add('action-btn-primary');
      if (gameBar) gameBar.style.display = 'none';
      if (freestyleControls) freestyleControls.style.display = 'flex';
      if (rhythmCanvas) rhythmCanvas.style.display = 'none';
      if (pianoWrapper) {
        pianoWrapper.style.height = '200px';
        pianoWrapper.classList.remove('game-mode');
      }
      if (pianoTipsText) {
        pianoTipsText.innerHTML = "物理键盘映射已激活！按住键盘 <strong>A、W、S、E、D、F、T、G、Y、H、U、J、K</strong> 即可快速弹奏对应的琴键。";
      }
      // Stop game
      rhythmGameActive = false;
      if (rhythmAnimationId) cancelAnimationFrame(rhythmAnimationId);
    });

    modeGameBtn.addEventListener('click', () => {
      modeFreeBtn.classList.remove('action-btn-primary');
      modeGameBtn.classList.add('action-btn-primary');
      if (gameBar) gameBar.style.display = 'flex';
      if (freestyleControls) freestyleControls.style.display = 'none';
      if (rhythmCanvas) rhythmCanvas.style.display = 'block';
      if (pianoWrapper) {
        pianoWrapper.style.height = '360px';
        pianoWrapper.classList.add('game-mode');
      }
      if (pianoTipsText) {
        pianoTipsText.innerHTML = "物理音轨映射：<strong>A (C4), S (D4), D (E4), F (F4), G (G4), H (A4), J (B4), K (C5)</strong>；点击对应琴键亦可触发打击！";
      }
      
      // Draw welcome
      if (rhythmCtx) {
        rhythmCtx.fillStyle = 'rgba(10, 8, 20, 0.95)';
        rhythmCtx.fillRect(0, 0, 520, 160);
        rhythmCtx.fillStyle = '#fff';
        rhythmCtx.font = 'bold 15px "Inter", sans-serif';
        rhythmCtx.textAlign = 'center';
        rhythmCtx.fillText('节奏挑战模式 (Rhythm Challenge)', 260, 50);
        rhythmCtx.fillStyle = 'var(--text-secondary)';
        rhythmCtx.font = '11px "Inter", sans-serif';
        rhythmCtx.fillText('选择上方曲目，点击 [开始挑战] 开始播放落轨音符。', 260, 85);
        rhythmCtx.fillStyle = 'rgba(139, 92, 246, 0.5)';
        rhythmCtx.fillText('请使用键盘按键 A、S、D、F、G、H、J、K 对应 8 个音轨。', 260, 115);
      }
    });
  }

  if (rhythmPlayBtn) {
    rhythmPlayBtn.addEventListener('click', startRhythmGame);
  }

  // 3.5 Premium Arcade Lab: high-feedback canvas games
  (function initPremiumArcadeLab() {
    const library = document.querySelector('.arcade-library');
    if (!library) return;

    library.innerHTML = `
      <div class="arcade-library-header">
        <div>
          <span class="quick-card-kicker"><i data-lucide="sparkles"></i> PREMIUM ARCADE</span>
          <h2>高能街机实验室</h2>
          <p>六个高级街机模式：生存构筑、Boss 弹幕、霓虹漂移、潜行劫取、连锁解谜、回合战术。每局都有阶段事件、局内成长、特殊道具和最佳纪录。</p>
        </div>
        <div class="mini-game-scoreboard">
          <span>当前游戏</span>
          <strong id="premium-active-title">星核幸存者 Starcore Survivor</strong>
        </div>
      </div>
      <div class="arcade-career-panel" aria-label="街机生涯总览">
        <div class="career-rank-card">
          <span>街机评级</span>
          <strong id="premium-career-rating">RANK C</strong>
          <small id="premium-career-total">总声望 0</small>
          <button type="button" class="career-codex-open" id="premium-career-open">
            <i data-lucide="panel-right-open"></i>
            <span>生涯档案</span>
          </button>
        </div>
        <div class="career-daily-card">
          <span>今日挑战</span>
          <strong id="premium-daily-challenge">加载挑战中...</strong>
          <small id="premium-daily-status">完成后解锁限定徽章</small>
        </div>
        <div class="career-achievements" id="premium-achievement-feed" aria-live="polite"></div>
      </div>
      <div class="arcade-run-log-panel" id="premium-run-log-panel" aria-label="街机战报复盘">
        <div class="arcade-run-log-heading">
          <span><i data-lucide="activity"></i> RUN TELEMETRY</span>
          <strong id="premium-run-log-title">等待首局战报</strong>
          <small id="premium-run-log-summary">完成任意高级街机模式后，这里会记录最近战报、强项模式与平均声望。</small>
        </div>
        <div class="arcade-run-log-stats">
          <span>最近 <strong id="premium-run-last-score">--</strong></span>
          <span>强项 <strong id="premium-run-best-mode">--</strong></span>
          <span>均值 <strong id="premium-run-average">--</strong></span>
        </div>
        <div class="arcade-run-log-list" id="premium-run-log-list"></div>
      </div>
      <div class="arcade-leaderboard-panel" id="premium-leaderboard-panel" data-empty="true" aria-label="街机个人名人堂">
        <div class="arcade-leaderboard-heading">
          <span><i data-lucide="crown"></i> HALL OF FAME</span>
          <strong id="premium-leaderboard-title">等待个人纪录</strong>
          <small id="premium-leaderboard-summary">个人最高纪录会跨模式排序，展示奖牌、难度、战术芯片和下一突破目标。</small>
        </div>
        <div class="arcade-leaderboard-stats">
          <span>总 PB <strong id="premium-leaderboard-total">0</strong></span>
          <span>金牌 <strong id="premium-leaderboard-golds">0/7</strong></span>
          <span>最近刷新 <strong id="premium-leaderboard-latest">--</strong></span>
        </div>
        <div class="arcade-leaderboard-list" id="premium-leaderboard-list"></div>
      </div>
      <div class="arcade-rival-panel" id="premium-rival-panel" data-tone="combat" data-complete="false" aria-label="街机宿敌挑战">
        <div class="arcade-rival-heading">
          <span><i data-lucide="swords"></i> RIVAL INTEL</span>
          <strong id="premium-rival-title">宿敌扫描中...</strong>
          <small id="premium-rival-summary">系统会根据最近战报、联赛路线和奖牌进度生成下一位可追逐宿敌。</small>
        </div>
        <div class="arcade-rival-stats">
          <span>目标 <strong id="premium-rival-target">--</strong></span>
          <span>差距 <strong id="premium-rival-gap">--</strong></span>
          <span>压强 <strong id="premium-rival-pressure">--</strong></span>
        </div>
        <div class="arcade-rival-brief" id="premium-rival-brief">完成一局后，这里会给出宿敌打法提示。</div>
        <button type="button" class="arcade-rival-action" id="premium-rival-start" data-rival-target-game="survivor">
          <i data-lucide="crosshair"></i>
          <span>锁定宿敌</span>
        </button>
      </div>
      <div class="arcade-coach-panel" id="premium-run-coach-panel" data-empty="true" aria-label="街机赛后教练">
        <div class="arcade-coach-heading">
          <span><i data-lucide="sparkles"></i> POST-RUN COACH</span>
          <strong id="premium-coach-title">等待赛后复盘</strong>
          <small id="premium-coach-summary">完成一局后，系统会根据奖牌、纪录和装备推荐下一把训练目标。</small>
        </div>
        <div class="arcade-coach-grid" aria-label="赛后复盘指标">
          <span><small>奖牌推进</small><strong id="premium-coach-medal">--</strong></span>
          <span><small>纪录变化</small><strong id="premium-coach-delta">--</strong></span>
          <span><small>下一目标</small><strong id="premium-coach-target">--</strong></span>
        </div>
        <div class="arcade-coach-actions">
          <button type="button" class="arcade-coach-action arcade-coach-primary" id="premium-coach-launch" data-coach-target-game="survivor">
            <i data-lucide="crosshair"></i>
            <span>进入复盘目标</span>
          </button>
          <button type="button" class="arcade-coach-action" id="premium-coach-difficulty" data-coach-difficulty="standard">
            <i data-lucide="gauge"></i>
            <span>切换推荐难度</span>
          </button>
          <button type="button" class="arcade-coach-action" id="premium-coach-loadout" data-coach-loadout="pulse">
            <i data-lucide="cpu"></i>
            <span>装备推荐芯片</span>
          </button>
        </div>
      </div>
      <div class="arcade-director-panel" id="premium-arcade-director" data-tone="daily" aria-label="街机导演推荐">
        <div class="arcade-director-main">
          <span><i data-lucide="target"></i> NEXT RUN</span>
          <strong id="premium-director-title">分析挑战路线中...</strong>
          <small id="premium-director-reason">根据每日挑战、奖牌和成就进度推荐下一局。</small>
        </div>
        <div class="arcade-director-meters" aria-label="街机完成度">
          <span>奖牌 <strong id="premium-director-medals">0/7</strong></span>
          <span>成就 <strong id="premium-director-achievements">0/25</strong></span>
          <span>完成度 <strong id="premium-director-completion">0%</strong></span>
        </div>
        <button type="button" class="arcade-director-action" id="premium-director-start" data-target-game="survivor">
          <i data-lucide="play"></i>
          <span>进入推荐挑战</span>
        </button>
      </div>
      <div class="arcade-mastery-panel" id="premium-mastery-panel" aria-label="街机大师地图">
        <div class="arcade-mastery-heading">
          <span><i data-lucide="radar"></i> MASTERY MAP</span>
          <strong id="premium-mastery-title">大师地图初始化中...</strong>
          <small id="premium-mastery-summary">跟踪每个模式的最佳分、奖牌、下一突破目标和进度。</small>
        </div>
        <div class="arcade-mastery-grid" id="premium-mastery-grid"></div>
      </div>
      <div class="arcade-contract-board" id="premium-contract-board" aria-label="街机契约任务">
        <div class="arcade-contract-heading">
          <span><i data-lucide="clipboard-check"></i> CREW CONTRACTS</span>
          <strong>今日契约</strong>
        </div>
        <div class="arcade-contract-grid" id="premium-contract-list"></div>
      </div>
      <div class="arcade-league-panel" id="premium-league-panel" aria-label="街机挑战联赛">
        <div class="arcade-league-heading">
          <span><i data-lucide="shield-half"></i> CHALLENGE LEAGUE</span>
          <strong id="premium-league-title">联赛路线生成中...</strong>
          <small id="premium-league-summary">完成每日 3 段跨模式路线，结算整条联赛声望和限定徽章。</small>
        </div>
        <div class="arcade-league-route" id="premium-league-route"></div>
        <div class="arcade-league-side">
          <span>阶段 <strong id="premium-league-progress">0/3</strong></span>
          <span>奖励 <strong id="premium-league-reward">+0</strong></span>
          <button type="button" class="arcade-league-action" id="premium-league-start" data-league-target-game="survivor">
            <i data-lucide="flag"></i>
            <span>进入联赛阶段</span>
          </button>
        </div>
      </div>
      <div class="arcade-difficulty-panel" id="premium-difficulty-panel" aria-label="街机难度矩阵">
        <div class="arcade-difficulty-heading">
          <span><i data-lucide="sliders-horizontal"></i> DIFFICULTY MATRIX</span>
          <strong id="premium-difficulty-active">标准协议</strong>
          <small id="premium-difficulty-summary">标准敌压与完整声望结算，适合日常推进。</small>
        </div>
        <div class="arcade-difficulty-grid" id="premium-difficulty-list"></div>
      </div>
      <div class="arcade-loadout-panel" id="premium-loadout-panel" aria-label="街机战术芯片">
        <div class="arcade-loadout-heading">
          <span><i data-lucide="cpu"></i> TACTICAL LOADOUT</span>
          <strong id="premium-loadout-active">脉冲校准</strong>
          <small id="premium-loadout-summary">声望、机动与生存微调会应用到下一局。</small>
        </div>
        <div class="arcade-loadout-grid" id="premium-loadout-list"></div>
      </div>
      <div class="premium-career-dialog" id="premium-career-dialog" aria-hidden="true">
        <div class="premium-career-card" role="dialog" aria-modal="true" aria-labelledby="premium-career-title">
          <button type="button" class="premium-career-close" id="premium-career-close" aria-label="关闭生涯档案">
            <i data-lucide="x"></i>
          </button>
          <div class="premium-career-heading">
            <span class="quick-card-kicker"><i data-lucide="trophy"></i> ARCADE CAREER</span>
            <h3 id="premium-career-title">街机生涯档案</h3>
            <p id="premium-career-summary">查看奖牌、每日挑战与全部成就。</p>
          </div>
          <div class="career-dialog-daily" id="premium-career-dialog-daily"></div>
          <div class="career-dialog-grid" id="premium-career-medals"></div>
          <div class="career-dialog-achievements" id="premium-career-achievements"></div>
        </div>
      </div>
      <div class="mini-game-tabs" role="tablist" aria-label="精品小游戏选择">
        <button type="button" class="mini-game-tab active" data-premium-game="survivor">星核幸存者</button>
        <button type="button" class="mini-game-tab" data-premium-game="boss">棱镜 Boss</button>
        <button type="button" class="mini-game-tab" data-premium-game="drift">霓虹漂移</button>
        <button type="button" class="mini-game-tab" data-premium-game="heist">赛博潜入</button>
        <button type="button" class="mini-game-tab" data-premium-game="chain">连锁炼金</button>
        <button type="button" class="mini-game-tab" data-premium-game="tactics">裂隙战术</button>
      </div>
      <div class="mini-game-stage" id="premium-game-stage" tabindex="0" aria-label="精品街机操作区">
        <div class="mini-game-panel active" id="premium-survivor">
          <div class="mini-game-copy">
            <h3>Starcore Survivor</h3>
            <p>WASD / 方向键移动，自动射击，Space 释放星爆。吸收星核升级武器，在 90 秒内顶住精英潮和深空事件。</p>
            <div class="mini-stats">
              <span>能量 <strong id="premium-survivor-score">0</strong></span>
              <span>最佳 <strong id="premium-survivor-best">0</strong></span>
              <span>等级 <strong id="premium-survivor-level">1</strong></span>
              <span>生命 <strong id="premium-survivor-hp">100</strong></span>
              <span>构筑 <strong id="premium-survivor-build">Pulse I</strong></span>
              <span>连段 <strong id="premium-survivor-chain">0x</strong></span>
              <span>超载 <strong id="premium-survivor-overdrive">0%</strong></span>
              <span>危机 <strong id="premium-survivor-threat">WAVE 1</strong></span>
              <span>事件 <strong id="premium-survivor-event">稳定</strong></span>
              <span>赏金 <strong id="premium-survivor-bounty">ELITE 0/2</strong></span>
            </div>
            <div class="mini-actions">
              <button type="button" class="action-btn action-btn-primary" id="premium-survivor-start">部署 / 重开</button>
              <button type="button" class="action-btn" id="premium-survivor-pause">暂停</button>
            </div>
          </div>
          <div class="mini-playfield-stack">
            <canvas class="mini-canvas mini-canvas-wide" id="premium-survivor-canvas" width="560" height="360"></canvas>
            <div class="survivor-upgrade-draft" id="premium-survivor-draft" aria-hidden="true">
              <div class="survivor-draft-heading">
                <span>LEVEL UP</span>
                <strong id="premium-survivor-draft-title">选择星核改造</strong>
                <small>按 1/2/3 或点击卡片，立即改变本局构筑。</small>
              </div>
              <div class="survivor-upgrade-grid" id="premium-survivor-draft-options"></div>
            </div>
          </div>
        </div>
        <div class="mini-game-panel" id="premium-boss">
          <div class="mini-game-copy">
            <h3>Prism Boss Rush</h3>
            <p>WASD / 方向键机动，Space 闪避无敌，自动开火。Boss 会切换环形、狙击、雨幕和横扫四种弹幕。</p>
            <div class="mini-stats">
              <span>分数 <strong id="premium-boss-score">0</strong></span>
              <span>机体 <strong id="premium-boss-lives">3</strong></span>
              <span>最佳 <strong id="premium-boss-best">0</strong></span>
              <span>Boss <strong id="premium-boss-hp">100%</strong></span>
              <span>阶段 <strong id="premium-boss-phase">I</strong></span>
              <span>招式 <strong id="premium-boss-pattern">扫描中</strong></span>
              <span>弱点 <strong id="premium-boss-weak">LOCKED</strong></span>
              <span>破招 <strong id="premium-boss-break">0</strong></span>
              <span>专注 <strong id="premium-boss-focus">0%</strong></span>
              <span>闪避 <strong id="premium-boss-dash">READY</strong></span>
            </div>
            <div class="mini-actions">
              <button type="button" class="action-btn action-btn-primary" id="premium-boss-start">开战 / 重开</button>
              <button type="button" class="action-btn" id="premium-boss-pause">暂停</button>
            </div>
          </div>
          <canvas class="mini-canvas mini-canvas-wide" id="premium-boss-canvas" width="560" height="340"></canvas>
        </div>
        <div class="mini-game-panel" id="premium-drift">
          <div class="mini-game-copy">
            <h3>Neon Drift</h3>
            <p>WASD / 方向键推进，Space 量子加速，Q 相位刹车。穿越连续检查点、完成赞助合约、压住赛道热度并甩开劲敌。</p>
            <div class="mini-stats">
              <span>分数 <strong id="premium-drift-score">0</strong></span>
              <span>检查点 <strong id="premium-drift-gates">0</strong>/8</span>
              <span>最佳 <strong id="premium-drift-best">0</strong></span>
              <span>护盾 <strong id="premium-drift-shield">100</strong></span>
              <span>倍率 <strong id="premium-drift-mult">x1.0</strong></span>
              <span>线路 <strong id="premium-drift-line">READY</strong></span>
              <span>连击 <strong id="premium-drift-combo">0x</strong></span>
              <span>劲敌 <strong id="premium-drift-rival">+0.0G</strong></span>
              <span>超车 <strong id="premium-drift-overtake">0</strong></span>
              <span>加速 <strong id="premium-drift-boost">READY</strong></span>
              <span>合约 <strong id="premium-drift-contract">APEX 0/3</strong></span>
              <span>热度 <strong id="premium-drift-heat">0%</strong></span>
              <span>相位 <strong id="premium-drift-phase">READY</strong></span>
            </div>
            <div class="mini-actions">
              <button type="button" class="action-btn action-btn-primary" id="premium-drift-start">点火 / 重开</button>
              <button type="button" class="action-btn" id="premium-drift-pause">暂停</button>
              <button type="button" class="action-btn" id="premium-drift-phase-btn">Q 相位刹车</button>
            </div>
          </div>
          <canvas class="mini-canvas mini-canvas-wide" id="premium-drift-canvas" width="560" height="340" aria-label="霓虹漂移赛道"></canvas>
        </div>
        <div class="mini-game-panel" id="premium-heist">
          <div class="mini-game-copy">
            <h3>Cyber Heist</h3>
            <p>潜入数据金库。WASD / 方向键移动，Space 启动短暂隐身，Q 部署诱饵；黑入终端、绕开摄像头与视野锥，偷走 4 枚密钥后撤离。</p>
            <div class="mini-stats">
              <span>密钥 <strong id="premium-heist-keys">0</strong>/4</span>
              <span>最佳 <strong id="premium-heist-best">0</strong></span>
              <span>警戒 <strong id="premium-heist-alert">LOW</strong></span>
              <span>安防 <strong id="premium-heist-security">0%</strong></span>
              <span>步数 <strong id="premium-heist-steps">0</strong></span>
              <span>路线 <strong id="premium-heist-route">SCAN</strong></span>
              <span>连段 <strong id="premium-heist-chain">0x</strong></span>
              <span>工具 <strong id="premium-heist-tools">CLOAK 2</strong></span>
              <span>诱饵 <strong id="premium-heist-decoys">2</strong></span>
              <span>战利品 <strong id="premium-heist-loot">0</strong></span>
            </div>
            <div class="mini-actions">
              <button type="button" class="action-btn action-btn-primary" id="premium-heist-new">生成任务</button>
            </div>
          </div>
          <canvas class="mini-canvas mini-canvas-wide" id="premium-heist-canvas" width="560" height="360"></canvas>
        </div>
        <div class="mini-game-panel" id="premium-chain">
          <div class="mini-game-copy">
            <h3>Alchemy Chain</h3>
            <p>点击相邻同色能量团触发连锁爆破。完成阶段炼成、制造特殊核心并维持倍率，在限定步数内冲破目标分数。</p>
            <div class="mini-stats">
              <span>步数 <strong id="premium-chain-moves">30</strong></span>
              <span>分数 <strong id="premium-chain-score">0</strong></span>
              <span>最佳 <strong id="premium-chain-best">0</strong></span>
              <span>连锁 <strong id="premium-chain-combo">0</strong></span>
              <span>倍率 <strong id="premium-chain-mult">x1.0</strong></span>
              <span>阶段 <strong id="premium-chain-phase">I</strong></span>
              <span>炼成 <strong id="premium-chain-goal">连锁 7+</strong></span>
              <span>提示 <strong id="premium-chain-hint">SCAN</strong></span>
              <span>精华 <strong id="premium-chain-essence">C0 V0 P0 G0 N0</strong></span>
              <span>配方 <strong id="premium-chain-recipe">极光 0%</strong></span>
              <span>超载 <strong id="premium-chain-overcharge">0%</strong></span>
              <span>目标 <strong id="premium-chain-target">9000</strong></span>
            </div>
            <div class="mini-actions">
              <button type="button" class="action-btn action-btn-primary" id="premium-chain-new">重置能量场</button>
              <button type="button" class="action-btn" id="premium-chain-catalyst">Q 催化</button>
            </div>
          </div>
          <div class="memory-board chain-board" id="premium-chain-board" aria-label="连锁消除棋盘"></div>
        </div>
        <div class="mini-game-panel" id="premium-tactics">
          <div class="mini-game-copy">
            <h3>Rift Tactics</h3>
            <p>回合制机甲战术。WASD / 方向键移动，Space 释放相位爆破或架盾；夺取 3 个数据核心后撤离，敌人会包抄、射线压制与近战追击。</p>
            <div class="mini-stats">
              <span>核心 <strong id="premium-tactics-cores">0</strong>/3</span>
              <span>装甲 <strong id="premium-tactics-hp">100</strong></span>
              <span>行动 <strong id="premium-tactics-ap">3</strong></span>
              <span>回合 <strong id="premium-tactics-turn">1</strong></span>
              <span>威胁 <strong id="premium-tactics-threat">LOW</strong></span>
              <span>预判 <strong id="premium-tactics-intel">安全窗口</strong></span>
              <span>危险 <strong id="premium-tactics-danger">0</strong></span>
              <span>掩体 <strong id="premium-tactics-cover">OPEN</strong></span>
              <span>动量 <strong id="premium-tactics-momentum">0</strong></span>
              <span>路线 <strong id="premium-tactics-route">SCAN</strong></span>
              <span>最佳 <strong id="premium-tactics-best">0</strong></span>
            </div>
            <div class="mini-actions">
              <button type="button" class="action-btn action-btn-primary" id="premium-tactics-start">开始行动 / 重开</button>
              <button type="button" class="action-btn" id="premium-tactics-action">相位爆破</button>
            </div>
          </div>
          <canvas class="mini-canvas mini-canvas-wide" id="premium-tactics-canvas" width="560" height="360" aria-label="裂隙战术棋盘"></canvas>
        </div>
        <div class="premium-touch-controls" aria-label="触控街机控制器">
          <div class="premium-dpad">
            <button type="button" data-premium-control="up" aria-label="上">▲</button>
            <button type="button" data-premium-control="left" aria-label="左">◀</button>
            <button type="button" data-premium-control="right" aria-label="右">▶</button>
            <button type="button" data-premium-control="down" aria-label="下">▼</button>
          </div>
          <div class="premium-action-stack">
            <button type="button" class="premium-action-pad" data-premium-control="action" aria-label="动作">ACT</button>
            <button type="button" class="premium-action-pad premium-tool-pad" data-premium-control="tool" aria-label="工具">TOOL</button>
          </div>
        </div>
      </div>`;

    safeCreateIcons();

    const stage = document.getElementById('premium-game-stage');
    const title = document.getElementById('premium-active-title');
    const premiumKeys = { up: false, down: false, left: false, right: false, action: false, tool: false };
    let premiumActive = 'survivor';
    const titles = {
      survivor: '星核幸存者 Starcore Survivor',
      boss: '棱镜 Boss Rush',
      drift: '霓虹漂移 Neon Drift',
      heist: '赛博潜入 Cyber Heist',
      chain: '连锁炼金 Alchemy Chain',
      tactics: '裂隙战术 Rift Tactics',
      runner: '主线远征 Cyber Astro-Runner'
    };
    const premiumTabLabels = {
      runner: '主线远征',
      survivor: '星核幸存者',
      boss: '棱镜 Boss',
      drift: '霓虹漂移',
      heist: '赛博潜入',
      chain: '连锁炼金',
      tactics: '裂隙战术'
    };
    const careerGameOrder = ['runner', 'survivor', 'boss', 'drift', 'heist', 'chain', 'tactics'];
    const careerKey = 'atherix_premium_arcade_career_v2';
    const medalRank = { none: 0, bronze: 1, silver: 2, gold: 3 };
    const medalLabels = { none: '无', bronze: '铜', silver: '银', gold: '金' };
    const medalRules = {
      survivor: [
        { name: 'gold', threshold: 2600 },
        { name: 'silver', threshold: 1600 },
        { name: 'bronze', threshold: 800 }
      ],
      boss: [
        { name: 'gold', threshold: 2500 },
        { name: 'silver', threshold: 1400 },
        { name: 'bronze', threshold: 700 }
      ],
      drift: [
        { name: 'gold', threshold: 2400 },
        { name: 'silver', threshold: 1500 },
        { name: 'bronze', threshold: 850 }
      ],
      heist: [
        { name: 'gold', threshold: 1000 },
        { name: 'silver', threshold: 800 },
        { name: 'bronze', threshold: 550 }
      ],
      chain: [
        { name: 'gold', threshold: 9000 },
        { name: 'silver', threshold: 7000 },
        { name: 'bronze', threshold: 4500 }
      ],
      tactics: [
        { name: 'gold', threshold: 1800 },
        { name: 'silver', threshold: 1250 },
        { name: 'bronze', threshold: 850 }
      ],
      runner: [
        { name: 'gold', threshold: 2600 },
        { name: 'silver', threshold: 1800 },
        { name: 'bronze', threshold: 900 }
      ]
    };
    const achievementDefs = [
      { id: 'survivor_level_4', label: '星核觉醒', desc: '星核幸存者达到 4 级' },
      { id: 'survivor_90', label: '深空存活', desc: '坚持完整 90 秒' },
      { id: 'survivor_anomaly', label: '裂隙调度', desc: '星核幸存者触发深空异常事件' },
      { id: 'survivor_bounty', label: '赏金猎星', desc: '星核幸存者完成一项精英赏金' },
      { id: 'boss_phase_2', label: '棱镜破相', desc: 'Boss 进入第二阶段' },
      { id: 'boss_clear', label: '碎光终结', desc: '击破棱镜核心' },
      { id: 'boss_focus_surge', label: '擦弹专注', desc: 'Boss 战触发专注爆发' },
      { id: 'drift_clear', label: '霓虹完赛', desc: 'Neon Drift 穿越全部检查点' },
      { id: 'drift_clean', label: '零损漂移', desc: '高护盾完成 Neon Drift' },
      { id: 'drift_combo', label: '量子倍率', desc: 'Neon Drift 倍率达到 x3.0' },
      { id: 'drift_sponsor', label: '赞助制霸', desc: 'Neon Drift 完成一张赞助合约' },
      { id: 'heist_ghost', label: '幽影协议', desc: '成功启动隐身装置' },
      { id: 'heist_clean', label: '无声撤离', desc: '低步数完成潜入' },
      { id: 'heist_cache', label: '金库猎手', desc: '赛博潜入中取得高价值缓存' },
      { id: 'chain_combo_9', label: '九连炼成', desc: '一次连锁爆破 9 格以上' },
      { id: 'chain_recipe', label: '秘方共振', desc: '连锁炼金完成一张配方契约' },
      { id: 'chain_clear', label: '贤者能场', desc: '完成连锁炼金目标' },
      { id: 'tactics_clear', label: '裂隙撤离', desc: '完成裂隙战术撤离' },
      { id: 'tactics_sweep', label: '战术清场', desc: '裂隙战术中击破全部敌人' },
      { id: 'tactics_clean', label: '无损机甲', desc: '高装甲完成裂隙战术' },
      { id: 'runner_contract', label: '航线承包', desc: '主线远征完成一张航线合约' },
      { id: 'runner_final', label: '星门远征', desc: '通关主线最终关' },
      { id: 'contract_clear', label: '契约猎手', desc: '完成任意街机契约' },
      { id: 'daily_clear', label: '今日制霸', desc: '完成每日街机挑战' },
      { id: 'league_clear', label: '联赛冠军', desc: '完成一条每日挑战联赛路线' }
    ];
    const dailyChallenges = [
      { id: 'survivor_1200', label: '星核幸存者得分 1200+', game: 'survivor', check: (game, score) => game === 'survivor' && score >= 1200 },
      { id: 'boss_900', label: '棱镜 Boss 得分 900+', game: 'boss', check: (game, score) => game === 'boss' && score >= 900 },
      { id: 'drift_1200', label: '霓虹漂移评分 1200+', game: 'drift', check: (game, score) => game === 'drift' && score >= 1200 },
      { id: 'heist_700', label: '赛博潜入评分 700+', game: 'heist', check: (game, score) => game === 'heist' && score >= 700 },
      { id: 'chain_6000', label: '连锁炼金得分 6000+', game: 'chain', check: (game, score) => game === 'chain' && score >= 6000 },
      { id: 'tactics_1100', label: '裂隙战术评分 1100+', game: 'tactics', check: (game, score) => game === 'tactics' && score >= 1100 },
      { id: 'runner_1500', label: '主线关卡评分 1500+', game: 'runner', check: (game, score) => game === 'runner' && score >= 1500 }
    ];
    const contractDefs = [
      { id: 'score_pool', title: '火力热身', desc: '任意街机累计声望', tone: 'score', type: 'score_pool', target: 2200, reward: 260 },
      { id: 'mode_sampler', title: '轮换出击', desc: '完成 3 个不同模式的结算', tone: 'modes', type: 'distinct_modes', targetCount: 3, reward: 320 },
      { id: 'medal_push', title: '奖牌推进', desc: '在 2 个模式拿到铜牌以上', tone: 'medal', type: 'medal_result', targetCount: 2, reward: 360 },
      { id: 'combat_contract', title: '火线突破', desc: '幸存者 800+ 或 Boss 700+', tone: 'combat', type: 'target_games', games: ['survivor', 'boss'], scoreTarget: 700, targetCount: 1, reward: 280 },
      { id: 'mind_contract', title: '冷静解法', desc: '连锁 4500+ 或战术 850+', tone: 'mind', type: 'target_games', games: ['chain', 'tactics'], scoreTarget: 850, targetCount: 1, reward: 300 },
      { id: 'speed_contract', title: '高速航线', desc: '主线 900+ 或漂移 850+', tone: 'speed', type: 'target_games', games: ['runner', 'drift'], scoreTarget: 850, targetCount: 1, reward: 300 }
    ];
    const leagueDefs = [
      {
        id: 'frontline_circuit',
        title: '星火突围联赛',
        summary: '从自动射击到 Boss 战再到高速漂移，考验操作连续稳定性。',
        reward: 680,
        stages: [
          { id: 'frontline-survivor', game: 'survivor', target: 900, tip: '用星爆处理第一波精英潮' },
          { id: 'frontline-boss', game: 'boss', target: 800, tip: '擦弹攒专注，抓弱点窗口反击' },
          { id: 'frontline-drift', game: 'drift', target: 950, tip: '保持 PERFECT 门与低热度' }
        ]
      },
      {
        id: 'shadow_mind',
        title: '幽影解法联赛',
        summary: '潜入、连锁与战术三连，强调规划、路线和风险控制。',
        reward: 720,
        stages: [
          { id: 'shadow-heist', game: 'heist', target: 650, tip: '先拿缓存，再用诱饵拆视野交叉' },
          { id: 'shadow-chain', game: 'chain', target: 5200, tip: '优先 9 连与配方颜色' },
          { id: 'shadow-tactics', game: 'tactics', target: 950, tip: '沿推荐路线吃掩体动量' }
        ]
      },
      {
        id: 'grand_tour',
        title: '霓虹巡回联赛',
        summary: '主线远征开局，接入星核幸存者和战术撤离，像正式赛季一样推进。',
        reward: 760,
        stages: [
          { id: 'grand-runner', game: 'runner', target: 1000, tip: '保持连段，完成航线合约' },
          { id: 'grand-survivor', game: 'survivor', target: 1100, tip: '留 Space 超载处理异常事件' },
          { id: 'grand-tactics', game: 'tactics', target: 1050, tip: '爆破锁定单位后撤离核心' }
        ]
      }
    ];
    const loadoutDefs = [
      {
        id: 'pulse',
        label: '脉冲校准',
        tone: 'pulse',
        requirement: '默认启用',
        unlock: () => true,
        summary: '稳定声望与星核吸附，适合熟悉所有模式。',
        perks: ['声望 +5%', '星核吸附 +24', '战术护盾 +8'],
        bonuses: { scoreBoost: 0.05, survivorMagnet: 24, driftBoost: 10, tacticsShield: 8 }
      },
      {
        id: 'aegis',
        label: '棱镜护盾',
        tone: 'aegis',
        requirement: '完成 1 局或声望 600',
        unlock: () => (career.plays || 0) >= 1 || (career.totalScore || 0) >= 600,
        summary: '提高容错率，适合 Boss、潜入和高压漂移。',
        perks: ['生命/护盾提升', 'Boss 机体 +1', '潜入隐身 +1'],
        bonuses: { scoreBoost: 0.03, survivorHp: 18, bossLives: 1, driftShield: 16, heistCloaks: 1, tacticsHp: 14 }
      },
      {
        id: 'overdrive',
        label: '霓虹超频',
        tone: 'overdrive',
        requirement: '任意奖牌或声望 1500',
        unlock: () => earnedMedalCount() >= 1 || (career.totalScore || 0) >= 1500,
        summary: '更快、更危险、更高收益，适合冲分。',
        perks: ['声望 +10%', '移动/加速强化', '闪避冷却缩短'],
        bonuses: { scoreBoost: 0.1, survivorSpeed: 18, driftBoost: 25, chainMoves: 1, bossDashMs: -150 }
      },
      {
        id: 'strategist',
        label: '裂隙参谋',
        tone: 'strategy',
        requirement: '2 项成就或声望 2600',
        unlock: () => (career.achievements || []).length >= 2 || (career.totalScore || 0) >= 2600,
        summary: '给解谜与战术模式更多计划空间。',
        perks: ['战术行动 +1', '连锁步数 +3', '初始护盾 +16'],
        bonuses: { scoreBoost: 0.07, tacticsAp: 1, tacticsShield: 16, chainMoves: 3, heistCloaks: 1 }
      }
    ];
    const difficultyDefs = [
      {
        id: 'training',
        label: '训练协议',
        short: '训练',
        tone: 'training',
        scoreBoost: -0.08,
        pressure: 0.82,
        summary: '降低敌压并提供额外容错，适合练习路线与熟悉新模式。',
        perks: ['敌压 -18%', '生命/护盾 +14', '声望 -8%'],
        tuning: { hp: 14, shield: 14, enemyHp: 0.9, bossHp: 0.9, guardCone: -1, chainTarget: 0.86, chainMoves: 2, tacticsHp: 12 }
      },
      {
        id: 'standard',
        label: '标准协议',
        short: '标准',
        tone: 'standard',
        scoreBoost: 0,
        pressure: 1,
        summary: '标准敌压与完整声望结算，适合日常推进。',
        perks: ['标准敌压', '标准目标', '声望 x1.00'],
        tuning: { hp: 0, shield: 0, enemyHp: 1, bossHp: 1, guardCone: 0, chainTarget: 1, chainMoves: 0, tacticsHp: 0 }
      },
      {
        id: 'elite',
        label: '精英协议',
        short: '精英',
        tone: 'elite',
        scoreBoost: 0.18,
        pressure: 1.18,
        summary: '提高敌压和目标门槛，适合冲击奖牌与高分。',
        perks: ['敌压 +18%', '目标 +15%', '声望 +18%'],
        tuning: { hp: -6, shield: -8, enemyHp: 1.14, bossHp: 1.12, guardCone: 1, chainTarget: 1.15, chainMoves: -1, tacticsHp: -6 }
      },
      {
        id: 'nightmare',
        label: '梦魇协议',
        short: '梦魇',
        tone: 'nightmare',
        scoreBoost: 0.36,
        pressure: 1.36,
        summary: '高压挑战，敌人更强、资源更紧，专为熟练玩家冲榜。',
        perks: ['敌压 +36%', '目标 +28%', '声望 +36%'],
        tuning: { hp: -14, shield: -16, enemyHp: 1.28, bossHp: 1.26, guardCone: 1, chainTarget: 1.28, chainMoves: -2, tacticsHp: -12 }
      }
    ];
    const rivalProfiles = {
      runner: { name: 'ORION-7', title: '航线幽灵', tone: 'speed', tactic: '保持连段窗口，冲刺只留给水晶、信标与航线合约。' },
      survivor: { name: 'NOVA-9', title: '星核猎手', tone: 'combat', tactic: '先控精英潮，Space 超载留给异常事件和赏金目标。' },
      boss: { name: 'PRISM-0', title: '棱镜决斗者', tone: 'duel', tactic: '擦弹攒专注，等弱点预警结束前贴近反击。' },
      drift: { name: 'KAIRO', title: '霓虹劲敌', tone: 'speed', tactic: '连续 PERFECT 门能压制劲敌，Q 相位刹车只救高热路段。' },
      heist: { name: 'ECHO-V', title: '幽影渗透者', tone: 'shadow', tactic: '先拿缓存再撤离，诱饵优先拆守卫与摄像头交叉视野。' },
      chain: { name: 'SAGE-X', title: '炼金解算器', tone: 'mind', tactic: '优先配方颜色和 9 连，催化剂等超载团再出手。' },
      tactics: { name: 'RIFT-MK', title: '裂隙指挥官', tone: 'strategy', tactic: '沿推荐路线拿掩体动量，爆破锁定单位后再推进核心。' }
    };

    function todayKey() {
      const d = new Date();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${month}-${day}`;
    }

    function getDailyChallenge() {
      const key = todayKey();
      const seed = key.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      return { ...dailyChallenges[seed % dailyChallenges.length], date: key };
    }

    function getDailyContracts() {
      const key = todayKey();
      const seed = key.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0);
      const pool = contractDefs.slice(1);
      const selected = [contractDefs[0]];
      let cursor = seed % pool.length;
      while (selected.length < 3 && selected.length <= contractDefs.length) {
        const candidate = pool[cursor % pool.length];
        if (!selected.some(contract => contract.id === candidate.id)) {
          selected.push(candidate);
        }
        cursor += 2;
      }
      return selected.map(contract => ({ ...contract, date: key }));
    }

    function getDailyLeagueRoute(date = todayKey()) {
      const seed = String(date).split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 5), 0);
      return { ...leagueDefs[seed % leagueDefs.length], date };
    }

    function createDefaultContractState(date = todayKey()) {
      return {
        date,
        claimed: [],
        progress: {}
      };
    }

    function createDefaultLeagueState(date = todayKey()) {
      const route = getDailyLeagueRoute(date);
      return {
        date,
        routeId: route.id,
        stageIndex: 0,
        completed: false,
        rewarded: false,
        stageScores: {}
      };
    }

    function createDefaultCareer() {
      return {
        totalScore: 0,
        plays: 0,
        best: {},
        medals: {},
        achievements: [],
        daily: {},
        contracts: createDefaultContractState(),
        league: createDefaultLeagueState(),
        loadout: { active: 'pulse' },
        difficulty: 'standard',
        runs: []
      };
    }

    function loadCareer() {
      try {
        const parsed = JSON.parse(localStorage.getItem(careerKey) || 'null');
        const merged = { ...createDefaultCareer(), ...(parsed || {}) };
        merged.best = merged.best && typeof merged.best === 'object' ? merged.best : {};
        merged.medals = merged.medals && typeof merged.medals === 'object' ? merged.medals : {};
        merged.achievements = Array.isArray(merged.achievements) ? merged.achievements : [];
        merged.daily = merged.daily && typeof merged.daily === 'object' ? merged.daily : {};
        merged.contracts = merged.contracts && typeof merged.contracts === 'object' ? merged.contracts : createDefaultContractState();
        merged.league = merged.league && typeof merged.league === 'object' ? merged.league : createDefaultLeagueState();
        merged.loadout = merged.loadout && typeof merged.loadout === 'object' ? merged.loadout : { active: 'pulse' };
        if (!loadoutDefs.some(def => def.id === merged.loadout.active)) merged.loadout.active = 'pulse';
        if (!difficultyDefs.some(def => def.id === merged.difficulty)) merged.difficulty = 'standard';
        merged.runs = Array.isArray(merged.runs) ? merged.runs.slice(0, 12).filter(run => run && typeof run === 'object') : [];
        if (!Array.isArray(merged.contracts.claimed)) merged.contracts.claimed = [];
        if (!merged.contracts.progress || typeof merged.contracts.progress !== 'object') merged.contracts.progress = {};
        if (!merged.league.stageScores || typeof merged.league.stageScores !== 'object') merged.league.stageScores = {};
        merged.league.stageIndex = Number.isFinite(Number(merged.league.stageIndex)) ? Number(merged.league.stageIndex) : 0;
        merged.league.completed = !!merged.league.completed;
        merged.league.rewarded = !!merged.league.rewarded;
        merged.totalScore = Number.isFinite(Number(merged.totalScore)) ? Number(merged.totalScore) : 0;
        merged.plays = Number.isFinite(Number(merged.plays)) ? Number(merged.plays) : 0;
        return merged;
      } catch {
        return createDefaultCareer();
      }
    }

    let career = loadCareer();

    function saveCareer() {
      localStorage.setItem(careerKey, JSON.stringify(career));
    }

    function ensureContractsForToday() {
      const date = todayKey();
      if (!career.contracts || career.contracts.date !== date) {
        career.contracts = createDefaultContractState(date);
      }
      if (!Array.isArray(career.contracts.claimed)) career.contracts.claimed = [];
      if (!career.contracts.progress || typeof career.contracts.progress !== 'object') career.contracts.progress = {};
      return career.contracts;
    }

    function ensureLeagueForToday() {
      const date = todayKey();
      const route = getDailyLeagueRoute(date);
      if (!career.league || career.league.date !== date || career.league.routeId !== route.id) {
        career.league = createDefaultLeagueState(date);
      }
      if (!career.league.stageScores || typeof career.league.stageScores !== 'object') career.league.stageScores = {};
      career.league.stageIndex = Math.max(0, Math.min(route.stages.length, Number(career.league.stageIndex || 0)));
      career.league.completed = !!career.league.completed || career.league.stageIndex >= route.stages.length;
      career.league.rewarded = !!career.league.rewarded;
      return career.league;
    }

    function contractProgressEntry(contractId) {
      const state = ensureContractsForToday();
      if (!state.progress[contractId] || typeof state.progress[contractId] !== 'object') {
        state.progress[contractId] = { value: 0, games: {} };
      }
      if (!state.progress[contractId].games || typeof state.progress[contractId].games !== 'object') {
        state.progress[contractId].games = {};
      }
      state.progress[contractId].value = Number(state.progress[contractId].value || 0);
      return state.progress[contractId];
    }

    function medalFor(game, score) {
      const rules = medalRules[game] || [];
      const match = rules.find(rule => score >= rule.threshold);
      return match?.name || 'none';
    }

    function careerRating() {
      const medals = Object.values(career.medals || {});
      const golds = medals.filter(medal => medal === 'gold').length;
      const silvers = medals.filter(medal => medal === 'silver').length;
      const unlocked = career.achievements.length;
      if (golds >= 5 && unlocked >= 8) return 'RANK SSS';
      if (golds >= 4 && unlocked >= 6) return 'RANK SS';
      if (golds >= 2 && unlocked >= 4) return 'RANK S';
      if (golds + silvers >= 3 || unlocked >= 3) return 'RANK A';
      if (career.totalScore >= 2500) return 'RANK B';
      return 'RANK C';
    }

    function renderAchievementFeed() {
      const feed = document.getElementById('premium-achievement-feed');
      if (!feed) return;
      const latest = achievementDefs
        .filter(def => career.achievements.includes(def.id))
        .slice(-4);
      feed.innerHTML = latest.length
        ? latest.map(def => `<span class="career-badge" title="${def.desc}">${def.label}</span>`).join('')
        : '<span class="career-badge career-badge-muted">等待首枚徽章</span>';
    }

    function medalClass(medal) {
      return ['bronze', 'silver', 'gold'].includes(medal) ? medal : 'none';
    }

    function medalTargetText(game) {
      const rules = medalRules[game] || [];
      const bronze = rules.find(rule => rule.name === 'bronze')?.threshold || 0;
      const silver = rules.find(rule => rule.name === 'silver')?.threshold || 0;
      const gold = rules.find(rule => rule.name === 'gold')?.threshold || 0;
      return `铜 ${bronze} · 银 ${silver} · 金 ${gold}`;
    }

    function nextMedalTarget(game, score) {
      const rules = [...(medalRules[game] || [])].sort((a, b) => a.threshold - b.threshold);
      return rules.find(rule => score < rule.threshold) || null;
    }

    function arcadeCompletionPercent() {
      const medalProgress = careerGameOrder.reduce((sum, game) => {
        const score = Number(career.best?.[game] || 0);
        const medal = medalClass(career.medals?.[game] || medalFor(game, score));
        return sum + (medalRank[medal] || 0);
      }, 0) / (careerGameOrder.length * medalRank.gold);
      const achievementProgress = achievementDefs.length
        ? career.achievements.length / achievementDefs.length
        : 0;
      return Math.round((medalProgress * 0.58 + achievementProgress * 0.42) * 100);
    }

    function earnedMedalCount() {
      return careerGameOrder.filter(game => {
        const score = Number(career.best?.[game] || 0);
        return medalClass(career.medals?.[game] || medalFor(game, score)) !== 'none';
      }).length;
    }

    function masteryStatusForGame(game) {
      const score = Number(career.best?.[game] || 0);
      const medal = medalClass(career.medals?.[game] || medalFor(game, score));
      const rules = [...(medalRules[game] || [])].sort((a, b) => a.threshold - b.threshold);
      const next = nextMedalTarget(game, score);
      const gold = rules.find(rule => rule.name === 'gold') || rules[rules.length - 1] || { name: 'gold', threshold: 1 };
      const target = next || gold;
      const progress = next ? Math.min(100, Math.round(score / Math.max(1, target.threshold) * 100)) : 100;
      const delta = next ? Math.max(0, target.threshold - score) : 0;
      return {
        game,
        label: premiumTabLabels[game] || titles[game] || game,
        score,
        medal,
        targetName: target.name,
        targetLabel: next ? `${medalLabels[target.name] || target.name}牌 ${target.threshold}` : '金牌完成',
        delta,
        progress
      };
    }

    function masteryFocusTarget() {
      return careerGameOrder
        .map(masteryStatusForGame)
        .filter(item => item.delta > 0)
        .sort((a, b) => a.delta - b.delta || b.score - a.score)[0] || null;
    }

    function launchMasteryTarget(game) {
      if (!game) return;
      if (game === 'runner') {
        document.querySelector('.arcade-cabinet-bezel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('已定位到主线远征，冲刺下一枚奖牌', 'info');
        return;
      }
      switchPremiumGame(game);
      stage?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast(`已切换到大师地图目标：${titles[game] || game}`, 'success');
    }

    function renderArcadeMasteryMap() {
      const panel = document.getElementById('premium-mastery-panel');
      const titleEl = document.getElementById('premium-mastery-title');
      const summaryEl = document.getElementById('premium-mastery-summary');
      const grid = document.getElementById('premium-mastery-grid');
      if (!panel || !grid) return;
      const statuses = careerGameOrder.map(masteryStatusForGame);
      const goldCount = statuses.filter(item => item.medal === 'gold').length;
      const medalCount = statuses.filter(item => item.medal !== 'none').length;
      const focus = masteryFocusTarget();
      panel.dataset.complete = focus ? 'false' : 'true';
      if (titleEl) titleEl.textContent = `奖牌路线 ${medalCount}/${careerGameOrder.length} · 金牌 ${goldCount}/${careerGameOrder.length}`;
      if (summaryEl) {
        summaryEl.textContent = focus
          ? `下一突破：${focus.label} 距离 ${focus.targetLabel} 还差 ${focus.delta} 分。`
          : '所有模式已完成金牌目标，接下来就是刷新个人极限。';
      }
      grid.innerHTML = statuses.map(item => `
        <button type="button" class="arcade-mastery-card" data-mastery-game="${escapeHTML(item.game)}" data-medal="${escapeHTML(item.medal)}">
          <div class="arcade-mastery-top">
            <span>${escapeHTML(item.label)}</span>
            <b>${escapeHTML(medalLabels[item.medal] || medalLabels.none)}</b>
          </div>
          <strong>${escapeHTML(String(item.score))}</strong>
          <small>${escapeHTML(item.targetLabel)}${item.delta ? ` · 差 ${escapeHTML(String(item.delta))}` : ''}</small>
          <div class="arcade-mastery-progress" aria-label="${escapeHTML(item.label)} ${item.progress}%">
            <i style="width: ${item.progress}%"></i>
          </div>
          <em>${item.delta ? '锁定突破' : '金牌完成'}</em>
        </button>
      `).join('');
      grid.querySelectorAll('[data-mastery-game]').forEach(btn => {
        btn.addEventListener('click', () => launchMasteryTarget(btn.dataset.masteryGame));
      });
    }

    function formatRunTime(iso) {
      try {
        return new Date(iso).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return '刚刚';
      }
    }

    function runDifficultyLabel(id) {
      return difficultyDefs.find(def => def.id === id)?.short || '标准';
    }

    function runLoadoutLabel(id) {
      return loadoutDefs.find(def => def.id === id)?.label || '脉冲校准';
    }

    function careerRunStats() {
      const runs = Array.isArray(career.runs) ? career.runs : [];
      if (!runs.length) return { runs: [], average: 0, bestMode: '', last: null };
      const average = Math.round(runs.reduce((sum, run) => sum + Number(run.score || 0), 0) / runs.length);
      const best = runs.reduce((top, run) => Number(run.score || 0) > Number(top?.score || 0) ? run : top, runs[0]);
      return {
        runs,
        average,
        bestMode: best?.game || '',
        last: runs[0] || null
      };
    }

    function careerLeaderboard() {
      const runs = Array.isArray(career.runs) ? career.runs : [];
      const entries = careerGameOrder.map((game, index) => {
        const score = Number(career.best?.[game] || 0);
        if (!score) return null;
        const medal = medalClass(career.medals?.[game] || medalFor(game, score));
        const rules = [...(medalRules[game] || [])].sort((a, b) => a.threshold - b.threshold);
        const gold = rules.find(rule => rule.name === 'gold') || rules[rules.length - 1] || { threshold: Math.max(1, score) };
        const next = nextMedalTarget(game, score);
        const progress = Math.min(100, Math.round(score / Math.max(1, gold.threshold) * 100));
        const exactRun = runs.find(run => run?.game === game && Number(run.score || 0) === score) || null;
        const prestige = (medalRank[medal] || 0) * 1000 + Math.min(999, Math.round(score / Math.max(1, gold.threshold) * 1000));
        return {
          game,
          index,
          label: premiumTabLabels[game] || titles[game] || game,
          score,
          medal,
          progress,
          prestige,
          nextLabel: next ? `${medalLabels[next.name] || next.name}牌 ${next.threshold}` : '金牌完成',
          delta: next ? Math.max(0, next.threshold - score) : 0,
          difficulty: exactRun ? runDifficultyLabel(exactRun.difficulty) : '历史',
          loadout: exactRun ? runLoadoutLabel(exactRun.loadout) : '存档纪录',
          at: exactRun?.at || ''
        };
      }).filter(Boolean)
        .sort((a, b) => b.prestige - a.prestige || b.score - a.score || a.index - b.index)
        .map((entry, rank) => ({ ...entry, rank: rank + 1 }));
      const latestBest = runs.find(run => Number(run.score || 0) > Number(run.previousBest || 0)) || null;
      const totalBest = entries.reduce((sum, entry) => sum + entry.score, 0);
      const golds = entries.filter(entry => entry.medal === 'gold').length;
      return {
        entries,
        totalBest,
        golds,
        latestBest: latestBest ? {
          game: latestBest.game,
          label: premiumTabLabels[latestBest.game] || titles[latestBest.game] || latestBest.game,
          score: Number(latestBest.score || 0),
          delta: Math.max(0, Number(latestBest.score || 0) - Number(latestBest.previousBest || 0)),
          at: latestBest.at
        } : null
      };
    }

    function renderArcadeLeaderboard() {
      const panel = document.getElementById('premium-leaderboard-panel');
      const list = document.getElementById('premium-leaderboard-list');
      if (!panel || !list) return;
      const board = careerLeaderboard();
      const titleEl = document.getElementById('premium-leaderboard-title');
      const summaryEl = document.getElementById('premium-leaderboard-summary');
      const totalEl = document.getElementById('premium-leaderboard-total');
      const goldEl = document.getElementById('premium-leaderboard-golds');
      const latestEl = document.getElementById('premium-leaderboard-latest');
      const top = board.entries[0];
      panel.dataset.empty = top ? 'false' : 'true';
      if (titleEl) titleEl.textContent = top ? `#1 ${top.label} · ${top.score}` : '等待个人纪录';
      if (summaryEl) {
        summaryEl.textContent = top
          ? `${medalLabels[top.medal] || medalLabels.none}牌 · ${top.delta ? `下一目标 ${top.nextLabel}，还差 ${top.delta}` : '金牌完成，开始冲击极限分'}。`
          : '完成任意高级街机模式后，个人最高纪录会在这里组成名人堂。';
      }
      if (totalEl) totalEl.textContent = String(board.totalBest);
      if (goldEl) goldEl.textContent = `${board.golds}/${careerGameOrder.length}`;
      if (latestEl) latestEl.textContent = board.latestBest ? `${board.latestBest.label} +${board.latestBest.delta}` : '--';
      list.innerHTML = board.entries.length
        ? board.entries.slice(0, careerGameOrder.length).map(entry => `
          <button type="button" class="arcade-leaderboard-card" data-leaderboard-game="${escapeHTML(entry.game)}" data-medal="${escapeHTML(entry.medal)}">
            <span class="arcade-leaderboard-rank">#${entry.rank}</span>
            <div>
              <strong>${escapeHTML(entry.label)}</strong>
              <small>${escapeHTML(entry.difficulty)} · ${escapeHTML(entry.loadout)}${entry.at ? ` · ${escapeHTML(formatRunTime(entry.at))}` : ''}</small>
            </div>
            <b>${escapeHTML(String(entry.score))}</b>
            <em>${entry.delta ? `${escapeHTML(entry.nextLabel)} · 差 ${escapeHTML(String(entry.delta))}` : '金牌完成 · 刷新极限'}</em>
            <i style="width: ${entry.progress}%"></i>
          </button>
        `).join('')
        : '<div class="arcade-leaderboard-empty">暂无个人纪录。先完成一局高级街机，名人堂会自动点亮。</div>';
      list.querySelectorAll('[data-leaderboard-game]').forEach(btn => {
        btn.addEventListener('click', () => launchMasteryTarget(btn.dataset.leaderboardGame));
      });
    }

    function rivalProfileForGame(game) {
      return rivalProfiles[game] || rivalProfiles.survivor;
    }

    function arcadeRivalIntel() {
      const runs = Array.isArray(career.runs) ? career.runs : [];
      const latest = runs[0] || null;
      const league = leagueSnapshot();
      const focus = masteryFocusTarget();
      const game = latest?.game || league.activeStage?.game || focus?.game || 'survivor';
      const source = latest?.game ? '赛后复仇' : league.activeStage ? '联赛宿敌' : '奖牌猎手';
      const best = Number(career.best?.[game] || 0);
      const next = nextMedalTarget(game, best);
      let target = 0;
      if (latest?.game) {
        target = next?.threshold || Math.max(best + 150, Math.ceil(best * 1.08));
      } else if (league.activeStage?.game === game) {
        target = Number(league.activeStage.target || 0);
      } else {
        target = next?.threshold || Math.max(best + 150, Math.ceil(best * 1.08));
      }
      if (!target) {
        target = (medalRules[game] || []).find(rule => rule.name === 'bronze')?.threshold || 800;
      }
      const profile = rivalProfileForGame(game);
      const gap = Math.max(0, target - best);
      const pressure = best > 0 ? Math.max(100, Math.round(target / Math.max(1, best) * 100)) : 100;
      return {
        game,
        label: premiumTabLabels[game] || titles[game] || game,
        profile: profile.name,
        title: profile.title,
        tone: profile.tone,
        source,
        best,
        target,
        gap,
        pressure,
        complete: gap <= 0,
        tactic: profile.tactic,
        progress: target > 0 ? Math.min(100, Math.round(best / target * 100)) : 0
      };
    }

    function renderArcadeRival() {
      const panel = document.getElementById('premium-rival-panel');
      if (!panel) return;
      const intel = arcadeRivalIntel();
      const titleEl = document.getElementById('premium-rival-title');
      const summaryEl = document.getElementById('premium-rival-summary');
      const targetEl = document.getElementById('premium-rival-target');
      const gapEl = document.getElementById('premium-rival-gap');
      const pressureEl = document.getElementById('premium-rival-pressure');
      const briefEl = document.getElementById('premium-rival-brief');
      const actionBtn = document.getElementById('premium-rival-start');
      panel.dataset.tone = intel.tone;
      panel.dataset.complete = intel.complete ? 'true' : 'false';
      panel.style.setProperty('--rival-progress', `${intel.progress}%`);
      if (titleEl) titleEl.textContent = `${intel.profile} · ${intel.label}`;
      if (summaryEl) summaryEl.textContent = `${intel.title} 正在 ${intel.source} 中压线，目标 ${intel.target}+。`;
      if (targetEl) targetEl.textContent = String(intel.target);
      if (gapEl) gapEl.textContent = intel.gap ? String(intel.gap) : '已压制';
      if (pressureEl) pressureEl.textContent = intel.complete ? 'OVR' : `${intel.pressure}%`;
      if (briefEl) briefEl.textContent = `${intel.tactic} 当前最佳 ${intel.best}，完成后会刷新宿敌目标。`;
      if (actionBtn) {
        actionBtn.dataset.rivalTargetGame = intel.game;
        actionBtn.querySelector('span').textContent = intel.complete ? '刷新宿敌' : `挑战 ${intel.label}`;
      }
    }

    function renderArcadeRunLog() {
      const panel = document.getElementById('premium-run-log-panel');
      const titleEl = document.getElementById('premium-run-log-title');
      const summaryEl = document.getElementById('premium-run-log-summary');
      const lastEl = document.getElementById('premium-run-last-score');
      const bestEl = document.getElementById('premium-run-best-mode');
      const avgEl = document.getElementById('premium-run-average');
      const list = document.getElementById('premium-run-log-list');
      if (!panel || !list) return;
      const stats = careerRunStats();
      const last = stats.last;
      panel.dataset.empty = last ? 'false' : 'true';
      if (titleEl) titleEl.textContent = last ? `${premiumTabLabels[last.game] || titles[last.game] || last.game} · ${last.score}` : '等待首局战报';
      if (summaryEl) {
        summaryEl.textContent = last
          ? `${formatRunTime(last.at)} · ${runDifficultyLabel(last.difficulty)} · ${runLoadoutLabel(last.loadout)} · ${medalLabels[last.medal] || '无'}牌`
          : '完成任意高级街机模式后，这里会记录最近战报、强项模式与平均声望。';
      }
      if (lastEl) lastEl.textContent = last ? String(last.score) : '--';
      if (bestEl) bestEl.textContent = stats.bestMode ? (premiumTabLabels[stats.bestMode] || titles[stats.bestMode] || stats.bestMode) : '--';
      if (avgEl) avgEl.textContent = stats.average ? String(stats.average) : '--';
      list.innerHTML = stats.runs.length
        ? stats.runs.slice(0, 4).map(run => `
          <article class="arcade-run-log-item" data-medal="${escapeHTML(run.medal || 'none')}">
            <div>
              <strong>${escapeHTML(premiumTabLabels[run.game] || titles[run.game] || run.game)}</strong>
              <small>${escapeHTML(formatRunTime(run.at))} · ${escapeHTML(runDifficultyLabel(run.difficulty))} · ${escapeHTML(runLoadoutLabel(run.loadout))}</small>
            </div>
            <span>${escapeHTML(String(run.score || 0))}</span>
          </article>
        `).join('')
        : '<div class="arcade-run-empty">暂无战报。完成一局高级街机后会自动生成复盘记录。</div>';
    }

    function preferredCoachLoadout(game) {
      const map = {
        survivor: 'overdrive',
        boss: 'aegis',
        drift: 'overdrive',
        heist: 'strategist',
        chain: 'strategist',
        tactics: 'strategist',
        runner: 'pulse'
      };
      const preferred = loadoutDefs.find(def => def.id === map[game] && loadoutUnlocked(def));
      return preferred || activeLoadoutDef();
    }

    function preferredCoachDifficulty(run, status) {
      const bronze = (medalRules[run.game] || []).find(rule => rule.name === 'bronze')?.threshold || 0;
      if (bronze && run.score < bronze * 0.78) return difficultyDefs.find(def => def.id === 'training') || activeDifficultyDef();
      if (status.medal === 'gold') return difficultyDefs.find(def => def.id === 'nightmare') || activeDifficultyDef();
      if (status.medal !== 'none') return difficultyDefs.find(def => def.id === 'elite') || activeDifficultyDef();
      return activeDifficultyDef();
    }

    function coachFocusCopy(game) {
      const copy = {
        survivor: '优先清精英赏金，留 Space 超载处理陨雨与精英跃迁。',
        boss: '练擦弹攒专注，等弱点窗口再冲刺贴近破招。',
        drift: '保留 Q 相位刹车给高热度路段，连续 PERFECT 门能快速拉开劲敌。',
        heist: '先扫路线再拿缓存，诱饵留给摄像头与守卫交叉区。',
        chain: '先看提示预览，优先做 9 连与配方颜色，催化留给超载大团。',
        tactics: '沿推荐路线吃掩体动量，爆破窗口优先打断锁定单位。',
        runner: '先拿水晶与信标，冲刺留给连段窗口和航线合约。'
      };
      return copy[game] || '保持节奏，围绕下一枚奖牌目标打一局。';
    }

    function latestRunCoach() {
      const run = Array.isArray(career.runs) ? career.runs[0] : null;
      if (!run) return null;
      const status = masteryStatusForGame(run.game);
      const difficulty = preferredCoachDifficulty(run, status);
      const loadout = preferredCoachLoadout(run.game);
      const improved = Number(run.score || 0) > Number(run.previousBest || 0);
      const deltaText = improved
        ? `+${Math.max(0, Number(run.score || 0) - Number(run.previousBest || 0))}`
        : '保持纪录';
      return {
        game: run.game,
        gameLabel: premiumTabLabels[run.game] || titles[run.game] || run.game,
        score: Number(run.score || 0),
        medal: run.medal || 'none',
        medalLabel: medalLabels[run.medal] || medalLabels.none,
        improved,
        deltaText,
        previousBest: Number(run.previousBest || 0),
        targetLabel: status.delta > 0 ? `${status.targetLabel} 差 ${status.delta}` : '金牌完成，刷新极限',
        summary: coachFocusCopy(run.game),
        difficulty: difficulty.id,
        difficultyLabel: difficulty.short,
        loadout: loadout.id,
        loadoutLabel: loadout.label
      };
    }

    function renderArcadeCoach() {
      const panel = document.getElementById('premium-run-coach-panel');
      if (!panel) return;
      const coach = latestRunCoach();
      const titleEl = document.getElementById('premium-coach-title');
      const summaryEl = document.getElementById('premium-coach-summary');
      const medalEl = document.getElementById('premium-coach-medal');
      const deltaEl = document.getElementById('premium-coach-delta');
      const targetEl = document.getElementById('premium-coach-target');
      const launchBtn = document.getElementById('premium-coach-launch');
      const difficultyBtn = document.getElementById('premium-coach-difficulty');
      const loadoutBtn = document.getElementById('premium-coach-loadout');
      panel.dataset.empty = coach ? 'false' : 'true';

      if (!coach) {
        delete panel.dataset.medal;
        if (titleEl) titleEl.textContent = '等待赛后复盘';
        if (summaryEl) summaryEl.textContent = '完成一局后，系统会根据奖牌、纪录和装备推荐下一把训练目标。';
        if (medalEl) medalEl.textContent = '--';
        if (deltaEl) deltaEl.textContent = '--';
        if (targetEl) targetEl.textContent = '--';
        return;
      }

      panel.dataset.medal = coach.medal;
      if (titleEl) titleEl.textContent = `${coach.gameLabel} · ${coach.score}`;
      if (summaryEl) summaryEl.textContent = coach.summary;
      if (medalEl) medalEl.textContent = `${coach.medalLabel}牌`;
      if (deltaEl) deltaEl.textContent = coach.deltaText;
      if (targetEl) targetEl.textContent = coach.targetLabel;
      if (launchBtn) {
        launchBtn.dataset.coachTargetGame = coach.game;
        launchBtn.querySelector('span').textContent = coach.game === 'runner' ? '前往主线复盘' : `再战 ${coach.gameLabel}`;
      }
      if (difficultyBtn) {
        difficultyBtn.dataset.coachDifficulty = coach.difficulty;
        difficultyBtn.querySelector('span').textContent = `推荐难度：${coach.difficultyLabel}`;
      }
      if (loadoutBtn) {
        loadoutBtn.dataset.coachLoadout = coach.loadout;
        loadoutBtn.querySelector('span').textContent = `推荐芯片：${coach.loadoutLabel}`;
      }
    }

    function loadoutUnlocked(def) {
      try {
        return !!def.unlock();
      } catch {
        return def.id === 'pulse';
      }
    }

    function activeLoadoutDef() {
      const current = loadoutDefs.find(def => def.id === career.loadout?.active && loadoutUnlocked(def));
      return current || loadoutDefs[0];
    }

    function loadoutBonuses() {
      return { ...(activeLoadoutDef().bonuses || {}) };
    }

    function setActiveLoadout(id) {
      const target = loadoutDefs.find(def => def.id === id);
      if (!target || !loadoutUnlocked(target)) {
        showToast('该战术芯片尚未解锁', 'warning');
        return;
      }
      career.loadout = { active: target.id };
      saveCareer();
      updateCareerPanel();
      showToast(`已装备战术芯片：${target.label}`, 'success');
    }

    function renderArcadeLoadouts() {
      const panel = document.getElementById('premium-loadout-panel');
      const list = document.getElementById('premium-loadout-list');
      const activeEl = document.getElementById('premium-loadout-active');
      const summaryEl = document.getElementById('premium-loadout-summary');
      if (!panel || !list) return;
      const active = activeLoadoutDef();
      if (career.loadout?.active !== active.id) {
        career.loadout = { active: active.id };
        saveCareer();
      }
      panel.dataset.tone = active.tone;
      if (activeEl) activeEl.textContent = active.label;
      if (summaryEl) summaryEl.textContent = active.summary;
      list.innerHTML = loadoutDefs.map(def => {
        const unlocked = loadoutUnlocked(def);
        const equipped = active.id === def.id;
        return `
          <button type="button" class="arcade-loadout-card ${equipped ? 'is-equipped' : ''}" data-loadout-id="${escapeHTML(def.id)}" data-tone="${escapeHTML(def.tone)}" ${unlocked ? '' : 'disabled'} aria-pressed="${equipped ? 'true' : 'false'}">
            <span>${unlocked ? (equipped ? '已装备' : '可装备') : '未解锁'}</span>
            <strong>${escapeHTML(def.label)}</strong>
            <small>${escapeHTML(unlocked ? def.summary : def.requirement)}</small>
            <em>${def.perks.map(perk => escapeHTML(perk)).join(' · ')}</em>
          </button>
        `;
      }).join('');
      list.querySelectorAll('[data-loadout-id]').forEach(btn => {
        btn.addEventListener('click', () => setActiveLoadout(btn.dataset.loadoutId));
      });
    }

    function activeDifficultyDef() {
      return difficultyDefs.find(def => def.id === career.difficulty) || difficultyDefs.find(def => def.id === 'standard') || difficultyDefs[0];
    }

    function difficultyTuning() {
      return { ...(activeDifficultyDef().tuning || {}) };
    }

    function setArcadeDifficulty(id) {
      const target = difficultyDefs.find(def => def.id === id);
      if (!target) return;
      career.difficulty = target.id;
      saveCareer();
      updateCareerPanel();
      showToast(`已切换难度：${target.label}`, 'success');
    }

    function renderArcadeDifficulty() {
      const panel = document.getElementById('premium-difficulty-panel');
      const list = document.getElementById('premium-difficulty-list');
      const activeEl = document.getElementById('premium-difficulty-active');
      const summaryEl = document.getElementById('premium-difficulty-summary');
      if (!panel || !list) return;
      const active = activeDifficultyDef();
      if (career.difficulty !== active.id) {
        career.difficulty = active.id;
        saveCareer();
      }
      panel.dataset.tone = active.tone;
      if (activeEl) activeEl.textContent = active.label;
      if (summaryEl) summaryEl.textContent = active.summary;
      list.innerHTML = difficultyDefs.map(def => {
        const selected = active.id === def.id;
        const scorePercent = Math.round(def.scoreBoost * 100);
        const scoreLabel = scorePercent > 0 ? `+${scorePercent}%` : `${scorePercent}%`;
        return `
          <button type="button" class="arcade-difficulty-card ${selected ? 'is-selected' : ''}" data-difficulty-id="${escapeHTML(def.id)}" data-tone="${escapeHTML(def.tone)}" aria-pressed="${selected ? 'true' : 'false'}">
            <span>${selected ? '当前协议' : '切换协议'}</span>
            <strong>${escapeHTML(def.short)}</strong>
            <small>${escapeHTML(def.summary)}</small>
            <em>敌压 x${def.pressure.toFixed(2)} · 声望 ${scoreLabel}</em>
          </button>
        `;
      }).join('');
      list.querySelectorAll('[data-difficulty-id]').forEach(btn => {
        btn.addEventListener('click', () => setArcadeDifficulty(btn.dataset.difficultyId));
      });
    }

    function contractTargetValue(contract) {
      return contract.type === 'score_pool' ? contract.target : contract.targetCount;
    }

    function contractProgressValue(contract) {
      const entry = contractProgressEntry(contract.id);
      if (contract.type === 'score_pool') {
        return Math.min(contract.target, Math.max(0, Number(entry.value || 0)));
      }
      return Math.min(contract.targetCount, Object.keys(entry.games || {}).length);
    }

    function contractProgressLabel(contract) {
      const progress = contractProgressValue(contract);
      const target = contractTargetValue(contract);
      return contract.type === 'score_pool'
        ? `${progress}/${target}`
        : `${progress}/${target}`;
    }

    function renderArcadeContracts() {
      const list = document.getElementById('premium-contract-list');
      if (!list) return;
      const state = ensureContractsForToday();
      list.innerHTML = getDailyContracts().map(contract => {
        const progress = contractProgressValue(contract);
        const target = contractTargetValue(contract);
        const complete = progress >= target;
        const claimed = state.claimed.includes(contract.id);
        const percent = target > 0 ? Math.min(100, Math.round(progress / target * 100)) : 0;
        return `
          <article class="arcade-contract-card ${claimed ? 'is-complete' : ''}" data-contract-id="${escapeHTML(contract.id)}" data-tone="${escapeHTML(contract.tone)}">
            <div class="arcade-contract-top">
              <span>${claimed ? '已结算' : complete ? '待结算' : '进行中'}</span>
              <b>+${Number(contract.reward || 0)}</b>
            </div>
            <strong>${escapeHTML(contract.title)}</strong>
            <small>${escapeHTML(contract.desc)}</small>
            <div class="arcade-contract-progress" aria-label="${escapeHTML(contract.title)} ${contractProgressLabel(contract)}">
              <span><i style="width: ${percent}%"></i></span>
              <b>${escapeHTML(contractProgressLabel(contract))}</b>
            </div>
          </article>
        `;
      }).join('');
    }

    function leagueSnapshot() {
      const state = ensureLeagueForToday();
      const route = getDailyLeagueRoute(state.date);
      const stageIndex = Math.max(0, Math.min(route.stages.length, Number(state.stageIndex || 0)));
      const completed = !!state.completed || stageIndex >= route.stages.length;
      const stages = route.stages.map((stage, index) => {
        const done = completed || index < stageIndex;
        return {
          ...stage,
          label: premiumTabLabels[stage.game] || titles[stage.game] || stage.game,
          best: Number(career.best?.[stage.game] || 0),
          score: Number(state.stageScores?.[stage.id] || 0),
          state: done ? 'complete' : index === stageIndex ? 'active' : 'locked'
        };
      });
      const completedCount = completed ? route.stages.length : stageIndex;
      return {
        id: route.id,
        title: route.title,
        summary: route.summary,
        reward: route.reward,
        date: route.date,
        stageIndex,
        completed,
        progressText: `${completedCount}/${route.stages.length}`,
        activeStage: completed ? null : stages[stageIndex],
        stages
      };
    }

    function renderArcadeLeague() {
      const panel = document.getElementById('premium-league-panel');
      const routeEl = document.getElementById('premium-league-route');
      if (!panel || !routeEl) return;
      const league = leagueSnapshot();
      const titleEl = document.getElementById('premium-league-title');
      const summaryEl = document.getElementById('premium-league-summary');
      const progressEl = document.getElementById('premium-league-progress');
      const rewardEl = document.getElementById('premium-league-reward');
      const actionBtn = document.getElementById('premium-league-start');
      panel.dataset.complete = league.completed ? 'true' : 'false';
      if (titleEl) titleEl.textContent = league.completed ? `${league.title} · 已夺冠` : league.title;
      if (summaryEl) {
        summaryEl.textContent = league.completed
          ? `整条路线已完成，+${league.reward} 联赛声望已结算。`
          : `${league.summary} 当前目标：${league.activeStage?.label || '赛季完成'} ${league.activeStage?.target || ''}+。`;
      }
      if (progressEl) progressEl.textContent = league.progressText;
      if (rewardEl) rewardEl.textContent = `+${league.reward}`;
      if (actionBtn) {
        const target = league.activeStage?.game || masteryFocusTarget()?.game || 'survivor';
        actionBtn.dataset.leagueTargetGame = target;
        actionBtn.querySelector('span').textContent = league.completed ? '继续刷新纪录' : `挑战 ${league.activeStage?.label || '下一阶段'}`;
      }
      routeEl.innerHTML = league.stages.map((stage, index) => `
        <article class="arcade-league-stage" data-state="${escapeHTML(stage.state)}">
          <span>${index + 1}</span>
          <div>
            <strong>${escapeHTML(stage.label)}</strong>
            <small>${escapeHTML(stage.tip)} · 目标 ${escapeHTML(String(stage.target))}+</small>
          </div>
          <b>${stage.state === 'complete' ? 'DONE' : stage.state === 'active' ? 'LIVE' : 'LOCK'}</b>
        </article>
      `).join('');
    }

    function updateArcadeLeague(game, score, details = {}) {
      const state = ensureLeagueForToday();
      const route = getDailyLeagueRoute(state.date);
      if (state.completed) return { advanced: false, completed: true, details };
      const stage = route.stages[Math.max(0, Math.min(route.stages.length - 1, Number(state.stageIndex || 0)))];
      if (!stage) return { advanced: false, completed: true, details };
      if (stage.game === game) {
        state.stageScores[stage.id] = Math.max(Number(state.stageScores[stage.id] || 0), Number(score || 0));
      }
      if (stage.game !== game || Number(score || 0) < Number(stage.target || 0)) {
        return { advanced: false, completed: false, details };
      }
      state.stageIndex = Math.min(route.stages.length, Number(state.stageIndex || 0) + 1);
      if (state.stageIndex >= route.stages.length) {
        state.completed = true;
        if (!state.rewarded) {
          state.rewarded = true;
          career.totalScore = Math.max(0, Number(career.totalScore || 0) + Number(route.reward || 0));
          unlockAchievement('league_clear');
          showToast(`联赛夺冠：${route.title} +${route.reward}`, 'success');
        }
      } else {
        const next = route.stages[state.stageIndex];
        showToast(`联赛推进：下一站 ${premiumTabLabels[next.game] || titles[next.game] || next.game}`, 'success');
      }
      return { advanced: true, completed: !!state.completed, details };
    }

    function updateArcadeContracts(game, score, details = {}) {
      const state = ensureContractsForToday();
      const completed = [];
      getDailyContracts().forEach(contract => {
        const entry = contractProgressEntry(contract.id);
        const beforeComplete = contractProgressValue(contract) >= contractTargetValue(contract);
        if (contract.type === 'score_pool') {
          entry.value = Math.max(0, Number(entry.value || 0) + score);
        } else if (contract.type === 'distinct_modes') {
          entry.games[game] = true;
        } else if (contract.type === 'medal_result') {
          if (medalFor(game, score) !== 'none') entry.games[game] = true;
        } else if (contract.type === 'target_games') {
          const targetScore = Number(contract.scoreTarget || 0);
          if ((contract.games || []).includes(game) && score >= targetScore) {
            entry.games[game] = true;
          }
        }
        const nowComplete = contractProgressValue(contract) >= contractTargetValue(contract);
        if (!beforeComplete && nowComplete && !state.claimed.includes(contract.id)) {
          state.claimed.push(contract.id);
          career.totalScore = Math.max(0, (career.totalScore || 0) + Number(contract.reward || 0));
          completed.push(contract);
        }
      });
      if (completed.length) {
        unlockAchievement('contract_clear');
        showToast(`契约完成：${completed.map(contract => contract.title).join('、')}`, 'success');
      }
      return { completed, details };
    }

    function arcadeDirective() {
      const daily = getDailyChallenge();
      const dailyDone = career.daily?.date === daily.date && career.daily?.id === daily.id;
      if (!dailyDone) {
        return {
          game: daily.game,
          tone: 'daily',
          title: `今日挑战 · ${daily.label}`,
          reason: '限定挑战尚未完成，优先拿下今日徽章与额外声望。'
        };
      }

      const league = leagueSnapshot();
      if (league.activeStage) {
        return {
          game: league.activeStage.game,
          tone: 'league',
          title: `联赛阶段 ${league.stageIndex + 1} · ${league.activeStage.label}`,
          reason: `${league.title} 正在推进，当前目标 ${league.activeStage.target}+。`
        };
      }

      const medalTarget = careerGameOrder
        .map(game => {
          const score = Number(career.best?.[game] || 0);
          const medal = medalClass(career.medals?.[game] || medalFor(game, score));
          return { game, score, medal, target: nextMedalTarget(game, score) };
        })
        .filter(item => item.target)
        .sort((a, b) => (a.target.threshold - a.score) - (b.target.threshold - b.score))[0];
      if (medalTarget) {
        return {
          game: medalTarget.game,
          tone: 'medal',
          title: `奖牌补完 · ${titles[medalTarget.game]}`,
          reason: `距离${medalLabels[medalTarget.target.name]}牌还差 ${Math.max(0, medalTarget.target.threshold - medalTarget.score)} 分。`
        };
      }

      const lowestBest = careerGameOrder
        .map(game => ({ game, score: Number(career.best?.[game] || 0) }))
        .sort((a, b) => a.score - b.score)[0];
      return {
        game: lowestBest?.game || 'survivor',
        tone: 'mastery',
        title: `大师循环 · ${titles[lowestBest?.game || 'survivor']}`,
        reason: '全部奖牌目标已达成，继续刷新最低项目的个人纪录。'
      };
    }

    function renderArcadeDirector() {
      const panel = document.getElementById('premium-arcade-director');
      if (!panel) return;
      const directive = arcadeDirective();
      const medalCount = careerGameOrder.filter(game => {
        const score = Number(career.best?.[game] || 0);
        return medalClass(career.medals?.[game] || medalFor(game, score)) !== 'none';
      }).length;
      const titleEl = document.getElementById('premium-director-title');
      const reasonEl = document.getElementById('premium-director-reason');
      const medalEl = document.getElementById('premium-director-medals');
      const achievementEl = document.getElementById('premium-director-achievements');
      const completionEl = document.getElementById('premium-director-completion');
      const actionBtn = document.getElementById('premium-director-start');
      panel.dataset.tone = directive.tone;
      if (titleEl) titleEl.textContent = directive.title;
      if (reasonEl) reasonEl.textContent = directive.reason;
      if (medalEl) medalEl.textContent = `${medalCount}/${careerGameOrder.length}`;
      if (achievementEl) achievementEl.textContent = `${career.achievements.length}/${achievementDefs.length}`;
      if (completionEl) completionEl.textContent = `${arcadeCompletionPercent()}%`;
      if (actionBtn) {
        actionBtn.dataset.targetGame = directive.game;
        actionBtn.querySelector('span').textContent = directive.game === 'runner' ? '前往主线远征' : '进入推荐挑战';
      }
    }

    function updatePremiumTabBadges() {
      library.querySelectorAll('[data-premium-game]').forEach(btn => {
        const game = btn.dataset.premiumGame;
        const score = Number(career.best?.[game] || 0);
        const medal = medalClass(career.medals?.[game] || medalFor(game, score));
        btn.innerHTML = `
          <span>${escapeHTML(premiumTabLabels[game] || titles[game] || game)}</span>
          <small class="mini-game-medal-chip medal-${escapeHTML(medal)}">${escapeHTML(medalLabels[medal] || medalLabels.none)}</small>
        `;
      });
      safeCreateIcons();
    }

    function renderCareerDialog() {
      const summary = document.getElementById('premium-career-summary');
      const dailyEl = document.getElementById('premium-career-dialog-daily');
      const medalsEl = document.getElementById('premium-career-medals');
      const achievementsEl = document.getElementById('premium-career-achievements');
      const daily = getDailyChallenge();
      const completedDaily = career.daily?.date === daily.date && career.daily?.id === daily.id;
      const unlockedCount = career.achievements.length;
      const difficulty = activeDifficultyDef();

      if (summary) {
        summary.textContent = `${careerRating()} · 总声望 ${career.totalScore || 0} · 难度 ${difficulty.short} · 已解锁 ${unlockedCount}/${achievementDefs.length} 项成就`;
      }
      if (dailyEl) {
        dailyEl.innerHTML = `
          <span>今日挑战</span>
          <strong>${escapeHTML(daily.label)}</strong>
          <small>${completedDaily ? '已完成，限定徽章已入库' : '完成后解锁「今日制霸」并计入生涯声望'}</small>
        `;
        dailyEl.classList.toggle('is-complete', completedDaily);
      }
      if (medalsEl) {
        medalsEl.innerHTML = careerGameOrder.map(game => {
          const score = Number(career.best?.[game] || 0);
          const medal = medalClass(career.medals?.[game] || medalFor(game, score));
          return `
            <article class="career-medal-card career-medal-${medal}">
              <div>
                <span>${escapeHTML(titles[game] || game)}</span>
                <strong>${score}</strong>
              </div>
              <b>${escapeHTML(medalLabels[medal] || medalLabels.none)}</b>
              <small>${escapeHTML(medalTargetText(game))}</small>
            </article>
          `;
        }).join('');
      }
      if (achievementsEl) {
        achievementsEl.innerHTML = achievementDefs.map(def => {
          const unlocked = career.achievements.includes(def.id);
          return `
            <span class="career-achievement ${unlocked ? 'is-unlocked' : 'is-locked'}" title="${escapeHTML(def.desc)}">
              <b>${escapeHTML(def.label)}</b>
              <small>${escapeHTML(unlocked ? '已解锁' : def.desc)}</small>
            </span>
          `;
        }).join('');
      }
    }

    function updateCareerPanel() {
      const ratingEl = document.getElementById('premium-career-rating');
      const totalEl = document.getElementById('premium-career-total');
      const challengeEl = document.getElementById('premium-daily-challenge');
      const dailyStatusEl = document.getElementById('premium-daily-status');
      const daily = getDailyChallenge();
      if (ratingEl) ratingEl.textContent = careerRating();
      if (totalEl) {
        const medals = Object.entries(career.medals || {})
          .map(([game, medal]) => `${titles[game] || game}: ${medalLabels[medal] || medal}`)
          .join(' · ');
        totalEl.textContent = `总声望 ${career.totalScore || 0} · 难度 ${activeDifficultyDef().short}${medals ? ` · ${medals}` : ''}`;
      }
      if (challengeEl) challengeEl.textContent = daily.label;
      if (dailyStatusEl) {
        dailyStatusEl.textContent = career.daily?.date === daily.date && career.daily?.id === daily.id
          ? '今日挑战已完成'
          : '完成后解锁限定徽章';
      }
      renderAchievementFeed();
      renderArcadeRunLog();
      renderArcadeLeaderboard();
      renderArcadeRival();
      renderArcadeCoach();
      renderArcadeDirector();
      renderArcadeMasteryMap();
      renderArcadeContracts();
      renderArcadeLeague();
      renderArcadeDifficulty();
      renderArcadeLoadouts();
      updatePremiumTabBadges();
      renderCareerDialog();
    }

    function unlockAchievement(id) {
      if (!id || career.achievements.includes(id)) return false;
      career.achievements.push(id);
      saveCareer();
      updateCareerPanel();
      return true;
    }

    function recordPremiumResult(game, score, details = {}) {
      const rawValue = Math.max(0, Math.floor(score || 0));
      const difficulty = activeDifficultyDef();
      const loadout = activeLoadoutDef();
      const scoreBoost = Number(loadoutBonuses().scoreBoost || 0) + Number(difficulty.scoreBoost || 0);
      const value = Math.max(0, Math.floor(rawValue * (1 + scoreBoost)));
      career.totalScore = Math.max(0, (career.totalScore || 0) + value);
      career.plays = (career.plays || 0) + 1;
      const previousBest = Number(career.best[game] || 0);
      const previousMedal = medalClass(career.medals[game] || medalFor(game, previousBest));
      career.best[game] = Math.max(Number(career.best[game] || 0), value);
      const medal = medalFor(game, value);
      if ((medalRank[medal] || 0) > (medalRank[career.medals[game] || 'none'] || 0)) {
        career.medals[game] = medal;
      }
      career.runs = [
        {
          id: `${Date.now()}-${game}`,
          at: new Date().toISOString(),
          game,
          rawScore: rawValue,
          score: value,
          medal,
          previousBest,
          previousMedal,
          difficulty: difficulty.id,
          loadout: loadout.id
        },
        ...(Array.isArray(career.runs) ? career.runs : [])
      ].slice(0, 12);
      const daily = getDailyChallenge();
      if ((!career.daily || career.daily.date !== daily.date || career.daily.id !== daily.id) && daily.check(game, value, { ...details, rawScore: rawValue, loadout: loadout.id, difficulty: difficulty.id })) {
        career.daily = { date: daily.date, id: daily.id, done: true };
        unlockAchievement('daily_clear');
      }
      updateArcadeContracts(game, value, { ...details, rawScore: rawValue, loadout: loadout.id, difficulty: difficulty.id });
      updateArcadeLeague(game, value, { ...details, rawScore: rawValue, loadout: loadout.id, difficulty: difficulty.id });
      saveCareer();
      updateCareerPanel();
    }

    window.atherixArcadeCareer = {
      recordResult: recordPremiumResult,
      unlock: unlockAchievement,
      update: updateCareerPanel,
      loadout: () => ({
        active: activeLoadoutDef().id,
        label: activeLoadoutDef().label,
        bonuses: loadoutBonuses(),
        unlocked: loadoutDefs.filter(loadoutUnlocked).map(def => def.id)
      }),
      equipLoadout: setActiveLoadout,
      difficulty: () => ({
        active: activeDifficultyDef().id,
        label: activeDifficultyDef().label,
        scoreBoost: activeDifficultyDef().scoreBoost,
        pressure: activeDifficultyDef().pressure,
        tuning: difficultyTuning()
      }),
      setDifficulty: setArcadeDifficulty,
      mastery: () => careerGameOrder.map(masteryStatusForGame),
      leaderboard: () => careerLeaderboard(),
      rival: () => arcadeRivalIntel(),
      runs: () => (Array.isArray(career.runs) ? career.runs : []).map(run => ({ ...run })),
      coach: () => latestRunCoach(),
      league: () => leagueSnapshot(),
      contracts: () => getDailyContracts().map(contract => ({
        id: contract.id,
        title: contract.title,
        progress: contractProgressValue(contract),
        target: contractTargetValue(contract),
        claimed: ensureContractsForToday().claimed.includes(contract.id)
      }))
    };
    document.addEventListener('atherix:vault-imported', () => {
      career = loadCareer();
      ensureContractsForToday();
      ensureLeagueForToday();
      updateCareerPanel();
    });
    updateCareerPanel();

    const careerDialog = document.getElementById('premium-career-dialog');
    const careerOpenBtn = document.getElementById('premium-career-open');
    const careerCloseBtn = document.getElementById('premium-career-close');

    function setCareerDialogOpen(open) {
      if (!careerDialog) return;
      renderCareerDialog();
      careerDialog.classList.toggle('active', open);
      careerDialog.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) {
        careerCloseBtn?.focus({ preventScroll: true });
      } else {
        careerOpenBtn?.focus({ preventScroll: true });
      }
    }

    if (careerOpenBtn) {
      careerOpenBtn.addEventListener('click', () => setCareerDialogOpen(true));
    }
    if (careerCloseBtn) {
      careerCloseBtn.addEventListener('click', () => setCareerDialogOpen(false));
    }
    if (careerDialog) {
      careerDialog.addEventListener('click', (event) => {
        if (event.target === careerDialog) setCareerDialogOpen(false);
      });
    }
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && careerDialog?.classList.contains('active')) {
        event.preventDefault();
        setCareerDialogOpen(false);
      }
    });

    function focusStage() {
      if (stage) stage.focus({ preventScroll: true });
    }

    function clearPremiumKeys() {
      Object.keys(premiumKeys).forEach(key => {
        premiumKeys[key] = false;
      });
    }

    function pauseRealtimePremiumGamesExcept(name) {
      if (name !== 'survivor' && survivor.running && !survivor.paused) toggleSurvivorPause(true);
      if (name !== 'boss' && bossMode.running && !bossMode.paused) toggleBossPause(true);
      if (name !== 'drift' && drift.running && !drift.paused) toggleDriftPause(true);
    }

    function switchPremiumGame(name) {
      premiumActive = name;
      pauseRealtimePremiumGamesExcept(name);
      clearPremiumKeys();
      library.querySelectorAll('[data-premium-game]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.premiumGame === name);
      });
      library.querySelectorAll('.mini-game-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `premium-${name}`);
      });
      if (title) title.textContent = titles[name];
      if (name === 'tactics') drawTactics();
      if (name === 'drift') drawDrift();
      focusStage();
    }

    function launchDirectorChallenge() {
      const target = document.getElementById('premium-director-start')?.dataset.targetGame || arcadeDirective().game;
      if (target === 'runner') {
        document.querySelector('.arcade-cabinet-bezel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('已定位到主线远征，请按 Enter 或 START 开始挑战', 'info');
        return;
      }
      switchPremiumGame(target);
      showToast(`已锁定推荐挑战：${titles[target] || target}`, 'success');
    }

    function launchLeagueStage() {
      const league = leagueSnapshot();
      const target = document.getElementById('premium-league-start')?.dataset.leagueTargetGame || league.activeStage?.game;
      if (!target) return;
      if (target === 'runner') {
        document.querySelector('.arcade-cabinet-bezel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('已定位到联赛主线阶段', 'info');
        return;
      }
      switchPremiumGame(target);
      stage?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast(`已进入联赛阶段：${titles[target] || target}`, 'success');
    }

    function launchRivalChallenge() {
      const intel = arcadeRivalIntel();
      launchMasteryTarget(intel.game);
      showToast(`宿敌挑战：${intel.profile} · ${intel.label} ${intel.target}+`, 'info');
    }

    document.getElementById('premium-director-start')?.addEventListener('click', launchDirectorChallenge);
    document.getElementById('premium-league-start')?.addEventListener('click', launchLeagueStage);
    document.getElementById('premium-rival-start')?.addEventListener('click', launchRivalChallenge);
    document.getElementById('premium-coach-launch')?.addEventListener('click', () => {
      const target = document.getElementById('premium-coach-launch')?.dataset.coachTargetGame || latestRunCoach()?.game;
      if (!target) return;
      if (target === 'runner') {
        document.querySelector('.arcade-cabinet-bezel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('已定位到主线复盘目标', 'info');
        return;
      }
      switchPremiumGame(target);
      showToast(`已进入复盘目标：${titles[target] || target}`, 'success');
    });
    document.getElementById('premium-coach-difficulty')?.addEventListener('click', () => {
      setArcadeDifficulty(document.getElementById('premium-coach-difficulty')?.dataset.coachDifficulty);
    });
    document.getElementById('premium-coach-loadout')?.addEventListener('click', () => {
      setActiveLoadout(document.getElementById('premium-coach-loadout')?.dataset.coachLoadout);
    });

    library.querySelectorAll('[data-premium-game]').forEach(btn => {
      btn.addEventListener('click', () => switchPremiumGame(btn.dataset.premiumGame));
    });

    function applyPremiumControl(control, pressed) {
      if (pressed && premiumActive === 'survivor' && survivor.draftOpen && control === 'action') {
        selectSurvivorUpgrade(survivor.draftChoices[0]?.id);
        return;
      }
      if (control === 'up') premiumKeys.up = pressed;
      if (control === 'down') premiumKeys.down = pressed;
      if (control === 'left') premiumKeys.left = pressed;
      if (control === 'right') premiumKeys.right = pressed;
      if (control === 'action') premiumKeys.action = pressed;
      if (control === 'tool') premiumKeys.tool = pressed;
      if (pressed && premiumActive === 'heist') {
        if (control === 'up') moveHeist(0, -1);
        if (control === 'down') moveHeist(0, 1);
        if (control === 'left') moveHeist(-1, 0);
        if (control === 'right') moveHeist(1, 0);
        if (control === 'action') triggerHeistCloak();
        if (control === 'tool') triggerHeistDecoy();
      }
      if (pressed && premiumActive === 'tactics') {
        if (control === 'up') moveTactics(0, -1);
        if (control === 'down') moveTactics(0, 1);
        if (control === 'left') moveTactics(-1, 0);
        if (control === 'right') moveTactics(1, 0);
        if (control === 'action') triggerTacticsAction();
      }
      if (pressed && premiumActive === 'drift' && control === 'tool') {
        triggerDriftPhaseBrake();
      }
    }

    library.querySelectorAll('[data-premium-control]').forEach(btn => {
      const control = btn.dataset.premiumControl;
      const press = (event) => {
        event.preventDefault();
        focusStage();
        applyPremiumControl(control, true);
      };
      const release = (event) => {
        event.preventDefault();
        applyPremiumControl(control, false);
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('pointercancel', release);
    });

    function drawGrid(ctx, w, h, color, gap = 28) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function overlay(ctx, w, h, headline, subline) {
      ctx.save();
      ctx.fillStyle = 'rgba(5, 8, 22, 0.76)';
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = '800 26px Outfit, sans-serif';
      ctx.fillText(headline, w / 2, h / 2 - 8);
      ctx.fillStyle = '#A78BFA';
      ctx.font = '700 13px Inter, sans-serif';
      ctx.fillText(subline, w / 2, h / 2 + 24);
      ctx.restore();
    }

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const pick = (items) => items[Math.floor(Math.random() * items.length)];

    const survivor = {
      canvas: document.getElementById('premium-survivor-canvas'),
      ctx: document.getElementById('premium-survivor-canvas')?.getContext('2d'),
      bestKey: 'atherix_premium_survivor_best',
      running: false,
      paused: false,
      raf: null,
      last: 0,
      elapsed: 0,
      spawn: 0,
      shot: 0,
      score: 0,
      chain: 0,
      chainTimer: 0,
      bestChain: 0,
      overdrive: 0,
      overdriveFlash: 0,
      overdriveText: 'SYNC',
      player: null,
      enemies: [],
      bullets: [],
      orbs: [],
      pickups: [],
      hazards: [],
      particles: [],
      draftOpen: false,
      draftChoices: [],
      anomaly: null,
      anomalyCooldown: 0,
      anomalyCount: 0,
      bountyIndex: 0,
      bountyProgress: 0,
      bountiesCompleted: 0,
      bountyFlash: 0,
      lastBounty: ''
    };

    const survivorAnomalyDefs = {
      meteor: { label: '裂隙陨雨', short: 'METEOR', color: '#F97316', duration: 5600 },
      cache: { label: '补给裂隙', short: 'CACHE', color: '#34D399', duration: 4200 },
      nemesis: { label: '精英跃迁', short: 'NEMESIS', color: '#A78BFA', duration: 6200 }
    };

    const survivorBountyDefs = [
      { id: 'elite', label: 'ELITE', target: 2, reward: 420, color: '#FDE68A', check: enemy => !!enemy.elite },
      { id: 'heavy', label: 'HEAVY', target: 3, reward: 520, color: '#F97316', check: enemy => ['brute', 'warden'].includes(enemy.type) },
      { id: 'nemesis', label: 'NEMESIS', target: 1, reward: 680, color: '#A78BFA', check: enemy => !!enemy.nemesis || enemy.type === 'nemesis' }
    ];

    const survivorUpgradeDefs = [
      {
        id: 'rail',
        tone: 'rail',
        title: '裂轨弹头',
        desc: '伤害 +7，穿透 +1。适合切开精英潮。',
        tag: 'Rail',
        available: p => p.pierce < 5,
        apply: p => {
          p.damage += 7;
          p.pierce = Math.min(5, p.pierce + 1);
        }
      },
      {
        id: 'pulse',
        tone: 'pulse',
        title: '脉冲超频',
        desc: '射击间隔 -28ms，子弹速度提升。',
        tag: 'Pulse',
        available: p => p.fireRate > 72,
        apply: p => {
          p.fireRate = Math.max(72, p.fireRate - 28);
          p.bulletSpeed += 22;
        }
      },
      {
        id: 'drone',
        tone: 'drone',
        title: '伴飞无人机',
        desc: '增加一台环绕火力无人机。',
        tag: 'Drone',
        available: p => p.drones < 4,
        apply: p => {
          p.drones = Math.min(4, p.drones + 1);
        }
      },
      {
        id: 'nova',
        tone: 'nova',
        title: '星爆核心',
        desc: '星爆半径与伤害提升，冷却缩短。',
        tag: 'Nova',
        available: p => p.novaRadius < 210,
        apply: p => {
          p.novaRadius = Math.min(210, p.novaRadius + 22);
          p.novaDamage += 28;
          p.novaCooldownMax = Math.max(3600, p.novaCooldownMax - 520);
        }
      },
      {
        id: 'magnet',
        tone: 'magnet',
        title: '星核牵引',
        desc: '吸附范围 +34，移速 +8。',
        tag: 'Magnet',
        available: p => p.magnet < 235,
        apply: p => {
          p.magnet += 34;
          p.speed += 8;
        }
      },
      {
        id: 'reactor',
        tone: 'reactor',
        title: '反应炉装甲',
        desc: '生命上限 +18，并立即修复 32 点。',
        tag: 'Reactor',
        available: p => p.maxHp < 185,
        apply: p => {
          p.maxHp += 18;
          p.hp = Math.min(p.maxHp, p.hp + 32);
        }
      },
      {
        id: 'thruster',
        tone: 'thruster',
        title: '相位推进器',
        desc: '移动速度 +22，碰撞半径略降。',
        tag: 'Thrust',
        available: p => p.speed < 310,
        apply: p => {
          p.speed += 22;
          p.r = Math.max(9, p.r - 0.6);
        }
      },
      {
        id: 'overcharge',
        tone: 'overcharge',
        title: '过载协议',
        desc: '伤害 +14，射速提升，但当前生命 -8。',
        tag: 'Over',
        available: p => p.hp > 22,
        apply: p => {
          p.damage += 14;
          p.fireRate = Math.max(76, p.fireRate - 16);
          p.hp = Math.max(16, p.hp - 8);
        }
      }
    ];

    function survivorUpgradeCount(id) {
      return survivor.player?.upgrades?.filter(item => item === id).length || 0;
    }

    function survivorBuildSummary() {
      const p = survivor.player;
      if (!p) return 'Pulse I';
      const counts = (p.upgrades || []).reduce((map, id) => {
        map[id] = (map[id] || 0) + 1;
        return map;
      }, {});
      const labels = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([id, count]) => `${survivorUpgradeDefs.find(def => def.id === id)?.tag || id}${count > 1 ? count : ''}`);
      return labels.length ? labels.join(' + ') : p.build;
    }

    function survivorXpTarget() {
      const p = survivor.player;
      return p ? 90 + p.level * 38 : 128;
    }

    function currentSurvivorBounty() {
      return survivorBountyDefs[survivor.bountyIndex % survivorBountyDefs.length];
    }

    function formatSurvivorBounty() {
      const bounty = currentSurvivorBounty();
      if (!bounty) return 'CLEAR';
      return `${bounty.label} ${Math.min(survivor.bountyProgress, bounty.target)}/${bounty.target}`;
    }

    function resetSurvivorBounty() {
      survivor.bountyIndex = 0;
      survivor.bountyProgress = 0;
      survivor.bountiesCompleted = 0;
      survivor.bountyFlash = 0;
      survivor.lastBounty = '';
    }

    function resolveSurvivorBounty(enemy) {
      const bounty = currentSurvivorBounty();
      if (!bounty || !bounty.check(enemy)) return { completed: false, label: bounty?.label || '', reward: 0 };
      survivor.bountyProgress++;
      survivor.lastBounty = `${bounty.label} ${Math.min(survivor.bountyProgress, bounty.target)}/${bounty.target}`;
      if (survivor.bountyProgress < bounty.target) {
        setSurvivorUi();
        return { completed: false, label: bounty.label, reward: 0 };
      }
      survivor.bountyProgress = 0;
      survivor.bountyIndex++;
      survivor.bountiesCompleted++;
      survivor.bountyFlash = 1150;
      survivor.lastBounty = `${bounty.label} CLEAR`;
      survivor.score += bounty.reward;
      addSurvivorOverdrive(24, `${bounty.label} BOUNTY`);
      survivor.chainTimer = Math.max(survivor.chainTimer, 2600);
      survivor.pickups.push({ x: enemy.x, y: enemy.y, r: 10, type: 'surge' });
      survivor.orbs.push({ x: enemy.x + 18, y: enemy.y - 18, r: 8, value: Math.floor(bounty.reward * 0.16) });
      survivorBurst(enemy.x, enemy.y, bounty.color, 42);
      unlockAchievement('survivor_bounty');
      setSurvivorUi();
      return { completed: true, label: bounty.label, reward: bounty.reward };
    }

    function setSurvivorUi() {
      document.getElementById('premium-survivor-score').textContent = Math.floor(survivor.score);
      document.getElementById('premium-survivor-best').textContent = localStorage.getItem(survivor.bestKey) || '0';
      document.getElementById('premium-survivor-level').textContent = survivor.player?.level || 1;
      document.getElementById('premium-survivor-hp').textContent = Math.max(0, Math.ceil(survivor.player?.hp || 100));
      document.getElementById('premium-survivor-build').textContent = survivorBuildSummary();
      const chainEl = document.getElementById('premium-survivor-chain');
      if (chainEl) {
        chainEl.textContent = `${survivor.chain}x`;
        chainEl.style.color = survivor.chain >= 12 ? '#FDE68A' : survivor.chain >= 5 ? '#A7F3D0' : '#fff';
      }
      const overdriveEl = document.getElementById('premium-survivor-overdrive');
      if (overdriveEl) {
        overdriveEl.textContent = survivor.overdrive >= 100 ? 'READY' : `${Math.floor(survivor.overdrive)}%`;
        overdriveEl.style.color = survivor.overdrive >= 100 ? '#FDE68A' : survivor.overdrive >= 65 ? '#BAE6FD' : '#fff';
      }
      document.getElementById('premium-survivor-threat').textContent = `WAVE ${Math.max(1, Math.floor(survivor.elapsed / 18000) + 1)}`;
      const eventEl = document.getElementById('premium-survivor-event');
      if (eventEl) {
        const eventDef = survivor.anomaly ? survivorAnomalyDefs[survivor.anomaly.type] : null;
        eventEl.textContent = eventDef ? eventDef.short : '稳定';
        eventEl.style.color = eventDef ? eventDef.color : '#fff';
      }
      const bountyEl = document.getElementById('premium-survivor-bounty');
      if (bountyEl) {
        const bounty = currentSurvivorBounty();
        bountyEl.textContent = formatSurvivorBounty();
        bountyEl.style.color = survivor.bountyFlash > 0 ? '#FDE68A' : survivor.bountyProgress > 0 ? '#A7F3D0' : (bounty?.color || '#fff');
      }
    }

    function startSurvivor() {
      const bonuses = loadoutBonuses();
      const tuning = difficultyTuning();
      survivor.running = true;
      survivor.paused = false;
      survivor.last = performance.now();
      survivor.elapsed = 0;
      survivor.spawn = 0;
      survivor.shot = 0;
      survivor.score = 0;
      survivor.chain = 0;
      survivor.chainTimer = 0;
      survivor.bestChain = 0;
      survivor.overdrive = 0;
      survivor.overdriveFlash = 0;
      survivor.overdriveText = 'SYNC';
      survivor.anomaly = null;
      survivor.anomalyCooldown = 9200;
      survivor.anomalyCount = 0;
      resetSurvivorBounty();
      survivor.draftOpen = false;
      survivor.draftChoices = [];
      hideSurvivorDraft();
      const hpMax = 100 + Number(bonuses.survivorHp || 0) + Number(tuning.hp || 0);
      survivor.player = {
        x: 280,
        y: 180,
        r: 12,
        hp: hpMax,
        maxHp: hpMax,
        xp: 0,
        level: 1,
        fireRate: 240,
        damage: 18,
        bulletSpeed: 390,
        speed: 198 + Number(bonuses.survivorSpeed || 0),
        build: activeLoadoutDef().id === 'pulse' ? 'Pulse Sync' : activeLoadoutDef().label,
        magnet: 85 + Number(bonuses.survivorMagnet || 0),
        novaCooldown: 0,
        novaCooldownMax: 6200,
        novaRadius: 138,
        novaDamage: 95,
        novaFlash: 0,
        drones: 0,
        pierce: 0,
        upgrades: []
      };
      survivor.enemies = [];
      survivor.bullets = [];
      survivor.orbs = [];
      survivor.pickups = [];
      survivor.hazards = [];
      survivor.particles = [];
      document.getElementById('premium-survivor-pause').textContent = '暂停';
      setSurvivorUi();
      cancelAnimationFrame(survivor.raf);
      focusStage();
      survivor.raf = requestAnimationFrame(runSurvivor);
    }

    function spawnSurvivorEnemy() {
      const c = survivor.canvas;
      const difficulty = activeDifficultyDef();
      const tuning = difficultyTuning();
      const pressure = Number(difficulty.pressure || 1);
      const enemyHpScale = Number(tuning.enemyHp || 1);
      const enemySpeedScale = 0.92 + pressure * 0.08;
      const side = Math.floor(Math.random() * 4);
      const p = [
        { x: Math.random() * c.width, y: -24 },
        { x: c.width + 24, y: Math.random() * c.height },
        { x: Math.random() * c.width, y: c.height + 24 },
        { x: -24, y: Math.random() * c.height }
      ][side];
      const wave = Math.floor(survivor.elapsed / 18000);
      const type = pick(wave > 3 ? ['swarm', 'swarm', 'brute', 'charger', 'warden'] : wave > 1 ? ['swarm', 'swarm', 'brute', 'charger'] : ['swarm', 'swarm', 'brute']);
      const elite = Math.random() < Math.min(0.44, (0.08 + survivor.elapsed / 125000) * pressure);
      const stats = {
        swarm: { r: 10, hp: 30 + wave * 6, speed: 108 + wave * 4, value: 14, color: '#EC4899' },
        brute: { r: 17, hp: 82 + wave * 16, speed: 70 + wave * 3, value: 38, color: '#F97316' },
        charger: { r: 12, hp: 42 + wave * 10, speed: 128 + wave * 8, value: 24, color: '#06B6D4' },
        warden: { r: 21, hp: 150 + wave * 28, speed: 55 + wave * 2, value: 76, color: '#A78BFA' }
      }[type];
      survivor.enemies.push({
        ...p,
        ...stats,
        type,
        hp: stats.hp * enemyHpScale * (elite ? 1.55 : 1),
        maxHp: stats.hp * enemyHpScale * (elite ? 1.55 : 1),
        speed: stats.speed * enemySpeedScale,
        value: stats.value * (elite ? 2 : 1),
        elite,
        pulse: Math.random() * Math.PI * 2
      });
    }

    function survivorBurst(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        survivor.particles.push({ x, y, vx: (Math.random() - 0.5) * 190, vy: (Math.random() - 0.5) * 190, life: 420, color, r: Math.random() * 2.8 + 1 });
      }
    }

    function addSurvivorOverdrive(amount = 0, reason = 'SYNC') {
      survivor.overdrive = clamp(survivor.overdrive + amount, 0, 100);
      survivor.overdriveText = survivor.overdrive >= 100 ? 'OMEGA READY' : reason;
    }

    function awardSurvivorChain(value = 0, x = 0, y = 0, reason = 'core') {
      if (survivor.chainTimer <= 0) survivor.chain = 0;
      survivor.chain = Math.min(99, survivor.chain + 1);
      survivor.bestChain = Math.max(survivor.bestChain, survivor.chain);
      survivor.chainTimer = 2400;
      const bonus = Math.floor(value * Math.min(2.35, 0.16 + survivor.chain * 0.085));
      addSurvivorOverdrive(value * 0.18 + survivor.chain * 0.72, reason);
      if (survivor.chain % 6 === 0) survivorBurst(x, y, '#FDE68A', 26);
      return bonus;
    }

    function survivorRandomPoint(margin = 42) {
      const c = survivor.canvas;
      return {
        x: margin + Math.random() * Math.max(1, c.width - margin * 2),
        y: margin + Math.random() * Math.max(1, c.height - margin * 2)
      };
    }

    function queueSurvivorMeteor(count = 1) {
      for (let i = 0; i < count; i++) {
        const point = survivorRandomPoint(48);
        const wave = Math.max(1, Math.floor(survivor.elapsed / 18000) + 1);
        survivor.hazards.push({
          type: 'meteor',
          x: point.x,
          y: point.y,
          r: 42 + Math.min(14, wave * 2),
          timer: 920 + Math.random() * 260,
          telegraph: 1180,
          life: 420,
          damage: 16,
          enemyDamage: 112 + wave * 18,
          exploded: false
        });
      }
    }

    function spawnSurvivorCachePickup() {
      const point = survivorRandomPoint(56);
      const pool = ['surge', 'haste', 'heal', 'bomb'];
      const type = pool[(survivor.anomaly?.spawned || 0) % pool.length];
      survivor.pickups.push({ x: point.x, y: point.y, r: 9, type });
      survivor.orbs.push({ x: point.x + 16, y: point.y - 12, r: 7, value: 38 });
      survivorBurst(point.x, point.y, '#34D399', 24);
    }

    function spawnSurvivorNemesis() {
      const c = survivor.canvas;
      const tuning = difficultyTuning();
      const pressure = Number(activeDifficultyDef().pressure || 1);
      const wave = Math.max(1, Math.floor(survivor.elapsed / 18000) + 1);
      const fromLeft = Math.random() < 0.5;
      survivor.enemies.push({
        x: fromLeft ? -32 : c.width + 32,
        y: 72 + Math.random() * (c.height - 144),
        r: 24,
        hp: (360 + wave * 96) * Number(tuning.enemyHp || 1),
        maxHp: (360 + wave * 96) * Number(tuning.enemyHp || 1),
        speed: (54 + wave * 4) * (0.92 + pressure * 0.08),
        value: 220 + wave * 42,
        color: '#FDE68A',
        type: 'nemesis',
        elite: true,
        nemesis: true,
        pulse: Math.random() * Math.PI * 2,
        slow: 0
      });
    }

    function startSurvivorAnomaly(forcedType = '') {
      if (!survivor.running || survivor.draftOpen || survivor.anomaly) return false;
      const cycle = ['meteor', 'cache', 'nemesis'];
      const type = survivorAnomalyDefs[forcedType] ? forcedType : cycle[survivor.anomalyCount % cycle.length];
      const def = survivorAnomalyDefs[type];
      survivor.anomaly = {
        type,
        label: def.label,
        color: def.color,
        timer: def.duration,
        duration: def.duration,
        spawnTimer: 0,
        spawned: 0
      };
      survivor.anomalyCount++;
      survivor.anomalyCooldown = 15000;
      unlockAchievement('survivor_anomaly');
      addSurvivorOverdrive(10, def.short);
      if (type === 'meteor') queueSurvivorMeteor(3);
      if (type === 'cache') {
        spawnSurvivorCachePickup();
        survivor.anomaly.spawned++;
      }
      if (type === 'nemesis') spawnSurvivorNemesis();
      survivorBurst(survivor.player.x, survivor.player.y, def.color, 34);
      setSurvivorUi();
      return true;
    }

    function resolveSurvivorMeteor(hazard) {
      const p = survivor.player;
      hazard.exploded = true;
      hazard.life = 460;
      survivorBurst(hazard.x, hazard.y, '#F97316', 46);
      if (p && Math.hypot(p.x - hazard.x, p.y - hazard.y) < hazard.r + p.r) {
        p.hp -= hazard.damage;
        survivor.chain = 0;
        survivor.chainTimer = 0;
      }
      survivor.enemies.forEach(enemy => {
        if (Math.hypot(enemy.x - hazard.x, enemy.y - hazard.y) < hazard.r + enemy.r) {
          enemy.hp -= hazard.enemyDamage;
          enemy.slow = Math.max(enemy.slow || 0, 820);
        }
      });
      survivor.enemies = survivor.enemies.filter(enemy => {
        if (enemy.hp > 0) return true;
        defeatSurvivorEnemy(enemy, 'anomaly');
        return false;
      });
    }

    function updateSurvivorAnomaly(dt) {
      survivor.hazards.forEach(hazard => {
        if (!hazard.exploded) {
          hazard.timer -= dt;
          if (hazard.timer <= 0) resolveSurvivorMeteor(hazard);
        } else {
          hazard.life -= dt;
        }
      });
      survivor.hazards = survivor.hazards.filter(hazard => !hazard.exploded || hazard.life > 0);

      if (!survivor.anomaly) {
        survivor.anomalyCooldown = Math.max(0, survivor.anomalyCooldown - dt);
        if (survivor.elapsed > 10500 && survivor.anomalyCooldown <= 0) startSurvivorAnomaly();
        return;
      }

      const event = survivor.anomaly;
      event.timer -= dt;
      event.spawnTimer += dt;
      if (event.type === 'meteor' && event.spawnTimer > 940) {
        event.spawnTimer = 0;
        queueSurvivorMeteor(survivor.elapsed > 52000 ? 2 : 1);
      }
      if (event.type === 'cache' && event.spawnTimer > 980 && event.spawned < 4) {
        event.spawnTimer = 0;
        spawnSurvivorCachePickup();
        event.spawned++;
      }
      if (event.type === 'nemesis' && event.spawnTimer > 1700 && event.spawned < 2) {
        event.spawnTimer = 0;
        event.spawned++;
        spawnSurvivorEnemy();
        const latest = survivor.enemies[survivor.enemies.length - 1];
        if (latest) {
          latest.elite = true;
          latest.hp *= 1.35;
          latest.maxHp *= 1.35;
          latest.value *= 2;
        }
      }
      if (event.timer <= 0) {
        survivor.anomaly = null;
        survivor.anomalyCooldown = Math.max(9200, 14600 - survivor.anomalyCount * 650);
      }
    }

    function defeatSurvivorEnemy(enemy, reason = 'weapon') {
      const p = survivor.player;
      survivor.score += enemy.value;
      survivor.orbs.push({ x: enemy.x, y: enemy.y, r: enemy.elite ? 7 : 6, value: enemy.value });
      if (enemy.nemesis) {
        survivor.score += 360;
        addSurvivorOverdrive(32, 'NEMESIS BREAK');
        survivor.pickups.push({ x: enemy.x + 12, y: enemy.y - 10, r: 9, type: 'surge' });
        survivor.pickups.push({ x: enemy.x - 14, y: enemy.y + 12, r: 8, type: 'heal' });
      }
      if (enemy.elite) {
        addSurvivorOverdrive(18, 'ELITE BREAK');
        survivor.chainTimer = Math.max(survivor.chainTimer, 1800);
      }
      resolveSurvivorBounty(enemy);
      const pickupChance = enemy.elite ? 0.48 : 0.08;
      if (Math.random() < pickupChance) {
        const pool = enemy.elite ? ['heal', 'bomb', 'haste', 'surge'] : ['heal', 'bomb', 'haste'];
        survivor.pickups.push({ x: enemy.x, y: enemy.y, r: enemy.elite ? 9 : 8, type: pick(pool) });
      }
      if (p && reason === 'nova' && enemy.elite) p.hp = Math.min(p.maxHp, p.hp + 4);
      survivorBurst(enemy.x, enemy.y, enemy.color, enemy.elite ? 22 : 14);
    }

    function pickSurvivorUpgrades() {
      const p = survivor.player;
      const pool = survivorUpgradeDefs.filter(def => !def.available || def.available(p));
      const choices = [];
      const mutable = pool.length ? [...pool] : [...survivorUpgradeDefs];
      while (choices.length < 3 && mutable.length) {
        const index = Math.floor(Math.random() * mutable.length);
        choices.push(mutable.splice(index, 1)[0]);
      }
      return choices;
    }

    function hideSurvivorDraft() {
      const draft = document.getElementById('premium-survivor-draft');
      const options = document.getElementById('premium-survivor-draft-options');
      if (draft) {
        draft.classList.remove('active');
        draft.setAttribute('aria-hidden', 'true');
      }
      if (options) options.innerHTML = '';
    }

    function renderSurvivorDraft() {
      const draft = document.getElementById('premium-survivor-draft');
      const options = document.getElementById('premium-survivor-draft-options');
      const title = document.getElementById('premium-survivor-draft-title');
      if (!draft || !options || !survivor.player) return;
      draft.classList.toggle('active', survivor.draftOpen);
      draft.setAttribute('aria-hidden', survivor.draftOpen ? 'false' : 'true');
      if (title) title.textContent = `选择第 ${survivor.player.level} 级改造`;
      options.innerHTML = survivor.draftChoices.map((choice, index) => `
        <button type="button" class="survivor-upgrade-option" data-survivor-upgrade="${escapeHTML(choice.id)}" data-tone="${escapeHTML(choice.tone)}">
          <span>${index + 1}</span>
          <strong>${escapeHTML(choice.title)}</strong>
          <small>${escapeHTML(choice.desc)}</small>
          <em>已选 ${survivorUpgradeCount(choice.id)}</em>
        </button>
      `).join('');
      options.querySelectorAll('[data-survivor-upgrade]').forEach(btn => {
        btn.addEventListener('click', () => selectSurvivorUpgrade(btn.dataset.survivorUpgrade));
      });
    }

    function openSurvivorDraft() {
      const p = survivor.player;
      if (!p || survivor.draftOpen) return;
      p.level++;
      p.xp = 0;
      survivor.draftOpen = true;
      survivor.draftChoices = pickSurvivorUpgrades();
      clearPremiumKeys();
      if (p.level >= 4) unlockAchievement('survivor_level_4');
      survivorBurst(p.x, p.y, '#34D399', 42);
      renderSurvivorDraft();
      setSurvivorUi();
    }

    function selectSurvivorUpgrade(id) {
      const p = survivor.player;
      const choice = survivor.draftChoices.find(item => item.id === id);
      if (!p || !survivor.draftOpen || !choice) return false;
      choice.apply(p);
      p.upgrades.push(choice.id);
      p.build = survivorBuildSummary();
      survivor.score += 60 + p.level * 16;
      survivor.draftOpen = false;
      survivor.draftChoices = [];
      hideSurvivorDraft();
      clearPremiumKeys();
      survivor.last = performance.now();
      survivorBurst(p.x, p.y, '#BAE6FD', 34);
      setSurvivorUi();
      drawSurvivor();
      focusStage();
      return true;
    }

    function fireSurvivorVolley() {
      const p = survivor.player;
      if (!survivor.enemies.length) return;
      const target = survivor.enemies.reduce((best, enemy) => Math.hypot(enemy.x - p.x, enemy.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? enemy : best, survivor.enemies[0]);
      const angle = Math.atan2(target.y - p.y, target.x - p.x);
      const spread = p.level >= 7 ? [-0.26, -0.1, 0.1, 0.26] : p.level >= 4 ? [-0.18, 0, 0.18] : (p.level >= 2 ? [-0.08, 0.08] : [0]);
      spread.forEach(offset => survivor.bullets.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle + offset) * p.bulletSpeed,
        vy: Math.sin(angle + offset) * p.bulletSpeed,
        r: p.pierce > 0 ? 5 : 4,
        life: 980,
        damage: p.damage,
        pierce: p.pierce
      }));
      for (let i = 0; i < p.drones; i++) {
        const spin = survivor.elapsed / 420 + i * Math.PI * 2 / Math.max(1, p.drones);
        survivor.bullets.push({
          x: p.x + Math.cos(spin) * 30,
          y: p.y + Math.sin(spin) * 30,
          vx: Math.cos(spin) * (p.bulletSpeed * 0.86),
          vy: Math.sin(spin) * (p.bulletSpeed * 0.86),
          r: 4,
          life: 720,
          damage: p.damage * 0.7,
          pierce: 1
        });
      }
    }

    function triggerSurvivorNova() {
      const p = survivor.player;
      if (!p) return;
      const overdrive = survivor.overdrive >= 100;
      if (p.novaCooldown > 0 && !overdrive) return;
      if (overdrive) {
        survivor.overdrive = 0;
        survivor.overdriveFlash = 740;
        survivor.overdriveText = 'OMEGA BURST';
        survivor.chain = Math.max(survivor.chain, 3);
        survivor.chainTimer = Math.max(survivor.chainTimer, 2800);
        survivor.score += 220 + survivor.chain * 18;
        p.novaCooldown = Math.max(1600, Math.min(p.novaCooldown || 0, p.novaCooldownMax * 0.45));
      } else {
        p.novaCooldown = p.novaCooldownMax || 6200;
      }
      p.novaFlash = overdrive ? 520 : 320;
      const radius = (p.novaRadius || 138) * (overdrive ? 1.48 : 1);
      const damage = (p.novaDamage || 95) * (overdrive ? 1.72 : 1);
      survivor.enemies.forEach(enemy => {
        const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
        if (d < radius) {
          enemy.hp -= damage;
          if (overdrive) {
            enemy.slow = Math.max(enemy.slow || 0, 1300);
            const angle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
            enemy.x += Math.cos(angle) * 18;
            enemy.y += Math.sin(angle) * 18;
          }
        }
      });
      survivorBurst(p.x, p.y, overdrive ? '#FDE68A' : '#BAE6FD', overdrive ? 110 : 68);
    }

    function finishSurvivor(text) {
      survivor.running = false;
      survivor.draftOpen = false;
      survivor.draftChoices = [];
      hideSurvivorDraft();
      cancelAnimationFrame(survivor.raf);
      const finalScore = Math.floor(survivor.score + survivor.elapsed / 120 + survivor.bestChain * 42 + survivor.overdrive * 3 + survivor.anomalyCount * 95 + survivor.bountiesCompleted * 150);
      localStorage.setItem(survivor.bestKey, String(Math.max(Number(localStorage.getItem(survivor.bestKey) || 0), finalScore)));
      if (survivor.elapsed >= 90000) unlockAchievement('survivor_90');
      recordPremiumResult('survivor', finalScore, { elapsed: survivor.elapsed, level: survivor.player?.level || 1, bestChain: survivor.bestChain, overdrive: Math.floor(survivor.overdrive), anomalies: survivor.anomalyCount, bounties: survivor.bountiesCompleted });
      setSurvivorUi();
      drawSurvivor();
      overlay(survivor.ctx, survivor.canvas.width, survivor.canvas.height, text, `Score ${finalScore} · 点击部署再来一局`);
    }

    function runSurvivor(now) {
      if (!survivor.running) return;
      const dt = Math.min(34, now - survivor.last);
      survivor.last = now;
      if (survivor.draftOpen) {
        drawSurvivor();
        survivor.raf = requestAnimationFrame(runSurvivor);
        return;
      }
      if (survivor.paused) {
        drawSurvivor();
        overlay(survivor.ctx, survivor.canvas.width, survivor.canvas.height, 'PAUSED', '点击继续或按按钮恢复');
        survivor.raf = requestAnimationFrame(runSurvivor);
        return;
      }
      const p = survivor.player;
      survivor.elapsed += dt;
      survivor.spawn += dt;
      survivor.shot += dt;
      const c = survivor.canvas;
      p.novaCooldown = Math.max(0, p.novaCooldown - dt);
      p.novaFlash = Math.max(0, p.novaFlash - dt);
      survivor.chainTimer = Math.max(0, survivor.chainTimer - dt);
      if (survivor.chainTimer <= 0) survivor.chain = 0;
      survivor.overdriveFlash = Math.max(0, survivor.overdriveFlash - dt);
      survivor.bountyFlash = Math.max(0, survivor.bountyFlash - dt);
      updateSurvivorAnomaly(dt);
      if (premiumKeys.action) triggerSurvivorNova();
      let mx = (premiumKeys.right ? 1 : 0) - (premiumKeys.left ? 1 : 0);
      let my = (premiumKeys.down ? 1 : 0) - (premiumKeys.up ? 1 : 0);
      const len = Math.hypot(mx, my) || 1;
      p.x = Math.max(16, Math.min(c.width - 16, p.x + mx / len * p.speed * dt / 1000));
      p.y = Math.max(16, Math.min(c.height - 16, p.y + my / len * p.speed * dt / 1000));
      while (survivor.spawn > Math.max(180, (700 - survivor.elapsed / 130) / Number(activeDifficultyDef().pressure || 1))) {
        survivor.spawn = 0;
        spawnSurvivorEnemy();
      }
      if (survivor.shot > p.fireRate && survivor.enemies.length) {
        survivor.shot = 0;
        fireSurvivorVolley();
      }
      survivor.bullets.forEach(b => { b.x += b.vx * dt / 1000; b.y += b.vy * dt / 1000; b.life -= dt; });
      survivor.bullets = survivor.bullets.filter(b => b.life > 0 && b.x > -20 && b.y > -20 && b.x < c.width + 20 && b.y < c.height + 20);
      survivor.enemies.forEach(enemy => {
        const a = Math.atan2(p.y - enemy.y, p.x - enemy.x);
        enemy.pulse += dt / 280;
        enemy.slow = Math.max(0, (enemy.slow || 0) - dt);
        const slowFactor = enemy.slow > 0 ? 0.48 : 1;
        const strafe = enemy.type === 'charger' ? Math.sin(enemy.pulse) * 0.85 : enemy.type === 'warden' ? Math.sin(enemy.pulse) * 0.35 : 0;
        enemy.x += (Math.cos(a) * enemy.speed + Math.cos(a + Math.PI / 2) * enemy.speed * strafe) * slowFactor * dt / 1000;
        enemy.y += (Math.sin(a) * enemy.speed + Math.sin(a + Math.PI / 2) * enemy.speed * strafe) * slowFactor * dt / 1000;
        if (Math.hypot(enemy.x - p.x, enemy.y - p.y) < enemy.r + p.r) p.hp -= (enemy.elite ? 28 : 18) * dt / 1000;
      });
      for (let i = survivor.enemies.length - 1; i >= 0; i--) {
        const enemy = survivor.enemies[i];
        for (let j = survivor.bullets.length - 1; j >= 0; j--) {
          const b = survivor.bullets[j];
          if (Math.hypot(enemy.x - b.x, enemy.y - b.y) < enemy.r + b.r) {
            enemy.hp -= b.damage;
            if (b.pierce > 0) b.pierce--;
            else survivor.bullets.splice(j, 1);
            survivorBurst(b.x, b.y, enemy.color, 4);
            if (enemy.hp <= 0) {
              defeatSurvivorEnemy(enemy, 'weapon');
              survivor.enemies.splice(i, 1);
            }
            break;
          }
        }
      }
      survivor.enemies = survivor.enemies.filter(enemy => {
        if (enemy.hp > 0) return true;
        defeatSurvivorEnemy(enemy, 'nova');
        return false;
      });
      survivor.orbs.forEach(orb => {
        if (Math.hypot(p.x - orb.x, p.y - orb.y) < p.magnet) {
          orb.x += (p.x - orb.x) * 0.12;
          orb.y += (p.y - orb.y) * 0.12;
        }
      });
      survivor.pickups.forEach(item => {
        if (Math.hypot(p.x - item.x, p.y - item.y) < p.magnet * 0.72) {
          item.x += (p.x - item.x) * 0.08;
          item.y += (p.y - item.y) * 0.08;
        }
      });
      survivor.pickups = survivor.pickups.filter(item => {
        if (Math.hypot(p.x - item.x, p.y - item.y) >= p.r + item.r) return true;
        if (item.type === 'heal') p.hp = Math.min(p.maxHp || 115, p.hp + 24);
        if (item.type === 'bomb') survivor.enemies.forEach(enemy => enemy.hp -= 72);
        if (item.type === 'surge') addSurvivorOverdrive(35, 'SURGE PICKUP');
        if (item.type === 'haste') {
          p.fireRate = Math.max(70, p.fireRate - 12);
          p.speed += 8;
        }
        survivorBurst(item.x, item.y, item.type === 'heal' ? '#34D399' : item.type === 'bomb' ? '#F97316' : item.type === 'surge' ? '#FDE68A' : '#BAE6FD', 26);
        return false;
      });
      survivor.orbs = survivor.orbs.filter(orb => {
        if (Math.hypot(p.x - orb.x, p.y - orb.y) < p.r + orb.r) {
          const chainBonus = awardSurvivorChain(orb.value, orb.x, orb.y, 'CORE CHAIN');
          p.xp += orb.value + Math.floor(chainBonus * 0.25);
          survivor.score += orb.value + chainBonus;
          if (p.xp >= survivorXpTarget() && !survivor.draftOpen) {
            openSurvivorDraft();
          }
          return false;
        }
        return true;
      });
      survivor.particles.forEach(pt => { pt.x += pt.vx * dt / 1000; pt.y += pt.vy * dt / 1000; pt.life -= dt; });
      survivor.particles = survivor.particles.filter(pt => pt.life > 0);
      setSurvivorUi();
      drawSurvivor();
      if (p.hp <= 0) return finishSurvivor('CORE LOST');
      if (survivor.elapsed >= 90000) return finishSurvivor('90s SURVIVED');
      survivor.raf = requestAnimationFrame(runSurvivor);
    }

    function drawSurvivor() {
      const { ctx, canvas: c } = survivor;
      if (!ctx || !c) return;
      ctx.fillStyle = '#040711';
      ctx.fillRect(0, 0, c.width, c.height);
      drawGrid(ctx, c.width, c.height, 'rgba(6, 182, 212, 0.07)');
      survivor.hazards.forEach(hazard => {
        if (hazard.type !== 'meteor') return;
        const telegraphProgress = hazard.exploded ? 1 : clamp(1 - hazard.timer / Math.max(1, hazard.telegraph), 0, 1);
        ctx.save();
        ctx.globalAlpha = hazard.exploded ? clamp(hazard.life / 460, 0, 1) : 0.28 + telegraphProgress * 0.38;
        ctx.strokeStyle = hazard.exploded ? '#FDE68A' : '#F97316';
        ctx.fillStyle = hazard.exploded ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.08)';
        ctx.lineWidth = hazard.exploded ? 5 : 2 + telegraphProgress * 3;
        if (!hazard.exploded) ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, hazard.r * (hazard.exploded ? 1.08 : 0.72 + telegraphProgress * 0.28), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#FDE68A';
        ctx.font = '900 10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(hazard.exploded ? 'IMPACT' : 'WARNING', hazard.x, hazard.y + 4);
        ctx.restore();
      });
      survivor.orbs.forEach(o => { ctx.fillStyle = '#FBBF24'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill(); });
      survivor.pickups.forEach(item => {
        ctx.fillStyle = item.type === 'heal' ? '#34D399' : item.type === 'bomb' ? '#F97316' : item.type === 'surge' ? '#FDE68A' : '#BAE6FD';
        ctx.beginPath();
        ctx.moveTo(item.x, item.y - 10);
        ctx.lineTo(item.x + 10, item.y);
        ctx.lineTo(item.x, item.y + 10);
        ctx.lineTo(item.x - 10, item.y);
        ctx.closePath();
        ctx.fill();
      });
      survivor.bullets.forEach(b => { ctx.fillStyle = '#BAE6FD'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); });
      const activeBounty = currentSurvivorBounty();
      survivor.enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + (e.elite ? Math.sin(e.pulse) * 2 : 0), 0, Math.PI * 2);
        ctx.fill();
        if (e.slow > 0) {
          ctx.strokeStyle = 'rgba(186, 230, 253, 0.72)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 7, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (e.elite || e.type === 'warden') {
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2, 3);
          ctx.fillStyle = '#fff';
          ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2 * Math.max(0, e.hp / e.maxHp), 3);
        }
        if (activeBounty?.check(e)) {
          ctx.save();
          ctx.strokeStyle = activeBounty.color;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 13 + Math.sin(e.pulse) * 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = activeBounty.color;
          ctx.font = '900 9px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText('MARK', e.x, e.y - e.r - 14);
          ctx.restore();
        }
      });
      survivor.particles.forEach(pt => { ctx.globalAlpha = Math.max(0, pt.life / 420); ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
      const p = survivor.player || { x: 280, y: 180, r: 12, hp: 100 };
      if (p.novaFlash > 0) {
        const radius = p.novaRadius || 138;
        const overdriveAlpha = clamp(survivor.overdriveFlash / 740, 0, 1);
        ctx.strokeStyle = overdriveAlpha > 0 ? `rgba(253, 230, 138, ${Math.max(0.25, overdriveAlpha)})` : `rgba(186, 230, 253, ${p.novaFlash / 320})`;
        ctx.lineWidth = overdriveAlpha > 0 ? 7 : 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * (overdriveAlpha > 0 ? 1.45 : 1) * (1 - p.novaFlash / 620), 0, Math.PI * 2);
        ctx.stroke();
      }
      if (survivor.overdrive >= 100 || survivor.overdriveFlash > 0) {
        ctx.strokeStyle = survivor.overdriveFlash > 0 ? 'rgba(253, 230, 138, 0.92)' : 'rgba(253, 230, 138, 0.58)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 14 + Math.sin(survivor.elapsed / 120) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowColor = '#34D399';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#34D399';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2 * clamp(p.hp / (p.maxHp || 100), 0, 1));
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '700 12px JetBrains Mono, monospace';
      ctx.fillText(`${Math.max(0, 90 - survivor.elapsed / 1000).toFixed(0)}s`, 14, 22);
      ctx.fillText(`NOVA ${p.novaCooldown > 0 ? Math.ceil(p.novaCooldown / 1000) : 'READY'}`, 14, 40);
      ctx.fillStyle = survivor.overdrive >= 100 ? '#FDE68A' : '#BAE6FD';
      ctx.fillText(`CHAIN ${survivor.chain}x · OVR ${survivor.overdrive >= 100 ? 'READY' : Math.floor(survivor.overdrive) + '%'}`, 14, 58);
      if (survivor.anomaly) {
        const eventDef = survivorAnomalyDefs[survivor.anomaly.type];
        const remaining = Math.max(0, Math.ceil(survivor.anomaly.timer / 1000));
        ctx.fillStyle = eventDef?.color || '#FDE68A';
        ctx.font = '900 12px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${eventDef?.short || 'EVENT'} ${remaining}s`, c.width - 14, 22);
        ctx.textAlign = 'left';
      }
      const bountyDef = currentSurvivorBounty();
      if (bountyDef) {
        ctx.fillStyle = survivor.bountyFlash > 0 ? '#FDE68A' : bountyDef.color;
        ctx.font = '900 12px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`BOUNTY ${formatSurvivorBounty()}`, c.width - 14, survivor.anomaly ? 42 : 22);
        if (survivor.lastBounty && survivor.bountyFlash > 0) {
          ctx.fillText(`${survivor.lastBounty} +${survivorBountyDefs[(survivor.bountyIndex + survivorBountyDefs.length - 1) % survivorBountyDefs.length]?.reward || 0}`, c.width - 14, survivor.anomaly ? 60 : 40);
        }
        ctx.textAlign = 'left';
      }
    }

    function updateSurvivorPauseButton() {
      const btn = document.getElementById('premium-survivor-pause');
      if (btn) btn.textContent = survivor.paused ? '继续' : '暂停';
    }

    function toggleSurvivorPause(force) {
      if (!survivor.running || survivor.draftOpen) return false;
      survivor.paused = typeof force === 'boolean' ? force : !survivor.paused;
      clearPremiumKeys();
      updateSurvivorPauseButton();
      focusStage();
      return true;
    }

    function survivorDebugState() {
      const p = survivor.player || {};
      return {
        running: survivor.running,
        paused: survivor.paused,
        draftOpen: survivor.draftOpen,
        elapsed: Math.round(survivor.elapsed),
        score: Math.floor(survivor.score),
        chain: survivor.chain,
        chainTimer: Math.ceil(survivor.chainTimer),
        bestChain: survivor.bestChain,
        overdrive: Math.floor(survivor.overdrive),
        overdriveFlash: Math.ceil(survivor.overdriveFlash),
        anomaly: survivor.anomaly ? {
          type: survivor.anomaly.type,
          label: survivor.anomaly.label,
          timer: Math.ceil(survivor.anomaly.timer),
          spawned: survivor.anomaly.spawned
        } : null,
        anomalyCount: survivor.anomalyCount,
        anomalyCooldown: Math.ceil(survivor.anomalyCooldown),
        bounty: {
          id: currentSurvivorBounty()?.id || '',
          label: currentSurvivorBounty()?.label || '',
          progress: survivor.bountyProgress,
          target: currentSurvivorBounty()?.target || 0,
          completed: survivor.bountiesCompleted,
          flash: Math.ceil(survivor.bountyFlash),
          last: survivor.lastBounty
        },
        hazards: survivor.hazards.map(hazard => ({
          type: hazard.type,
          exploded: !!hazard.exploded,
          timer: Math.ceil(hazard.timer || 0),
          life: Math.ceil(hazard.life || 0)
        })),
        build: survivorBuildSummary(),
        player: {
          hp: Math.ceil(p.hp || 0),
          maxHp: Math.ceil(p.maxHp || 0),
          level: p.level || 1,
          novaCooldown: Math.ceil(p.novaCooldown || 0),
          novaRadius: Math.ceil(p.novaRadius || 0),
          novaDamage: Math.ceil(p.novaDamage || 0)
        },
        enemies: survivor.enemies.length,
        slowed: survivor.enemies.filter(enemy => enemy.slow > 0).length,
        pickups: survivor.pickups.map(item => item.type),
        hud: {
          chain: document.getElementById('premium-survivor-chain')?.textContent || '',
          overdrive: document.getElementById('premium-survivor-overdrive')?.textContent || '',
          build: document.getElementById('premium-survivor-build')?.textContent || '',
          threat: document.getElementById('premium-survivor-threat')?.textContent || '',
          event: document.getElementById('premium-survivor-event')?.textContent || '',
          bounty: document.getElementById('premium-survivor-bounty')?.textContent || ''
        }
      };
    }

    function forceSurvivorAnomaly(type = 'meteor') {
      switchPremiumGame('survivor');
      if (!survivor.running) startSurvivor();
      survivor.paused = false;
      survivor.draftOpen = false;
      hideSurvivorDraft();
      survivor.anomaly = null;
      survivor.hazards = [];
      survivor.anomalyCooldown = 0;
      const started = startSurvivorAnomaly(type);
      setSurvivorUi();
      drawSurvivor();
      return {
        started,
        state: survivorDebugState(),
        achieved: (career.achievements || []).includes('survivor_anomaly')
      };
    }

    function forceSurvivorOverdrive() {
      switchPremiumGame('survivor');
      startSurvivor();
      const p = survivor.player;
      survivor.overdrive = 100;
      survivor.chain = 6;
      survivor.chainTimer = 2400;
      survivor.bestChain = Math.max(survivor.bestChain, survivor.chain);
      p.novaCooldown = 1600;
      survivor.enemies = [
        { x: p.x + 60, y: p.y, r: 12, hp: 70, maxHp: 70, speed: 82, value: 28, color: '#06B6D4', type: 'charger', elite: false, pulse: 0, slow: 0 },
        { x: p.x - 64, y: p.y + 28, r: 18, hp: 260, maxHp: 260, speed: 68, value: 80, color: '#F97316', type: 'brute', elite: true, pulse: 1.2, slow: 0 },
        { x: p.x + 36, y: p.y - 58, r: 10, hp: 45, maxHp: 45, speed: 110, value: 18, color: '#EC4899', type: 'swarm', elite: false, pulse: 2.1, slow: 0 }
      ];
      setSurvivorUi();
      drawSurvivor();
      const before = survivorDebugState();
      triggerSurvivorNova();
      survivor.enemies = survivor.enemies.filter(enemy => {
        if (enemy.hp > 0) return true;
        defeatSurvivorEnemy(enemy, 'nova');
        return false;
      });
      setSurvivorUi();
      drawSurvivor();
      return {
        before,
        after: survivorDebugState()
      };
    }

    function forceSurvivorBounty() {
      switchPremiumGame('survivor');
      startSurvivor();
      survivor.paused = false;
      survivor.draftOpen = false;
      hideSurvivorDraft();
      const p = survivor.player;
      const before = survivorDebugState();
      let attempts = 0;
      while (survivor.bountiesCompleted <= before.bounty.completed && attempts < 3) {
        const enemy = {
          x: p.x + 58 + attempts * 22,
          y: p.y - 28 + attempts * 18,
          r: 18,
          hp: 0,
          maxHp: 260,
          speed: 0,
          value: 150,
          color: '#FDE68A',
          type: 'brute',
          elite: true,
          pulse: attempts,
          slow: 0
        };
        defeatSurvivorEnemy(enemy, 'debug-bounty');
        attempts++;
      }
      setSurvivorUi();
      drawSurvivor();
      return {
        attempts,
        before,
        after: survivorDebugState(),
        achieved: (career.achievements || []).includes('survivor_bounty')
      };
    }

    document.getElementById('premium-survivor-start').addEventListener('click', startSurvivor);
    document.getElementById('premium-survivor-pause').addEventListener('click', () => {
      toggleSurvivorPause();
    });
    setSurvivorUi();
    drawSurvivor();
    overlay(survivor.ctx, survivor.canvas.width, survivor.canvas.height, '部署星核机体', 'WASD 移动 · 自动射击 · 吸收星核升级');

    const bossMode = {
      canvas: document.getElementById('premium-boss-canvas'),
      ctx: document.getElementById('premium-boss-canvas')?.getContext('2d'),
      bestKey: 'atherix_premium_boss_best',
      running: false,
      paused: false,
      raf: null,
      last: 0,
      t: 0,
      score: 0,
      player: { x: 280, y: 300, r: 12, lives: 3, invuln: 0, dash: 0, dashCooldown: 0, graze: 0, grazeStreak: 0, bestGrazeStreak: 0, focus: 0, focusSurge: 0 },
      boss: { x: 280, y: 92, r: 38, hp: 1000, maxHp: 1000, phase: 1 },
      shots: [],
      bullets: [],
      particles: [],
      shotTimer: 0,
      patternTimer: 0,
      queuedPattern: '',
      currentPattern: '',
      telegraphTimer: 0,
      telegraphDuration: 0,
      patternFlash: 0,
      weakpoint: { active: false, hits: 0, required: 3, x: 280, y: 92, r: 20, pattern: '', timer: 0 },
      breakCount: 0,
      breakFlash: 0,
      focusFlash: 0,
      focusSurges: 0,
      lastBreak: '',
      bonuses: {}
    };

    const bossPatternDefs = {
      ring: { label: '棱镜环爆', color: '#06B6D4' },
      snipe: { label: '锁定狙击', color: '#F97316' },
      rain: { label: '量子雨幕', color: '#A78BFA' },
      sweep: { label: '横扫光栅', color: '#EC4899' }
    };

    function setBossUi() {
      document.getElementById('premium-boss-score').textContent = Math.floor(bossMode.score);
      document.getElementById('premium-boss-lives').textContent = bossMode.player.lives;
      document.getElementById('premium-boss-best').textContent = localStorage.getItem(bossMode.bestKey) || '0';
      document.getElementById('premium-boss-hp').textContent = `${Math.max(0, Math.ceil(bossMode.boss.hp / bossMode.boss.maxHp * 100))}%`;
      document.getElementById('premium-boss-phase').textContent = ['I', 'II', 'III'][bossMode.boss.phase - 1] || 'III';
      const patternEl = document.getElementById('premium-boss-pattern');
      if (patternEl) {
        const pattern = bossMode.queuedPattern || bossMode.currentPattern;
        patternEl.textContent = pattern
          ? `${bossMode.queuedPattern ? '预警 ' : ''}${bossPatternDefs[pattern]?.label || pattern}`
          : '扫描中';
      }
      const weakEl = document.getElementById('premium-boss-weak');
      if (weakEl) {
        const weak = bossMode.weakpoint;
        weakEl.textContent = weak.active ? `${Math.max(0, weak.required - weak.hits)}/${weak.required}` : (bossMode.breakFlash > 0 ? 'BROKEN' : 'LOCKED');
        weakEl.style.color = weak.active ? '#FDE68A' : bossMode.breakFlash > 0 ? '#34D399' : '#94A3B8';
      }
      const breakEl = document.getElementById('premium-boss-break');
      if (breakEl) {
        breakEl.textContent = bossMode.breakCount;
        breakEl.style.color = bossMode.breakCount > 0 ? '#A7F3D0' : '#fff';
      }
      const focusEl = document.getElementById('premium-boss-focus');
      if (focusEl) {
        const surge = Number(bossMode.player.focusSurge || 0);
        const focus = Math.max(0, Math.min(100, Math.round(Number(bossMode.player.focus || 0))));
        focusEl.textContent = surge > 0 ? 'SURGE' : `${focus}%`;
        focusEl.style.color = surge > 0 ? '#FDE68A' : focus >= 80 ? '#A7F3D0' : '#fff';
      }
      document.getElementById('premium-boss-dash').textContent = bossMode.player.dashCooldown > 0 ? `${Math.ceil(bossMode.player.dashCooldown / 1000)}s` : 'READY';
    }

    function startBoss() {
      const bonuses = loadoutBonuses();
      const tuning = difficultyTuning();
      const maxHp = Math.round(1000 * Number(tuning.bossHp || 1));
      bossMode.running = true;
      bossMode.paused = false;
      bossMode.last = performance.now();
      bossMode.t = 0;
      bossMode.score = 0;
      bossMode.player = { x: 280, y: 300, r: 12, lives: 3 + Number(bonuses.bossLives || 0), invuln: 1000, dash: 0, dashCooldown: 0, graze: 0, grazeStreak: 0, bestGrazeStreak: 0, focus: 0, focusSurge: 0 };
      bossMode.boss = { x: 280, y: 92, r: 38, hp: maxHp, maxHp, phase: 1 };
      bossMode.shots = [];
      bossMode.bullets = [];
      bossMode.particles = [];
      bossMode.shotTimer = 0;
      bossMode.patternTimer = 0;
      bossMode.queuedPattern = '';
      bossMode.currentPattern = '';
      bossMode.telegraphTimer = 0;
      bossMode.telegraphDuration = 0;
      bossMode.patternFlash = 0;
      bossMode.weakpoint = { active: false, hits: 0, required: 3, x: 280, y: 92, r: 20, pattern: '', timer: 0 };
      bossMode.breakCount = 0;
      bossMode.breakFlash = 0;
      bossMode.focusFlash = 0;
      bossMode.focusSurges = 0;
      bossMode.lastBreak = '';
      bossMode.bonuses = bonuses;
      setBossUi();
      updateBossPauseButton();
      cancelAnimationFrame(bossMode.raf);
      focusStage();
      bossMode.raf = requestAnimationFrame(runBoss);
    }

    function finishBoss(text) {
      bossMode.running = false;
      bossMode.paused = false;
      cancelAnimationFrame(bossMode.raf);
      localStorage.setItem(bossMode.bestKey, String(Math.max(Number(localStorage.getItem(bossMode.bestKey) || 0), Math.floor(bossMode.score))));
      if (text === 'PRISM BROKEN') unlockAchievement('boss_clear');
      recordPremiumResult('boss', bossMode.score, { phase: bossMode.boss.phase, graze: bossMode.player.graze, bestGrazeStreak: bossMode.player.bestGrazeStreak, focusSurges: bossMode.focusSurges });
      setBossUi();
      updateBossPauseButton();
      drawBoss();
      overlay(bossMode.ctx, bossMode.canvas.width, bossMode.canvas.height, text, `Score ${Math.floor(bossMode.score)} · 点击开战再来一局`);
    }

    function updateBossPauseButton() {
      const btn = document.getElementById('premium-boss-pause');
      if (btn) btn.textContent = bossMode.paused ? '继续' : '暂停';
    }

    function toggleBossPause(force) {
      if (!bossMode.running) return false;
      bossMode.paused = typeof force === 'boolean' ? force : !bossMode.paused;
      bossMode.last = performance.now();
      clearPremiumKeys();
      updateBossPauseButton();
      focusStage();
      return true;
    }

    function bossSpark(x, y, color, count = 8) {
      for (let i = 0; i < count; i++) {
        bossMode.particles.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, r: Math.random() * 2 + 1, life: 360, color });
      }
    }

    function activateBossFocusSurge() {
      const p = bossMode.player;
      if (!p || p.focusSurge > 0) return false;
      p.focus = 0;
      p.focusSurge = 5200;
      p.invuln = Math.max(p.invuln, 260);
      bossMode.focusFlash = 980;
      bossMode.focusSurges++;
      bossMode.score += 260 + Math.min(360, Number(p.bestGrazeStreak || 0) * 18);
      unlockAchievement('boss_focus_surge');
      bossSpark(p.x, p.y, '#FDE68A', 40);
      setBossUi();
      return true;
    }

    function awardBossGraze() {
      const p = bossMode.player;
      p.graze++;
      p.grazeStreak = Number(p.grazeStreak || 0) + 1;
      p.bestGrazeStreak = Math.max(Number(p.bestGrazeStreak || 0), p.grazeStreak);
      const streakBonus = Math.min(16, Math.floor(p.grazeStreak / 2) * 2);
      p.focus = Math.min(100, Number(p.focus || 0) + 16 + streakBonus);
      bossMode.score += 18 + p.grazeStreak * 3;
      bossSpark(p.x, p.y, '#BAE6FD', p.grazeStreak >= 4 ? 8 : 4);
      if (p.focus >= 100) activateBossFocusSurge();
      else setBossUi();
    }

    function bossPhaseFromHp() {
      const b = bossMode.boss;
      const hpRatio = b.maxHp > 0 ? b.hp / b.maxHp : 0;
      const phase = hpRatio < 0.33 ? 3 : (hpRatio < 0.66 ? 2 : 1);
      b.phase = phase;
      if (phase >= 2) unlockAchievement('boss_phase_2');
      return phase;
    }

    function pickBossPattern(phase) {
      return pick(phase === 1 ? ['ring', 'snipe'] : phase === 2 ? ['ring', 'snipe', 'rain'] : ['ring', 'snipe', 'rain', 'sweep']);
    }

    function bossWeakRequired(phase) {
      return Math.min(5, 2 + phase);
    }

    function openBossWeakpoint(pattern, phase) {
      const b = bossMode.boss;
      bossMode.weakpoint = {
        active: true,
        hits: 0,
        required: bossWeakRequired(phase),
        x: b.x,
        y: b.y,
        r: 19 + phase * 2,
        pattern,
        timer: bossMode.telegraphDuration
      };
    }

    function closeBossWeakpoint() {
      bossMode.weakpoint = {
        ...bossMode.weakpoint,
        active: false,
        hits: 0,
        pattern: '',
        timer: 0
      };
    }

    function bossWeakpointActive() {
      return !!bossMode.weakpoint?.active && !!bossMode.queuedPattern && bossMode.telegraphTimer > 0;
    }

    function bossWeakState() {
      const weak = bossMode.weakpoint || {};
      return {
        active: !!weak.active,
        hits: Number(weak.hits || 0),
        required: Number(weak.required || 0),
        remaining: Math.max(0, Number(weak.required || 0) - Number(weak.hits || 0)),
        pattern: weak.pattern || '',
        x: Math.round(Number(weak.x || 0)),
        y: Math.round(Number(weak.y || 0)),
        timer: Math.ceil(Number(weak.timer || 0)),
        breakCount: bossMode.breakCount,
        lastBreak: bossMode.lastBreak,
        breakFlash: Math.ceil(bossMode.breakFlash),
        focus: Math.round(Number(bossMode.player.focus || 0)),
        focusSurge: Math.ceil(Number(bossMode.player.focusSurge || 0)),
        focusFlash: Math.ceil(Number(bossMode.focusFlash || 0)),
        focusSurges: Number(bossMode.focusSurges || 0),
        graze: Number(bossMode.player.graze || 0),
        grazeStreak: Number(bossMode.player.grazeStreak || 0),
        bestGrazeStreak: Number(bossMode.player.bestGrazeStreak || 0),
        bullets: bossMode.bullets.length,
        score: Math.floor(bossMode.score),
        hudWeak: document.getElementById('premium-boss-weak')?.textContent || '',
        hudBreak: document.getElementById('premium-boss-break')?.textContent || '',
        hudFocus: document.getElementById('premium-boss-focus')?.textContent || ''
      };
    }

    function breakBossPattern() {
      if (!bossMode.weakpoint.active) return false;
      const pattern = bossMode.weakpoint.pattern || bossMode.queuedPattern || bossMode.currentPattern || '';
      const phase = bossPhaseFromHp();
      const clearedBullets = bossMode.bullets.length;
      bossMode.breakCount++;
      bossMode.lastBreak = bossPatternDefs[pattern]?.label || pattern || '破招';
      bossMode.breakFlash = 920;
      bossMode.score += 420 + phase * 120 + clearedBullets * 8;
      bossMode.boss.hp = Math.max(1, bossMode.boss.hp - (42 + phase * 12));
      bossMode.player.invuln = Math.max(bossMode.player.invuln, 520);
      bossMode.player.focus = Math.min(100, Number(bossMode.player.focus || 0) + 24 + phase * 4);
      bossMode.bullets = [];
      bossMode.queuedPattern = '';
      bossMode.currentPattern = '';
      bossMode.telegraphTimer = 0;
      bossMode.telegraphDuration = 0;
      bossMode.patternTimer = -420;
      bossSpark(bossMode.boss.x, bossMode.boss.y, '#34D399', 34);
      closeBossWeakpoint();
      if (bossMode.player.focus >= 100) activateBossFocusSurge();
      setBossUi();
      return true;
    }

    function hitBossWeakpoint(damage = 0) {
      if (!bossWeakpointActive()) return false;
      const weak = bossMode.weakpoint;
      weak.hits++;
      weak.timer = bossMode.telegraphTimer;
      bossMode.score += 36 + weak.hits * 12;
      bossMode.boss.hp = Math.max(1, bossMode.boss.hp - Math.max(3, Math.round(damage * 0.35)));
      bossSpark(weak.x, weak.y, '#FDE68A', 7);
      if (weak.hits >= weak.required) breakBossPattern();
      else setBossUi();
      return true;
    }

    function startBossTelegraph(forcedPattern = '') {
      if (bossMode.queuedPattern) return bossMode.queuedPattern;
      const phase = bossPhaseFromHp();
      const pressure = Number(activeDifficultyDef().pressure || 1);
      const pattern = forcedPattern || pickBossPattern(phase);
      bossMode.queuedPattern = pattern;
      bossMode.currentPattern = pattern;
      bossMode.telegraphDuration = Math.max(430, (780 - phase * 70) / Math.sqrt(pressure));
      bossMode.telegraphTimer = bossMode.telegraphDuration;
      bossMode.patternFlash = bossMode.telegraphDuration;
      openBossWeakpoint(pattern, phase);
      bossSpark(bossMode.boss.x, bossMode.boss.y, bossPatternDefs[pattern]?.color || '#BAE6FD', 18);
      setBossUi();
      return pattern;
    }

    function spawnBossPattern(pattern = bossMode.queuedPattern || pickBossPattern(bossPhaseFromHp())) {
      const b = bossMode.boss;
      const phase = bossPhaseFromHp();
      bossMode.currentPattern = pattern;
      bossMode.queuedPattern = '';
      bossMode.telegraphTimer = 0;
      bossMode.telegraphDuration = 0;
      bossMode.patternFlash = 320;
      closeBossWeakpoint();
      if (pattern === 'ring') {
        const count = 14 + phase * 8;
        for (let i = 0; i < count; i++) {
          const angle = Math.PI * 2 * i / count + bossMode.t * 0.002;
          bossMode.bullets.push({ x: b.x, y: b.y, vx: Math.cos(angle) * (96 + phase * 26), vy: Math.sin(angle) * (96 + phase * 26), r: 5, color: ['#06B6D4', '#8B5CF6', '#EC4899', '#F97316'][i % 4], grazed: false });
        }
      }
      if (pattern === 'snipe') {
        const base = Math.atan2(bossMode.player.y - b.y, bossMode.player.x - b.x);
        for (let i = -3; i <= 3; i++) bossMode.bullets.push({ x: b.x, y: b.y, vx: Math.cos(base + i * 0.13) * (178 + phase * 22), vy: Math.sin(base + i * 0.13) * (178 + phase * 22), r: 6, color: '#F97316', grazed: false });
      }
      if (pattern === 'rain') {
        for (let i = 0; i < 18 + phase * 4; i++) {
          const x = 20 + i * 30 + Math.sin(bossMode.t / 300 + i) * 10;
          bossMode.bullets.push({ x, y: -18, vx: Math.sin(i) * 18, vy: 145 + phase * 28, r: 5, color: '#A78BFA', grazed: false });
        }
      }
      if (pattern === 'sweep') {
        for (let i = 0; i < 2; i++) {
          const fromLeft = i === 0;
          bossMode.bullets.push({ x: fromLeft ? -20 : bossMode.canvas.width + 20, y: 128 + i * 74, vx: fromLeft ? 220 : -220, vy: 18, r: 9, color: '#EC4899', grazed: false });
        }
      }
      setBossUi();
    }

    function runBoss(now) {
      if (!bossMode.running) return;
      const dt = Math.min(34, now - bossMode.last);
      bossMode.last = now;
      if (bossMode.paused) {
        drawBoss();
        overlay(bossMode.ctx, bossMode.canvas.width, bossMode.canvas.height, 'PAUSED', 'P / Esc 或按钮继续 Boss 战');
        bossMode.raf = requestAnimationFrame(runBoss);
        return;
      }
      const p = bossMode.player;
      const b = bossMode.boss;
      bossMode.t += dt;
      bossMode.shotTimer += dt;
      bossMode.patternTimer += dt;
      bossMode.patternFlash = Math.max(0, bossMode.patternFlash - dt);
      bossMode.breakFlash = Math.max(0, bossMode.breakFlash - dt);
      bossMode.focusFlash = Math.max(0, bossMode.focusFlash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.dash = Math.max(0, p.dash - dt);
      p.dashCooldown = Math.max(0, p.dashCooldown - dt);
      p.focusSurge = Math.max(0, Number(p.focusSurge || 0) - dt);
      const speed = p.dash > 0 ? 410 : 225;
      p.x = clamp(p.x + ((premiumKeys.right ? 1 : 0) - (premiumKeys.left ? 1 : 0)) * speed * dt / 1000, 16, bossMode.canvas.width - 16);
      p.y = clamp(p.y + ((premiumKeys.down ? 1 : 0) - (premiumKeys.up ? 1 : 0)) * speed * 0.72 * dt / 1000, 178, bossMode.canvas.height - 18);
      if (premiumKeys.action && p.dashCooldown <= 0) {
        p.dash = 210;
        p.dashCooldown = Math.max(720, 1150 + Number(bossMode.bonuses.bossDashMs || 0));
        p.invuln = Math.max(p.invuln, 280);
        bossSpark(p.x, p.y, '#34D399', 16);
      }
      b.x = bossMode.canvas.width / 2 + Math.sin(bossMode.t / 850) * 130;
      b.y = 84 + Math.sin(bossMode.t / 520) * 18;
      if (bossMode.weakpoint.active) {
        bossMode.weakpoint.x = b.x;
        bossMode.weakpoint.y = b.y;
        bossMode.weakpoint.timer = bossMode.telegraphTimer;
      }
      if (bossMode.shotTimer > (p.focusSurge > 0 ? 54 : 88)) {
        bossMode.shotTimer = 0;
        const surgeDamage = p.focusSurge > 0 ? 7 + Math.floor(Number(p.bestGrazeStreak || 0) / 4) : 0;
        bossMode.shots.push({ x: p.x, y: p.y - 16, vy: p.focusSurge > 0 ? -560 : -470, r: p.focusSurge > 0 ? 5 : 4, damage: 9 + Math.floor(p.graze / 9) + surgeDamage, surge: p.focusSurge > 0 });
      }
      const phase = bossPhaseFromHp();
      if (bossMode.queuedPattern) {
        bossMode.telegraphTimer = Math.max(0, bossMode.telegraphTimer - dt);
        if (bossMode.telegraphTimer <= 0) {
          spawnBossPattern(bossMode.queuedPattern);
          bossMode.patternTimer = 0;
        }
      } else if (bossMode.patternTimer > Math.max(430, (1150 - phase * 170) / Number(activeDifficultyDef().pressure || 1))) {
        bossMode.patternTimer = 0;
        startBossTelegraph();
      }
      bossMode.shots.forEach(s => s.y += s.vy * dt / 1000);
      bossMode.bullets.forEach(s => { s.x += s.vx * dt / 1000; s.y += s.vy * dt / 1000; });
      bossMode.particles.forEach(pt => { pt.x += pt.vx * dt / 1000; pt.y += pt.vy * dt / 1000; pt.life -= dt; });
      bossMode.particles = bossMode.particles.filter(pt => pt.life > 0);
      bossMode.shots = bossMode.shots.filter(s => s.y > -20);
      bossMode.bullets = bossMode.bullets.filter(s => s.x > -40 && s.x < bossMode.canvas.width + 40 && s.y > -40 && s.y < bossMode.canvas.height + 40);
      bossMode.shots = bossMode.shots.filter(s => {
        if (bossWeakpointActive() && Math.hypot(s.x - bossMode.weakpoint.x, s.y - bossMode.weakpoint.y) < s.r + bossMode.weakpoint.r) {
          hitBossWeakpoint(s.damage);
          return false;
        }
        if (Math.hypot(s.x - b.x, s.y - b.y) < s.r + b.r) {
          b.hp -= s.damage;
          bossMode.score += 6;
          bossSpark(s.x, s.y, '#BAE6FD', 2);
          return false;
        }
        return true;
      });
      bossMode.bullets = bossMode.bullets.filter(s => {
        const distance = Math.hypot(s.x - p.x, s.y - p.y);
        if (!s.grazed && distance < s.r + p.r + 12 && distance > s.r + p.r) {
          s.grazed = true;
          awardBossGraze();
        }
        if (p.invuln <= 0 && Math.hypot(s.x - p.x, s.y - p.y) < s.r + p.r) {
          p.lives--;
          p.invuln = 1400;
          p.grazeStreak = 0;
          p.focus = Math.max(0, Number(p.focus || 0) - 32);
          p.focusSurge = 0;
          bossSpark(p.x, p.y, '#EF4444', 26);
          return false;
        }
        return true;
      });
      if (p.lives <= 0) return finishBoss('SHIP DOWN');
      if (b.hp <= 0) {
        bossMode.score += 1500;
        return finishBoss('PRISM BROKEN');
      }
      setBossUi();
      drawBoss();
      bossMode.raf = requestAnimationFrame(runBoss);
    }

    function drawBossTelegraph(ctx, c) {
      const pattern = bossMode.queuedPattern;
      if (!pattern) return;
      const b = bossMode.boss;
      const p = bossMode.player;
      const progress = clamp(1 - bossMode.telegraphTimer / Math.max(1, bossMode.telegraphDuration), 0, 1);
      const color = bossPatternDefs[pattern]?.color || '#BAE6FD';
      ctx.save();
      ctx.globalAlpha = 0.28 + progress * 0.46;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2 + progress * 2;
      ctx.setLineDash([8, 8]);
      if (pattern === 'ring') {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 58 + progress * 92, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (pattern === 'snipe') {
        const base = Math.atan2(p.y - b.y, p.x - b.x);
        for (let i = -3; i <= 3; i++) {
          const angle = base + i * 0.13;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x + Math.cos(angle) * 540, b.y + Math.sin(angle) * 540);
          ctx.stroke();
        }
      }
      if (pattern === 'rain') {
        for (let i = 0; i < 18; i++) {
          const x = 20 + i * 30 + Math.sin(bossMode.t / 300 + i) * 10;
          ctx.fillRect(x - 5, 0, 10, c.height);
        }
      }
      if (pattern === 'sweep') {
        [128, 202].forEach(y => {
          ctx.fillRect(0, y - 7, c.width, 14);
          ctx.strokeRect(4, y - 12, c.width - 8, 24);
        });
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = '900 12px JetBrains Mono, monospace';
      ctx.fillText(`WARNING · ${bossPatternDefs[pattern]?.label || pattern}`, 18, 62);
      ctx.restore();
    }

    function drawBossWeakpoint(ctx) {
      const weak = bossMode.weakpoint;
      if (!weak?.active && bossMode.breakFlash <= 0) return;
      ctx.save();
      if (weak?.active) {
        const required = Math.max(1, Number(weak.required || 1));
        const hits = Math.min(required, Number(weak.hits || 0));
        const progress = hits / required;
        const timeProgress = clamp(1 - bossMode.telegraphTimer / Math.max(1, bossMode.telegraphDuration), 0, 1);
        const pulse = Math.sin(bossMode.t / 56) * 2.5;
        ctx.translate(weak.x, weak.y);
        ctx.shadowColor = '#FDE68A';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FDE68A';
        ctx.beginPath();
        ctx.arc(0, 0, weak.r + 4 + pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(253, 230, 138, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, weak.r + 12 + timeProgress * 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#34D399';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, weak.r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF7ED';
        ctx.font = '900 10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.max(0, required - hits)}`, 0, 1);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#FDE68A';
        ctx.font = '900 11px JetBrains Mono, monospace';
        ctx.fillText(`COUNTER ${Math.max(0, required - hits)}/${required}`, Math.max(18, weak.x - 45), Math.max(32, weak.y - weak.r - 22));
      }
      if (bossMode.breakFlash > 0) {
        const alpha = clamp(bossMode.breakFlash / 920, 0, 1);
        ctx.globalAlpha = 0.18 + alpha * 0.28;
        ctx.fillStyle = '#34D399';
        ctx.fillRect(0, 0, bossMode.canvas.width, bossMode.canvas.height);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ECFDF5';
        ctx.font = '900 24px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#34D399';
        ctx.shadowBlur = 18;
        ctx.fillText('COUNTER BREAK', bossMode.canvas.width / 2, 132);
        if (bossMode.lastBreak) {
          ctx.font = '800 12px JetBrains Mono, monospace';
          ctx.fillText(`破招 ${bossMode.lastBreak}  +${bossMode.breakCount}`, bossMode.canvas.width / 2, 154);
        }
      }
      ctx.restore();
    }

    function drawBoss() {
      const { ctx, canvas: c, boss: b, player: p } = bossMode;
      if (!ctx || !c) return;
      ctx.fillStyle = '#050816';
      ctx.fillRect(0, 0, c.width, c.height);
      drawGrid(ctx, c.width, c.height, 'rgba(236, 72, 153, 0.07)', 30);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(bossMode.t / 550);
      ctx.strokeStyle = '#EC4899';
      ctx.shadowColor = '#EC4899';
      ctx.shadowBlur = 22;
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const r = i % 2 ? b.r * 0.65 : b.r;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      drawBossTelegraph(ctx, c);
      drawBossWeakpoint(ctx);
      bossMode.shots.forEach(s => {
        ctx.fillStyle = s.surge ? '#FDE68A' : '#BAE6FD';
        ctx.fillRect(s.x - (s.surge ? 3 : 2), s.y - 9, s.surge ? 6 : 4, s.surge ? 15 : 12);
      });
      bossMode.bullets.forEach(s => { ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); });
      bossMode.particles.forEach(pt => {
        ctx.globalAlpha = Math.max(0, pt.life / 360);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      if (p.dash > 0) {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 24, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (p.focusSurge > 0 || bossMode.focusFlash > 0) {
        const alpha = p.focusSurge > 0 ? 0.34 : clamp(bossMode.focusFlash / 980, 0, 1) * 0.3;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#FDE68A';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 31 + Math.sin(bossMode.t / 72) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FDE68A';
        ctx.font = '900 10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('FOCUS SURGE', p.x, p.y - 30);
        ctx.restore();
      }
      ctx.fillStyle = p.invuln > 0 ? '#34D399' : '#06B6D4';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 16);
      ctx.lineTo(p.x + 13, p.y + 14);
      ctx.lineTo(p.x - 13, p.y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.fillRect(18, 16, c.width - 36, 8);
      ctx.fillStyle = '#EC4899';
      ctx.fillRect(18, 16, (c.width - 36) * Math.max(0, b.hp / b.maxHp), 8);
      ctx.fillStyle = '#fff';
      ctx.font = '700 12px JetBrains Mono, monospace';
      ctx.fillText(`PHASE ${b.phase}  GRAZE ${p.graze}  FOCUS ${p.focusSurge > 0 ? 'SURGE' : Math.round(Number(p.focus || 0)) + '%'}  BREAK ${bossMode.breakCount}`, 18, 42);
    }

    document.getElementById('premium-boss-start').addEventListener('click', startBoss);
    document.getElementById('premium-boss-pause').addEventListener('click', () => {
      toggleBossPause();
    });
    setBossUi();
    updateBossPauseButton();
    drawBoss();
    overlay(bossMode.ctx, bossMode.canvas.width, bossMode.canvas.height, '棱镜核心等待挑战', 'A/D 移动 · Space 冲刺无敌 · 自动射击');

    const drift = {
      canvas: document.getElementById('premium-drift-canvas'),
      ctx: document.getElementById('premium-drift-canvas')?.getContext('2d'),
      bestKey: 'atherix_premium_drift_best',
      running: false,
      paused: false,
      raf: null,
      last: 0,
      elapsed: 0,
      score: 0,
      gateIndex: 0,
      multiplier: 1,
      boost: 100,
      maxBoost: 100,
      hitCooldown: 0,
      combo: 0,
      bestCombo: 0,
      lineQuality: 0,
      lineLabel: 'READY',
      lineTone: 'ready',
      lineFlash: 0,
      lineBank: 0,
      draft: 0,
      draftBank: 0,
      overtakes: 0,
      heat: 0,
      heatPeak: 0,
      phaseCharge: 100,
      phaseBrake: 0,
      phaseUses: 0,
      contractIndex: 0,
      contractProgress: 0,
      contractsCompleted: 0,
      lastContract: '',
      lastTactic: '',
      splits: [],
      rival: { x: 132, y: 238, r: 13, segment: 0, progress: 0, speed: 0.000092, flash: 0, pressure: 0, gap: 0 },
      player: { x: 70, y: 276, vx: 0, vy: 0, angle: -0.62, r: 12, shield: 100, trail: [] },
      gates: [
        { x: 132, y: 238, r: 27 },
        { x: 220, y: 126, r: 27 },
        { x: 356, y: 86, r: 27 },
        { x: 488, y: 142, r: 27 },
        { x: 462, y: 282, r: 27 },
        { x: 310, y: 294, r: 27 },
        { x: 166, y: 176, r: 27 },
        { x: 74, y: 82, r: 27 }
      ],
      barriers: [
        { x: 190, y: 188, w: 88, h: 22 },
        { x: 326, y: 152, w: 24, h: 92 },
        { x: 410, y: 42, w: 24, h: 72 },
        { x: 74, y: 130, w: 26, h: 86 }
      ],
      drones: [],
      particles: []
    };
    const driftSponsorDefs = [
      { id: 'apex', label: 'APEX', target: 3, reward: 620, heatDrop: 8, charge: 24, check: ({ grade }) => grade.quality >= 70 },
      { id: 'rival', label: 'RIVAL', target: 2, reward: 760, heatDrop: 10, charge: 30, check: ({ overtakeBonus }) => overtakeBonus > 0 },
      { id: 'cool', label: 'COOL', target: 4, reward: 700, heatDrop: 18, charge: 28, check: ({ grade }) => grade.quality >= 52 && drift.heat <= 58 }
    ];

    function currentDriftSponsor() {
      return driftSponsorDefs[drift.contractIndex % driftSponsorDefs.length];
    }

    function formatDriftSponsor() {
      const sponsor = currentDriftSponsor();
      return `${sponsor.label} ${Math.min(drift.contractProgress, sponsor.target)}/${sponsor.target}`;
    }

    function addDriftHeat(amount) {
      drift.heat = clamp(Number(drift.heat || 0) + amount, 0, 100);
      drift.heatPeak = Math.max(Number(drift.heatPeak || 0), drift.heat);
    }

    function chargeDriftPhase(amount) {
      drift.phaseCharge = clamp(Number(drift.phaseCharge || 0) + amount, 0, 100);
    }

    function resolveDriftSponsor(context) {
      const sponsor = currentDriftSponsor();
      if (!sponsor?.check(context)) return { completed: false, label: sponsor?.label || '', reward: 0 };
      drift.contractProgress++;
      drift.lastContract = '';
      if (drift.contractProgress < sponsor.target) {
        drift.lastTactic = `${sponsor.label} 合约推进 ${drift.contractProgress}/${sponsor.target}`;
        return { completed: false, label: sponsor.label, reward: 0 };
      }
      drift.contractProgress = 0;
      drift.contractIndex++;
      drift.contractsCompleted++;
      drift.lastContract = sponsor.label;
      drift.lastTactic = `${sponsor.label} 赞助达成 +${sponsor.reward}`;
      drift.score += sponsor.reward;
      drift.lineBank += Math.floor(sponsor.reward * 0.18);
      addDriftHeat(-sponsor.heatDrop);
      chargeDriftPhase(sponsor.charge);
      unlockAchievement('drift_sponsor');
      driftSpark(drift.player.x, drift.player.y, '#FDE68A', 42);
      return { completed: true, label: sponsor.label, reward: sponsor.reward };
    }

    function triggerDriftPhaseBrake() {
      if (!drift.running || drift.paused || drift.phaseBrake > 0) return false;
      if (drift.phaseCharge < 100) {
        drift.lastTactic = `相位充能 ${Math.floor(drift.phaseCharge)}%`;
        setDriftUi();
        return false;
      }
      drift.phaseCharge = 0;
      drift.phaseBrake = 1450;
      drift.phaseUses++;
      drift.lastTactic = '相位刹车：路线锁定';
      drift.lineLabel = 'PHASE';
      drift.lineTone = 'perfect';
      drift.lineQuality = Math.max(drift.lineQuality, 88);
      drift.lineFlash = 980;
      addDriftHeat(-22);
      drift.boost = Math.min(drift.maxBoost, drift.boost + 22);
      drift.player.vx *= 0.68;
      drift.player.vy *= 0.68;
      const angle = driftSegmentAngle(drift.gateIndex);
      if (Number.isFinite(angle)) drift.player.angle = angle;
      driftSpark(drift.player.x, drift.player.y, '#FDE68A', 34);
      setDriftUi();
      drawDrift();
      return true;
    }

    function setDriftUi() {
      document.getElementById('premium-drift-score').textContent = Math.floor(drift.score);
      document.getElementById('premium-drift-gates').textContent = drift.gateIndex;
      document.getElementById('premium-drift-best').textContent = localStorage.getItem(drift.bestKey) || '0';
      document.getElementById('premium-drift-shield').textContent = Math.max(0, Math.ceil(drift.player.shield));
      document.getElementById('premium-drift-mult').textContent = `x${drift.multiplier.toFixed(1)}`;
      document.getElementById('premium-drift-boost').textContent = drift.boost >= drift.maxBoost - 4 ? 'READY' : `${Math.ceil(drift.boost)}%`;
      const lineEl = document.getElementById('premium-drift-line');
      if (lineEl) {
        lineEl.textContent = drift.lineLabel === 'READY' ? 'READY' : `${drift.lineLabel} ${drift.lineQuality}`;
        lineEl.style.color = drift.lineTone === 'perfect' ? '#FDE68A' : drift.lineTone === 'apex' ? '#A7F3D0' : drift.lineTone === 'clean' ? '#BAE6FD' : drift.lineTone === 'danger' ? '#FCA5A5' : '#CBD5E1';
      }
      const comboEl = document.getElementById('premium-drift-combo');
      if (comboEl) {
        comboEl.textContent = `${drift.combo}x`;
        comboEl.style.color = drift.combo >= 4 ? '#FDE68A' : drift.combo >= 2 ? '#A7F3D0' : '#fff';
      }
      const rivalEl = document.getElementById('premium-drift-rival');
      if (rivalEl) {
        const gap = Number(drift.rival?.gap || 0);
        rivalEl.textContent = `${gap >= 0 ? '+' : ''}${gap.toFixed(1)}G`;
        rivalEl.style.color = gap >= 0.35 ? '#A7F3D0' : gap >= -0.35 ? '#FDE68A' : '#FCA5A5';
      }
      const overtakeEl = document.getElementById('premium-drift-overtake');
      if (overtakeEl) {
        overtakeEl.textContent = drift.draft > 0.35 ? `DRAFT ${Math.round(drift.draft * 100)}` : String(drift.overtakes);
        overtakeEl.style.color = drift.overtakes >= 3 ? '#FDE68A' : drift.draft > 0.35 ? '#BAE6FD' : '#fff';
      }
      const contractEl = document.getElementById('premium-drift-contract');
      if (contractEl) {
        contractEl.textContent = formatDriftSponsor();
        contractEl.style.color = drift.lastContract ? '#FDE68A' : drift.contractProgress > 0 ? '#A7F3D0' : '#fff';
      }
      const heatEl = document.getElementById('premium-drift-heat');
      if (heatEl) {
        heatEl.textContent = `${Math.floor(drift.heat)}%`;
        heatEl.style.color = drift.heat >= 75 ? '#FCA5A5' : drift.heat >= 45 ? '#FDE68A' : '#A7F3D0';
      }
      const phaseEl = document.getElementById('premium-drift-phase');
      if (phaseEl) {
        phaseEl.textContent = drift.phaseBrake > 0 ? 'BRAKE' : drift.phaseCharge >= 100 ? 'READY' : `${Math.floor(drift.phaseCharge)}%`;
        phaseEl.style.color = drift.phaseBrake > 0 || drift.phaseCharge >= 100 ? '#FDE68A' : '#BAE6FD';
      }
      const phaseBtn = document.getElementById('premium-drift-phase-btn');
      if (phaseBtn) {
        phaseBtn.textContent = drift.phaseBrake > 0 ? 'Q 相位中' : drift.phaseCharge >= 100 ? 'Q 相位 READY' : `Q 相位 ${Math.floor(drift.phaseCharge)}%`;
        phaseBtn.dataset.ready = drift.phaseCharge >= 100 && drift.phaseBrake <= 0 && drift.running && !drift.paused ? 'true' : 'false';
        phaseBtn.setAttribute('aria-disabled', !drift.running || drift.paused || drift.phaseBrake > 0 || drift.phaseCharge < 100 ? 'true' : 'false');
      }
    }

    function resetDriftState() {
      const bonuses = loadoutBonuses();
      const tuning = difficultyTuning();
      const pressure = Number(activeDifficultyDef().pressure || 1);
      drift.running = true;
      drift.paused = false;
      drift.last = performance.now();
      drift.elapsed = 0;
      drift.score = 0;
      drift.gateIndex = 0;
      drift.multiplier = 1;
      drift.maxBoost = 100 + Number(bonuses.driftBoost || 0);
      drift.boost = drift.maxBoost;
      drift.hitCooldown = 0;
      drift.combo = 0;
      drift.bestCombo = 0;
      drift.lineQuality = 0;
      drift.lineLabel = 'READY';
      drift.lineTone = 'ready';
      drift.lineFlash = 0;
      drift.lineBank = 0;
      drift.draft = 0;
      drift.draftBank = 0;
      drift.overtakes = 0;
      drift.heat = 16;
      drift.heatPeak = 16;
      drift.phaseCharge = 100;
      drift.phaseBrake = 0;
      drift.phaseUses = 0;
      drift.contractIndex = 0;
      drift.contractProgress = 0;
      drift.contractsCompleted = 0;
      drift.lastContract = '';
      drift.lastTactic = '起跑相位已就绪';
      drift.splits = [];
      drift.rival = { x: 132, y: 238, r: 13, segment: 0, progress: 0, speed: 0.000092 * pressure, flash: 0, pressure: 0, gap: -0.2 };
      drift.player = { x: 70, y: 276, vx: 0, vy: 0, angle: -0.62, r: 12, shield: 100 + Number(bonuses.driftShield || 0) + Number(tuning.shield || 0), trail: [] };
      drift.drones = [
        { x: 278, y: 66, baseX: 278, baseY: 66, ampX: 110, ampY: 34, phase: 0, speed: 0.0016 * pressure, r: 13 },
        { x: 430, y: 228, baseX: 430, baseY: 228, ampX: 52, ampY: 78, phase: 1.7, speed: 0.002 * pressure, r: 12 },
        { x: 218, y: 286, baseX: 218, baseY: 286, ampX: 56, ampY: 26, phase: 3.1, speed: 0.0018 * pressure, r: 11 }
      ];
      drift.particles = [];
    }

    function startDrift() {
      resetDriftState();
      setDriftUi();
      updateDriftPauseButton();
      cancelAnimationFrame(drift.raf);
      focusStage();
      drift.raf = requestAnimationFrame(runDrift);
    }

    function updateDriftPauseButton() {
      const btn = document.getElementById('premium-drift-pause');
      if (btn) btn.textContent = drift.paused ? '继续' : '暂停';
    }

    function toggleDriftPause(force) {
      if (!drift.running) return false;
      drift.paused = typeof force === 'boolean' ? force : !drift.paused;
      drift.last = performance.now();
      clearPremiumKeys();
      updateDriftPauseButton();
      focusStage();
      return true;
    }

    function driftSpark(x, y, color, count = 10) {
      for (let i = 0; i < count; i++) {
        drift.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 150,
          vy: (Math.random() - 0.5) * 150,
          life: 440,
          r: Math.random() * 2.6 + 1,
          color
        });
      }
    }

    function damageDrift(amount, x, y) {
      if (drift.hitCooldown > 0) return;
      const phaseGuard = drift.phaseBrake > 0;
      const finalDamage = phaseGuard ? amount * 0.45 : amount;
      drift.player.shield -= finalDamage;
      const heatGain = phaseGuard ? 3 + amount * 0.22 : 10 + amount * 0.8;
      addDriftHeat(heatGain);
      chargeDriftPhase(phaseGuard ? 11 : 6);
      drift.lastTactic = phaseGuard ? '相位擦碰：损伤降低' : `碰撞热度 +${Math.round(heatGain)}`;
      drift.multiplier = Math.max(1, drift.multiplier * (phaseGuard ? 0.88 : 0.72));
      drift.combo = 0;
      drift.lineLabel = phaseGuard ? 'GLANCING' : 'BROKEN';
      drift.lineTone = phaseGuard ? 'clean' : 'danger';
      drift.lineQuality = phaseGuard ? 42 : 0;
      drift.lineFlash = 860;
      drift.hitCooldown = phaseGuard ? 420 : 760;
      drift.player.vx *= phaseGuard ? -0.18 : -0.36;
      drift.player.vy *= phaseGuard ? -0.18 : -0.36;
      driftSpark(x, y, phaseGuard ? '#FDE68A' : '#EF4444', phaseGuard ? 18 : 28);
    }

    function driftRectCollision(rect) {
      const p = drift.player;
      const nearestX = clamp(p.x, rect.x, rect.x + rect.w);
      const nearestY = clamp(p.y, rect.y, rect.y + rect.h);
      return Math.hypot(p.x - nearestX, p.y - nearestY) < p.r + 2;
    }

    function driftAngleDelta(a, b) {
      return Math.atan2(Math.sin(a - b), Math.cos(a - b));
    }

    function driftSegmentAngle(index) {
      const gate = drift.gates[index];
      const next = drift.gates[index + 1];
      if (!gate || !next) return drift.player.angle;
      return Math.atan2(next.y - gate.y, next.x - gate.x);
    }

    function driftPlayerRouteProgress() {
      if (drift.gateIndex >= drift.gates.length) return drift.gates.length;
      const p = drift.player;
      if (drift.gateIndex <= 0) {
        const start = { x: 70, y: 276 };
        const first = drift.gates[0];
        const dx = first.x - start.x;
        const dy = first.y - start.y;
        const lenSq = Math.max(1, dx * dx + dy * dy);
        return clamp(((p.x - start.x) * dx + (p.y - start.y) * dy) / lenSq, 0, 1) * 0.85;
      }
      const prev = drift.gates[drift.gateIndex - 1];
      const next = drift.gates[drift.gateIndex];
      if (!prev || !next) return drift.gateIndex;
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const lenSq = Math.max(1, dx * dx + dy * dy);
      const t = clamp(((p.x - prev.x) * dx + (p.y - prev.y) * dy) / lenSq, 0, 1);
      return drift.gateIndex - 1 + t;
    }

    function driftRivalProgress() {
      const rival = drift.rival;
      if (!rival) return 0;
      return rival.segment + rival.progress;
    }

    function updateDriftRival(dt) {
      const rival = drift.rival;
      if (!rival) return;
      rival.flash = Math.max(0, rival.flash - dt);
      rival.progress += dt * rival.speed * (1 + drift.gateIndex * 0.018);
      while (rival.progress >= 1 && rival.segment < drift.gates.length - 2) {
        rival.progress -= 1;
        rival.segment++;
      }
      const from = drift.gates[rival.segment] || drift.gates[0];
      const to = drift.gates[rival.segment + 1] || from;
      rival.x = from.x + (to.x - from.x) * rival.progress;
      rival.y = from.y + (to.y - from.y) * rival.progress;
      rival.gap = driftPlayerRouteProgress() - driftRivalProgress();
      rival.pressure = clamp(1 - Math.abs(rival.gap) / 1.35, 0, 1);

      const dist = Math.hypot(rival.x - drift.player.x, rival.y - drift.player.y);
      const draftWindow = rival.gap < 0.55 && rival.gap > -1.45;
      drift.draft = draftWindow ? clamp(1 - dist / 96, 0, 1) : 0;
      if (drift.draft > 0.08) {
        drift.boost = Math.min(drift.maxBoost, drift.boost + dt * 0.032 * drift.draft);
        drift.score += dt * 0.052 * drift.draft * drift.multiplier;
        drift.draftBank += dt * 0.024 * drift.draft;
      }
      if (dist < drift.player.r + rival.r - 2 && drift.hitCooldown <= 0) {
        damageDrift(9, rival.x, rival.y);
        rival.flash = 760;
      }
    }

    function awardDriftOvertake(grade, speed) {
      const qualifies = grade.quality >= 86 || (grade.quality >= 70 && drift.draft >= 0.5);
      if (!qualifies) return 0;
      drift.overtakes++;
      if (drift.rival) {
        drift.rival.flash = 1040;
        drift.rival.progress = Math.max(0, drift.rival.progress - 0.12);
      }
      const bonus = Math.floor((260 + grade.quality * 4 + speed * 0.35 + drift.combo * 44) * drift.multiplier);
      drift.score += bonus;
      drift.boost = Math.min(drift.maxBoost, drift.boost + 20 + drift.combo * 3);
      drift.lineBank += 86 + drift.overtakes * 16;
      driftSpark(drift.player.x, drift.player.y, '#FDE68A', 34);
      return bonus;
    }

    function driftToneColor(tone) {
      if (tone === 'perfect') return '#FDE68A';
      if (tone === 'apex') return '#34D399';
      if (tone === 'clean') return '#BAE6FD';
      if (tone === 'danger') return '#F97316';
      return '#94A3B8';
    }

    function gradeDriftGate(gate, speed) {
      const p = drift.player;
      const distance = Math.hypot(gate.x - p.x, gate.y - p.y);
      const centerScore = clamp(1 - distance / Math.max(1, gate.r + p.r), 0, 1);
      const speedScore = clamp((speed - 95) / 185, 0, 1);
      const targetAngle = driftSegmentAngle(drift.gateIndex);
      const angleScore = drift.gateIndex >= drift.gates.length - 1
        ? 0.78
        : clamp(1 - Math.abs(driftAngleDelta(p.angle, targetAngle)) / 1.32, 0, 1);
      const quality = Math.round(100 * (centerScore * 0.48 + speedScore * 0.28 + angleScore * 0.24));
      if (quality >= 86) return { label: 'PERFECT', tone: 'perfect', quality, bonus: 1.42, boost: 34, comboKeep: true };
      if (quality >= 70) return { label: 'APEX', tone: 'apex', quality, bonus: 1.22, boost: 28, comboKeep: true };
      if (quality >= 52) return { label: 'CLEAN', tone: 'clean', quality, bonus: 1.08, boost: 22, comboKeep: true };
      return { label: 'SCRAPPY', tone: 'danger', quality, bonus: 0.88, boost: 12, comboKeep: false };
    }

    function applyDriftLineGrade(grade, gate, speed) {
      drift.lineQuality = grade.quality;
      drift.lineLabel = grade.label;
      drift.lineTone = grade.tone;
      drift.lineFlash = 920;
      drift.combo = grade.comboKeep ? drift.combo + 1 : 0;
      drift.bestCombo = Math.max(drift.bestCombo, drift.combo);
      drift.multiplier = Math.min(4.6, drift.multiplier + 0.18 + drift.combo * 0.045 + (grade.quality >= 86 ? 0.14 : 0));
      if (drift.multiplier >= 3) unlockAchievement('drift_combo');
      drift.boost = Math.min(drift.maxBoost, drift.boost + grade.boost + drift.combo * 2);
      const splitScore = Math.floor((210 + speed * 0.72) * drift.multiplier * grade.bonus + drift.combo * 42);
      drift.lineBank += Math.max(0, grade.quality - 52) * 2 + drift.combo * 18;
      drift.score += splitScore;
      const overtakeBonus = awardDriftOvertake(grade, speed);
      addDriftHeat(grade.quality >= 86 ? -9 : grade.quality >= 70 ? -4 : grade.quality >= 52 ? 5 : 13);
      chargeDriftPhase(grade.quality * 0.16 + drift.combo * 2.5 + (overtakeBonus > 0 ? 16 : 0) + (drift.phaseBrake > 0 ? 12 : 0));
      const sponsorResult = resolveDriftSponsor({ grade, gate, speed, overtakeBonus });
      drift.splits.unshift({
        gate: drift.gateIndex + 1,
        label: grade.label,
        quality: grade.quality,
        score: splitScore,
        overtakeBonus,
        sponsor: sponsorResult.completed ? sponsorResult.label : '',
        heat: Math.floor(drift.heat),
        combo: drift.combo,
        age: 1800
      });
      drift.splits = drift.splits.slice(0, 4);
      driftSpark(gate.x, gate.y, driftToneColor(grade.tone), grade.quality >= 70 ? 42 : 24);
    }

    function passDriftGate(speed) {
      const gate = drift.gates[drift.gateIndex];
      if (!gate) return;
      const grade = gradeDriftGate(gate, speed);
      applyDriftLineGrade(grade, gate, speed);
      drift.gateIndex++;
      if (drift.gateIndex >= drift.gates.length) finishDrift('NEON ROUTE CLEARED');
    }

    function finishDrift(text) {
      if (!drift.running) return;
      drift.running = false;
      drift.paused = false;
      cancelAnimationFrame(drift.raf);
      const complete = drift.gateIndex >= drift.gates.length;
      const timeBonus = complete ? Math.max(0, 76000 - drift.elapsed) / 42 : 0;
      const finalScore = Math.floor(drift.score + drift.gateIndex * 120 + drift.player.shield * 7 + timeBonus + drift.bestCombo * 75 + drift.lineBank + drift.overtakes * 180 + drift.draftBank);
      localStorage.setItem(drift.bestKey, String(Math.max(Number(localStorage.getItem(drift.bestKey) || 0), finalScore)));
      if (complete) unlockAchievement('drift_clear');
      if (complete && drift.player.shield >= 75) unlockAchievement('drift_clean');
      recordPremiumResult('drift', finalScore, {
        gates: drift.gateIndex,
        shield: drift.player.shield,
        elapsed: drift.elapsed,
        bestCombo: drift.bestCombo,
        line: drift.lineLabel,
        overtakes: drift.overtakes,
        draft: Math.floor(drift.draftBank),
        contractsCompleted: drift.contractsCompleted,
        heatPeak: Math.floor(drift.heatPeak),
        phaseUses: drift.phaseUses
      });
      setDriftUi();
      updateDriftPauseButton();
      drawDrift();
      overlay(drift.ctx, drift.canvas.width, drift.canvas.height, text, `Score ${finalScore} · 点击点火再来一局`);
    }

    function runDrift(now) {
      if (!drift.running) return;
      const dt = Math.min(34, now - drift.last);
      drift.last = now;
      if (drift.paused) {
        drawDrift();
        overlay(drift.ctx, drift.canvas.width, drift.canvas.height, 'PAUSED', 'P / Esc 或按钮继续漂移');
        drift.raf = requestAnimationFrame(runDrift);
        return;
      }

      const p = drift.player;
      const phaseActive = drift.phaseBrake > 0;
      drift.phaseBrake = Math.max(0, drift.phaseBrake - dt);
      const turn = (premiumKeys.right ? 1 : 0) - (premiumKeys.left ? 1 : 0);
      const thrust = (premiumKeys.up ? 1 : 0) - (premiumKeys.down ? 0.55 : 0);
      const boostActive = premiumKeys.action && drift.boost > 2;
      const turnRate = 0.0044 * dt * (boostActive ? 1.08 : 1) * (phaseActive ? 1.55 : 1);
      p.angle += turn * turnRate;
      if (phaseActive) {
        const targetAngle = driftSegmentAngle(drift.gateIndex);
        if (Number.isFinite(targetAngle)) {
          p.angle -= driftAngleDelta(p.angle, targetAngle) * clamp(dt * 0.0055, 0, 0.24);
        }
      }
      if (thrust !== 0 || boostActive) {
        const accel = (boostActive ? 520 : 285) * (thrust >= 0 ? 1 : 0.72) * (phaseActive ? 0.58 : 1);
        const dir = thrust >= 0 ? p.angle : p.angle + Math.PI;
        p.vx += Math.cos(dir) * accel * dt / 1000;
        p.vy += Math.sin(dir) * accel * dt / 1000;
      }
      if (boostActive) {
        drift.boost = Math.max(0, drift.boost - dt * (phaseActive ? 0.045 : 0.08));
        drift.score += dt * 0.075 * drift.multiplier;
        driftSpark(p.x - Math.cos(p.angle) * 12, p.y - Math.sin(p.angle) * 12, phaseActive ? '#FDE68A' : '#BAE6FD', phaseActive ? 3 : 2);
      } else {
        drift.boost = Math.min(drift.maxBoost, drift.boost + dt * (phaseActive ? 0.03 : 0.018));
      }

      drift.elapsed += dt;
      drift.hitCooldown = Math.max(0, drift.hitCooldown - dt);
      drift.lineFlash = Math.max(0, drift.lineFlash - dt);
      const drag = Math.pow(phaseActive ? 0.946 : premiumKeys.down ? 0.955 : 0.982, dt / 16.67);
      p.vx *= drag;
      p.vy *= drag;
      const speed = Math.hypot(p.vx, p.vy);
      const maxSpeed = phaseActive ? 305 : 360;
      if (speed > maxSpeed) {
        p.vx = p.vx / speed * maxSpeed;
        p.vy = p.vy / speed * maxSpeed;
      }
      const heatDelta =
        (boostActive ? dt * 0.0065 : 0) +
        (speed > 190 ? (speed - 190) * dt * 0.000018 : 0) +
        Number(drift.rival?.pressure || 0) * dt * 0.0028;
      if (phaseActive) {
        addDriftHeat(-dt * 0.012);
      } else if (heatDelta > 0) {
        addDriftHeat(heatDelta);
      } else if (!boostActive && speed < 135) {
        addDriftHeat(-dt * 0.0035);
      }
      if (!phaseActive && drift.heat >= 88) {
        const overheatDrain = dt * (0.0016 + Math.max(0, drift.heat - 88) * 0.00012);
        p.shield -= overheatDrain;
        drift.multiplier = Math.max(1, drift.multiplier - dt * 0.00032);
        if (drift.heat >= 92 && drift.lineFlash <= 0) {
          drift.lastTactic = '高热衰减：松开加速或使用相位';
          drift.lineLabel = 'HEAT';
          drift.lineTone = 'danger';
          drift.lineQuality = Math.floor(drift.heat);
          drift.lineFlash = 420;
        }
      }
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;

      if (p.x < 20 || p.x > drift.canvas.width - 20 || p.y < 20 || p.y > drift.canvas.height - 20) {
        p.x = clamp(p.x, 20, drift.canvas.width - 20);
        p.y = clamp(p.y, 20, drift.canvas.height - 20);
        damageDrift(6, p.x, p.y);
      }
      drift.barriers.forEach(rect => {
        if (driftRectCollision(rect)) damageDrift(8, p.x, p.y);
      });

      drift.drones.forEach(drone => {
        drone.x = drone.baseX + Math.sin(drift.elapsed * drone.speed + drone.phase) * drone.ampX;
        drone.y = drone.baseY + Math.cos(drift.elapsed * drone.speed * 0.86 + drone.phase) * drone.ampY;
        if (Math.hypot(drone.x - p.x, drone.y - p.y) < drone.r + p.r) damageDrift(12, drone.x, drone.y);
      });
      updateDriftRival(dt);

      const currentGate = drift.gates[drift.gateIndex];
      if (currentGate && Math.hypot(currentGate.x - p.x, currentGate.y - p.y) < currentGate.r + p.r) {
        passDriftGate(speed);
        if (!drift.running) return;
      }

      if (speed > 64) {
        drift.score += speed * dt / 1000 * 0.18 * drift.multiplier;
      }
      if (Math.abs(turn) > 0 && speed > 130) {
        drift.score += speed * dt / 1000 * 0.34 * drift.multiplier;
        drift.multiplier = Math.min(4.6, drift.multiplier + dt * 0.00018);
      } else {
        drift.multiplier = Math.max(1, drift.multiplier - dt * 0.00023);
      }
      p.trail.push({ x: p.x, y: p.y, life: 520, boost: boostActive, phase: phaseActive });
      if (p.trail.length > 42) p.trail.shift();
      p.trail.forEach(item => { item.life -= dt; });
      p.trail = p.trail.filter(item => item.life > 0);
      drift.particles.forEach(pt => {
        pt.x += pt.vx * dt / 1000;
        pt.y += pt.vy * dt / 1000;
        pt.life -= dt;
      });
      drift.particles = drift.particles.filter(pt => pt.life > 0);
      drift.splits.forEach(split => { split.age -= dt; });
      drift.splits = drift.splits.filter(split => split.age > 0).slice(0, 4);

      setDriftUi();
      drawDrift();
      if (p.shield <= 0) return finishDrift('DRIVE BROKEN');
      if (drift.elapsed >= 76000) return finishDrift('TIME OUT');
      drift.raf = requestAnimationFrame(runDrift);
    }

    function drawDrift() {
      const { ctx, canvas: c } = drift;
      if (!ctx || !c) return;
      const p = drift.player;
      ctx.fillStyle = '#040711';
      ctx.fillRect(0, 0, c.width, c.height);
      drawGrid(ctx, c.width, c.height, 'rgba(6, 182, 212, 0.055)', 24);

      ctx.strokeStyle = 'rgba(52, 211, 153, 0.22)';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      drift.gates.forEach((gate, index) => {
        if (index === 0) ctx.moveTo(gate.x, gate.y);
        else ctx.lineTo(gate.x, gate.y);
      });
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.36)';
      ctx.stroke();

      drift.barriers.forEach(rect => {
        ctx.fillStyle = 'rgba(236, 72, 153, 0.22)';
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 1.5;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
      });

      drift.gates.forEach((gate, index) => {
        const active = index === drift.gateIndex;
        const passed = index < drift.gateIndex;
        ctx.strokeStyle = active ? '#FBBF24' : passed ? '#34D399' : 'rgba(148, 163, 184, 0.24)';
        ctx.lineWidth = active ? 4 : 2;
        ctx.beginPath();
        ctx.arc(gate.x, gate.y, gate.r + (active ? Math.sin(drift.elapsed / 140) * 3 : 0), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = active ? '#FDE68A' : passed ? '#D1FAE5' : '#94A3B8';
        ctx.font = '800 12px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(index + 1), gate.x, gate.y + 4);
        if (active) {
          const next = drift.gates[index + 1];
          ctx.save();
          ctx.strokeStyle = 'rgba(253, 230, 138, 0.44)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.arc(gate.x, gate.y, gate.r * 0.42, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          if (next) {
            const angle = Math.atan2(next.y - gate.y, next.x - gate.x);
            ctx.strokeStyle = 'rgba(186, 230, 253, 0.5)';
            ctx.beginPath();
            ctx.moveTo(gate.x, gate.y);
            ctx.lineTo(gate.x + Math.cos(angle) * 54, gate.y + Math.sin(angle) * 54);
            ctx.stroke();
            ctx.fillStyle = '#BAE6FD';
            ctx.beginPath();
            ctx.arc(gate.x + Math.cos(angle) * 58, gate.y + Math.sin(angle) * 58, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      });

      drift.drones.forEach(drone => {
        ctx.fillStyle = '#EF4444';
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(drone.x, drone.y, drone.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.22)';
        ctx.beginPath();
        ctx.arc(drone.x, drone.y, drone.r + 18, 0, Math.PI * 2);
        ctx.stroke();
      });

      if (drift.rival) {
        const rival = drift.rival;
        const from = drift.gates[rival.segment] || drift.gates[0];
        const to = drift.gates[rival.segment + 1] || from;
        const rivalAngle = Math.atan2(to.y - from.y, to.x - from.x);
        if (drift.draft > 0.08) {
          ctx.save();
          ctx.globalAlpha = 0.22 + drift.draft * 0.42;
          ctx.strokeStyle = '#BAE6FD';
          ctx.lineWidth = 8 + drift.draft * 8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(rival.x, rival.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#BAE6FD';
          ctx.font = '800 10px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`DRAFT ${Math.round(drift.draft * 100)}`, (rival.x + p.x) / 2, (rival.y + p.y) / 2 - 10);
          ctx.restore();
        }
        ctx.save();
        ctx.translate(rival.x, rival.y);
        ctx.rotate(rivalAngle);
        const flash = clamp(rival.flash / 1040, 0, 1);
        ctx.shadowColor = flash > 0 ? '#FDE68A' : '#A78BFA';
        ctx.shadowBlur = 12 + flash * 16;
        ctx.fillStyle = flash > 0 ? '#FDE68A' : '#A78BFA';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-10, -10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = flash > 0 ? 'rgba(253, 230, 138, 0.9)' : 'rgba(221, 214, 254, 0.72)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = rival.gap <= -0.65 ? '#FCA5A5' : rival.gap >= 0.35 ? '#A7F3D0' : '#FDE68A';
        ctx.font = '800 10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RIVAL', rival.x, rival.y - 20);
      }

      p.trail.forEach(item => {
        ctx.globalAlpha = Math.max(0, item.life / 520) * 0.62;
        ctx.fillStyle = item.phase ? '#FDE68A' : item.boost ? '#BAE6FD' : '#A78BFA';
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.phase ? 6 : item.boost ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      drift.particles.forEach(pt => {
        ctx.globalAlpha = Math.max(0, pt.life / 440);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.shadowColor = drift.phaseBrake > 0 ? '#FDE68A' : drift.hitCooldown > 0 ? '#EF4444' : '#06B6D4';
      ctx.shadowBlur = drift.phaseBrake > 0 ? 24 : 16;
      ctx.fillStyle = drift.phaseBrake > 0 ? '#FDE68A' : drift.hitCooldown > 0 ? '#FDE68A' : '#06B6D4';
      ctx.beginPath();
      ctx.moveTo(17, 0);
      ctx.lineTo(-12, 12);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-12, -12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#DFFAFF';
      ctx.fillRect(-4, -4, 11, 8);
      ctx.restore();
      if (drift.phaseBrake > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(253, 230, 138, 0.46)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 24 + Math.sin(drift.elapsed / 75) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = '#fff';
      ctx.font = '700 12px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.max(0, 76 - drift.elapsed / 1000).toFixed(0)}s · BOOST ${Math.ceil(drift.boost)}%`, 16, 24);
      ctx.fillStyle = drift.heat >= 75 ? '#FCA5A5' : drift.heat >= 45 ? '#FDE68A' : '#A7F3D0';
      ctx.fillRect(16, 34, 74 * clamp(drift.heat / 100, 0, 1), 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.strokeRect(16.5, 34.5, 74, 4);
      ctx.fillStyle = drift.phaseBrake > 0 || drift.phaseCharge >= 100 ? '#FDE68A' : '#BAE6FD';
      ctx.font = '800 10px JetBrains Mono, monospace';
      ctx.fillText(`HEAT ${Math.floor(drift.heat)}% · PHASE ${drift.phaseBrake > 0 ? 'BRAKE' : drift.phaseCharge >= 100 ? 'READY' : `${Math.floor(drift.phaseCharge)}%`}`, 98, 39);
      ctx.fillStyle = drift.lastContract ? '#FDE68A' : '#A7F3D0';
      ctx.fillText(`${formatDriftSponsor()}${drift.lastTactic ? ` · ${drift.lastTactic}` : ''}`, 16, c.height - 16);
      if (drift.lineFlash > 0 && drift.lineLabel !== 'READY') {
        const alpha = clamp(drift.lineFlash / 920, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.35 + alpha * 0.65;
        ctx.fillStyle = driftToneColor(drift.lineTone);
        ctx.font = '900 18px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${drift.lineLabel} ${drift.lineQuality} · ${drift.combo}x`, c.width / 2, 42);
        ctx.restore();
      }
      drift.splits.forEach((split, index) => {
        const alpha = clamp(split.age / 1800, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.42 + alpha * 0.58;
        ctx.fillStyle = driftToneColor(split.label === 'PERFECT' ? 'perfect' : split.label === 'APEX' ? 'apex' : split.label === 'CLEAN' ? 'clean' : 'danger');
        ctx.font = '800 10px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        const overtakeText = split.overtakeBonus > 0 ? ` OVERTAKE +${split.overtakeBonus}` : '';
        const sponsorText = split.sponsor ? ` ${split.sponsor} CONTRACT` : '';
        ctx.fillText(`#${split.gate} ${split.label} ${split.quality} +${split.score} ${split.combo}x H${split.heat}${overtakeText}${sponsorText}`, c.width - 16, 24 + index * 15);
        ctx.restore();
      });
    }

    document.getElementById('premium-drift-start').addEventListener('click', startDrift);
    document.getElementById('premium-drift-pause').addEventListener('click', () => {
      toggleDriftPause();
    });
    document.getElementById('premium-drift-phase-btn').addEventListener('click', triggerDriftPhaseBrake);
    setDriftUi();
    updateDriftPauseButton();
    drawDrift();
    overlay(drift.ctx, drift.canvas.width, drift.canvas.height, '霓虹航线待点火', 'WASD 转向推进 · Space 加速 · Q 相位刹车');

    const heist = {
      canvas: document.getElementById('premium-heist-canvas'),
      ctx: document.getElementById('premium-heist-canvas')?.getContext('2d'),
      bestKey: 'atherix_premium_heist_best',
      tile: 28,
      grid: [],
      player: { x: 1, y: 1 },
      keys: [],
      exit: { x: 18, y: 11 },
      guards: [],
      cameras: [],
      terminals: [],
      doors: [],
      caches: [],
      collected: 0,
      loot: 0,
      steps: 0,
      security: 0,
      securityPeak: 0,
      cloaks: 2,
      cloakTurns: 0,
      decoys: 2,
      decoy: null,
      alert: 'LOW',
      lastTactic: 'INFILTRATE',
      alarmFlash: 0,
      routeLabel: 'SCAN',
      routeRisk: 0,
      chain: 0,
      bestChain: 0,
      heatCells: [],
      routeCells: [],
      won: false
    };

    function setHeistUi() {
      document.getElementById('premium-heist-keys').textContent = heist.collected;
      document.getElementById('premium-heist-best').textContent = localStorage.getItem(heist.bestKey) || '0';
      document.getElementById('premium-heist-steps').textContent = heist.steps;
      document.getElementById('premium-heist-tools').textContent = heist.cloakTurns > 0 ? `GHOST ${heist.cloakTurns}` : `CLOAK ${heist.cloaks}`;
      document.getElementById('premium-heist-decoys').textContent = heist.decoy?.timer > 0 ? `LIVE ${heist.decoy.timer}` : heist.decoys;
      document.getElementById('premium-heist-loot').textContent = heist.loot;
      const securityEl = document.getElementById('premium-heist-security');
      if (securityEl) {
        securityEl.textContent = `${Math.round(heist.security)}%`;
        securityEl.style.color = heist.security >= 82 ? '#EF4444' : heist.security >= 48 ? '#FBBF24' : '#34D399';
      }
      const intel = heistIntel();
      heist.routeLabel = intel.label;
      heist.routeRisk = intel.risk;
      heist.heatCells = intel.heatCells;
      heist.routeCells = intel.route;
      const routeEl = document.getElementById('premium-heist-route');
      if (routeEl) {
        routeEl.textContent = intel.label;
        routeEl.style.color = intel.risk >= 3 ? '#EF4444' : intel.risk > 0 ? '#FBBF24' : '#34D399';
      }
      const chainEl = document.getElementById('premium-heist-chain');
      if (chainEl) {
        chainEl.textContent = `${heist.chain}x`;
        chainEl.style.color = heist.chain >= 8 ? '#FDE68A' : heist.chain >= 4 ? '#A7F3D0' : '#fff';
      }
      const alertEl = document.getElementById('premium-heist-alert');
      alertEl.textContent = heist.alert;
      alertEl.style.color = ['HIGH', 'LOCK', 'CAM'].includes(heist.alert)
        ? '#EF4444'
        : (['MID', 'GHOST'].includes(heist.alert) ? '#FBBF24' : '#34D399');
    }

    function newHeist() {
      const bonuses = loadoutBonuses();
      const tuning = difficultyTuning();
      const coneDelta = Number(tuning.guardCone || 0);
      heist.grid = Array.from({ length: 13 }, (_, y) => Array.from({ length: 20 }, (_, x) => (x === 0 || y === 0 || x === 19 || y === 12 || (x % 4 === 0 && y % 3 !== 1)) ? 1 : 0));
      heist.player = { x: 1, y: 1 };
      heist.keys = [{ x: 5, y: 2 }, { x: 10, y: 5 }, { x: 15, y: 3 }, { x: 13, y: 10 }];
      heist.exit = { x: 18, y: 11 };
      heist.guards = [
        { x: 7, y: 8, dir: 1, axis: 'x', min: 5, max: 11, cone: Math.max(2, 3 + coneDelta) },
        { x: 16, y: 7, dir: -1, axis: 'y', min: 3, max: 10, cone: Math.max(2, 4 + coneDelta) },
        { x: 2, y: 10, dir: 1, axis: 'x', min: 2, max: 8, cone: Math.max(2, 3 + coneDelta) },
        { x: 11, y: 2, dir: 1, axis: 'y', min: 2, max: 7, cone: Math.max(2, 2 + coneDelta) }
      ];
      heist.guards.forEach(guard => {
        guard.patrolAxis = guard.axis;
      });
      heist.cameras = [
        { x: 6, y: 1, dir: 1, axis: 'y', cone: Math.max(2, 4 + coneDelta), sweep: 0, disabled: false },
        { x: 18, y: 5, dir: -1, axis: 'x', cone: Math.max(2, 4 + coneDelta), sweep: 1, disabled: false },
        { x: 5, y: 11, dir: 1, axis: 'x', cone: Math.max(2, 3 + coneDelta), sweep: 2, disabled: false }
      ];
      heist.terminals = [{ x: 3, y: 5, used: false }, { x: 17, y: 9, used: false }];
      heist.doors = [{ x: 9, y: 8, open: false }, { x: 12, y: 4, open: false }];
      heist.caches = [
        { x: 6, y: 6, value: 180, tier: 'S', taken: false },
        { x: 14, y: 8, value: 240, tier: 'A', taken: false },
        { x: 18, y: 2, value: 320, tier: 'X', taken: false }
      ];
      heist.collected = 0;
      heist.loot = 0;
      heist.steps = 0;
      heist.security = 0;
      heist.securityPeak = 0;
      heist.cloaks = Math.max(1, 2 + Number(bonuses.heistCloaks || 0) + (activeDifficultyDef().id === 'training' ? 1 : 0));
      heist.cloakTurns = 0;
      heist.decoys = Math.max(1, 2 + (activeDifficultyDef().id === 'training' ? 1 : 0));
      heist.decoy = null;
      heist.alert = 'LOW';
      heist.lastTactic = 'INFILTRATE';
      heist.alarmFlash = 0;
      heist.routeLabel = 'SCAN';
      heist.routeRisk = 0;
      heist.chain = 0;
      heist.bestChain = 0;
      heist.heatCells = [];
      heist.routeCells = [];
      heist.won = false;
      setHeistUi();
      focusStage();
      drawHeist();
    }

    function heistTileBlocked(x, y) {
      return !heist.grid[y] ||
        typeof heist.grid[y][x] === 'undefined' ||
        heist.grid[y][x] === 1 ||
        heist.doors.some(door => !door.open && door.x === x && door.y === y);
    }

    function heistKey(x, y) {
      return `${x},${y}`;
    }

    function heistDistance(a, b) {
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    function heistRaiseSecurity(amount, tactic = '') {
      heist.security = clamp(heist.security + amount, 0, 100);
      heist.securityPeak = Math.max(heist.securityPeak, heist.security);
      if (amount > 0) heist.alarmFlash = Math.max(heist.alarmFlash, 3);
      if (tactic) heist.lastTactic = tactic;
    }

    function heistCameraVector(camera) {
      const vectors = [
        { axis: 'x', dir: 1 },
        { axis: 'y', dir: 1 },
        { axis: 'x', dir: -1 },
        { axis: 'y', dir: -1 }
      ];
      return vectors[Math.abs(camera.sweep || 0) % vectors.length];
    }

    function heistCameraSensor(camera) {
      const vector = heistCameraVector(camera);
      return { ...camera, axis: vector.axis, dir: vector.dir };
    }

    function heistVisionReach(g) {
      for (let i = 1; i <= g.cone; i++) {
        const x = g.axis === 'x' ? g.x + g.dir * i : g.x;
        const y = g.axis === 'y' ? g.y + g.dir * i : g.y;
        if (heistTileBlocked(x, y)) return i - 1;
      }
      return g.cone;
    }

    function heistSensorSeesPlayer(sensor) {
      if (heist.cloakTurns > 0 || sensor.disabled) return false;
      const s = sensor.sweep !== undefined ? heistCameraSensor(sensor) : sensor;
      const dx = heist.player.x - s.x;
      const dy = heist.player.y - s.y;
      if (s.axis === 'x') {
        const forwardDistance = dx * s.dir;
        if (forwardDistance <= 0 || forwardDistance > s.cone || Math.abs(dy) > 1) return false;
        return forwardDistance <= heistVisionReach(s);
      }
      const forwardDistance = dy * s.dir;
      if (forwardDistance <= 0 || forwardDistance > s.cone || Math.abs(dx) > 1) return false;
      return forwardDistance <= heistVisionReach(s);
    }

    function guardSeesPlayer(g) {
      return heistSensorSeesPlayer(g);
    }

    function heistGuardOccupied(x, y, self) {
      return heist.guards.some(guard => guard !== self && guard.x === x && guard.y === y);
    }

    function heistMoveGuardTowardDecoy(g) {
      if (!heist.decoy || heist.decoy.timer <= 0 || heistDistance(g, heist.decoy) > 7) return false;
      const dirs = [
        { dx: Math.sign(heist.decoy.x - g.x), dy: 0, axis: 'x' },
        { dx: 0, dy: Math.sign(heist.decoy.y - g.y), axis: 'y' },
        { dx: -g.dir, dy: 0, axis: 'x' },
        { dx: 0, dy: -g.dir, axis: 'y' }
      ].filter(dir => dir.dx || dir.dy);
      for (const dir of dirs) {
        const nx = g.x + dir.dx;
        const ny = g.y + dir.dy;
        if (heistTileBlocked(nx, ny) || heistGuardOccupied(nx, ny, g)) continue;
        g.x = nx;
        g.y = ny;
        g.axis = dir.axis;
        g.dir = dir.dx || dir.dy;
        g.distracted = Math.max(g.distracted || 0, heist.decoy.timer);
        return true;
      }
      g.distracted = Math.max(g.distracted || 0, heist.decoy.timer);
      return true;
    }

    function heistPatrolGuard(g) {
      if (heistMoveGuardTowardDecoy(g)) return;
      g.axis = g.patrolAxis || g.axis;
      g[g.axis] += g.dir;
      if (g[g.axis] < g.min || g[g.axis] > g.max || heistTileBlocked(g.x, g.y)) {
        g.dir *= -1;
        g[g.axis] += g.dir * 2;
      }
      g.distracted = Math.max(0, (g.distracted || 0) - 1);
    }

    function heistAdvanceSensors() {
      heist.guards.forEach(heistPatrolGuard);
      heist.cameras.forEach(camera => {
        if (!camera.disabled) camera.sweep = (camera.sweep + 1) % 4;
      });
      if (heist.decoy) {
        heist.decoy.timer -= 1;
        if (heist.decoy.timer <= 0) heist.decoy = null;
      }
      heist.alarmFlash = Math.max(0, heist.alarmFlash - 1);
    }

    function heistHeatMap() {
      const heat = new Map();
      const add = (x, y, risk) => {
        if (heistTileBlocked(x, y)) return;
        const key = heistKey(x, y);
        heat.set(key, Math.max(heat.get(key) || 0, risk));
      };
      heist.guards.forEach(g => {
        add(g.x, g.y, 4);
        const reach = heistVisionReach(g);
        for (let i = 1; i <= reach; i++) {
          const cx = g.axis === 'x' ? g.x + g.dir * i : g.x;
          const cy = g.axis === 'y' ? g.y + g.dir * i : g.y;
          add(cx, cy, 3);
          if (g.axis === 'x') {
            add(cx, cy - 1, 2);
            add(cx, cy + 1, 2);
          } else {
            add(cx - 1, cy, 2);
            add(cx + 1, cy, 2);
          }
        }
      });
      heist.cameras.forEach(camera => {
        if (camera.disabled) return;
        const sensor = heistCameraSensor(camera);
        add(sensor.x, sensor.y, 3);
        const reach = heistVisionReach(sensor);
        for (let i = 1; i <= reach; i++) {
          const cx = sensor.axis === 'x' ? sensor.x + sensor.dir * i : sensor.x;
          const cy = sensor.axis === 'y' ? sensor.y + sensor.dir * i : sensor.y;
          add(cx, cy, 3);
          if (sensor.axis === 'x') {
            add(cx, cy - 1, 1);
            add(cx, cy + 1, 1);
          } else {
            add(cx - 1, cy, 1);
            add(cx + 1, cy, 1);
          }
        }
      });
      return heat;
    }

    function heistRouteTo(target, heat) {
      const start = heist.player;
      const startKey = heistKey(start.x, start.y);
      const targetKey = heistKey(target.x, target.y);
      const queue = [{ x: start.x, y: start.y, cost: 0, path: [] }];
      const best = new Map([[startKey, 0]]);
      const dirs = [[1, 0], [0, 1], [0, -1], [-1, 0]];
      while (queue.length) {
        queue.sort((a, b) => a.cost - b.cost);
        const node = queue.shift();
        if (heistKey(node.x, node.y) === targetKey) return node.path;
        dirs.forEach(([dx, dy]) => {
          const nx = node.x + dx;
          const ny = node.y + dy;
          if (heistTileBlocked(nx, ny) && heistKey(nx, ny) !== targetKey) return;
          const key = heistKey(nx, ny);
          const risk = heat.get(key) || 0;
          const nextCost = node.cost + 1 + risk * 2;
          if (best.has(key) && best.get(key) <= nextCost) return;
          best.set(key, nextCost);
          queue.push({ x: nx, y: ny, cost: nextCost, path: [...node.path, { x: nx, y: ny, risk }] });
        });
      }
      return [];
    }

    function heistObjectiveCandidates() {
      if (heist.collected >= 4) return [{ ...heist.exit, kind: 'EXIT' }];
      const keyTargets = heist.keys.map(key => ({ ...key, kind: 'KEY' }));
      const terminals = heist.terminals.filter(t => !t.used).map(t => ({ ...t, kind: 'TERMINAL' }));
      const caches = heist.caches
        .filter(cache => !cache.taken)
        .map(cache => ({ ...cache, kind: 'CACHE' }));
      return [...keyTargets, ...caches, ...terminals];
    }

    function heistIntel() {
      const heat = heistHeatMap();
      const candidates = heistObjectiveCandidates()
        .map(target => ({ target, route: heistRouteTo(target, heat) }))
        .filter(item => item.route.length || (item.target.x === heist.player.x && item.target.y === heist.player.y))
        .sort((a, b) => {
          const ar = a.route.reduce((sum, cell) => sum + (cell.risk || 0), 0);
          const br = b.route.reduce((sum, cell) => sum + (cell.risk || 0), 0);
          const objectiveWeight = target => {
            if (target.kind === 'KEY') return -3;
            if (target.kind === 'TERMINAL') return heist.security >= 45 ? -5 : -1;
            if (target.kind === 'CACHE') return -Math.min(4, Math.floor((target.value || 0) / 95));
            return 0;
          };
          return (a.route.length + ar * 2 + objectiveWeight(a.target)) -
            (b.route.length + br * 2 + objectiveWeight(b.target));
        });
      const best = candidates[0] || { target: { kind: 'NO ROUTE' }, route: [] };
      const risk = best.route.reduce((sum, cell) => sum + (cell.risk || 0), 0);
      const label = best.target.kind === 'NO ROUTE'
        ? 'NO ROUTE'
        : `${best.target.kind} ${best.route.length || 0} ${risk > 0 ? `R${risk}` : 'SAFE'}`;
      return {
        label,
        risk,
        target: best.target,
        route: best.route.slice(0, 18),
        cameras: heist.cameras.map(camera => ({
          x: camera.x,
          y: camera.y,
          disabled: !!camera.disabled,
          sensor: heistCameraSensor(camera)
        })),
        caches: heist.caches.map(cache => ({ ...cache })),
        heatCells: [...heat.entries()].map(([key, value]) => {
          const [x, y] = key.split(',').map(Number);
          return { x, y, risk: value };
        })
      };
    }

    function heistDebugState() {
      const intel = heistIntel();
      return {
        label: intel.label,
        risk: intel.risk,
        target: intel.target,
        route: intel.route,
        heatCells: intel.heatCells,
        cameras: intel.cameras,
        caches: intel.caches,
        chain: heist.chain,
        bestChain: heist.bestChain,
        routeHud: document.getElementById('premium-heist-route')?.textContent || '',
        chainHud: document.getElementById('premium-heist-chain')?.textContent || '',
        securityHud: document.getElementById('premium-heist-security')?.textContent || '',
        decoyHud: document.getElementById('premium-heist-decoys')?.textContent || '',
        lootHud: document.getElementById('premium-heist-loot')?.textContent || '',
        alert: heist.alert,
        steps: heist.steps,
        tools: document.getElementById('premium-heist-tools')?.textContent || '',
        player: { ...heist.player },
        guards: heist.guards.map(guard => ({
          x: guard.x,
          y: guard.y,
          axis: guard.axis,
          dir: guard.dir,
          distracted: guard.distracted || 0
        })),
        keys: heist.collected,
        remainingKeys: heist.keys.length,
        loot: heist.loot,
        security: Math.round(heist.security),
        securityPeak: Math.round(heist.securityPeak),
        cloaks: heist.cloaks,
        cloakTurns: heist.cloakTurns,
        decoys: heist.decoys,
        decoy: heist.decoy ? { ...heist.decoy } : null,
        lastTactic: heist.lastTactic,
        won: heist.won
      };
    }

    function stepHeistRoute() {
      const next = heistIntel().route[0];
      if (next) moveHeist(next.x - heist.player.x, next.y - heist.player.y);
      return heistDebugState();
    }

    function triggerHeistCloak() {
      if (premiumActive !== 'heist' || heist.won || heist.cloakTurns > 0 || heist.cloaks <= 0) return;
      heist.cloaks--;
      heist.cloakTurns = 4;
      heist.alert = 'GHOST';
      heist.lastTactic = 'CLOAK';
      unlockAchievement('heist_ghost');
      setHeistUi();
      drawHeist();
    }

    function triggerHeistDecoy() {
      if (premiumActive !== 'heist' || heist.won || heist.decoys <= 0 || heist.decoy?.timer > 0) return;
      heist.decoys--;
      heist.decoy = {
        x: heist.player.x,
        y: heist.player.y,
        timer: 5,
        pulse: 5
      };
      heistRaiseSecurity(6, 'DECOY');
      heist.alert = heist.cloakTurns > 0 ? 'GHOST' : 'DECOY';
      heist.chain = Math.max(heist.chain, 1);
      heist.bestChain = Math.max(heist.bestChain, heist.chain);
      setHeistUi();
      drawHeist();
    }

    function heistCaught(cause = 'HIGH') {
      heist.player = { x: 1, y: 1 };
      heist.cloakTurns = 0;
      heist.alert = cause;
      heist.chain = 0;
      heist.decoy = null;
      heistRaiseSecurity(cause === 'LOCK' ? 26 : 18, cause === 'LOCK' ? 'LOCKDOWN' : 'SPOTTED');
    }

    function collectHeistTile(risk) {
      heist.keys = heist.keys.filter(k => {
        const got = k.x === heist.player.x && k.y === heist.player.y;
        if (got) {
          heist.collected++;
          heist.loot += 55 + Math.max(0, heist.chain * 3);
          heist.lastTactic = 'KEY';
        }
        return !got;
      });
      heist.caches.forEach(cache => {
        if (cache.taken || cache.x !== heist.player.x || cache.y !== heist.player.y) return;
        cache.taken = true;
        const chainBonus = Math.max(0, heist.chain * 6);
        heist.loot += cache.value + chainBonus;
        heistRaiseSecurity(10 + Math.min(14, Math.floor(cache.value / 28)) + risk, `CACHE ${cache.tier}`);
        if (cache.value >= 240) unlockAchievement('heist_cache');
      });
      heist.terminals.forEach(t => {
        if (t.used || t.x !== heist.player.x || t.y !== heist.player.y) return;
        t.used = true;
        const door = heist.doors.find(d => !d.open);
        if (door) door.open = true;
        const camera = heist.cameras.find(item => !item.disabled);
        if (camera) camera.disabled = true;
        heist.cloaks = Math.min(3, heist.cloaks + 1);
        heist.decoys = Math.min(3, heist.decoys + 1);
        heist.security = Math.max(0, heist.security - 22);
        heist.lastTactic = camera ? 'TERMINAL CAM-OFF' : 'TERMINAL DOOR';
      });
    }

    function moveHeist(dx, dy) {
      if (premiumActive !== 'heist' || heist.won) return;
      const nx = heist.player.x + dx;
      const ny = heist.player.y + dy;
      if (heistTileBlocked(nx, ny)) return;
      heist.player = { x: nx, y: ny };
      heist.steps++;
      heist.cloakTurns = Math.max(0, heist.cloakTurns - 1);
      heist.security = clamp(heist.security - (heist.cloakTurns > 0 ? 1.6 : 0.9), 0, 100);
      heistAdvanceSensors();

      const heat = heistHeatMap();
      const risk = heat.get(heistKey(heist.player.x, heist.player.y)) || 0;
      const guardSeen = heist.guards.some(guardSeesPlayer);
      const cameraSeen = heist.cameras.some(heistSensorSeesPlayer);
      const guardCollision = heist.guards.some(g => g.x === heist.player.x && g.y === heist.player.y);
      if (cameraSeen) {
        heistRaiseSecurity(18 + risk, 'CAMERA');
      }
      if (guardCollision || guardSeen || (cameraSeen && heist.security >= 96)) {
        heistCaught(cameraSeen && heist.security >= 96 ? 'LOCK' : 'HIGH');
      } else {
        heist.chain += heist.cloakTurns > 0 ? 2 : 1;
        if (risk === 0) heist.chain++;
        heist.bestChain = Math.max(heist.bestChain, heist.chain);
        if (risk >= 3) heistRaiseSecurity(risk * 1.35, 'HOT ROUTE');
        collectHeistTile(risk);
        const nearby = heist.guards.some(g => heistDistance(g, heist.player) <= 4);
        heist.alert = heist.cloakTurns > 0
          ? 'GHOST'
          : cameraSeen
            ? 'CAM'
            : nearby || heist.security >= 48
              ? 'MID'
              : 'LOW';
      }
      if (heist.collected >= 4 && heist.player.x === heist.exit.x && heist.player.y === heist.exit.y) {
        heist.won = true;
        const securityPenalty = Math.round(heist.securityPeak * 2.2);
        const score = Math.max(100, 1200 - heist.steps * 18 + heist.bestChain * 28 + heist.cloaks * 35 + heist.loot - securityPenalty);
        localStorage.setItem(heist.bestKey, String(Math.max(Number(localStorage.getItem(heist.bestKey) || 0), score)));
        if (heist.steps <= 42) unlockAchievement('heist_clean');
        recordPremiumResult('heist', score, {
          steps: heist.steps,
          bestChain: heist.bestChain,
          route: heist.routeLabel,
          loot: heist.loot,
          security: Math.round(heist.securityPeak)
        });
        heist.alert = 'CLEAR';
      }
      setHeistUi();
      drawHeist();
    }

    function drawHeist() {
      const { ctx, canvas: c, tile } = heist;
      if (!ctx || !c) return;
      ctx.fillStyle = '#04111f';
      ctx.fillRect(0, 0, c.width, c.height);
      for (let y = 0; y < heist.grid.length; y++) {
        for (let x = 0; x < heist.grid[y].length; x++) {
          ctx.fillStyle = heist.grid[y][x] ? '#0f172a' : 'rgba(6, 182, 212, 0.08)';
          ctx.fillRect(x * tile, y * tile, tile - 1, tile - 1);
        }
      }
      heist.heatCells.forEach(cell => {
        const alpha = clamp(0.08 + cell.risk * 0.04, 0.1, 0.26);
        ctx.fillStyle = cell.risk >= 4 ? `rgba(239, 68, 68, ${alpha})` : `rgba(251, 191, 36, ${alpha})`;
        ctx.fillRect(cell.x * tile + 2, cell.y * tile + 2, tile - 5, tile - 5);
      });
      if (heist.routeCells.length) {
        ctx.save();
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 6]);
        ctx.beginPath();
        ctx.moveTo(heist.player.x * tile + tile / 2, heist.player.y * tile + tile / 2);
        heist.routeCells.forEach(cell => {
          ctx.lineTo(cell.x * tile + tile / 2, cell.y * tile + tile / 2);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        heist.routeCells.forEach((cell, index) => {
          ctx.fillStyle = cell.risk > 0 ? '#FDE68A' : '#67E8F9';
          ctx.globalAlpha = index === 0 ? 0.95 : 0.64;
          ctx.beginPath();
          ctx.arc(cell.x * tile + tile / 2, cell.y * tile + tile / 2, index === 0 ? 4 : 3, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
      ctx.fillStyle = heist.collected >= 4 ? '#34D399' : '#475569';
      ctx.fillRect(heist.exit.x * tile + 4, heist.exit.y * tile + 4, tile - 8, tile - 8);
      heist.doors.forEach(door => {
        ctx.fillStyle = door.open ? 'rgba(52, 211, 153, 0.22)' : '#7f1d1d';
        ctx.fillRect(door.x * tile + 3, door.y * tile + 3, tile - 6, tile - 6);
      });
      heist.terminals.forEach(t => {
        ctx.fillStyle = t.used ? '#34D399' : '#BAE6FD';
        ctx.fillRect(t.x * tile + 6, t.y * tile + 8, tile - 12, tile - 14);
      });
      heist.caches.forEach(cache => {
        if (cache.taken) return;
        ctx.save();
        ctx.fillStyle = cache.tier === 'X' ? '#F0ABFC' : cache.tier === 'A' ? '#FDE68A' : '#A7F3D0';
        ctx.globalAlpha = 0.88;
        ctx.fillRect(cache.x * tile + 6, cache.y * tile + 6, tile - 12, tile - 12);
        ctx.fillStyle = '#020617';
        ctx.font = '800 8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(cache.tier, cache.x * tile + tile / 2, cache.y * tile + 18);
        ctx.restore();
      });
      heist.cameras.forEach(camera => {
        const sensor = heistCameraSensor(camera);
        const reach = camera.disabled ? 0 : heistVisionReach(sensor);
        ctx.save();
        ctx.fillStyle = camera.disabled ? 'rgba(52, 211, 153, 0.38)' : 'rgba(34, 211, 238, 0.28)';
        ctx.fillRect(camera.x * tile + 7, camera.y * tile + 7, tile - 14, tile - 14);
        if (!camera.disabled) {
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.42)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(camera.x * tile + tile / 2, camera.y * tile + tile / 2);
          ctx.lineTo(
            (camera.x + (sensor.axis === 'x' ? sensor.dir * reach : 0)) * tile + tile / 2,
            (camera.y + (sensor.axis === 'y' ? sensor.dir * reach : 0)) * tile + tile / 2
          );
          ctx.stroke();
          ctx.fillStyle = 'rgba(34, 211, 238, 0.1)';
          for (let i = 1; i <= reach; i++) {
            const sx = sensor.axis === 'x' ? sensor.x + sensor.dir * i : sensor.x;
            const sy = sensor.axis === 'y' ? sensor.y + sensor.dir * i : sensor.y;
            ctx.fillRect(sx * tile + 3, sy * tile + 3, tile - 7, tile - 7);
          }
        }
        ctx.restore();
      });
      heist.keys.forEach(k => { ctx.fillStyle = '#FBBF24'; ctx.beginPath(); ctx.arc(k.x * tile + 14, k.y * tile + 14, 7, 0, Math.PI * 2); ctx.fill(); });
      if (heist.decoy?.timer > 0) {
        ctx.save();
        ctx.strokeStyle = '#DDD6FE';
        ctx.fillStyle = 'rgba(167, 139, 250, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(heist.decoy.x * tile + 14, heist.decoy.y * tile + 14, 7 + heist.decoy.timer, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      heist.guards.forEach(g => {
        const reach = heistVisionReach(g);
        ctx.fillStyle = g.distracted > 0 ? 'rgba(167, 139, 250, 0.18)' : 'rgba(239, 68, 68, 0.14)';
        ctx.beginPath();
        ctx.arc(g.x * tile + 14, g.y * tile + 14, tile * Math.max(1.25, reach * 0.72), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = g.distracted > 0 ? 'rgba(167, 139, 250, 0.2)' : 'rgba(239, 68, 68, 0.18)';
        ctx.beginPath();
        ctx.moveTo(g.x * tile + 14, g.y * tile + 14);
        if (g.axis === 'x') {
          ctx.lineTo((g.x + g.dir * reach) * tile + 14, (g.y - 1.35) * tile + 14);
          ctx.lineTo((g.x + g.dir * reach) * tile + 14, (g.y + 1.35) * tile + 14);
        } else {
          ctx.lineTo((g.x - 1.35) * tile + 14, (g.y + g.dir * reach) * tile + 14);
          ctx.lineTo((g.x + 1.35) * tile + 14, (g.y + g.dir * reach) * tile + 14);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = g.distracted > 0 ? '#A78BFA' : '#EF4444';
        ctx.fillRect(g.x * tile + 6, g.y * tile + 6, 16, 16);
      });
      ctx.fillStyle = heist.cloakTurns > 0 ? '#A78BFA' : '#06B6D4';
      ctx.fillRect(heist.player.x * tile + 5, heist.player.y * tile + 5, 18, 18);
      ctx.save();
      const hudX = c.width - 252;
      ctx.fillStyle = 'rgba(5, 8, 22, 0.68)';
      ctx.fillRect(hudX, 10, 238, 65);
      ctx.fillStyle = heist.routeRisk >= 3 ? '#FCA5A5' : heist.routeRisk > 0 ? '#FDE68A' : '#A7F3D0';
      ctx.font = '800 11px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`ROUTE ${heist.routeLabel}`, hudX + 10, 26);
      ctx.fillStyle = heist.chain >= 8 ? '#FDE68A' : heist.chain >= 4 ? '#A7F3D0' : '#BAE6FD';
      ctx.fillText(`CHAIN ${heist.chain}x · BEST ${heist.bestChain}x`, hudX + 10, 42);
      ctx.fillStyle = heist.security >= 82 ? '#FCA5A5' : heist.security >= 48 ? '#FDE68A' : '#A7F3D0';
      ctx.fillText(`SEC ${Math.round(heist.security)}% · LOOT ${heist.loot}`, hudX + 10, 58);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fillRect(hudX + 10, 63, 214, 4);
      ctx.fillStyle = heist.security >= 82 ? '#EF4444' : heist.security >= 48 ? '#F59E0B' : '#34D399';
      ctx.fillRect(hudX + 10, 63, 214 * (heist.security / 100), 4);
      ctx.restore();
      if (heist.lastTactic && heist.lastTactic !== 'INFILTRATE') {
        ctx.save();
        ctx.fillStyle = heist.alarmFlash > 0 ? '#FDE68A' : '#93C5FD';
        ctx.font = '800 10px JetBrains Mono, monospace';
        ctx.fillText(`TACTIC ${heist.lastTactic}`, 14, 346);
        ctx.restore();
      }
      if (heist.won) overlay(ctx, c.width, c.height, 'VAULT CLEAR', '高分已保存 · 点击生成任务再来一局');
    }

    document.getElementById('premium-heist-new').addEventListener('click', newHeist);
    newHeist();

    const chain = {
      board: document.getElementById('premium-chain-board'),
      bestKey: 'atherix_premium_chain_best',
      colors: ['cyan', 'violet', 'pink', 'gold', 'green'],
      grid: [],
      score: 0,
      moves: 30,
      combo: 0,
      streak: 0,
      mult: 1,
      target: 9000,
      phaseIndex: 0,
      bestMove: null,
      feedback: '寻找 3+ 同色能量团',
      lastGain: 0,
      lastClear: 0,
      lastSpecial: '',
      specialsTriggered: 0,
      essence: {},
      recipeProgress: {},
      recipeIndex: 0,
      recipesCompleted: 0,
      overcharge: 0,
      catalystUsed: 0,
      finished: false,
      recorded: false
    };
    const chainPhaseDefs = [
      { label: 'I', goal: '连锁 7+', reward: 420, check: result => result.cleared >= 7 },
      { label: 'II', goal: '制造核心', reward: 520, check: result => !!result.specialCreated },
      { label: 'III', goal: '触发核心', reward: 640, check: result => result.specialsTriggered >= 1 },
      { label: 'IV', goal: '爆破 14+', reward: 860, check: result => result.cleared >= 14 }
    ];
    const chainSpecialLabels = { bomb: 'BOMB', prism: 'PRISM', wild: 'FLUX' };
    const chainColorShort = { cyan: 'C', violet: 'V', pink: 'P', gold: 'G', green: 'N' };
    const chainColorNames = { cyan: '青', violet: '紫', pink: '绯', gold: '金', green: '翠' };
    const chainRecipeDefs = [
      { id: 'aurora', label: '极光谱', req: { cyan: 5, violet: 4, special: 1 }, reward: 640, charge: 38 },
      { id: 'corona', label: '日冕环', req: { gold: 6, pink: 5, cleared: 16 }, reward: 760, charge: 44 },
      { id: 'verdant', label: '翠焰核', req: { green: 7, cyan: 4, special: 2 }, reward: 840, charge: 50 }
    ];

    function freshChainLedger() {
      return { cyan: 0, violet: 0, pink: 0, gold: 0, green: 0, special: 0, cleared: 0 };
    }

    function resetChainLedger() {
      chain.essence = freshChainLedger();
      chain.recipeProgress = freshChainLedger();
      chain.recipeIndex = 0;
      chain.recipesCompleted = 0;
      chain.overcharge = 0;
      chain.catalystUsed = 0;
    }

    function currentChainRecipe() {
      return chainRecipeDefs[chain.recipeIndex % chainRecipeDefs.length];
    }

    function chainRecipePercent(recipe = currentChainRecipe()) {
      const req = recipe?.req || {};
      const total = Object.values(req).reduce((sum, value) => sum + value, 0);
      const done = Object.entries(req).reduce((sum, [key, value]) => {
        return sum + Math.min(Number(chain.recipeProgress[key] || 0), value);
      }, 0);
      return total ? Math.round((done / total) * 100) : 0;
    }

    function chainRecipeComplete(recipe = currentChainRecipe()) {
      return Object.entries(recipe?.req || {}).every(([key, value]) => Number(chain.recipeProgress[key] || 0) >= value);
    }

    function formatChainEssence() {
      return chain.colors.map(color => `${chainColorShort[color]}${Number(chain.essence[color] || 0)}`).join(' ');
    }

    function formatChainRecipe() {
      const recipe = currentChainRecipe();
      return `${recipe.label} ${chainRecipePercent(recipe)}%`;
    }

    function chainRecipeDetail() {
      const recipe = currentChainRecipe();
      const parts = Object.entries(recipe.req).map(([key, value]) => {
        const label = chainColorNames[key] || (key === 'special' ? '核' : '量');
        return `${label}${Math.min(Number(chain.recipeProgress[key] || 0), value)}/${value}`;
      });
      return `${recipe.label} ${parts.join(' ')}`;
    }

    function collectChainLedger(cells) {
      const ledger = freshChainLedger();
      cells.forEach(item => {
        const [row, col] = item.split(',').map(Number);
        const value = chain.grid[row]?.[col];
        if (!value) return;
        ledger.cleared++;
        if (isChainSpecial(value)) {
          ledger.special++;
        } else if (Object.prototype.hasOwnProperty.call(ledger, value)) {
          ledger[value]++;
        }
      });
      return ledger;
    }

    function addChainMaterials(ledger) {
      Object.keys(ledger).forEach(key => {
        chain.essence[key] = Number(chain.essence[key] || 0) + Number(ledger[key] || 0);
        chain.recipeProgress[key] = Number(chain.recipeProgress[key] || 0) + Number(ledger[key] || 0);
      });
    }

    function resolveChainRecipes() {
      const completed = [];
      let reward = 0;
      let guard = 0;
      while (guard < chainRecipeDefs.length && chainRecipeComplete()) {
        const recipe = currentChainRecipe();
        const surplus = freshChainLedger();
        Object.keys(surplus).forEach(key => {
          surplus[key] = Math.max(0, Number(chain.recipeProgress[key] || 0) - Number(recipe.req[key] || 0));
        });
        completed.push(recipe.label);
        reward += recipe.reward;
        chain.recipesCompleted++;
        chain.recipeIndex++;
        chain.recipeProgress = surplus;
        chain.overcharge = clamp(chain.overcharge + recipe.charge, 0, 100);
        unlockAchievement('chain_recipe');
        guard++;
      }
      return { completed, reward };
    }

    function randomChainCell() {
      const roll = Math.random();
      if (roll < 0.012) return 'bomb';
      if (roll < 0.02) return 'wild';
      if (roll < 0.026) return 'prism';
      return chain.colors[Math.floor(Math.random() * chain.colors.length)];
    }

    function isChainSpecial(value) {
      return value === 'bomb' || value === 'prism' || value === 'wild';
    }

    function chainKey(r, c) {
      return `${r},${c}`;
    }

    function chainInBounds(r, c) {
      return r >= 0 && c >= 0 && r < 7 && c < 7;
    }

    function chainPhaseDef() {
      return chainPhaseDefs[chain.phaseIndex] || null;
    }

    function chainCreatedSpecial(size) {
      if (size >= 13) return 'prism';
      if (size >= 9) return 'bomb';
      if (size >= 6) return 'wild';
      return '';
    }

    function newChain() {
      const bonuses = loadoutBonuses();
      const tuning = difficultyTuning();
      chain.score = 0;
      chain.moves = Math.max(20, 30 + Number(bonuses.chainMoves || 0) + Number(tuning.chainMoves || 0));
      chain.combo = 0;
      chain.streak = 0;
      chain.mult = 1;
      chain.target = Math.round(9000 * Number(tuning.chainTarget || 1));
      chain.phaseIndex = 0;
      chain.bestMove = null;
      chain.feedback = '寻找 3+ 同色能量团';
      chain.lastGain = 0;
      chain.lastClear = 0;
      chain.lastSpecial = '';
      chain.specialsTriggered = 0;
      resetChainLedger();
      chain.finished = false;
      chain.recorded = false;
      chain.grid = Array.from({ length: 7 }, () => Array.from({ length: 7 }, randomChainCell));
      chain.grid[2][2] = 'cyan';
      chain.grid[2][3] = 'cyan';
      chain.grid[2][4] = 'cyan';
      chain.grid[3][3] = 'bomb';
      chain.grid[4][1] = 'wild';
      chain.grid[0][1] = 'gold';
      chain.grid[1][1] = 'violet';
      chain.grid[2][1] = 'pink';
      chain.grid[3][1] = 'green';
      chain.grid[4] = ['violet', 'wild', 'pink', 'gold', 'green', 'cyan', 'violet'];
      chain.grid[5][1] = 'gold';
      chain.grid[6][1] = 'pink';
      focusStage();
      renderChain();
    }

    function floodChain(r, c, color, seen = new Set()) {
      const key = `${r},${c}`;
      if (seen.has(key) || r < 0 || c < 0 || r >= 7 || c >= 7 || chain.grid[r][c] !== color) return seen;
      seen.add(key);
      floodChain(r + 1, c, color, seen);
      floodChain(r - 1, c, color, seen);
      floodChain(r, c + 1, color, seen);
      floodChain(r, c - 1, color, seen);
      return seen;
    }

    function dominantChainColor() {
      const counts = chain.colors.map(color => ({
        color,
        count: chain.grid.reduce((sum, row) => sum + row.filter(value => value === color).length, 0)
      }));
      counts.sort((a, b) => b.count - a.count);
      return counts[0]?.color || pick(chain.colors);
    }

    function collectChainBlast(r, c, kind) {
      const cells = new Set();
      if (kind === 'bomb') {
        for (let y = r - 1; y <= r + 1; y++) {
          for (let x = c - 1; x <= c + 1; x++) {
            if (chainInBounds(y, x)) cells.add(chainKey(y, x));
          }
        }
      } else if (kind === 'wild') {
        for (let i = 0; i < 7; i++) {
          cells.add(chainKey(r, i));
          cells.add(chainKey(i, c));
        }
      } else {
        const color = dominantChainColor();
        chain.grid.forEach((row, rowIndex) => row.forEach((value, colIndex) => {
          if (value === color) cells.add(chainKey(rowIndex, colIndex));
        }));
      }
      return [...cells];
    }

    function collectChainCascade(startCells) {
      const cells = new Set(startCells);
      const queue = [...startCells];
      const processed = new Set();
      let specialsTriggered = 0;
      while (queue.length) {
        const key = queue.shift();
        if (processed.has(key)) continue;
        processed.add(key);
        const [r, c] = key.split(',').map(Number);
        const value = chain.grid[r]?.[c];
        if (!isChainSpecial(value)) continue;
        specialsTriggered++;
        collectChainBlast(r, c, value).forEach(nextKey => {
          if (!cells.has(nextKey)) {
            cells.add(nextKey);
            queue.push(nextKey);
          }
        });
      }
      return {
        cells: [...cells].filter(key => {
          const [r, c] = key.split(',').map(Number);
          return chainInBounds(r, c) && !!chain.grid[r]?.[c];
        }),
        specialsTriggered
      };
    }

    function evaluateChainMove(r, c) {
      const value = chain.grid[r]?.[c];
      if (!value) return { valid: false, cells: [], cleared: 0, gain: 0, value: '' };
      const special = isChainSpecial(value);
      const source = special ? [chainKey(r, c)] : [...floodChain(r, c, value)];
      if (!special && source.length < 3) {
        return { valid: false, cells: source, cleared: source.length, gain: 0, value };
      }
      const cascade = collectChainCascade(source);
      const cleared = cascade.cells.length;
      const specialCreated = special ? '' : chainCreatedSpecial(cleared);
      const base = cleared * cleared * (special ? 20 : 12) + cascade.specialsTriggered * 160 + (specialCreated ? 220 : 0);
      return {
        valid: cleared > 0,
        r,
        c,
        value,
        cells: cascade.cells,
        cleared,
        sourceSize: source.length,
        gain: Math.round(base * chain.mult),
        specialCreated,
        specialsTriggered: cascade.specialsTriggered
      };
    }

    function evaluateChainCatalyst() {
      const best = bestChainMove();
      if (!best) return { valid: false, cells: [], cleared: 0, gain: 0, value: 'catalyst', catalyst: true };
      const recipe = currentChainRecipe();
      const source = new Set([...best.cells, ...collectChainBlast(best.r, best.c, 'wild')]);
      const neededColor = Object.entries(recipe.req)
        .filter(([key]) => chain.colors.includes(key))
        .map(([key, value]) => ({ color: key, deficit: Math.max(0, value - Number(chain.recipeProgress[key] || 0)) }))
        .sort((a, b) => b.deficit - a.deficit)[0]?.color;
      if (neededColor) {
        const matching = [];
        chain.grid.forEach((row, rowIndex) => row.forEach((value, colIndex) => {
          if (value === neededColor) matching.push(chainKey(rowIndex, colIndex));
        }));
        matching.slice(0, 8).forEach(key => source.add(key));
      }
      const cascade = collectChainCascade([...source]);
      const cleared = cascade.cells.length;
      const specialCreated = cleared >= 18 ? 'prism' : cleared >= 12 ? 'bomb' : '';
      const base = cleared * cleared * 18 + cascade.specialsTriggered * 240 + 900 + (specialCreated ? 320 : 0);
      return {
        valid: cleared > 0,
        r: best.r,
        c: best.c,
        value: 'catalyst',
        cells: cascade.cells,
        cleared,
        sourceSize: source.size,
        gain: Math.round(base * chain.mult),
        specialCreated,
        specialsTriggered: cascade.specialsTriggered,
        catalyst: true
      };
    }

    function applyChainResult(result, { catalyst = false } = {}) {
      const ledger = collectChainLedger(result.cells);
      chain.combo = result.cleared;
      chain.streak += catalyst ? 2 : 1;
      chain.mult = clamp(1 + chain.streak * 0.18 + Math.max(0, result.cleared - 6) * 0.025 + (catalyst ? 0.25 : 0), 1, 4.2);
      chain.lastGain = result.gain;
      chain.lastClear = result.cleared;
      chain.lastSpecial = result.specialCreated || '';
      chain.specialsTriggered = result.specialsTriggered;
      addChainMaterials(ledger);
      if (!catalyst) {
        chain.overcharge = clamp(chain.overcharge + Math.min(36, result.cleared * 1.6 + result.specialsTriggered * 8 + (result.specialCreated ? 6 : 0)), 0, 100);
      }
      const recipeResult = resolveChainRecipes();
      if (result.cleared >= 9) unlockAchievement('chain_combo_9');
      chain.score += result.gain + recipeResult.reward;
      result.cells.forEach(item => {
        const [row, col] = item.split(',').map(Number);
        chain.grid[row][col] = null;
      });
      if (result.specialCreated) {
        const [row, col] = result.cells[0].split(',').map(Number);
        chain.grid[row][col] = result.specialCreated;
      }
      const phase = chainPhaseDef();
      if (phase?.check(result)) {
        chain.score += phase.reward;
        chain.feedback = `${phase.goal} 完成 +${phase.reward}`;
        chain.phaseIndex++;
      } else if (recipeResult.completed.length) {
        chain.feedback = `${recipeResult.completed.join('/')} 配方完成 +${recipeResult.reward}`;
      } else if (catalyst) {
        chain.feedback = `超载催化 ${result.cleared} 格 · +${result.gain}`;
      } else {
        const label = isChainSpecial(result.value) ? chainSpecialLabels[result.value] : result.value.toUpperCase();
        chain.feedback = `${label} 清除 ${result.cleared} · +${result.gain}`;
      }
      return { ledger, recipeResult };
    }

    function bestChainMove() {
      const moves = [];
      chain.grid.forEach((row, r) => row.forEach((_, c) => {
        const move = evaluateChainMove(r, c);
        if (move.valid) moves.push(move);
      }));
      moves.sort((a, b) =>
        b.gain - a.gain ||
        b.cleared - a.cleared ||
        Number(isChainSpecial(b.value)) - Number(isChainSpecial(a.value))
      );
      return moves[0] || null;
    }

    function settleChain() {
      for (let c = 0; c < 7; c++) {
        const column = [];
        for (let r = 6; r >= 0; r--) if (chain.grid[r][c]) column.push(chain.grid[r][c]);
        while (column.length < 7) column.push(randomChainCell());
        for (let r = 6; r >= 0; r--) chain.grid[r][c] = column[6 - r];
      }
    }

    function finishChainIfNeeded() {
      if (chain.finished) return;
      if (chain.moves <= 0 || chain.score >= chain.target) {
        chain.finished = true;
        localStorage.setItem(chain.bestKey, String(Math.max(Number(localStorage.getItem(chain.bestKey) || 0), chain.score)));
        if (!chain.recorded) {
          chain.recorded = true;
          if (chain.score >= chain.target) unlockAchievement('chain_clear');
          recordPremiumResult('chain', chain.score, { movesLeft: chain.moves, combo: chain.combo, mult: chain.mult, phase: chain.phaseIndex, recipes: chain.recipesCompleted });
        }
      }
    }

    function popChain(r, c) {
      if (chain.moves <= 0 || chain.finished) return;
      const result = evaluateChainMove(r, c);
      if (!result.valid) {
        chain.combo = 0;
        chain.streak = 0;
        chain.mult = 1;
        chain.lastGain = 0;
        chain.lastClear = 0;
        chain.lastSpecial = '';
        chain.specialsTriggered = 0;
        chain.feedback = '需要 3+ 相邻能量';
        renderChain();
        return;
      }
      chain.moves--;
      applyChainResult(result);
      settleChain();
      finishChainIfNeeded();
      renderChain();
    }

    function triggerChainCatalyst() {
      if (chain.moves <= 0 || chain.finished) return;
      if (chain.overcharge < 100) {
        chain.feedback = `超载未满 ${Math.floor(chain.overcharge)}% · 继续完成配方`;
        renderChain();
        return;
      }
      const result = evaluateChainCatalyst();
      if (!result.valid) {
        chain.feedback = '催化失败：没有可炼成能量';
        renderChain();
        return;
      }
      chain.overcharge = 0;
      chain.catalystUsed++;
      applyChainResult(result, { catalyst: true });
      settleChain();
      finishChainIfNeeded();
      renderChain();
    }

    function chainDebugState() {
      const best = bestChainMove();
      const phase = chainPhaseDef();
      const specials = chain.grid.flat().filter(isChainSpecial);
      return {
        score: chain.score,
        moves: chain.moves,
        combo: chain.combo,
        streak: chain.streak,
        mult: Number(chain.mult.toFixed(2)),
        target: chain.target,
        phase: phase?.label || 'MASTER',
        goal: phase?.goal || '目标分数',
        phaseIndex: chain.phaseIndex,
        feedback: chain.feedback,
        lastGain: chain.lastGain,
        lastClear: chain.lastClear,
        lastSpecial: chain.lastSpecial,
        specialsTriggered: chain.specialsTriggered,
        essence: { ...chain.essence },
        recipeProgress: { ...chain.recipeProgress },
        recipe: {
          id: currentChainRecipe().id,
          label: currentChainRecipe().label,
          percent: chainRecipePercent(),
          detail: chainRecipeDetail()
        },
        recipesCompleted: chain.recipesCompleted,
        overcharge: Math.floor(chain.overcharge),
        catalystUsed: chain.catalystUsed,
        achieved: (career.achievements || []).includes('chain_recipe'),
        finished: chain.finished,
        bestMove: best ? {
          r: best.r,
          c: best.c,
          value: best.value,
          cleared: best.cleared,
          gain: best.gain,
          specialCreated: best.specialCreated,
          specialsTriggered: best.specialsTriggered,
          cells: best.cells.slice(0, 24)
        } : null,
        specials: {
          total: specials.length,
          bomb: specials.filter(value => value === 'bomb').length,
          prism: specials.filter(value => value === 'prism').length,
          wild: specials.filter(value => value === 'wild').length
        },
        hud: {
          mult: document.getElementById('premium-chain-mult')?.textContent || '',
          phase: document.getElementById('premium-chain-phase')?.textContent || '',
          goal: document.getElementById('premium-chain-goal')?.textContent || '',
          hint: document.getElementById('premium-chain-hint')?.textContent || '',
          essence: document.getElementById('premium-chain-essence')?.textContent || '',
          recipe: document.getElementById('premium-chain-recipe')?.textContent || '',
          overcharge: document.getElementById('premium-chain-overcharge')?.textContent || ''
        },
        highlighted: chain.board?.querySelectorAll('.chain-hint,.chain-preview').length || 0
      };
    }

    function seedChainComboBoard() {
      chain.score = 0;
      chain.moves = Math.max(22, chain.moves || 30);
      chain.combo = 0;
      chain.streak = 0;
      chain.mult = 1;
      chain.phaseIndex = 0;
      chain.feedback = '实验矩阵已装载';
      chain.lastGain = 0;
      chain.lastClear = 0;
      chain.lastSpecial = '';
      chain.specialsTriggered = 0;
      resetChainLedger();
      chain.finished = false;
      chain.recorded = false;
      chain.grid = [
        ['cyan', 'cyan', 'cyan', 'cyan', 'gold', 'green', 'pink'],
        ['cyan', 'cyan', 'cyan', 'cyan', 'gold', 'green', 'pink'],
        ['cyan', 'cyan', 'cyan', 'cyan', 'bomb', 'green', 'pink'],
        ['violet', 'violet', 'wild', 'gold', 'gold', 'prism', 'green'],
        ['violet', 'pink', 'pink', 'gold', 'green', 'green', 'green'],
        ['gold', 'pink', 'violet', 'violet', 'violet', 'cyan', 'cyan'],
        ['gold', 'gold', 'pink', 'green', 'cyan', 'cyan', 'cyan']
      ];
      renderChain();
      return chainDebugState();
    }

    function forceChainCombo() {
      const before = seedChainComboBoard();
      popChain(0, 0);
      return { before, after: chainDebugState() };
    }

    function seedChainRecipeBoard() {
      chain.score = 0;
      chain.moves = Math.max(22, chain.moves || 30);
      chain.combo = 0;
      chain.streak = 0;
      chain.mult = 1;
      chain.phaseIndex = 0;
      chain.feedback = '秘方矩阵已装载';
      chain.lastGain = 0;
      chain.lastClear = 0;
      chain.lastSpecial = '';
      chain.specialsTriggered = 0;
      resetChainLedger();
      chain.finished = false;
      chain.recorded = false;
      chain.grid = [
        ['cyan', 'cyan', 'wild', 'violet', 'violet', 'gold', 'green'],
        ['cyan', 'bomb', 'violet', 'green', 'gold', 'pink', 'cyan'],
        ['cyan', 'cyan', 'violet', 'violet', 'pink', 'gold', 'green'],
        ['green', 'gold', 'violet', 'pink', 'pink', 'cyan', 'gold'],
        ['violet', 'pink', 'gold', 'green', 'green', 'cyan', 'violet'],
        ['gold', 'pink', 'violet', 'violet', 'green', 'cyan', 'cyan'],
        ['gold', 'green', 'pink', 'green', 'cyan', 'pink', 'gold']
      ];
      renderChain();
      return chainDebugState();
    }

    function forceChainRecipe() {
      const before = seedChainRecipeBoard();
      popChain(1, 1);
      return { before, after: chainDebugState() };
    }

    function forceChainCatalyst() {
      seedChainRecipeBoard();
      chain.overcharge = 100;
      chain.feedback = '超载调试已就绪';
      renderChain();
      const before = chainDebugState();
      triggerChainCatalyst();
      return { before, after: chainDebugState() };
    }

    function renderChain() {
      chain.bestMove = bestChainMove();
      const preview = new Set(chain.bestMove?.cells || []);
      const phase = chainPhaseDef();
      chain.board.innerHTML = '';
      chain.grid.forEach((row, r) => row.forEach((color, c) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const key = chainKey(r, c);
        const isHint = chain.bestMove?.r === r && chain.bestMove?.c === c;
        btn.className = `chain-cell chain-${color}${isHint ? ' chain-hint' : ''}${preview.has(key) && !isHint ? ' chain-preview' : ''}`;
        btn.dataset.chainRow = String(r);
        btn.dataset.chainCol = String(c);
        btn.dataset.chainValue = color;
        if (isHint) btn.dataset.chainGain = String(chain.bestMove?.gain || 0);
        btn.textContent = chainSpecialLabels[color] ? chainSpecialLabels[color][0] : '';
        btn.setAttribute('aria-label', color === 'bomb' ? '爆裂核心' : color === 'prism' ? '棱镜核心' : color === 'wild' ? '通量核心' : `${color} 能量`);
        btn.addEventListener('click', () => popChain(r, c));
        chain.board.appendChild(btn);
      }));
      document.getElementById('premium-chain-moves').textContent = chain.moves;
      document.getElementById('premium-chain-score').textContent = chain.score;
      document.getElementById('premium-chain-best').textContent = localStorage.getItem(chain.bestKey) || '0';
      document.getElementById('premium-chain-combo').textContent = chain.combo ? `${chain.combo}` : '0';
      document.getElementById('premium-chain-mult').textContent = `x${chain.mult.toFixed(1)}`;
      document.getElementById('premium-chain-phase').textContent = phase?.label || 'MASTER';
      document.getElementById('premium-chain-goal').textContent = phase?.goal || '冲刺目标';
      document.getElementById('premium-chain-hint').textContent = chain.bestMove ? `${chain.bestMove.cleared}格 +${chain.bestMove.gain}` : 'RESHUFFLE';
      document.getElementById('premium-chain-essence').textContent = formatChainEssence();
      document.getElementById('premium-chain-recipe').textContent = formatChainRecipe();
      document.getElementById('premium-chain-overcharge').textContent = chain.overcharge >= 100 ? 'READY' : `${Math.floor(chain.overcharge)}%`;
      document.getElementById('premium-chain-target').textContent = chain.score >= chain.target ? 'CLEAR' : chain.target;
      const catalystBtn = document.getElementById('premium-chain-catalyst');
      if (catalystBtn) {
        catalystBtn.textContent = chain.overcharge >= 100 ? 'Q 催化 READY' : `Q 催化 ${Math.floor(chain.overcharge)}%`;
        catalystBtn.dataset.ready = chain.overcharge >= 100 ? 'true' : 'false';
        catalystBtn.setAttribute('aria-disabled', chain.finished ? 'true' : 'false');
      }
      chain.board.classList.toggle('chain-cleared', chain.finished && chain.score >= chain.target);
      chain.board.classList.toggle('chain-overcharged', chain.overcharge >= 100 && !chain.finished);
      chain.board.dataset.feedback = chain.feedback;
      chain.board.dataset.recipe = chainRecipeDetail();
    }

    document.getElementById('premium-chain-new').addEventListener('click', newChain);
    document.getElementById('premium-chain-catalyst').addEventListener('click', triggerChainCatalyst);
    newChain();

    const tactics = {
      canvas: document.getElementById('premium-tactics-canvas'),
      ctx: document.getElementById('premium-tactics-canvas')?.getContext('2d'),
      bestKey: 'atherix_premium_tactics_best',
      cols: 10,
      rows: 8,
      tile: 42,
      offsetX: 70,
      offsetY: 22,
      walls: new Set(),
      cover: new Set(),
      cores: [],
      enemies: [],
      exit: { x: 9, y: 0 },
      player: { x: 1, y: 6, hp: 100, shield: 0, ap: 3, charge: 1, cores: 0 },
      turn: 1,
      kills: 0,
      momentum: 0,
      combo: 0,
      lastAction: '',
      won: false,
      lost: false,
      message: '夺取 3 个数据核心后撤离',
      flash: 0
    };

    function tacticsKey(x, y) {
      return `${x},${y}`;
    }

    function newTactics({ shouldFocus = false } = {}) {
      const bonuses = loadoutBonuses();
      const tuning = difficultyTuning();
      const enemyHpScale = Number(tuning.enemyHp || 1);
      tactics.walls = new Set([
        tacticsKey(2, 2), tacticsKey(3, 2), tacticsKey(7, 2),
        tacticsKey(5, 3), tacticsKey(1, 4), tacticsKey(8, 4),
        tacticsKey(4, 5), tacticsKey(6, 6)
      ]);
      tactics.cover = new Set([
        tacticsKey(0, 6), tacticsKey(2, 6), tacticsKey(4, 3),
        tacticsKey(6, 2), tacticsKey(7, 5), tacticsKey(9, 1)
      ]);
      tactics.cores = [
        { x: 1, y: 1, taken: false },
        { x: 6, y: 1, taken: false },
        { x: 8, y: 6, taken: false }
      ];
      tactics.enemies = [
        { id: 'drone-a', type: 'drone', x: 4, y: 1, hp: 45, maxHp: 45, disrupted: 0 },
        { id: 'turret-a', type: 'turret', x: 8, y: 1, hp: 60, maxHp: 60, disrupted: 0 },
        { id: 'hunter-a', type: 'hunter', x: 6, y: 5, hp: 70, maxHp: 70, disrupted: 0 },
        { id: 'warden-a', type: 'warden', x: 3, y: 6, hp: 95, maxHp: 95, disrupted: 0 }
      ].map(enemy => {
        const maxHp = Math.max(24, Math.round(enemy.maxHp * enemyHpScale));
        return { ...enemy, hp: maxHp, maxHp };
      });
      tactics.exit = { x: 9, y: 0 };
      tactics.player = {
        x: 1,
        y: 6,
        hp: 100 + Number(bonuses.tacticsHp || 0) + Number(tuning.tacticsHp || tuning.hp || 0),
        shield: Number(bonuses.tacticsShield || 0),
        ap: 3 + Number(bonuses.tacticsAp || 0),
        baseAp: 3 + Number(bonuses.tacticsAp || 0),
        charge: 1,
        cores: 0
      };
      tactics.turn = 1;
      tactics.kills = 0;
      tactics.momentum = 0;
      tactics.combo = 0;
      tactics.lastAction = '';
      tactics.won = false;
      tactics.lost = false;
      tactics.message = '夺取 3 个数据核心后撤离';
      tactics.flash = 0;
      setTacticsUi();
      if (shouldFocus) focusStage();
      drawTactics();
    }

    function livingTacticsEnemies() {
      return tactics.enemies.filter(enemy => enemy.hp > 0);
    }

    function tacticsEnemyAt(x, y) {
      return livingTacticsEnemies().find(enemy => enemy.x === x && enemy.y === y);
    }

    function tacticsBlocked(x, y, { ignoreEnemies = false } = {}) {
      if (x < 0 || y < 0 || x >= tactics.cols || y >= tactics.rows) return true;
      if (tactics.walls.has(tacticsKey(x, y))) return true;
      return !ignoreEnemies && !!tacticsEnemyAt(x, y);
    }

    function tacticsLineClear(ax, ay, bx, by) {
      if (ax !== bx && ay !== by) return false;
      const dx = Math.sign(bx - ax);
      const dy = Math.sign(by - ay);
      let x = ax + dx;
      let y = ay + dy;
      while (x !== bx || y !== by) {
        if (tactics.walls.has(tacticsKey(x, y))) return false;
        x += dx;
        y += dy;
      }
      return true;
    }

    function tacticsCellCenter(x, y) {
      return {
        x: tactics.offsetX + x * tactics.tile + tactics.tile / 2,
        y: tactics.offsetY + y * tactics.tile + tactics.tile / 2
      };
    }

    function tacticsCoverProfile(x = tactics.player.x, y = tactics.player.y) {
      if (tactics.cover.has(tacticsKey(x, y))) {
        return { level: 2, label: 'HARD', mitigation: 10, color: '#34D399' };
      }
      const nearWall = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .some(([dx, dy]) => tactics.walls.has(tacticsKey(x + dx, y + dy)));
      return nearWall
        ? { level: 1, label: 'SOFT', mitigation: 6, color: '#FBBF24' }
        : { level: 0, label: 'OPEN', mitigation: 0, color: '#94A3B8' };
    }

    function tacticsCellRisk(x, y) {
      if (tacticsBlocked(x, y, { ignoreEnemies: true })) return 99;
      let risk = 0;
      livingTacticsEnemies().forEach(enemy => {
        if (enemy.disrupted > 0) return;
        const dist = Math.abs(enemy.x - x) + Math.abs(enemy.y - y);
        const aligned = (enemy.x === x || enemy.y === y) && tacticsLineClear(enemy.x, enemy.y, x, y);
        if (enemy.type === 'turret' && aligned && dist <= 6) risk += 5;
        if (dist <= 1) risk += enemy.type === 'warden' ? 6 : 4;
        else if (enemy.type !== 'turret' && dist <= 3) risk += 4 - dist;
      });
      return Math.max(0, risk - tacticsCoverProfile(x, y).level);
    }

    function tacticsObjectiveTargets() {
      if (tactics.player.cores >= 3) return [{ ...tactics.exit, kind: 'EXIT' }];
      return tactics.cores.filter(core => !core.taken).map(core => ({ x: core.x, y: core.y, kind: 'CORE' }));
    }

    function tacticsPathTo(target) {
      const start = { x: tactics.player.x, y: tactics.player.y };
      const startKey = tacticsKey(start.x, start.y);
      const open = [{ ...start, score: 0, path: [] }];
      const best = new Map([[startKey, 0]]);
      while (open.length) {
        open.sort((a, b) => a.score - b.score);
        const node = open.shift();
        if (node.x === target.x && node.y === target.y) return node;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const nx = node.x + dx;
          const ny = node.y + dy;
          if (tacticsBlocked(nx, ny)) return;
          const key = tacticsKey(nx, ny);
          const cover = tacticsCoverProfile(nx, ny);
          const risk = tacticsCellRisk(nx, ny);
          const score = node.score + 1 + risk * 1.7 - cover.level * 0.35;
          if (score >= (best.get(key) ?? Infinity)) return;
          best.set(key, score);
          open.push({ x: nx, y: ny, score, path: [...node.path, { x: nx, y: ny, risk, cover: cover.label }] });
        });
      }
      return null;
    }

    function tacticsRoutePlan() {
      const targets = tacticsObjectiveTargets();
      const plans = targets.map(target => {
        const path = tacticsPathTo(target);
        if (!path) return null;
        const risk = path.path.reduce((sum, cell) => sum + Number(cell.risk || 0), 0);
        return {
          target,
          route: path.path,
          risk,
          score: path.score,
          next: path.path[0] || null,
          label: `${target.kind} ${path.path.length || 0} ${risk <= 2 ? 'SAFE' : `R${risk}`}`
        };
      }).filter(Boolean).sort((a, b) => a.score - b.score);
      return plans[0] || { target: null, route: [], risk: 0, score: 0, next: null, label: 'NO ROUTE' };
    }

    function awardTacticsMomentum(amount = 1, reason = '') {
      tactics.momentum = clamp(tactics.momentum + amount, 0, 9);
      tactics.lastAction = reason || tactics.lastAction;
      if (tactics.momentum >= 3) {
        tactics.player.shield = Math.min(42, tactics.player.shield + 3);
      }
    }

    function addTacticsDanger(map, x, y, tone = 'danger') {
      if (x < 0 || y < 0 || x >= tactics.cols || y >= tactics.rows) return;
      if (tactics.walls.has(tacticsKey(x, y))) return;
      const priority = { lane: 1, move: 2, adjacent: 3, impact: 4 };
      const key = tacticsKey(x, y);
      const prev = map.get(key);
      if (!prev || (priority[tone] || 0) > (priority[prev.tone] || 0)) {
        map.set(key, { x, y, tone });
      }
    }

    function tacticsEnemyStep(enemy) {
      const p = tactics.player;
      const options = [
        { dx: Math.sign(p.x - enemy.x), dy: 0 },
        { dx: 0, dy: Math.sign(p.y - enemy.y) },
        { dx: -Math.sign(p.x - enemy.x), dy: 0 },
        { dx: 0, dy: -Math.sign(p.y - enemy.y) }
      ].filter(step => step.dx || step.dy);
      return options.find(item => {
        const nx = enemy.x + item.dx;
        const ny = enemy.y + item.dy;
        return !tacticsBlocked(nx, ny) && !(nx === p.x && ny === p.y);
      }) || null;
    }

    function tacticsBlastTargets() {
      const p = tactics.player;
      return livingTacticsEnemies()
        .filter(enemy => {
          const dist = Math.abs(enemy.x - p.x) + Math.abs(enemy.y - p.y);
          return dist <= 4 && (enemy.x === p.x || enemy.y === p.y) && tacticsLineClear(p.x, p.y, enemy.x, enemy.y);
        })
        .sort((a, b) => (Math.abs(a.x - p.x) + Math.abs(a.y - p.y)) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y)));
    }

    function tacticsForecast() {
      const p = tactics.player;
      const danger = new Map();
      const lines = [];
      const intents = [];
      let incoming = 0;
      const cover = tacticsCoverProfile();

      livingTacticsEnemies().forEach(enemy => {
        if (enemy.disrupted > 0) {
          intents.push({ id: enemy.id, type: enemy.type, mode: 'disrupted', label: 'JAM', turns: enemy.disrupted });
          return;
        }
        const dist = Math.abs(enemy.x - p.x) + Math.abs(enemy.y - p.y);
        const aligned = (enemy.x === p.x || enemy.y === p.y) && tacticsLineClear(enemy.x, enemy.y, p.x, p.y);
        if (enemy.type === 'turret') {
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
            let x = enemy.x + dx;
            let y = enemy.y + dy;
            let last = null;
            while (x >= 0 && y >= 0 && x < tactics.cols && y < tactics.rows && !tactics.walls.has(tacticsKey(x, y))) {
              addTacticsDanger(danger, x, y, 'lane');
              last = { x, y };
              x += dx;
              y += dy;
            }
            if (last) lines.push({ from: tacticsCellCenter(enemy.x, enemy.y), to: tacticsCellCenter(last.x, last.y), tone: 'lane' });
          });
          if (aligned && dist <= 6) {
            incoming += Math.max(4, 16 - cover.mitigation);
            addTacticsDanger(danger, p.x, p.y, 'impact');
            lines.push({ from: tacticsCellCenter(enemy.x, enemy.y), to: tacticsCellCenter(p.x, p.y), tone: 'impact' });
            intents.push({ id: enemy.id, type: enemy.type, mode: 'lock', label: 'LOCK' });
          } else {
            intents.push({ id: enemy.id, type: enemy.type, mode: 'overwatch', label: 'WATCH' });
          }
          return;
        }

        if (dist <= 1) {
          incoming += Math.max(4, (enemy.type === 'warden' ? 24 : 15) - cover.mitigation);
          addTacticsDanger(danger, p.x, p.y, 'impact');
          intents.push({ id: enemy.id, type: enemy.type, mode: 'strike', label: 'STRIKE' });
          return;
        }

        const step = tacticsEnemyStep(enemy);
        if (step) {
          const nx = enemy.x + step.dx;
          const ny = enemy.y + step.dy;
          addTacticsDanger(danger, nx, ny, 'move');
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => addTacticsDanger(danger, nx + dx, ny + dy, 'adjacent'));
          lines.push({ from: tacticsCellCenter(enemy.x, enemy.y), to: tacticsCellCenter(nx, ny), tone: 'move' });
          intents.push({ id: enemy.id, type: enemy.type, mode: 'flank', label: 'FLANK', target: { x: nx, y: ny } });
        } else {
          intents.push({ id: enemy.id, type: enemy.type, mode: 'hold', label: 'HOLD' });
        }
      });

      const blastTargets = tacticsBlastTargets();
      const route = tacticsRoutePlan();
      let label = '安全窗口';
      let tone = 'safe';
      let suggestion = '推进核心';
      if (tactics.lost) {
        label = '机甲离线';
        tone = 'danger';
        suggestion = '重开行动';
      } else if (tactics.won) {
        label = '裂隙安全';
        tone = 'safe';
        suggestion = '评分已保存';
      } else if (incoming > 0) {
        label = '火力锁定';
        tone = 'danger';
        suggestion = tactics.player.charge > 0 ? '爆破或撤离' : '撤离或架盾';
      } else if (blastTargets.length > 0 && tactics.player.charge > 0) {
        label = `可爆破 ${Math.min(2, blastTargets.length)}`;
        tone = 'attack';
        suggestion = '直线火力窗口';
      } else if (tactics.player.charge > 0 && livingTacticsEnemies().some(enemy => enemy.disrupted <= 0)) {
        label = '可干扰';
        tone = 'attack';
        suggestion = '脉冲瘫痪近敌';
      } else if ([...danger.values()].some(cell => cell.tone !== 'lane')) {
        label = '包抄预警';
        tone = 'warn';
        suggestion = '避开标记格';
      } else if (route.next) {
        label = route.label;
        tone = route.risk > 2 ? 'warn' : 'safe';
        suggestion = '沿推荐路线推进';
      }

      return {
        dangerCells: [...danger.values()],
        lines,
        intents,
        incoming,
        blastTargets: blastTargets.map(enemy => enemy.id),
        route,
        cover,
        momentum: tactics.momentum,
        combo: tactics.combo,
        label,
        tone,
        suggestion
      };
    }

    function setTacticsUi() {
      const p = tactics.player;
      const forecast = tacticsForecast();
      const route = forecast.route || tacticsRoutePlan();
      const cover = forecast.cover || tacticsCoverProfile();
      document.getElementById('premium-tactics-cores').textContent = p.cores;
      document.getElementById('premium-tactics-hp').textContent = Math.max(0, Math.ceil(p.hp));
      document.getElementById('premium-tactics-ap').textContent = p.ap;
      document.getElementById('premium-tactics-turn').textContent = tactics.turn;
      document.getElementById('premium-tactics-best').textContent = localStorage.getItem(tactics.bestKey) || '0';
      const threatEl = document.getElementById('premium-tactics-threat');
      const nearby = livingTacticsEnemies().filter(enemy => Math.abs(enemy.x - p.x) + Math.abs(enemy.y - p.y) <= 3).length;
      const threat = tactics.lost ? 'DOWN' : tactics.won ? 'CLEAR' : forecast.incoming > 0 ? 'HIGH' : nearby >= 2 ? 'HIGH' : nearby === 1 ? 'MID' : 'LOW';
      threatEl.textContent = threat;
      threatEl.style.color = threat === 'HIGH' || threat === 'DOWN' ? '#EF4444' : threat === 'MID' ? '#FBBF24' : '#34D399';
      const intelEl = document.getElementById('premium-tactics-intel');
      if (intelEl) {
        intelEl.textContent = forecast.label;
        intelEl.style.color = forecast.tone === 'danger' ? '#EF4444' : forecast.tone === 'warn' ? '#FBBF24' : forecast.tone === 'attack' ? '#A78BFA' : '#34D399';
      }
      const dangerEl = document.getElementById('premium-tactics-danger');
      if (dangerEl) {
        dangerEl.textContent = forecast.dangerCells.length;
        dangerEl.style.color = forecast.incoming > 0 ? '#EF4444' : forecast.dangerCells.length > 0 ? '#FBBF24' : '#34D399';
      }
      const coverEl = document.getElementById('premium-tactics-cover');
      if (coverEl) {
        coverEl.textContent = cover.label;
        coverEl.style.color = cover.color;
      }
      const momentumEl = document.getElementById('premium-tactics-momentum');
      if (momentumEl) {
        momentumEl.textContent = tactics.momentum;
        momentumEl.style.color = tactics.momentum >= 5 ? '#A7F3D0' : tactics.momentum >= 2 ? '#FDE68A' : '#94A3B8';
      }
      const routeEl = document.getElementById('premium-tactics-route');
      if (routeEl) {
        routeEl.textContent = route.label;
        routeEl.style.color = route.risk > 2 ? '#FBBF24' : '#A7F3D0';
      }
      const actionBtn = document.getElementById('premium-tactics-action');
      if (actionBtn) {
        const targetText = p.charge > 0 && forecast.blastTargets.length > 0 ? ` · ${Math.min(2, forecast.blastTargets.length)} 目标` : '';
        const noTargetText = p.charge > 0 ? '干扰脉冲' : '架盾待机';
        actionBtn.textContent = p.charge > 0 && forecast.blastTargets.length > 0 ? `相位爆破 x${p.charge}${targetText}` : noTargetText;
        actionBtn.title = forecast.suggestion;
      }
    }

    function spendTacticsAp(amount = 1) {
      tactics.player.ap = Math.max(0, tactics.player.ap - amount);
      if (tactics.player.ap <= 0 && !tactics.won && !tactics.lost) {
        enemyTacticsTurn();
        if (!tactics.won && !tactics.lost) {
          tactics.player.ap = tactics.player.baseAp || 3;
          tactics.turn++;
        }
      }
    }

    function damageTacticsPlayer(amount) {
      const cover = tacticsCoverProfile();
      const momentumGuard = tactics.momentum >= 5 ? 3 : 0;
      const mitigated = Math.max(1, amount - cover.mitigation - momentumGuard);
      const absorbed = Math.min(tactics.player.shield, mitigated);
      tactics.player.shield -= absorbed;
      tactics.player.hp -= mitigated - absorbed;
      if (mitigated > absorbed) tactics.momentum = Math.max(0, tactics.momentum - 2);
      tactics.flash = 10;
      if (tactics.player.hp <= 0) {
        tactics.player.hp = 0;
        tactics.lost = true;
        tactics.message = '机甲失去行动能力';
      }
      return { raw: amount, mitigated, absorbed, cover };
    }

    function damageTacticsEnemy(enemy, amount) {
      const before = enemy.hp;
      enemy.hp -= amount;
      if (enemy.hp <= 0) {
        enemy.hp = 0;
        tactics.kills++;
        tactics.player.charge = Math.min(3, tactics.player.charge + 1);
        tactics.combo++;
        awardTacticsMomentum(2, 'kill');
      }
      return { before, after: enemy.hp, killed: before > 0 && enemy.hp <= 0 };
    }

    function finishTacticsWin() {
      if (tactics.won) return;
      tactics.won = true;
      const score = Math.max(250, 800 + tactics.player.hp * 8 + tactics.kills * 180 + tactics.player.cores * 260 + tactics.momentum * 45 + tactics.combo * 80 - tactics.turn * 22);
      localStorage.setItem(tactics.bestKey, String(Math.max(Number(localStorage.getItem(tactics.bestKey) || 0), Math.floor(score))));
      unlockAchievement('tactics_clear');
      if (tactics.player.hp >= 80) unlockAchievement('tactics_clean');
      if (livingTacticsEnemies().length === 0) unlockAchievement('tactics_sweep');
      recordPremiumResult('tactics', score, { turns: tactics.turn, hp: tactics.player.hp, kills: tactics.kills });
      tactics.message = `撤离成功 · 评分 ${Math.floor(score)}`;
    }

    function collectTacticsCore() {
      const core = tactics.cores.find(item => !item.taken && item.x === tactics.player.x && item.y === tactics.player.y);
      if (!core) return false;
      core.taken = true;
      tactics.player.cores++;
      tactics.player.charge = Math.min(3, tactics.player.charge + 1);
      awardTacticsMomentum(2, 'core');
      tactics.message = tactics.player.cores >= 3 ? '核心齐备，前往右上撤离点' : '数据核心已夺取';
      return true;
    }

    function moveTactics(dx, dy) {
      if (premiumActive !== 'tactics' || tactics.won || tactics.lost) return;
      const nx = tactics.player.x + dx;
      const ny = tactics.player.y + dy;
      const routeBefore = tacticsRoutePlan();
      const enemy = tacticsEnemyAt(nx, ny);
      if (enemy) {
        const result = damageTacticsEnemy(enemy, 28 + tactics.momentum * 2);
        if (!result.killed) enemy.disrupted = Math.max(enemy.disrupted || 0, 1);
        awardTacticsMomentum(result.killed ? 2 : 1, 'melee');
        tactics.message = enemy.hp <= 0 ? '近战击破目标' : '近战压制目标';
        spendTacticsAp(1);
        setTacticsUi();
        drawTactics();
        return;
      }
      if (tacticsBlocked(nx, ny, { ignoreEnemies: true })) {
        tactics.message = '该格无法通行';
        drawTactics();
        return;
      }
      tactics.player.x = nx;
      tactics.player.y = ny;
      const cover = tacticsCoverProfile(nx, ny);
      const risk = tacticsCellRisk(nx, ny);
      const followedRoute = !!routeBefore.next && routeBefore.next.x === nx && routeBefore.next.y === ny;
      if (followedRoute) awardTacticsMomentum(1, 'route');
      if (cover.level > 0) awardTacticsMomentum(cover.level, 'cover');
      if (risk <= 1) awardTacticsMomentum(1, 'clean');
      if (!followedRoute && risk > 2) tactics.momentum = Math.max(0, tactics.momentum - 1);
      const collected = collectTacticsCore();
      if (tactics.player.cores >= 3 && tactics.player.x === tactics.exit.x && tactics.player.y === tactics.exit.y) {
        finishTacticsWin();
      } else {
        if (!collected) {
          const routeText = followedRoute ? '推荐路线推进' : cover.level > 0 ? `${cover.label} 掩体就位` : risk > 2 ? '高危推进' : '战术推进';
          tactics.message = `${routeText} · 动量 ${tactics.momentum}`;
        }
        spendTacticsAp(1);
      }
      setTacticsUi();
      drawTactics();
    }

    function tacticsDisruptTargets() {
      const p = tactics.player;
      return livingTacticsEnemies()
        .filter(enemy => enemy.disrupted <= 0)
        .map(enemy => ({ enemy, dist: Math.abs(enemy.x - p.x) + Math.abs(enemy.y - p.y) }))
        .filter(item => item.dist <= 4)
        .sort((a, b) => a.dist - b.dist || (b.enemy.type === 'warden') - (a.enemy.type === 'warden'))
        .slice(0, 3)
        .map(item => item.enemy);
    }

    function triggerTacticsAction() {
      if (premiumActive !== 'tactics' || tactics.won || tactics.lost) return;
      const p = tactics.player;
      if (p.charge <= 0) {
        const cover = tacticsCoverProfile();
        p.shield = Math.min(42, p.shield + 14 + cover.level * 4);
        awardTacticsMomentum(1, 'guard');
        tactics.message = '架盾待机：下回合前吸收伤害';
        spendTacticsAp(1);
        setTacticsUi();
        drawTactics();
        return;
      }
      const targets = tacticsBlastTargets();
      if (!targets.length) {
        const disrupted = tacticsDisruptTargets();
        disrupted.forEach(enemy => {
          enemy.disrupted = Math.max(enemy.disrupted || 0, 2);
          damageTacticsEnemy(enemy, 10 + tactics.momentum * 2);
        });
        p.shield = Math.min(42, p.shield + 12 + disrupted.length * 3);
        p.charge--;
        awardTacticsMomentum(Math.max(1, disrupted.length), 'jam');
        tactics.message = disrupted.length ? `干扰脉冲瘫痪 ${disrupted.length} 目标` : '没有目标，能量转为护盾';
      } else {
        const hitTargets = targets.slice(0, 2);
        let killed = 0;
        hitTargets.forEach(enemy => {
          const result = damageTacticsEnemy(enemy, 48 + tactics.momentum * 3);
          if (result.killed) killed++;
          else enemy.disrupted = Math.max(enemy.disrupted || 0, 1);
        });
        p.charge--;
        const refunded = hitTargets.length >= 2 || killed > 0;
        if (refunded) p.ap = Math.min(p.baseAp || 3, p.ap + 1);
        awardTacticsMomentum(hitTargets.length + killed, 'blast');
        tactics.message = `${targets.length > 1 ? '相位爆破贯穿双目标' : '相位爆破命中目标'}${refunded ? ' · 返还行动' : ''}`;
      }
      spendTacticsAp(1);
      setTacticsUi();
      drawTactics();
    }

    function enemyTacticsTurn() {
      const p = tactics.player;
      livingTacticsEnemies().forEach(enemy => {
        if (tactics.lost) return;
        if (enemy.disrupted > 0) {
          enemy.disrupted--;
          tactics.message = '干扰生效：敌方行动延迟';
          return;
        }
        const dist = Math.abs(enemy.x - p.x) + Math.abs(enemy.y - p.y);
        const aligned = (enemy.x === p.x || enemy.y === p.y) && tacticsLineClear(enemy.x, enemy.y, p.x, p.y);
        if (enemy.type === 'turret' && aligned && dist <= 6) {
          const result = damageTacticsPlayer(16);
          tactics.message = result.cover.level > 0 ? `${result.cover.label} 掩体吸收炮塔射线` : '炮塔射线命中机甲';
          return;
        }
        if (dist <= 1) {
          const result = damageTacticsPlayer(enemy.type === 'warden' ? 24 : 15);
          tactics.message = result.cover.level > 0 ? `${result.cover.label} 掩体抵消近战冲击` : '敌方近战接触';
          return;
        }
        const step = tacticsEnemyStep(enemy);
        if (step && enemy.type !== 'turret') {
          enemy.x += step.dx;
          enemy.y += step.dy;
        }
      });
      tactics.player.shield = Math.max(0, tactics.player.shield - 6);
      tactics.momentum = Math.max(0, tactics.momentum - 1);
    }

    function drawTactics() {
      const { ctx, canvas: c } = tactics;
      if (!ctx || !c) return;
      const routePlan = tacticsRoutePlan();
      const routeKeys = new Set((routePlan.route || []).slice(0, 6).map(cell => tacticsKey(cell.x, cell.y)));
      ctx.fillStyle = '#06111f';
      ctx.fillRect(0, 0, c.width, c.height);
      drawGrid(ctx, c.width, c.height, 'rgba(56, 189, 248, 0.06)', 28);

      for (let y = 0; y < tactics.rows; y++) {
        for (let x = 0; x < tactics.cols; x++) {
          const px = tactics.offsetX + x * tactics.tile;
          const py = tactics.offsetY + y * tactics.tile;
          const isExit = x === tactics.exit.x && y === tactics.exit.y;
          const isWall = tactics.walls.has(tacticsKey(x, y));
          const isCover = tactics.cover.has(tacticsKey(x, y));
          const isRoute = routeKeys.has(tacticsKey(x, y));
          ctx.fillStyle = isWall ? '#172033' : isExit ? 'rgba(52, 211, 153, 0.22)' : isCover ? 'rgba(16, 185, 129, 0.16)' : 'rgba(15, 23, 42, 0.82)';
          ctx.fillRect(px, py, tactics.tile - 2, tactics.tile - 2);
          ctx.strokeStyle = isExit ? 'rgba(52, 211, 153, 0.55)' : isCover ? 'rgba(52, 211, 153, 0.32)' : 'rgba(148, 163, 184, 0.14)';
          ctx.strokeRect(px + 0.5, py + 0.5, tactics.tile - 3, tactics.tile - 3);
          if (isRoute && !isWall) {
            ctx.strokeStyle = 'rgba(186, 230, 253, 0.42)';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 6, py + 6, tactics.tile - 14, tactics.tile - 14);
            ctx.lineWidth = 1;
          }
          if (isCover) {
            ctx.fillStyle = 'rgba(167, 243, 208, 0.7)';
            ctx.fillRect(px + 8, py + tactics.tile - 12, tactics.tile - 18, 3);
            ctx.fillRect(px + 8, py + 9, 3, 13);
          }
        }
      }

      const forecast = tacticsForecast();
      if (routePlan.route?.length) {
        ctx.save();
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.56)';
        ctx.fillStyle = 'rgba(186, 230, 253, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 7]);
        ctx.beginPath();
        const start = tacticsCellCenter(tactics.player.x, tactics.player.y);
        ctx.moveTo(start.x, start.y);
        routePlan.route.slice(0, 6).forEach(cell => {
          const center = tacticsCellCenter(cell.x, cell.y);
          ctx.lineTo(center.x, center.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        routePlan.route.slice(0, 6).forEach((cell, index) => {
          const center = tacticsCellCenter(cell.x, cell.y);
          ctx.globalAlpha = index === 0 ? 0.95 : 0.48;
          ctx.beginPath();
          ctx.arc(center.x, center.y, index === 0 ? 5 : 3, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
      const dangerPaint = {
        lane: { fill: 'rgba(249, 115, 22, 0.08)', stroke: 'rgba(249, 115, 22, 0.2)' },
        move: { fill: 'rgba(167, 139, 250, 0.14)', stroke: 'rgba(167, 139, 250, 0.38)' },
        adjacent: { fill: 'rgba(251, 191, 36, 0.12)', stroke: 'rgba(251, 191, 36, 0.32)' },
        impact: { fill: 'rgba(239, 68, 68, 0.24)', stroke: 'rgba(239, 68, 68, 0.68)' }
      };
      ctx.save();
      forecast.dangerCells.forEach(cell => {
        const px = tactics.offsetX + cell.x * tactics.tile;
        const py = tactics.offsetY + cell.y * tactics.tile;
        const paint = dangerPaint[cell.tone] || dangerPaint.adjacent;
        ctx.fillStyle = paint.fill;
        ctx.strokeStyle = paint.stroke;
        ctx.lineWidth = cell.tone === 'impact' ? 2.5 : 1.5;
        ctx.fillRect(px + 4, py + 4, tactics.tile - 10, tactics.tile - 10);
        ctx.strokeRect(px + 5, py + 5, tactics.tile - 12, tactics.tile - 12);
      });
      forecast.lines.forEach(line => {
        ctx.strokeStyle = line.tone === 'impact' ? 'rgba(239, 68, 68, 0.62)' : line.tone === 'move' ? 'rgba(167, 139, 250, 0.48)' : 'rgba(249, 115, 22, 0.28)';
        ctx.lineWidth = line.tone === 'impact' ? 3 : 2;
        ctx.setLineDash(line.tone === 'lane' ? [5, 7] : [8, 6]);
        ctx.beginPath();
        ctx.moveTo(line.from.x, line.from.y);
        ctx.lineTo(line.to.x, line.to.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();
      const intentMap = new Map(forecast.intents.map(intent => [intent.id, intent]));

      tactics.cores.forEach(core => {
        if (core.taken) return;
        const cx = tactics.offsetX + core.x * tactics.tile + tactics.tile / 2;
        const cy = tactics.offsetY + core.y * tactics.tile + tactics.tile / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(performance.now() / 700);
        ctx.fillStyle = '#FBBF24';
        ctx.shadowColor = '#FBBF24';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      livingTacticsEnemies().forEach(enemy => {
        const px = tactics.offsetX + enemy.x * tactics.tile;
        const py = tactics.offsetY + enemy.y * tactics.tile;
        const color = enemy.type === 'turret' ? '#F97316' : enemy.type === 'warden' ? '#EC4899' : '#EF4444';
        if (enemy.disrupted <= 0 && (enemy.x === tactics.player.x || enemy.y === tactics.player.y) && tacticsLineClear(enemy.x, enemy.y, tactics.player.x, tactics.player.y)) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.28)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(px + tactics.tile / 2, py + tactics.tile / 2);
          ctx.lineTo(tactics.offsetX + tactics.player.x * tactics.tile + tactics.tile / 2, tactics.offsetY + tactics.player.y * tactics.tile + tactics.tile / 2);
          ctx.stroke();
        }
        ctx.fillStyle = enemy.disrupted > 0 ? '#22D3EE' : color;
        ctx.shadowColor = enemy.disrupted > 0 ? '#22D3EE' : color;
        ctx.shadowBlur = 10;
        ctx.fillRect(px + 8, py + 8, tactics.tile - 18, tactics.tile - 18);
        if (enemy.disrupted > 0) {
          ctx.strokeStyle = 'rgba(186, 230, 253, 0.9)';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 5, py + 5, tactics.tile - 12, tactics.tile - 12);
        }
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px + 7, py + tactics.tile - 8, tactics.tile - 16, 4);
        ctx.fillStyle = '#34D399';
        ctx.fillRect(px + 7, py + tactics.tile - 8, (tactics.tile - 16) * Math.max(0, enemy.hp / enemy.maxHp), 4);
        const intent = intentMap.get(enemy.id);
        if (intent) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.font = '800 7px JetBrains Mono, monospace';
          ctx.fillText(intent.label, px + 9, py + 20);
        }
      });

      const p = tactics.player;
      const px = tactics.offsetX + p.x * tactics.tile;
      const py = tactics.offsetY + p.y * tactics.tile;
      const cover = tacticsCoverProfile();
      if (tactics.flash > 0) tactics.flash--;
      ctx.save();
      ctx.shadowColor = p.shield > 0 ? '#34D399' : '#38BDF8';
      ctx.shadowBlur = p.shield > 0 ? 20 : 12;
      ctx.fillStyle = tactics.flash > 0 ? '#FDE68A' : '#38BDF8';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(px + 7, py + 5, tactics.tile - 14, tactics.tile - 10, 7);
        ctx.fill();
      } else {
        ctx.fillRect(px + 7, py + 5, tactics.tile - 14, tactics.tile - 10);
      }
      ctx.fillStyle = '#08111f';
      ctx.fillRect(px + 15, py + 15, 7, 7);
      ctx.fillRect(px + 25, py + 15, 7, 7);
      if (p.shield > 0) {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + tactics.tile / 2, py + tactics.tile / 2, 22, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (cover.level > 0) {
        ctx.strokeStyle = cover.level > 1 ? 'rgba(52, 211, 153, 0.9)' : 'rgba(251, 191, 36, 0.82)';
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 4, py + 4, tactics.tile - 10, tactics.tile - 10);
      }
      ctx.restore();

      ctx.fillStyle = '#fff';
      ctx.font = '800 12px JetBrains Mono, monospace';
      ctx.fillText(`SHIELD ${Math.round(p.shield)} · CHARGE ${p.charge} · MOM ${tactics.momentum}`, 18, 24);
      ctx.fillStyle = forecast.tone === 'danger' ? '#FCA5A5' : forecast.tone === 'warn' ? '#FDE68A' : forecast.tone === 'attack' ? '#DDD6FE' : '#A7F3D0';
      ctx.font = '800 11px JetBrains Mono, monospace';
      ctx.fillText(`INTEL ${forecast.label} · ${forecast.dangerCells.length} ZONES · ${routePlan.label}`, 18, 42);
      ctx.fillStyle = '#A78BFA';
      ctx.font = '700 12px Plus Jakarta Sans, sans-serif';
      ctx.fillText(tactics.message, 18, 344);

      if (tactics.won) overlay(ctx, c.width, c.height, 'RIFT SECURED', '数据核心撤离成功 · 评分已保存');
      if (tactics.lost) overlay(ctx, c.width, c.height, 'MECH DOWN', '点击开始行动重开战术任务');
    }

    document.getElementById('premium-tactics-start').addEventListener('click', () => newTactics({ shouldFocus: true }));
    document.getElementById('premium-tactics-action').addEventListener('click', () => {
      focusStage();
      triggerTacticsAction();
    });
    newTactics();

    function tacticsDebugState() {
      const forecast = tacticsForecast();
      const route = forecast.route || tacticsRoutePlan();
      const cover = forecast.cover || tacticsCoverProfile();
      return {
        active: premiumActive,
        player: { ...tactics.player },
        turn: tactics.turn,
        kills: tactics.kills,
        momentum: tactics.momentum,
        combo: tactics.combo,
        lastAction: tactics.lastAction,
        message: tactics.message,
        cover,
        route: {
          label: route.label,
          risk: route.risk,
          length: route.route?.length || 0,
          next: route.next,
          target: route.target,
          preview: (route.route || []).slice(0, 6)
        },
        forecast: {
          label: forecast.label,
          tone: forecast.tone,
          suggestion: forecast.suggestion,
          incoming: forecast.incoming,
          dangerCount: forecast.dangerCells.length,
          blastTargets: forecast.blastTargets,
          intents: forecast.intents
        },
        enemies: livingTacticsEnemies().map(enemy => ({
          id: enemy.id,
          type: enemy.type,
          x: enemy.x,
          y: enemy.y,
          hp: enemy.hp,
          maxHp: enemy.maxHp,
          disrupted: enemy.disrupted || 0
        })),
        hud: {
          cover: document.getElementById('premium-tactics-cover')?.textContent || '',
          momentum: document.getElementById('premium-tactics-momentum')?.textContent || '',
          route: document.getElementById('premium-tactics-route')?.textContent || '',
          intel: document.getElementById('premium-tactics-intel')?.textContent || '',
          danger: document.getElementById('premium-tactics-danger')?.textContent || '',
          action: document.getElementById('premium-tactics-action')?.textContent || '',
          ap: document.getElementById('premium-tactics-ap')?.textContent || ''
        }
      };
    }

    if (['127.0.0.1', 'localhost'].includes(window.location.hostname)) {
      window.__atherixDebug = {
        ...(window.__atherixDebug || {}),
        premium: {
          active: () => premiumActive,
          survivorRunning: () => survivor.running,
          survivorPaused: () => survivor.paused,
          survivorElapsed: () => survivor.elapsed,
          survivorScore: () => survivor.score,
          survivorDraftOpen: () => survivor.draftOpen,
          survivorDraftChoices: () => survivor.draftChoices.map(choice => ({ id: choice.id, title: choice.title })),
          openSurvivorDraft: () => {
            if (!survivor.running) startSurvivor();
            if (!survivor.draftOpen) openSurvivorDraft();
            return survivor.draftChoices.map(choice => choice.id);
          },
          chooseSurvivorUpgrade: (id) => selectSurvivorUpgrade(id || survivor.draftChoices[0]?.id),
          survivorBuild: () => survivorBuildSummary(),
          survivorState: () => survivorDebugState(),
          forceSurvivorAnomaly: (type = 'meteor') => forceSurvivorAnomaly(type),
          forceSurvivorOverdrive: () => forceSurvivorOverdrive(),
          forceSurvivorBounty: () => forceSurvivorBounty(),
          bossRunning: () => bossMode.running,
          bossPaused: () => bossMode.paused,
          bossPhase: () => bossMode.boss.phase,
          bossPattern: () => ({
            queued: bossMode.queuedPattern,
            current: bossMode.currentPattern,
            label: bossPatternDefs[bossMode.queuedPattern || bossMode.currentPattern]?.label || '',
            telegraphMs: Math.ceil(bossMode.telegraphTimer),
            bullets: bossMode.bullets.length,
            weak: bossWeakState(),
            breakCount: bossMode.breakCount,
            hud: document.getElementById('premium-boss-pattern')?.textContent || '',
            weakHud: document.getElementById('premium-boss-weak')?.textContent || '',
            breakHud: document.getElementById('premium-boss-break')?.textContent || ''
          }),
          bossWeakState: () => bossWeakState(),
          forceBossFocusSurge: () => {
            if (!bossMode.running) startBoss();
            bossMode.paused = false;
            bossMode.player.focus = 0;
            bossMode.player.focusSurge = 0;
            bossMode.player.graze = 0;
            bossMode.player.grazeStreak = 0;
            bossMode.player.bestGrazeStreak = 0;
            bossMode.focusFlash = 0;
            bossMode.focusSurges = 0;
            const before = bossWeakState();
            let attempts = 0;
            while (bossMode.player.focusSurge <= 0 && attempts < 8) {
              awardBossGraze();
              attempts++;
            }
            setBossUi();
            return {
              attempts,
              before,
              after: bossWeakState()
            };
          },
          forceBossTelegraph: (pattern = 'snipe') => {
            if (!bossMode.running) startBoss();
            bossMode.bullets = [];
            bossMode.queuedPattern = '';
            bossMode.currentPattern = '';
            bossMode.telegraphTimer = 0;
            bossMode.telegraphDuration = 0;
            bossMode.patternTimer = 0;
            startBossTelegraph(pattern);
            drawBoss();
            return window.__atherixDebug.premium.bossPattern();
          },
          forceBossCounter: (pattern = 'snipe') => {
            if (!bossMode.running) startBoss();
            bossMode.paused = false;
            bossMode.bullets = [
              { x: bossMode.boss.x, y: bossMode.boss.y + 42, vx: 0, vy: 120, r: 6, color: '#F97316', grazed: false },
              { x: bossMode.boss.x - 28, y: bossMode.boss.y + 52, vx: -30, vy: 132, r: 5, color: '#A78BFA', grazed: false }
            ];
            bossMode.queuedPattern = '';
            bossMode.currentPattern = '';
            bossMode.telegraphTimer = 0;
            bossMode.telegraphDuration = 0;
            bossMode.patternTimer = 0;
            startBossTelegraph(pattern);
            const before = window.__atherixDebug.premium.bossPattern();
            const required = Math.max(1, bossMode.weakpoint.required || 1);
            for (let i = 0; i < required + 1 && bossWeakpointActive(); i++) hitBossWeakpoint(18);
            drawBoss();
            return {
              before,
              after: window.__atherixDebug.premium.bossPattern(),
              weak: bossWeakState()
            };
          },
          driftRunning: () => drift.running,
          driftPaused: () => drift.paused,
          driftGates: () => drift.gateIndex,
          driftShield: () => drift.player.shield,
          driftLineState: () => ({
            running: drift.running,
            paused: drift.paused,
            gates: drift.gateIndex,
            label: drift.lineLabel,
            tone: drift.lineTone,
            quality: drift.lineQuality,
            combo: drift.combo,
            bestCombo: drift.bestCombo,
            lineBank: Math.floor(drift.lineBank),
            draft: Number(drift.draft.toFixed(2)),
            draftBank: Math.floor(drift.draftBank),
            overtakes: drift.overtakes,
            heat: Math.floor(drift.heat),
            heatPeak: Math.floor(drift.heatPeak),
            phaseCharge: Math.floor(drift.phaseCharge),
            phaseBrake: Math.ceil(drift.phaseBrake),
            phaseUses: drift.phaseUses,
            contract: {
              id: currentDriftSponsor()?.id || '',
              label: currentDriftSponsor()?.label || '',
              progress: drift.contractProgress,
              target: currentDriftSponsor()?.target || 0,
              completed: drift.contractsCompleted
            },
            lastContract: drift.lastContract,
            lastTactic: drift.lastTactic,
            rival: {
              gap: Number((drift.rival?.gap || 0).toFixed(2)),
              segment: drift.rival?.segment || 0,
              progress: Number((drift.rival?.progress || 0).toFixed(2)),
              flash: Math.ceil(drift.rival?.flash || 0)
            },
            splits: drift.splits.map(split => ({ ...split })),
            score: Math.floor(drift.score),
            boost: Math.ceil(drift.boost),
            mult: Number(drift.multiplier.toFixed(2)),
            lineHud: document.getElementById('premium-drift-line')?.textContent || '',
            comboHud: document.getElementById('premium-drift-combo')?.textContent || '',
            rivalHud: document.getElementById('premium-drift-rival')?.textContent || '',
            overtakeHud: document.getElementById('premium-drift-overtake')?.textContent || '',
            contractHud: document.getElementById('premium-drift-contract')?.textContent || '',
            heatHud: document.getElementById('premium-drift-heat')?.textContent || '',
            phaseHud: document.getElementById('premium-drift-phase')?.textContent || '',
            phaseReady: document.getElementById('premium-drift-phase-btn')?.dataset.ready || ''
          }),
          forceDriftPhaseBrake: () => {
            if (!drift.running) startDrift();
            drift.paused = false;
            drift.phaseCharge = 100;
            drift.phaseBrake = 0;
            drift.heat = Math.max(72, drift.heat);
            drift.heatPeak = Math.max(drift.heatPeak, drift.heat);
            setDriftUi();
            const before = window.__atherixDebug.premium.driftLineState();
            const triggered = triggerDriftPhaseBrake();
            return {
              triggered,
              before,
              after: window.__atherixDebug.premium.driftLineState()
            };
          },
          forceDriftApex: () => {
            if (!drift.running) startDrift();
            drift.paused = false;
            const gate = drift.gates[drift.gateIndex];
            if (!gate) return window.__atherixDebug.premium.driftLineState();
            drift.player.x = gate.x;
            drift.player.y = gate.y;
            drift.player.angle = driftSegmentAngle(drift.gateIndex);
            drift.player.vx = Math.cos(drift.player.angle) * 242;
            drift.player.vy = Math.sin(drift.player.angle) * 242;
            passDriftGate(Math.hypot(drift.player.vx, drift.player.vy));
            setDriftUi();
            drawDrift();
            return window.__atherixDebug.premium.driftLineState();
          },
          forceDriftSponsor: () => {
            if (!drift.running) startDrift();
            drift.paused = false;
            drift.contractIndex = 0;
            drift.contractProgress = 0;
            drift.lastContract = '';
            setDriftUi();
            const before = window.__atherixDebug.premium.driftLineState();
            let attempts = 0;
            while (drift.running && drift.contractsCompleted <= before.contract.completed && attempts < 4) {
              window.__atherixDebug.premium.forceDriftApex();
              attempts++;
            }
            setDriftUi();
            drawDrift();
            return {
              attempts,
              before,
              after: window.__atherixDebug.premium.driftLineState(),
              achieved: (career.achievements || []).includes('drift_sponsor')
            };
          },
          heistSteps: () => heist.steps,
          heistIntel: () => heistDebugState(),
          stepHeistRoute: () => stepHeistRoute(),
          forceHeistDecoy: () => {
            switchPremiumGame('heist');
            if (!heist.grid.length) newHeist();
            heist.player = { x: 6, y: 8 };
            heist.decoy = null;
            heist.decoys = Math.max(1, heist.decoys);
            const before = heistDebugState();
            triggerHeistDecoy();
            heistAdvanceSensors();
            setHeistUi();
            drawHeist();
            return {
              before,
              after: heistDebugState()
            };
          },
          forceHeistCache: () => {
            switchPremiumGame('heist');
            if (!heist.grid.length) newHeist();
            const target = heist.caches.find(cache => !cache.taken && cache.value >= 240) ||
              heist.caches.find(cache => !cache.taken);
            if (!target) return { before: heistDebugState(), after: heistDebugState(), achieved: false };
            const starts = [
              { x: target.x - 1, y: target.y },
              { x: target.x + 1, y: target.y },
              { x: target.x, y: target.y - 1 },
              { x: target.x, y: target.y + 1 }
            ];
            const start = starts.find(pos => !heistTileBlocked(pos.x, pos.y)) || { x: target.x, y: target.y };
            heist.player = start;
            heist.cloakTurns = Math.max(heist.cloakTurns, 2);
            heist.chain = Math.max(heist.chain, 5);
            const before = heistDebugState();
            moveHeist(target.x - start.x, target.y - start.y);
            return {
              before,
              after: heistDebugState(),
              achieved: (career.achievements || []).includes('heist_cache')
            };
          },
          chainState: () => chainDebugState(),
          forceChainCombo: () => forceChainCombo(),
          forceChainRecipe: () => forceChainRecipe(),
          forceChainCatalyst: () => forceChainCatalyst(),
          tacticsTurn: () => tactics.turn,
          tacticsState: () => tacticsDebugState(),
          tacticsForecast: () => {
            const forecast = tacticsForecast();
            const route = forecast.route || tacticsRoutePlan();
            const cover = forecast.cover || tacticsCoverProfile();
            return {
              label: forecast.label,
              tone: forecast.tone,
              suggestion: forecast.suggestion,
              incoming: forecast.incoming,
              dangerCount: forecast.dangerCells.length,
              dangerCells: forecast.dangerCells,
              intents: forecast.intents,
              blastTargets: forecast.blastTargets,
              route,
              cover,
              momentum: tactics.momentum,
              combo: tactics.combo,
              intelHud: document.getElementById('premium-tactics-intel')?.textContent || '',
              dangerHud: document.getElementById('premium-tactics-danger')?.textContent || '',
              coverHud: document.getElementById('premium-tactics-cover')?.textContent || '',
              momentumHud: document.getElementById('premium-tactics-momentum')?.textContent || '',
              routeHud: document.getElementById('premium-tactics-route')?.textContent || '',
              action: document.getElementById('premium-tactics-action')?.textContent || ''
            };
          },
          forceTacticsRoute: () => {
            switchPremiumGame('tactics');
            newTactics({ shouldFocus: true });
            const before = tacticsDebugState();
            const next = before.route.next;
            if (next) moveTactics(next.x - tactics.player.x, next.y - tactics.player.y);
            return {
              before,
              after: tacticsDebugState()
            };
          },
          forceTacticsBlast: () => {
            switchPremiumGame('tactics');
            newTactics({ shouldFocus: true });
            tactics.player = { ...tactics.player, x: 4, y: 3, hp: 110, shield: 0, ap: 2, baseAp: 3, charge: 2, cores: 0 };
            tactics.momentum = 3;
            tactics.combo = 0;
            tactics.enemies = [
              { id: 'drone-a', type: 'drone', x: 4, y: 1, hp: 30, maxHp: 45, disrupted: 0 },
              { id: 'turret-a', type: 'turret', x: 4, y: 0, hp: 90, maxHp: 90, disrupted: 0 },
              { id: 'hunter-a', type: 'hunter', x: 8, y: 6, hp: 70, maxHp: 70, disrupted: 0 },
              { id: 'warden-a', type: 'warden', x: 0, y: 0, hp: 95, maxHp: 95, disrupted: 0 }
            ];
            tactics.message = '调试：双目标相位窗口';
            setTacticsUi();
            drawTactics();
            const before = tacticsDebugState();
            triggerTacticsAction();
            return {
              before,
              after: tacticsDebugState()
            };
          },
          achievements: () => achievementDefs.map(def => ({
            ...def,
            unlocked: career.achievements.includes(def.id)
          })),
          contracts: () => window.atherixArcadeCareer?.contracts?.() || [],
          runs: () => window.atherixArcadeCareer?.runs?.() || [],
          coach: () => window.atherixArcadeCareer?.coach?.() || null,
          league: () => window.atherixArcadeCareer?.league?.() || {},
          leaderboard: () => window.atherixArcadeCareer?.leaderboard?.() || {},
          rival: () => window.atherixArcadeCareer?.rival?.() || {},
          loadout: () => window.atherixArcadeCareer?.loadout?.() || {},
          difficulty: () => window.atherixArcadeCareer?.difficulty?.() || {},
          mastery: () => window.atherixArcadeCareer?.mastery?.() || []
        }
      };
    }

    window.addEventListener('keydown', (e) => {
      if (!isGameSectionActive() || isEditableTarget(e.target) || !document.activeElement?.closest?.('#premium-game-stage')) return;
      const codes = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyQ', 'KeyP', 'Escape', 'Digit1', 'Digit2', 'Digit3'];
      if (!codes.includes(e.code)) return;
      e.preventDefault();
      if (premiumActive === 'survivor' && survivor.draftOpen) {
        if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
          selectSurvivorUpgrade(survivor.draftChoices[Number(e.code.replace('Digit', '')) - 1]?.id);
        }
        return;
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (premiumActive === 'survivor') toggleSurvivorPause();
        if (premiumActive === 'boss') toggleBossPause();
        if (premiumActive === 'drift') toggleDriftPause();
        return;
      }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') premiumKeys.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') premiumKeys.down = true;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') premiumKeys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') premiumKeys.right = true;
      if (e.code === 'Space') premiumKeys.action = true;
      if (e.code === 'KeyQ') premiumKeys.tool = true;
      if (premiumActive === 'heist') {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') moveHeist(0, -1);
        if (e.code === 'ArrowDown' || e.code === 'KeyS') moveHeist(0, 1);
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveHeist(-1, 0);
        if (e.code === 'ArrowRight' || e.code === 'KeyD') moveHeist(1, 0);
        if (e.code === 'Space') triggerHeistCloak();
        if (e.code === 'KeyQ') triggerHeistDecoy();
      }
      if (premiumActive === 'tactics') {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') moveTactics(0, -1);
        if (e.code === 'ArrowDown' || e.code === 'KeyS') moveTactics(0, 1);
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveTactics(-1, 0);
        if (e.code === 'ArrowRight' || e.code === 'KeyD') moveTactics(1, 0);
        if (e.code === 'Space') triggerTacticsAction();
      }
      if (premiumActive === 'drift' && e.code === 'KeyQ') triggerDriftPhaseBrake();
      if (premiumActive === 'chain' && e.code === 'KeyQ') triggerChainCatalyst();
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') premiumKeys.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') premiumKeys.down = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') premiumKeys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') premiumKeys.right = false;
      if (e.code === 'Space') premiumKeys.action = false;
      if (e.code === 'KeyQ') premiumKeys.tool = false;
    });

    window.addEventListener('blur', clearPremiumKeys);
  })();

  // 4. Cyber Astro-Runner Mario-style Game Engine
  // ==========================================
  // RETRO ARCADE RUNNER ENGINE (V3)
  // ==========================================
  const gameLauncherCard = document.getElementById('game-launcher-card');
  const arcadeCanvas = document.getElementById('arcade-canvas');
  const gameOverlay = document.getElementById('game-overlay-screen');
  const gamePauseOverlay = document.getElementById('game-pause-screen');
  const gamePauseResumeBtn = document.getElementById('game-pause-resume');
  const gamePauseRestartBtn = document.getElementById('game-pause-restart');
  const gamePauseMuteBtn = document.getElementById('game-pause-mute');
  const gameRestartBtn = document.getElementById('game-restart-btn');
  const gameTimerSpan = document.getElementById('game-timer');
  const gameCoinsSpan = document.getElementById('game-coins');
  const gameBestTimeSpan = document.getElementById('game-best-time');
  const gameScoreSpan = document.getElementById('game-score');
  const gameComboSpan = document.getElementById('game-combo');
  const gameContractSpan = document.getElementById('game-contract');

  // New DOM elements for retro controls
  const levelSelect = document.getElementById('game-level-select');
  const musicSelect = document.getElementById('game-music-select');
  const displayLevelName = document.getElementById('display-level-name');
  const displayLevelDifficulty = document.getElementById('display-level-difficulty');
  const targetCoinsSpan = document.getElementById('target-coins');
  const gameShieldSpan = document.getElementById('game-shield');
  const gameStatusSpan = document.getElementById('game-status');
  const btnJumpLed = document.getElementById('btn-jump-led');
  const btnLeftLed = document.getElementById('btn-left-led');
  const btnRightLed = document.getElementById('btn-right-led');
  const btnDashLed = document.getElementById('btn-dash-led');
  const btnStartLed = document.getElementById('btn-start-led');
  const btnPauseLed = document.getElementById('btn-pause-led');
  const btnBgmLed = document.getElementById('btn-bgm-led');
  const joystickShaft = document.getElementById('joystick-shaft');

  const gameCtx = arcadeCanvas ? arcadeCanvas.getContext('2d') : null;
  let currentLevelIndex = 0;
  let targetCoins = 5;
  let levelWidth = 1600;
  let gameStartTime = 0;
  let gameElapsedBeforePause = 0;
  let gamePauseStartedAt = 0;
  let statusTimeoutId = null;
  let runnerScore = 0;
  let runnerCombo = 0;
  let runnerBestCombo = 0;
  let runnerComboUntil = 0;
  let runnerContractIndex = 0;
  let runnerContractProgress = 0;
  let runnerContractsCompleted = 0;
  let runnerLastContract = '';
  let runnerLastAction = '';
  let runnerLastScoreGain = 0;
  const runnerContractDefs = [
    { id: 'crystal', label: 'CRYSTAL', target: 3, reward: 420, events: ['crystal'], color: '#FDE68A' },
    { id: 'stomp', label: 'STOMP', target: 2, reward: 560, events: ['stomp'], color: '#FCA5A5' },
    { id: 'signal', label: 'SIGNAL', target: 1, reward: 480, events: ['checkpoint', 'powerup', 'dash'], color: '#BAE6FD' }
  ];

  // Level elements and particles
  let platforms = [];
  let hazards = [];
  let coins = [];
  let enemies = [];
  let powerUps = [];
  let checkpoints = [];
  let exitPortal = { x: 0, y: 0, w: 0, h: 0 };
  let particles = [];
  let starBackground = [];

  // Populate static parallax stars
  if (starBackground.length === 0) {
    for (let i = 0; i < 45; i++) {
      starBackground.push({
        x: Math.random() * 800,
        y: Math.random() * 300,
        size: Math.random() * 2 + 0.4,
        speed: Math.random() * 0.12 + 0.03
      });
    }
  }

  // Particle explosion trigger helper
  function createParticleExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5 - 2.2,
        radius: Math.random() * 2.5 + 1.2,
        alpha: 1.0,
        decay: Math.random() * 0.035 + 0.015,
        color: color
      });
    }
  }

  function rectsOverlap(a, b) {
    return a.x + a.w > b.x &&
      a.x < b.x + b.w &&
      a.y + a.h > b.y &&
      a.y < b.y + b.h;
  }

  function playerRect() {
    return { x: player.x, y: player.y, w: player.width, h: player.height };
  }

  function setGameStatus(text, color = '#8B5CF6', duration = 1600) {
    if (!gameStatusSpan) return;
    gameStatusSpan.textContent = text;
    gameStatusSpan.style.color = color;
    if (statusTimeoutId) clearTimeout(statusTimeoutId);
    if (duration > 0) {
      statusTimeoutId = setTimeout(() => {
        if (!gameRunning) return;
        gameStatusSpan.textContent = player.dashReady ? 'READY' : 'DASH CD';
        gameStatusSpan.style.color = player.dashReady ? '#8B5CF6' : '#64748B';
      }, duration);
    }
  }

  function updateShieldDisplay() {
    if (!gameShieldSpan) return;
    gameShieldSpan.textContent = player.shield > 0 ? `${player.shield}` : '0';
    gameShieldSpan.style.color = player.shield > 0 ? '#34D399' : '#64748B';
  }

  function currentRunnerContract() {
    return runnerContractDefs[runnerContractIndex % runnerContractDefs.length];
  }

  function formatRunnerContract() {
    const contract = currentRunnerContract();
    if (!contract) return 'READY';
    return `${contract.label} ${Math.min(runnerContractProgress, contract.target)}/${contract.target}`;
  }

  function setRunnerMetaUi() {
    if (gameScoreSpan) {
      gameScoreSpan.textContent = String(Math.max(0, Math.floor(runnerScore)));
      gameScoreSpan.style.color = runnerLastScoreGain > 0 ? '#BAE6FD' : '#94A3B8';
    }
    if (gameComboSpan) {
      gameComboSpan.textContent = `${Math.max(0, runnerCombo)}x`;
      gameComboSpan.style.color = runnerCombo >= 5 ? '#FDE68A' : runnerCombo >= 2 ? '#A7F3D0' : '#94A3B8';
    }
    if (gameContractSpan) {
      const contract = currentRunnerContract();
      gameContractSpan.textContent = formatRunnerContract();
      gameContractSpan.style.color = runnerLastContract ? '#FDE68A' : runnerContractProgress > 0 ? '#A7F3D0' : (contract?.color || '#CBD5E1');
    }
  }

  function resetRunnerMeta() {
    runnerScore = 0;
    runnerCombo = 0;
    runnerBestCombo = 0;
    runnerComboUntil = 0;
    runnerContractIndex = 0;
    runnerContractProgress = 0;
    runnerContractsCompleted = 0;
    runnerLastContract = '';
    runnerLastAction = 'READY';
    runnerLastScoreGain = 0;
    setRunnerMetaUi();
  }

  function addRunnerScore(amount, reason, options = {}) {
    const base = Number(amount || 0);
    if (!Number.isFinite(base) || base === 0) return 0;
    const comboEnabled = options.combo !== false && base > 0;
    const now = Date.now();
    if (comboEnabled) {
      runnerCombo = now <= runnerComboUntil ? runnerCombo + 1 : 1;
      runnerBestCombo = Math.max(runnerBestCombo, runnerCombo);
      runnerComboUntil = now + Number(options.comboMs || 2800);
    }
    const multiplier = comboEnabled ? 1 + Math.min(5, Math.max(0, runnerCombo - 1)) * 0.14 : 1;
    const gain = Math.floor(base * multiplier);
    runnerScore = Math.max(0, runnerScore + gain);
    runnerLastAction = reason || runnerLastAction || 'SCORE';
    runnerLastScoreGain = gain;
    setRunnerMetaUi();
    return gain;
  }

  function resolveRunnerContract(eventType, amount = 1) {
    const contract = currentRunnerContract();
    if (!contract || !contract.events.includes(eventType)) {
      setRunnerMetaUi();
      return { completed: false, label: contract?.label || '', reward: 0 };
    }
    runnerContractProgress += Math.max(1, Math.floor(amount || 1));
    runnerLastContract = '';
    if (runnerContractProgress < contract.target) {
      runnerLastAction = `${contract.label} ${runnerContractProgress}/${contract.target}`;
      setRunnerMetaUi();
      return { completed: false, label: contract.label, reward: 0 };
    }
    runnerContractProgress = 0;
    runnerContractIndex++;
    runnerContractsCompleted++;
    runnerLastContract = contract.label;
    runnerLastAction = `${contract.label} CLEAR`;
    addRunnerScore(contract.reward, `${contract.label} CONTRACT`, { combo: false });
    setGameStatus(`${contract.label} +${contract.reward}`, contract.color || '#FDE68A', 1200);
    window.atherixArcadeCareer?.unlock?.('runner_contract');
    if (typeof player !== 'undefined') {
      createParticleExplosion(player.x + player.width / 2, player.y + player.height / 2, contract.color || '#FDE68A', 30);
    }
    setRunnerMetaUi();
    return { completed: true, label: contract.label, reward: contract.reward };
  }

  function runnerDebugState() {
    const contract = currentRunnerContract();
    return {
      running: !!gameRunning,
      paused: !!gamePaused,
      elapsedMs: getRunnerElapsedMs(),
      score: Math.max(0, Math.floor(runnerScore)),
      combo: runnerCombo,
      bestCombo: runnerBestCombo,
      comboRemainingMs: Math.max(0, runnerComboUntil - Date.now()),
      contract: {
        id: contract?.id || '',
        label: contract?.label || '',
        progress: runnerContractProgress,
        target: contract?.target || 0,
        completed: runnerContractsCompleted
      },
      lastContract: runnerLastContract,
      lastAction: runnerLastAction,
      lastScoreGain: runnerLastScoreGain,
      scoreHud: gameScoreSpan?.textContent || '',
      comboHud: gameComboSpan?.textContent || '',
      contractHud: gameContractSpan?.textContent || '',
      statusHud: gameStatusSpan?.textContent || ''
    };
  }

  function forceRunnerContract() {
    if (gamePaused) resumeRunnerGame();
    if (!gameRunning) startLevel();
    runnerContractIndex = 0;
    runnerContractProgress = 0;
    runnerLastContract = '';
    setRunnerMetaUi();
    const before = runnerDebugState();
    let attempts = 0;
    while (runnerContractsCompleted <= before.contract.completed && attempts < 4) {
      addRunnerScore(90, 'DEBUG CRYSTAL', { combo: true, comboMs: 4000 });
      resolveRunnerContract('crystal');
      attempts++;
    }
    setRunnerMetaUi();
    drawGame();
    const achievements = window.__atherixDebug?.premium?.achievements?.() || [];
    return {
      attempts,
      before,
      after: runnerDebugState(),
      achieved: achievements.some(item => item.id === 'runner_contract' && item.unlocked)
    };
  }

  function consumeShieldOrDie(hitX, hitY) {
    if (player.shield > 0 && Date.now() > player.invulnerableUntil) {
      player.shield--;
      player.invulnerableUntil = Date.now() + 1100;
      player.vx = player.vx >= 0 ? -5 : 5;
      player.vy = -6.5;
      updateShieldDisplay();
      setGameStatus('SHIELD HIT', '#34D399');
      createParticleExplosion(hitX, hitY, '#34D399', 26);
      playArcadeSound('shield');
      runnerCombo = 0;
      runnerComboUntil = 0;
      addRunnerScore(35, 'SHIELD SAVE', { combo: false });
      return false;
    }
    triggerDeath();
    return true;
  }

  function triggerPlayerDash() {
    if (!gameRunning || !player.dashReady) return;
    const dir = player.vx < -0.2 ? -1 : 1;
    player.vx = dir * 10.5;
    player.dashReady = false;
    player.dashCooldownUntil = Date.now() + 1100;
    player.dashBurstUntil = Date.now() + 190;
    setGameStatus('DASH', '#60A5FA', 700);
    playArcadeSound('dash');
    createParticleExplosion(player.x + player.width / 2, player.y + player.height / 2, '#60A5FA', 14);
    addRunnerScore(25, 'DASH', { combo: true, comboMs: 1800 });
    resolveRunnerContract('dash');
  }

  function hasActiveCheckpoint() {
    const start = gameLevels[currentLevelIndex].playerStart;
    return player.checkpoint && (player.checkpoint.x !== start.x || player.checkpoint.y !== start.y);
  }

  function isGameSectionActive() {
    const gameSection = document.getElementById('game');
    return !!(gameSection && gameSection.classList.contains('active'));
  }

  function isMiniGameFocus() {
    const active = document.activeElement;
    return !!(active && active.closest && active.closest('.arcade-library'));
  }

  document.getElementById('game')?.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.arcade-library')) return;
    if (isMiniGameFocus()) {
      document.activeElement.blur();
    }
  });

  function isEditableTarget(target) {
    if (!target || !target.tagName) return false;
    return target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable;
  }

  function releaseArcadeButtonFocus() {
    const active = document.activeElement;
    if (active && active.closest && active.closest('#game')) {
      active.blur();
    }
  }

  function resetGameKeyState() {
    Object.keys(gameKeys).forEach(k => gameKeys[k] = false);
    if (joystickShaft) joystickShaft.style.transform = 'translate(0, 0)';
    ['light-left', 'light-right', 'light-up'].forEach(id => {
      const light = document.getElementById(id);
      if (light) light.classList.remove('active');
    });
    [btnLeftLed, btnRightLed, btnStartLed, btnPauseLed, btnJumpLed, btnDashLed, btnBgmLed].forEach(button => {
      if (button) button.classList.remove('is-held');
    });
  }

  function getRunnerElapsedMs() {
    if (gamePaused) return Math.max(0, gameElapsedBeforePause);
    if (!gameStartTime) return 0;
    return Math.max(0, Date.now() - gameStartTime);
  }

  function setPauseOverlayVisible(visible) {
    if (!gamePauseOverlay) return;
    gamePauseOverlay.style.display = visible ? 'flex' : 'none';
    gamePauseOverlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  function updateRunnerPauseMuteLabel() {
    if (!gamePauseMuteBtn) return;
    const label = gamePauseMuteBtn.querySelector('span');
    const icon = gamePauseMuteBtn.querySelector('i');
    if (label) label.textContent = isMusicMuted ? '开启 BGM' : '静音 BGM';
    if (icon) icon.setAttribute('data-lucide', isMusicMuted ? 'volume-2' : 'volume-x');
    safeCreateIcons();
  }

  function shiftRunnerDeadlines(deltaMs) {
    if (deltaMs <= 0) return;
    ['dashCooldownUntil', 'dashBurstUntil', 'invulnerableUntil'].forEach(key => {
      if (player[key] && player[key] > 0) player[key] += deltaMs;
    });
    if (runnerComboUntil > 0) runnerComboUntil += deltaMs;
  }

  clearRunnerPauseState = function() {
    gamePaused = false;
    gameElapsedBeforePause = 0;
    gamePauseStartedAt = 0;
    setPauseOverlayVisible(false);
    setRunnerTouchButtonState(btnPauseLed, false);
  };

  function pauseRunnerGame() {
    if (!gameRunning || gamePaused) return false;
    gameElapsedBeforePause = getRunnerElapsedMs();
    gamePauseStartedAt = Date.now();
    gamePaused = true;
    gameRunning = false;
    cancelAnimationFrame(gameLoopId);
    stopMusic();
    resetGameKeyState();
    if (gameTimerSpan) gameTimerSpan.textContent = (gameElapsedBeforePause / 1000).toFixed(1);
    setGameStatus('PAUSED', '#F59E0B', 0);
    updateRunnerPauseMuteLabel();
    setPauseOverlayVisible(true);
    releaseArcadeButtonFocus();
    return true;
  }

  function resumeRunnerGame() {
    if (!gamePaused) return false;
    const pauseDuration = Date.now() - gamePauseStartedAt;
    shiftRunnerDeadlines(pauseDuration);
    gamePaused = false;
    gameRunning = true;
    gameStartTime = Date.now() - gameElapsedBeforePause;
    gamePauseStartedAt = 0;
    setPauseOverlayVisible(false);
    setRunnerTouchButtonState(btnPauseLed, false);
    setGameStatus(player.dashReady ? 'READY' : 'DASH CD', player.dashReady ? '#8B5CF6' : '#64748B', 0);
    if (musicSelect && musicSelect.value !== 'mute') startMusic();
    releaseArcadeButtonFocus();
    updateGame();
    return true;
  }

  function toggleRunnerPause() {
    if (gamePaused) return resumeRunnerGame();
    if (gameRunning) return pauseRunnerGame();
    return false;
  }

  // Game levels config
  const gameLevels = [
    {
      name: '宇宙轨道 (Astro Orbit)',
      difficulty: 'EASY',
      diffColor: '#06B6D4',
      theme: {
        bg: '#080512',
        grid: 'rgba(6, 182, 212, 0.07)',
        platFill: '#0f172a',
        platStroke: '#06B6D4',
        skyStarColor: '#06B6D4'
      },
      playerStart: { x: 50, y: 300 },
      levelWidth: 1600,
      targetCoins: 5,
      exitPortal: { x: 1520, y: 290, w: 40, h: 70 },
      platforms: [
        { x: 0, y: 360, w: 600, h: 40 },
        { x: 700, y: 320, w: 300, h: 40 },
        { x: 1100, y: 360, w: 500, h: 40 }
      ],
      hazards: [
        { x: 400, y: 350, w: 40, h: 10 }
      ],
      coins: [
        { x: 250, y: 280, w: 10, h: 16 },
        { x: 500, y: 280, w: 10, h: 16 },
        { x: 800, y: 240, w: 10, h: 16 },
        { x: 950, y: 240, w: 10, h: 16 },
        { x: 1250, y: 280, w: 10, h: 16 }
      ],
      powerUps: [
        { x: 620, y: 285, w: 18, h: 18, type: 'dash' }
      ],
      checkpoints: [
        { x: 1040, y: 315, w: 18, h: 36 }
      ],
      enemies: [
        { x: 300, y: 335, w: 25, h: 25, vx: 1, rangeStart: 200, rangeEnd: 450, isDead: false },
        { x: 1300, y: 335, w: 25, h: 25, vx: 1.2, rangeStart: 1200, rangeEnd: 1450, isDead: false }
      ],
      musicId: 0
    },
    {
      name: '赛博霓虹城 (Neon City)',
      difficulty: 'MEDIUM',
      diffColor: '#EC4899',
      theme: {
        bg: '#0b0816',
        grid: 'rgba(236, 72, 153, 0.07)',
        platFill: '#1a0b2e',
        platStroke: '#EC4899',
        skyStarColor: '#EC4899'
      },
      playerStart: { x: 50, y: 300 },
      levelWidth: 2200,
      targetCoins: 8,
      exitPortal: { x: 2120, y: 290, w: 40, h: 70 },
      platforms: [
        { x: 0, y: 360, w: 400, h: 40 },
        { x: 500, y: 300, w: 180, h: 20 },
        { x: 750, y: 360, w: 300, h: 40 },
        { x: 1100, y: 280, w: 200, h: 20, moveAxis: 'y', minY: 235, maxY: 315, speed: 0.8 },
        { x: 1350, y: 340, w: 180, h: 20 },
        { x: 1600, y: 360, w: 600, h: 40 }
      ],
      hazards: [
        { x: 250, y: 350, w: 50, h: 10 },
        { x: 850, y: 350, w: 60, h: 10 },
        { x: 1750, y: 350, w: 60, h: 10 }
      ],
      coins: [
        { x: 200, y: 280, w: 10, h: 16 },
        { x: 380, y: 280, w: 10, h: 16 },
        { x: 580, y: 220, w: 10, h: 16 },
        { x: 880, y: 280, w: 10, h: 16 },
        { x: 1200, y: 200, w: 10, h: 16 },
        { x: 1420, y: 260, w: 10, h: 16 },
        { x: 1700, y: 280, w: 10, h: 16 },
        { x: 1950, y: 280, w: 10, h: 16 }
      ],
      powerUps: [
        { x: 1040, y: 245, w: 18, h: 18, type: 'shield' },
        { x: 1540, y: 300, w: 18, h: 18, type: 'dash' }
      ],
      checkpoints: [
        { x: 1080, y: 240, w: 18, h: 36 }
      ],
      enemies: [
        { x: 150, y: 335, w: 25, h: 25, vx: 1.5, rangeStart: 80, rangeEnd: 350, isDead: false },
        { x: 800, y: 335, w: 25, h: 25, vx: -1.8, rangeStart: 760, rangeEnd: 1000, isDead: false },
        { x: 1650, y: 335, w: 25, h: 25, vx: 2.0, rangeStart: 1610, rangeEnd: 1850, isDead: false },
        { x: 1880, y: 335, w: 25, h: 25, vx: -1.6, rangeStart: 1800, rangeEnd: 2050, isDead: false }
      ],
      musicId: 1
    },
    {
      name: '重力核心 (Gravity Core)',
      difficulty: 'HARD',
      diffColor: '#F59E0B',
      theme: {
        bg: '#0e0404',
        grid: 'rgba(245, 158, 11, 0.07)',
        platFill: '#220808',
        platStroke: '#F59E0B',
        skyStarColor: '#F59E0B'
      },
      playerStart: { x: 50, y: 300 },
      levelWidth: 2800,
      targetCoins: 10,
      exitPortal: { x: 2720, y: 290, w: 40, h: 70 },
      platforms: [
        { x: 0, y: 360, w: 300, h: 40 },
        { x: 380, y: 300, w: 100, h: 20 },
        { x: 550, y: 360, w: 120, h: 40 },
        { x: 750, y: 280, w: 120, h: 20 },
        { x: 950, y: 340, w: 100, h: 20 },
        { x: 1120, y: 300, w: 80, h: 20 },
        { x: 1280, y: 360, w: 200, h: 40 },
        { x: 1550, y: 260, w: 120, h: 20 },
        { x: 1750, y: 320, w: 120, h: 20, moveAxis: 'x', minX: 1720, maxX: 1880, speed: 1.1 },
        { x: 1950, y: 360, w: 250, h: 40 },
        { x: 2300, y: 300, w: 120, h: 20, moveAxis: 'y', minY: 245, maxY: 330, speed: 1 },
        { x: 2500, y: 360, w: 300, h: 40 }
      ],
      hazards: [
        { x: 180, y: 350, w: 60, h: 10 },
        { x: 600, y: 350, w: 40, h: 10 },
        { x: 1330, y: 350, w: 80, h: 10 },
        { x: 2020, y: 350, w: 100, h: 10 },
        { x: 2580, y: 350, w: 80, h: 10 }
      ],
      coins: [
        { x: 150, y: 280, w: 10, h: 16 },
        { x: 430, y: 220, w: 10, h: 16 },
        { x: 610, y: 280, w: 10, h: 16 },
        { x: 810, y: 200, w: 10, h: 16 },
        { x: 1000, y: 260, w: 10, h: 16 },
        { x: 1160, y: 220, w: 10, h: 16 },
        { x: 1380, y: 280, w: 10, h: 16 },
        { x: 1610, y: 180, w: 10, h: 16 },
        { x: 1810, y: 240, w: 10, h: 16 },
        { x: 2080, y: 280, w: 10, h: 16 },
        { x: 2360, y: 220, w: 10, h: 16 },
        { x: 2620, y: 280, w: 10, h: 16 }
      ],
      powerUps: [
        { x: 700, y: 235, w: 18, h: 18, type: 'shield' },
        { x: 1505, y: 220, w: 18, h: 18, type: 'dash' },
        { x: 2240, y: 315, w: 18, h: 18, type: 'shield' }
      ],
      checkpoints: [
        { x: 1240, y: 320, w: 18, h: 36 },
        { x: 2220, y: 320, w: 18, h: 36 }
      ],
      enemies: [
        { x: 80, y: 335, w: 25, h: 25, vx: 2.2, rangeStart: 20, rangeEnd: 260, isDead: false },
        { x: 1300, y: 335, w: 25, h: 25, vx: -2.5, rangeStart: 1290, rangeEnd: 1470, isDead: false },
        { x: 2000, y: 335, w: 25, h: 25, vx: 2.8, rangeStart: 1960, rangeEnd: 2180, isDead: false },
        { x: 2550, y: 335, w: 25, h: 25, vx: -2.0, rangeStart: 2510, rangeEnd: 2780, isDead: false }
      ],
      musicId: 2
    },
    {
      name: '量子裂谷 (Quantum Rift)',
      difficulty: 'EXPERT',
      diffColor: '#A78BFA',
      theme: {
        bg: '#050816',
        grid: 'rgba(167, 139, 250, 0.08)',
        platFill: '#111827',
        platStroke: '#A78BFA',
        skyStarColor: '#67E8F9'
      },
      playerStart: { x: 50, y: 300 },
      levelWidth: 3400,
      targetCoins: 12,
      exitPortal: { x: 3305, y: 270, w: 42, h: 82 },
      platforms: [
        { x: 0, y: 360, w: 340, h: 40 },
        { x: 430, y: 310, w: 140, h: 20 },
        { x: 650, y: 250, w: 120, h: 20, moveAxis: 'x', minX: 620, maxX: 850, speed: 1.2 },
        { x: 930, y: 340, w: 170, h: 20 },
        { x: 1180, y: 280, w: 130, h: 20, moveAxis: 'y', minY: 230, maxY: 325, speed: 1 },
        { x: 1420, y: 360, w: 280, h: 40 },
        { x: 1810, y: 300, w: 130, h: 20 },
        { x: 2050, y: 250, w: 130, h: 20, moveAxis: 'x', minX: 2020, maxX: 2260, speed: 1.35 },
        { x: 2350, y: 340, w: 210, h: 20 },
        { x: 2700, y: 285, w: 130, h: 20, moveAxis: 'y', minY: 240, maxY: 345, speed: 1.1 },
        { x: 3000, y: 360, w: 400, h: 40 }
      ],
      hazards: [
        { x: 250, y: 350, w: 55, h: 10 },
        { x: 990, y: 330, w: 65, h: 10 },
        { x: 1500, y: 350, w: 85, h: 10 },
        { x: 2400, y: 330, w: 70, h: 10 },
        { x: 3080, y: 350, w: 110, h: 10 }
      ],
      coins: [
        { x: 180, y: 285, w: 10, h: 16 },
        { x: 470, y: 240, w: 10, h: 16 },
        { x: 700, y: 185, w: 10, h: 16 },
        { x: 960, y: 275, w: 10, h: 16 },
        { x: 1230, y: 205, w: 10, h: 16 },
        { x: 1510, y: 285, w: 10, h: 16 },
        { x: 1870, y: 230, w: 10, h: 16 },
        { x: 2120, y: 180, w: 10, h: 16 },
        { x: 2420, y: 265, w: 10, h: 16 },
        { x: 2760, y: 210, w: 10, h: 16 },
        { x: 3070, y: 285, w: 10, h: 16 },
        { x: 3210, y: 285, w: 10, h: 16 }
      ],
      powerUps: [
        { x: 585, y: 270, w: 18, h: 18, type: 'dash' },
        { x: 1380, y: 315, w: 18, h: 18, type: 'shield' },
        { x: 2290, y: 300, w: 18, h: 18, type: 'dash' },
        { x: 2890, y: 250, w: 18, h: 18, type: 'shield' }
      ],
      checkpoints: [
        { x: 1330, y: 320, w: 18, h: 36 },
        { x: 2580, y: 305, w: 18, h: 36 }
      ],
      enemies: [
        { x: 110, y: 335, w: 25, h: 25, vx: 2.4, rangeStart: 40, rangeEnd: 310, isDead: false },
        { x: 1440, y: 335, w: 25, h: 25, vx: -2.6, rangeStart: 1420, rangeEnd: 1680, isDead: false },
        { x: 2350, y: 315, w: 25, h: 25, vx: 2.1, rangeStart: 2330, rangeEnd: 2540, isDead: false },
        { x: 3040, y: 335, w: 25, h: 25, vx: -2.8, rangeStart: 3005, rangeEnd: 3260, isDead: false }
      ],
      musicId: 3
    },
    {
      name: '深空货运港 (Cargo Dock)',
      difficulty: 'ADVANCED',
      diffColor: '#22D3EE',
      theme: {
        bg: '#04111f',
        grid: 'rgba(34, 211, 238, 0.07)',
        platFill: '#082f49',
        platStroke: '#22D3EE',
        skyStarColor: '#7DD3FC'
      },
      playerStart: { x: 50, y: 300 },
      levelWidth: 3900,
      targetCoins: 14,
      exitPortal: { x: 3815, y: 290, w: 42, h: 82 },
      platforms: [
        { x: 0, y: 360, w: 480, h: 40 },
        { x: 560, y: 330, w: 220, h: 20 },
        { x: 850, y: 360, w: 320, h: 40 },
        { x: 1240, y: 305, w: 210, h: 20, moveAxis: 'y', minY: 275, maxY: 330, speed: 0.75 },
        { x: 1530, y: 360, w: 500, h: 40 },
        { x: 2140, y: 315, w: 240, h: 20, moveAxis: 'x', minX: 2100, maxX: 2280, speed: 0.95 },
        { x: 2520, y: 360, w: 380, h: 40 },
        { x: 2970, y: 300, w: 240, h: 20 },
        { x: 3330, y: 340, w: 220, h: 20 },
        { x: 3650, y: 360, w: 250, h: 40 }
      ],
      hazards: [
        { x: 330, y: 350, w: 70, h: 10 },
        { x: 940, y: 350, w: 80, h: 10 },
        { x: 1700, y: 350, w: 100, h: 10 },
        { x: 2640, y: 350, w: 90, h: 10 },
        { x: 3690, y: 350, w: 80, h: 10 }
      ],
      coins: [
        { x: 170, y: 285, w: 10, h: 16 },
        { x: 350, y: 285, w: 10, h: 16 },
        { x: 620, y: 255, w: 10, h: 16 },
        { x: 910, y: 285, w: 10, h: 16 },
        { x: 1090, y: 285, w: 10, h: 16 },
        { x: 1320, y: 230, w: 10, h: 16 },
        { x: 1610, y: 285, w: 10, h: 16 },
        { x: 1900, y: 285, w: 10, h: 16 },
        { x: 2200, y: 240, w: 10, h: 16 },
        { x: 2570, y: 285, w: 10, h: 16 },
        { x: 2810, y: 285, w: 10, h: 16 },
        { x: 3060, y: 225, w: 10, h: 16 },
        { x: 3410, y: 265, w: 10, h: 16 },
        { x: 3735, y: 285, w: 10, h: 16 },
        { x: 3835, y: 265, w: 10, h: 16 }
      ],
      powerUps: [
        { x: 790, y: 292, w: 18, h: 18, type: 'dash' },
        { x: 1485, y: 320, w: 18, h: 18, type: 'shield' },
        { x: 2440, y: 322, w: 18, h: 18, type: 'dash' },
        { x: 3260, y: 300, w: 18, h: 18, type: 'shield' }
      ],
      checkpoints: [
        { x: 1465, y: 320, w: 18, h: 36 },
        { x: 2925, y: 320, w: 18, h: 36 }
      ],
      enemies: [
        { x: 180, y: 335, w: 25, h: 25, vx: 2.0, rangeStart: 60, rangeEnd: 450, isDead: false },
        { x: 1580, y: 335, w: 25, h: 25, vx: -2.2, rangeStart: 1540, rangeEnd: 2020, isDead: false },
        { x: 2570, y: 335, w: 25, h: 25, vx: 2.1, rangeStart: 2530, rangeEnd: 2880, isDead: false },
        { x: 3670, y: 335, w: 25, h: 25, vx: -2.4, rangeStart: 3655, rangeEnd: 3890, isDead: false }
      ],
      musicId: 1
    },
    {
      name: '磁暴矿井 (Magnetic Mines)',
      difficulty: 'HARD+',
      diffColor: '#84CC16',
      theme: {
        bg: '#061006',
        grid: 'rgba(132, 204, 22, 0.07)',
        platFill: '#13240b',
        platStroke: '#84CC16',
        skyStarColor: '#BEF264'
      },
      playerStart: { x: 50, y: 300 },
      levelWidth: 4400,
      targetCoins: 16,
      exitPortal: { x: 4315, y: 290, w: 42, h: 82 },
      platforms: [
        { x: 0, y: 360, w: 420, h: 40 },
        { x: 520, y: 320, w: 220, h: 20 },
        { x: 830, y: 280, w: 250, h: 20 },
        { x: 1180, y: 360, w: 360, h: 40 },
        { x: 1620, y: 310, w: 190, h: 20, moveAxis: 'y', minY: 265, maxY: 335, speed: 0.9 },
        { x: 1900, y: 340, w: 300, h: 20 },
        { x: 2300, y: 270, w: 190, h: 20 },
        { x: 2600, y: 360, w: 360, h: 40 },
        { x: 3060, y: 310, w: 190, h: 20, moveAxis: 'x', minX: 3010, maxX: 3190, speed: 1.1 },
        { x: 3380, y: 270, w: 220, h: 20 },
        { x: 3720, y: 360, w: 680, h: 40 }
      ],
      hazards: [
        { x: 250, y: 350, w: 65, h: 10 },
        { x: 1240, y: 350, w: 90, h: 10 },
        { x: 2030, y: 330, w: 80, h: 10 },
        { x: 2690, y: 350, w: 120, h: 10 },
        { x: 3830, y: 350, w: 90, h: 10 },
        { x: 4100, y: 350, w: 90, h: 10 }
      ],
      coins: [
        { x: 165, y: 285, w: 10, h: 16 },
        { x: 570, y: 245, w: 10, h: 16 },
        { x: 690, y: 245, w: 10, h: 16 },
        { x: 910, y: 205, w: 10, h: 16 },
        { x: 1040, y: 205, w: 10, h: 16 },
        { x: 1290, y: 285, w: 10, h: 16 },
        { x: 1500, y: 285, w: 10, h: 16 },
        { x: 1700, y: 235, w: 10, h: 16 },
        { x: 1970, y: 265, w: 10, h: 16 },
        { x: 2365, y: 195, w: 10, h: 16 },
        { x: 2650, y: 285, w: 10, h: 16 },
        { x: 2900, y: 285, w: 10, h: 16 },
        { x: 3115, y: 235, w: 10, h: 16 },
        { x: 3460, y: 195, w: 10, h: 16 },
        { x: 3800, y: 285, w: 10, h: 16 },
        { x: 4035, y: 285, w: 10, h: 16 },
        { x: 4240, y: 285, w: 10, h: 16 }
      ],
      powerUps: [
        { x: 770, y: 240, w: 18, h: 18, type: 'dash' },
        { x: 1565, y: 318, w: 18, h: 18, type: 'shield' },
        { x: 2535, y: 320, w: 18, h: 18, type: 'dash' },
        { x: 3655, y: 320, w: 18, h: 18, type: 'shield' }
      ],
      checkpoints: [
        { x: 1145, y: 320, w: 18, h: 36 },
        { x: 2525, y: 320, w: 18, h: 36 },
        { x: 3655, y: 320, w: 18, h: 36 }
      ],
      enemies: [
        { x: 125, y: 335, w: 25, h: 25, vx: 2.1, rangeStart: 40, rangeEnd: 395, isDead: false },
        { x: 1215, y: 335, w: 25, h: 25, vx: -2.6, rangeStart: 1190, rangeEnd: 1530, isDead: false },
        { x: 1930, y: 315, w: 25, h: 25, vx: 2.4, rangeStart: 1910, rangeEnd: 2190, isDead: false },
        { x: 2630, y: 335, w: 25, h: 25, vx: 2.8, rangeStart: 2610, rangeEnd: 2940, isDead: false },
        { x: 3740, y: 335, w: 25, h: 25, vx: -2.5, rangeStart: 3725, rangeEnd: 4360, isDead: false }
      ],
      musicId: 2
    },
    {
      name: '离子瀑布 (Ion Falls)',
      difficulty: 'MASTER',
      diffColor: '#38BDF8',
      theme: {
        bg: '#03101c',
        grid: 'rgba(56, 189, 248, 0.08)',
        platFill: '#0c2438',
        platStroke: '#38BDF8',
        skyStarColor: '#BAE6FD'
      },
      playerStart: { x: 50, y: 300 },
      levelWidth: 5000,
      targetCoins: 18,
      exitPortal: { x: 4910, y: 240, w: 42, h: 86 },
      platforms: [
        { x: 0, y: 360, w: 420, h: 40 },
        { x: 500, y: 330, w: 210, h: 20 },
        { x: 780, y: 300, w: 210, h: 20 },
        { x: 1060, y: 260, w: 190, h: 20 },
        { x: 1340, y: 320, w: 240, h: 20 },
        { x: 1680, y: 360, w: 300, h: 40 },
        { x: 2070, y: 300, w: 210, h: 20, moveAxis: 'y', minY: 250, maxY: 335, speed: 0.9 },
        { x: 2380, y: 245, w: 190, h: 20 },
        { x: 2680, y: 320, w: 230, h: 20 },
        { x: 3000, y: 360, w: 300, h: 40 },
        { x: 3400, y: 300, w: 210, h: 20, moveAxis: 'x', minX: 3360, maxX: 3540, speed: 1.15 },
        { x: 3740, y: 250, w: 190, h: 20 },
        { x: 4080, y: 325, w: 230, h: 20 },
        { x: 4400, y: 360, w: 270, h: 40 },
        { x: 4760, y: 310, w: 240, h: 20 }
      ],
      hazards: [
        { x: 305, y: 350, w: 70, h: 10 },
        { x: 1745, y: 350, w: 90, h: 10 },
        { x: 2745, y: 310, w: 70, h: 10 },
        { x: 3105, y: 350, w: 120, h: 10 },
        { x: 4470, y: 350, w: 95, h: 10 }
      ],
      coins: [
        { x: 160, y: 285, w: 10, h: 16 },
        { x: 555, y: 255, w: 10, h: 16 },
        { x: 665, y: 255, w: 10, h: 16 },
        { x: 845, y: 225, w: 10, h: 16 },
        { x: 1140, y: 185, w: 10, h: 16 },
        { x: 1415, y: 245, w: 10, h: 16 },
        { x: 1745, y: 285, w: 10, h: 16 },
        { x: 1940, y: 285, w: 10, h: 16 },
        { x: 2160, y: 225, w: 10, h: 16 },
        { x: 2450, y: 170, w: 10, h: 16 },
        { x: 2740, y: 245, w: 10, h: 16 },
        { x: 3055, y: 285, w: 10, h: 16 },
        { x: 3255, y: 285, w: 10, h: 16 },
        { x: 3470, y: 225, w: 10, h: 16 },
        { x: 3810, y: 175, w: 10, h: 16 },
        { x: 4160, y: 250, w: 10, h: 16 },
        { x: 4450, y: 285, w: 10, h: 16 },
        { x: 4635, y: 285, w: 10, h: 16 },
        { x: 4845, y: 235, w: 10, h: 16 },
        { x: 4930, y: 215, w: 10, h: 16 }
      ],
      powerUps: [
        { x: 1000, y: 260, w: 18, h: 18, type: 'dash' },
        { x: 1640, y: 320, w: 18, h: 18, type: 'shield' },
        { x: 2940, y: 322, w: 18, h: 18, type: 'dash' },
        { x: 3980, y: 292, w: 18, h: 18, type: 'shield' },
        { x: 4690, y: 320, w: 18, h: 18, type: 'dash' }
      ],
      checkpoints: [
        { x: 1285, y: 320, w: 18, h: 36 },
        { x: 2585, y: 290, w: 18, h: 36 },
        { x: 4325, y: 320, w: 18, h: 36 }
      ],
      enemies: [
        { x: 130, y: 335, w: 25, h: 25, vx: 2.0, rangeStart: 40, rangeEnd: 395, isDead: false },
        { x: 1390, y: 295, w: 25, h: 25, vx: -2.3, rangeStart: 1350, rangeEnd: 1565, isDead: false },
        { x: 3020, y: 335, w: 25, h: 25, vx: 2.6, rangeStart: 3010, rangeEnd: 3290, isDead: false },
        { x: 4105, y: 300, w: 25, h: 25, vx: -2.2, rangeStart: 4090, rangeEnd: 4290, isDead: false },
        { x: 4785, y: 285, w: 25, h: 25, vx: 2.0, rangeStart: 4765, rangeEnd: 4980, isDead: false }
      ],
      musicId: 3
    },
    {
      name: '终局星门 (Final Star Gate)',
      difficulty: 'FINAL',
      diffColor: '#F472B6',
      theme: {
        bg: '#120716',
        grid: 'rgba(244, 114, 182, 0.08)',
        platFill: '#2a0f24',
        platStroke: '#F472B6',
        skyStarColor: '#FBCFE8'
      },
      playerStart: { x: 50, y: 300 },
      levelWidth: 5600,
      targetCoins: 20,
      exitPortal: { x: 5510, y: 290, w: 42, h: 86 },
      platforms: [
        { x: 0, y: 360, w: 420, h: 40 },
        { x: 530, y: 320, w: 200, h: 20 },
        { x: 820, y: 280, w: 170, h: 20 },
        { x: 1080, y: 340, w: 260, h: 20 },
        { x: 1460, y: 300, w: 170, h: 20, moveAxis: 'x', minX: 1425, maxX: 1585, speed: 1.15 },
        { x: 1720, y: 360, w: 300, h: 40 },
        { x: 2140, y: 305, w: 220, h: 20 },
        { x: 2480, y: 260, w: 170, h: 20 },
        { x: 2760, y: 340, w: 260, h: 20 },
        { x: 3150, y: 300, w: 190, h: 20, moveAxis: 'y', minY: 245, maxY: 335, speed: 1.0 },
        { x: 3440, y: 360, w: 320, h: 40 },
        { x: 3880, y: 310, w: 200, h: 20 },
        { x: 4200, y: 270, w: 170, h: 20, moveAxis: 'x', minX: 4160, maxX: 4340, speed: 1.2 },
        { x: 4520, y: 340, w: 240, h: 20 },
        { x: 4860, y: 300, w: 220, h: 20 },
        { x: 5200, y: 360, w: 400, h: 40 }
      ],
      hazards: [
        { x: 270, y: 350, w: 80, h: 10 },
        { x: 1130, y: 330, w: 80, h: 10 },
        { x: 1795, y: 350, w: 85, h: 10 },
        { x: 2800, y: 330, w: 85, h: 10 },
        { x: 3500, y: 350, w: 100, h: 10 },
        { x: 4580, y: 330, w: 90, h: 10 },
        { x: 5300, y: 350, w: 130, h: 10 }
      ],
      coins: [
        { x: 160, y: 285, w: 10, h: 16 },
        { x: 575, y: 245, w: 10, h: 16 },
        { x: 675, y: 245, w: 10, h: 16 },
        { x: 880, y: 205, w: 10, h: 16 },
        { x: 1160, y: 265, w: 10, h: 16 },
        { x: 1290, y: 265, w: 10, h: 16 },
        { x: 1515, y: 225, w: 10, h: 16 },
        { x: 1780, y: 285, w: 10, h: 16 },
        { x: 1970, y: 285, w: 10, h: 16 },
        { x: 2220, y: 230, w: 10, h: 16 },
        { x: 2550, y: 185, w: 10, h: 16 },
        { x: 2845, y: 265, w: 10, h: 16 },
        { x: 2985, y: 265, w: 10, h: 16 },
        { x: 3230, y: 225, w: 10, h: 16 },
        { x: 3520, y: 285, w: 10, h: 16 },
        { x: 3715, y: 285, w: 10, h: 16 },
        { x: 3955, y: 235, w: 10, h: 16 },
        { x: 4265, y: 195, w: 10, h: 16 },
        { x: 4595, y: 265, w: 10, h: 16 },
        { x: 4930, y: 225, w: 10, h: 16 },
        { x: 5040, y: 225, w: 10, h: 16 },
        { x: 5265, y: 285, w: 10, h: 16 },
        { x: 5445, y: 285, w: 10, h: 16 },
        { x: 5530, y: 265, w: 10, h: 16 }
      ],
      powerUps: [
        { x: 770, y: 280, w: 18, h: 18, type: 'dash' },
        { x: 1680, y: 320, w: 18, h: 18, type: 'shield' },
        { x: 2395, y: 270, w: 18, h: 18, type: 'dash' },
        { x: 3385, y: 320, w: 18, h: 18, type: 'shield' },
        { x: 4440, y: 300, w: 18, h: 18, type: 'dash' },
        { x: 5135, y: 320, w: 18, h: 18, type: 'shield' }
      ],
      checkpoints: [
        { x: 1665, y: 320, w: 18, h: 36 },
        { x: 3060, y: 320, w: 18, h: 36 },
        { x: 4445, y: 320, w: 18, h: 36 },
        { x: 5135, y: 320, w: 18, h: 36 }
      ],
      enemies: [
        { x: 110, y: 335, w: 25, h: 25, vx: 2.4, rangeStart: 35, rangeEnd: 395, isDead: false },
        { x: 1095, y: 315, w: 25, h: 25, vx: -2.6, rangeStart: 1090, rangeEnd: 1330, isDead: false },
        { x: 1745, y: 335, w: 25, h: 25, vx: 2.7, rangeStart: 1730, rangeEnd: 2010, isDead: false },
        { x: 2785, y: 315, w: 25, h: 25, vx: -2.5, rangeStart: 2770, rangeEnd: 3010, isDead: false },
        { x: 3470, y: 335, w: 25, h: 25, vx: 2.8, rangeStart: 3445, rangeEnd: 3750, isDead: false },
        { x: 4535, y: 315, w: 25, h: 25, vx: -2.4, rangeStart: 4525, rangeEnd: 4750, isDead: false },
        { x: 5215, y: 335, w: 25, h: 25, vx: 3.0, rangeStart: 5205, rangeEnd: 5580, isDead: false }
      ],
      musicId: 3
    }
  ];

  function syncLevelSelectOptions() {
    if (!levelSelect) return;
    const selectedLevel = String(currentLevelIndex);
    const options = gameLevels.map((level, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `第${index + 1}关: ${level.name} (${level.difficulty})`;
      return option;
    });
    levelSelect.replaceChildren(...options);
    levelSelect.value = selectedLevel;
  }

  syncLevelSelectOptions();

  function getLevelDisplayName(level) {
    return (level.name || '').replace(/\s*\(.+?\)\s*$/, '');
  }

  // Sound generator
  function playArcadeSound(type) {
    if (isMusicMuted) return;
    if (!pianoAudioCtx) {
      pianoAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (pianoAudioCtx.state === 'suspended') {
      pianoAudioCtx.resume();
    }
    const now = pianoAudioCtx.currentTime;

    if (type === 'jump') {
      const osc = pianoAudioCtx.createOscillator();
      const gain = pianoAudioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(pianoAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    }
    else if (type === 'coin') {
      const osc = pianoAudioCtx.createOscillator();
      const gain = pianoAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.07);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.07);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(pianoAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    }
    else if (type === 'squash') {
      const osc = pianoAudioCtx.createOscillator();
      const gain = pianoAudioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.14);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(pianoAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
    else if (type === 'dash') {
      const osc = pianoAudioCtx.createOscillator();
      const gain = pianoAudioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.09);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(pianoAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.17);
    }
    else if (type === 'shield') {
      const osc = pianoAudioCtx.createOscillator();
      const gain = pianoAudioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(880, now + 0.06);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(pianoAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
    else if (type === 'checkpoint') {
      const notes = [392.00, 523.25, 659.25];
      notes.forEach((freq, idx) => {
        const osc = pianoAudioCtx.createOscillator();
        const gain = pianoAudioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.07, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(pianoAudioCtx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.22);
      });
    }
    else if (type === 'death') {
      const osc = pianoAudioCtx.createOscillator();
      const gain = pianoAudioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.45);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(pianoAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.46);
    }
    else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = pianoAudioCtx.createOscillator();
        const gain = pianoAudioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.06, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.09 + 0.07);
        gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.09 + 0.16);
        osc.connect(gain);
        gain.connect(pianoAudioCtx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.18);
      });
    }
  }

  // Chiptune background music system
  const chiptuneSongs = [
    {
      tempo: 140,
      notes: [
        'C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'C4', 'D4',
        'E4', 'G4', 'A4', 'C5', 'A4', 'G4', 'E4', 'D4',
        'C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'C4', 'D4',
        'E4', 'D4', 'C4', 'D4', 'C4', 'G3', 'C4', 'E4'
      ],
      durations: Array(32).fill(0.3)
    },
    {
      tempo: 120,
      notes: [
        'A3', 'C4', 'E4', 'A4', 'G4', 'E4', 'C4', 'E4',
        'D3', 'F3', 'A3', 'D4', 'C4', 'A3', 'F3', 'A3',
        'G3', 'B3', 'D4', 'G4', 'F4', 'D4', 'B3', 'D4',
        'E3', 'G#3', 'B3', 'E4', 'D4', 'B3', 'G#3', 'E3'
      ],
      durations: Array(32).fill(0.35)
    },
    {
      tempo: 160,
      notes: [
        'E3', 'G3', 'B3', 'E4', 'F4', 'E4', 'B3', 'G3',
        'E3', 'F3', 'G3', 'A3', 'G3', 'F3', 'E3', 'B3',
        'E3', 'G3', 'B3', 'E4', 'D4', 'B3', 'A3', 'B3',
        'C4', 'B3', 'A3', 'G3', 'F3', 'G3', 'F3', 'D3'
      ],
      durations: Array(32).fill(0.22)
    },
    {
      tempo: 150,
      notes: [
        'C4', 'G3', 'C4', 'D#4', 'G4', 'D#4', 'C4', 'A#3',
        'D4', 'A3', 'D4', 'F4', 'A4', 'F4', 'D4', 'C4',
        'G3', 'A#3', 'D4', 'G4', 'F4', 'D4', 'A#3', 'G3',
        'C4', 'D#4', 'G4', 'A#4', 'G4', 'D#4', 'C4', 'G3'
      ],
      durations: Array(32).fill(0.26)
    }
  ];

  let musicTimer = null;
  let musicCurrentNote = 0;
  let isMusicPlaying = false;
  let musicAudioCtx = null;
  let musicGainNode = null;
  let currentActiveSongIndex = 0;
  let isMusicMuted = false;
  let nextNoteTime = 0.0;
  const scheduleAheadTime = 0.1;
  const lookahead = 25.0;
  let schedulerTimerId = null;

  function initMusicAudio() {
    if (!musicAudioCtx) {
      musicAudioCtx = pianoAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    }
    if (musicAudioCtx.state === 'suspended') {
      musicAudioCtx.resume();
    }
    if (!musicGainNode) {
      musicGainNode = musicAudioCtx.createGain();
      musicGainNode.gain.setValueAtTime(0.04, musicAudioCtx.currentTime);
      musicGainNode.connect(musicAudioCtx.destination);
    }
  }

  function playChiptuneNote(noteName, time) {
    if (!musicAudioCtx || !musicGainNode || isMusicMuted) return;
    const freqs = {
      'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
      'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
      'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
      'A#4': 466.16, 'B4': 493.88, 'C5': 523.25
    };
    const freq = freqs[noteName];
    if (!freq) return;

    const osc = musicAudioCtx.createOscillator();
    const gain = musicAudioCtx.createGain();
    const oscTypes = ['triangle', 'square', 'sawtooth'];
    osc.type = oscTypes[currentActiveSongIndex] || 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(musicGainNode);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  function musicScheduler() {
    while (nextNoteTime < musicAudioCtx.currentTime + scheduleAheadTime) {
      scheduleNextNote();
      advanceNote();
    }
  }

  function scheduleNextNote() {
    const song = chiptuneSongs[currentActiveSongIndex];
    if (!song) return;
    const note = song.notes[musicCurrentNote];
    playChiptuneNote(note, nextNoteTime);
  }

  function advanceNote() {
    const song = chiptuneSongs[currentActiveSongIndex];
    if (!song) return;
    const duration = song.durations[musicCurrentNote] || 0.3;
    nextNoteTime += duration;
    musicCurrentNote++;
    if (musicCurrentNote >= song.notes.length) {
      musicCurrentNote = 0;
    }
  }

  function startMusic() {
    if (isMusicPlaying || isMusicMuted) return;
    initMusicAudio();
    isMusicPlaying = true;
    musicCurrentNote = 0;
    nextNoteTime = musicAudioCtx.currentTime + 0.05;
    
    function runScheduler() {
      if (!isMusicPlaying) return;
      musicScheduler();
      schedulerTimerId = setTimeout(runScheduler, lookahead);
    }
    runScheduler();
  }

  stopMusic = function() {
    isMusicPlaying = false;
    if (schedulerTimerId) {
      clearTimeout(schedulerTimerId);
      schedulerTimerId = null;
    }
  };

  // Player state
  let player = {
    x: 50, y: 300, vx: 0, vy: 0,
    width: 20, height: 32,
    isGrounded: false, doubleJumpAvailable: true,
    coinsCollected: 0,
    shield: 0,
    checkpoint: null,
    dashReady: true,
    dashCooldownUntil: 0,
    dashBurstUntil: 0,
    invulnerableUntil: 0
  };

  if (['127.0.0.1', 'localhost'].includes(window.location.hostname)) {
    window.__atherixDebug = {
      ...(window.__atherixDebug || {}),
      get player() {
        return { ...player };
      },
      gameRunning: () => gameRunning,
      gamePaused: () => gamePaused,
      runnerElapsedMs: () => getRunnerElapsedMs(),
      runnerState: () => runnerDebugState(),
      forceRunnerContract: () => forceRunnerContract()
    };
  }

  initLevelData = function() {
    const lvl = gameLevels[currentLevelIndex];
    if (!lvl) return;

    if (displayLevelName) displayLevelName.textContent = `${currentLevelIndex + 1}/${gameLevels.length} ${getLevelDisplayName(lvl)}`;
    if (displayLevelDifficulty) {
      displayLevelDifficulty.textContent = lvl.difficulty;
      displayLevelDifficulty.style.color = lvl.diffColor;
    }
    targetCoins = lvl.targetCoins;
    if (targetCoinsSpan) targetCoinsSpan.textContent = targetCoins;
    levelWidth = lvl.levelWidth;

    platforms = (lvl.platforms || []).map(p => ({
      ...p,
      originX: p.x,
      originY: p.y,
      dir: p.dir || 1,
      prevX: p.x,
      prevY: p.y
    }));
    hazards = (lvl.hazards || []).map(h => ({ ...h }));
    coins = (lvl.coins || []).map(c => ({ ...c, collected: false }));
    enemies = (lvl.enemies || []).map(e => ({ ...e, isDead: false }));
    powerUps = (lvl.powerUps || []).map(p => ({ ...p, collected: false }));
    checkpoints = (lvl.checkpoints || []).map(c => ({ ...c, active: false }));
    exitPortal = { ...(lvl.exitPortal || { x: levelWidth - 80, y: 290, w: 42, h: 82 }) };

    player.x = lvl.playerStart.x;
    player.y = lvl.playerStart.y;
    player.vx = 0;
    player.vy = 0;
    player.isGrounded = false;
    player.doubleJumpAvailable = true;
    player.coinsCollected = 0;
    player.shield = 0;
    player.checkpoint = { ...lvl.playerStart };
    player.dashReady = true;
    player.dashCooldownUntil = 0;
    player.dashBurstUntil = 0;
    player.invulnerableUntil = 0;

    particles = [];
    resetRunnerMeta();

    if (gameCoinsSpan) gameCoinsSpan.textContent = '0';
    if (gameTimerSpan) gameTimerSpan.textContent = '0.0';
    updateShieldDisplay();
    setGameStatus('READY', '#8B5CF6', 0);

    const bestLvlTime = localStorage.getItem(`atherix_astro_runner_best_lvl_${currentLevelIndex}`) || '--';
    if (gameBestTimeSpan) gameBestTimeSpan.textContent = bestLvlTime === '--' ? '--' : `${bestLvlTime}s`;

    if (levelSelect) levelSelect.value = String(currentLevelIndex);
    if (musicSelect && musicSelect.value !== 'mute') {
      musicSelect.value = lvl.musicId;
      currentActiveSongIndex = lvl.musicId;
    }
  };

  const gameKeys = {};
  const overlayActionCodes = ['Enter'];
  const runnerTouchMap = {
    left: 'ArrowLeft',
    right: 'ArrowRight'
  };

  function setRunnerTouchButtonState(button, held) {
    if (!button) return;
    button.classList.toggle('is-held', held);
  }

  function setRunnerDirection(control, pressed) {
    const code = runnerTouchMap[control];
    if (!code) return;
    gameKeys[code] = pressed;
    setRunnerTouchButtonState(control === 'left' ? btnLeftLed : btnRightLed, pressed);
    if (joystickShaft) {
      if (pressed) {
        joystickShaft.style.transform = control === 'left' ? 'translate(-6px, 0)' : 'translate(6px, 0)';
      } else if (!gameKeys.ArrowLeft && !gameKeys.ArrowRight) {
        joystickShaft.style.transform = 'translate(0, 0)';
      }
    }
  }

  function runOverlayAction() {
    if (!gameOverlay || gameOverlay.style.display === 'none') return false;
    const titleText = document.getElementById('game-overlay-title').textContent;
    if (titleText === 'VICTORY!' && currentLevelIndex < gameLevels.length - 1) {
      currentLevelIndex++;
      if (levelSelect) levelSelect.value = String(currentLevelIndex);
      startLevel();
    } else if (titleText === 'GAME OVER' && hasActiveCheckpoint()) {
      respawnAtCheckpoint();
    } else {
      startLevel();
    }
    return true;
  }

  window.addEventListener('keydown', (e) => {
    const gameControlCodes = ['Space', 'Enter', 'Escape', 'KeyP', 'KeyW', 'KeyA', 'KeyD', 'KeyK', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
    const pauseToggleCodes = ['Escape', 'KeyP'];
    const isGameControlKey = gameControlCodes.includes(e.code);
    const gameIsActive = isGameSectionActive();
    const miniGameHasFocus = isMiniGameFocus();

    if (gameIsActive && isGameControlKey && !isEditableTarget(e.target) && !miniGameHasFocus) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (gameIsActive && !isEditableTarget(e.target) && !miniGameHasFocus && pauseToggleCodes.includes(e.code)) {
      e.preventDefault();
      toggleRunnerPause();
      return;
    }

    if (gamePaused) {
      if (gameIsActive && !isEditableTarget(e.target) && !miniGameHasFocus && e.code === 'Enter') {
        e.preventDefault();
        resumeRunnerGame();
      }
      return;
    }

    // If not running, Enter starts/retries the game. Space is reserved for jump only.
    if (!gameRunning) {
      if (gameIsActive && !isEditableTarget(e.target) && !miniGameHasFocus) {
        if (overlayActionCodes.includes(e.code)) {
          e.preventDefault();
          runOverlayAction();
        }
      }
      return;
    }

    if (isEditableTarget(e.target)) return;
    if (miniGameHasFocus) return;

    if (!isGameControlKey) return;

    const wasPressed = !!gameKeys[e.code];
    gameKeys[e.code] = true;

    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      if (joystickShaft) joystickShaft.style.transform = 'translate(-6px, 0)';
      if (document.getElementById('light-left')) document.getElementById('light-left').classList.add('active');
    } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      if (joystickShaft) joystickShaft.style.transform = 'translate(6px, 0)';
      if (document.getElementById('light-right')) document.getElementById('light-right').classList.add('active');
    } else if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
      if (joystickShaft) joystickShaft.style.transform = 'translate(0, -6px)';
      if (document.getElementById('light-up')) document.getElementById('light-up').classList.add('active');
    }

    if (wasPressed || e.repeat) return;

    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
      triggerPlayerJump();
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') {
      triggerPlayerDash();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (isGameSectionActive() && !isEditableTarget(e.target) && !isMiniGameFocus() && ['Space', 'Enter', 'Escape', 'KeyP', 'KeyW', 'KeyA', 'KeyD', 'KeyK', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
      e.stopPropagation();
    }
    gameKeys[e.code] = false;
    
    if (['KeyA', 'ArrowLeft'].includes(e.code)) {
      if (document.getElementById('light-left')) document.getElementById('light-left').classList.remove('active');
    }
    if (['KeyD', 'ArrowRight'].includes(e.code)) {
      if (document.getElementById('light-right')) document.getElementById('light-right').classList.remove('active');
    }
    if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
      if (document.getElementById('light-up')) document.getElementById('light-up').classList.remove('active');
    }

    if (['KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight', 'Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
      if (joystickShaft) joystickShaft.style.transform = 'translate(0, 0)';
    }
  });

  function triggerPlayerJump() {
    if (player.isGrounded) {
      player.vy = -9.2;
      player.isGrounded = false;
      playArcadeSound('jump');
      createParticleExplosion(player.x + player.width/2, player.y + player.height, '#06B6D4', 6);
    } else if (player.doubleJumpAvailable) {
      player.vy = -8.2;
      player.doubleJumpAvailable = false;
      playArcadeSound('jump');
      createParticleExplosion(player.x + player.width/2, player.y + player.height, '#EC4899', 8);
    }
  }

  function triggerDeath() {
    gameRunning = false;
    clearRunnerPauseState();
    playArcadeSound('death');
    cancelAnimationFrame(gameLoopId);
    cancelAnimationFrame(deathAnimationId);
    stopMusic();

    createParticleExplosion(player.x + player.width/2, player.y + player.height/2, '#EF4444', 30);

    let deathFrameCount = 0;
    function drawDeathAnimation() {
      if (gameRunning) return;
      drawGame();
      deathFrameCount++;
      if (deathFrameCount < 60) {
        deathAnimationId = requestAnimationFrame(drawDeathAnimation);
      }
    }
    drawDeathAnimation();

    if (gameOverlay) {
      document.getElementById('game-overlay-title').textContent = 'GAME OVER';
      document.getElementById('game-overlay-title').style.color = '#EF4444';
      document.getElementById('game-overlay-title').style.textShadow = '0 0 15px rgba(239, 68, 68, 0.6)';
      const canRespawn = hasActiveCheckpoint();
      document.getElementById('game-overlay-subtitle').textContent = canRespawn ? '检查点已保存，点击此处或按 [Enter] 从信标继续' : '点击此处或按 [Enter] 重新挑战本关';
      gameOverlay.style.display = 'flex';
    }
  }

  function respawnAtCheckpoint() {
    if (!player.checkpoint) {
      startLevel();
      return;
    }
    player.x = player.checkpoint.x;
    player.y = player.checkpoint.y;
    player.vx = 0;
    player.vy = 0;
    player.isGrounded = false;
    player.doubleJumpAvailable = true;
    player.dashReady = true;
    player.dashBurstUntil = 0;
    player.dashCooldownUntil = 0;
    player.invulnerableUntil = Date.now() + 1300;
    if (gameOverlay) gameOverlay.style.display = 'none';
    cancelAnimationFrame(deathAnimationId);
    clearRunnerPauseState();
    gameRunning = true;
    setGameStatus('CHECKPOINT', '#A78BFA');
    if (musicSelect && musicSelect.value !== 'mute') startMusic();
    updateGame();
  }

  function triggerWin() {
    const finishTime = (getRunnerElapsedMs() / 1000).toFixed(1);
    gameRunning = false;
    clearRunnerPauseState();
    playArcadeSound('win');
    cancelAnimationFrame(gameLoopId);
    stopMusic();

    const bestLvlTime = localStorage.getItem(`atherix_astro_runner_best_lvl_${currentLevelIndex}`);
    if (!bestLvlTime || parseFloat(finishTime) < parseFloat(bestLvlTime)) {
      localStorage.setItem(`atherix_astro_runner_best_lvl_${currentLevelIndex}`, finishTime);
      if (gameBestTimeSpan) gameBestTimeSpan.textContent = `${finishTime}s`;
    }
    addRunnerScore(350 + currentLevelIndex * 120 + player.coinsCollected * 35, 'ROUTE CLEAR', { combo: false });
    const campaignScore = Math.max(120, Math.round(
      2200 -
      parseFloat(finishTime) * 24 +
      currentLevelIndex * 260 +
      player.shield * 80 +
      runnerScore +
      runnerBestCombo * 45 +
      runnerContractsCompleted * 520
    ));
    if (window.atherixArcadeCareer) {
      window.atherixArcadeCareer.recordResult('runner', campaignScore, {
        level: currentLevelIndex + 1,
        finishTime: parseFloat(finishTime),
        routeScore: Math.floor(runnerScore),
        bestCombo: runnerBestCombo,
        contractsCompleted: runnerContractsCompleted
      });
      if (runnerContractsCompleted > 0) {
        window.atherixArcadeCareer.unlock('runner_contract');
      }
      if (currentLevelIndex === gameLevels.length - 1) {
        window.atherixArcadeCareer.unlock('runner_final');
      }
    }

    createParticleExplosion(exitPortal.x + exitPortal.w/2, exitPortal.y + exitPortal.h/2, '#10B981', 40);

    if (gameOverlay) {
      document.getElementById('game-overlay-title').textContent = 'VICTORY!';
      document.getElementById('game-overlay-title').style.color = '#10B981';
      document.getElementById('game-overlay-title').style.textShadow = '0 0 15px rgba(16, 185, 129, 0.6)';
      
      const nextLevelAvail = currentLevelIndex < gameLevels.length - 1;
      let victoryMsg = `通关用时: <strong style="color:#FFF; font-size:1.4rem;">${finishTime}s</strong><br>`;
      victoryMsg += `航线评分: <strong style="color:#BAE6FD;">${Math.floor(runnerScore)}</strong> · 最佳连段 <strong style="color:#A7F3D0;">${runnerBestCombo}x</strong> · 合约 <strong style="color:#FDE68A;">${runnerContractsCompleted}</strong><br>`;
      if (nextLevelAvail) {
        victoryMsg += `点击此处或按 [Enter] 开启下一关卡挑战！`;
      } else {
        victoryMsg += `恭喜你通关了全部关卡！再次点击以重新挑战。`;
      }
      document.getElementById('game-overlay-subtitle').innerHTML = victoryMsg;
      gameOverlay.style.display = 'flex';
    }
  }

  // Core Game loop
  function updateGame() {
    if (!gameRunning) return;

    const now = Date.now();

    for (const plat of platforms) {
      plat.prevX = plat.x;
      plat.prevY = plat.y;
      if (plat.moveAxis === 'x') {
        plat.x += (plat.speed || 1) * plat.dir;
        if (plat.x <= plat.minX || plat.x >= plat.maxX) {
          plat.x = Math.max(plat.minX, Math.min(plat.maxX, plat.x));
          plat.dir *= -1;
        }
      } else if (plat.moveAxis === 'y') {
        plat.y += (plat.speed || 1) * plat.dir;
        if (plat.y <= plat.minY || plat.y >= plat.maxY) {
          plat.y = Math.max(plat.minY, Math.min(plat.maxY, plat.y));
          plat.dir *= -1;
        }
      }
    }

    if (!player.dashReady && now >= player.dashCooldownUntil) {
      player.dashReady = true;
      setGameStatus('READY', '#8B5CF6', 0);
    }

    if (runnerCombo > 0 && runnerComboUntil > 0 && now > runnerComboUntil) {
      runnerCombo = 0;
      runnerComboUntil = 0;
      runnerLastAction = 'COMBO RESET';
      runnerLastScoreGain = 0;
      setRunnerMetaUi();
    }

    player.vy += 0.45;
    if (player.vy > 10) player.vy = 10;

    if (now > player.dashBurstUntil) {
      if (gameKeys['KeyD'] || gameKeys['ArrowRight']) {
        player.vx = 4;
        if (player.isGrounded && Math.random() < 0.15) {
          particles.push({
            x: player.x,
            y: player.y + player.height,
            vx: -1,
            vy: -Math.random(),
            radius: 1,
            alpha: 0.8,
            decay: 0.05,
            color: 'rgba(255, 255, 255, 0.3)'
          });
        }
      } else if (gameKeys['KeyA'] || gameKeys['ArrowLeft']) {
        player.vx = -4;
        if (player.isGrounded && Math.random() < 0.15) {
          particles.push({
            x: player.x + player.width,
            y: player.y + player.height,
            vx: 1,
            vy: -Math.random(),
            radius: 1,
            alpha: 0.8,
            decay: 0.05,
            color: 'rgba(255, 255, 255, 0.3)'
          });
        }
      } else {
        player.vx *= 0.8;
      }
    } else if (Math.random() < 0.7) {
      particles.push({
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        vx: -player.vx * 0.18 + (Math.random() - 0.5),
        vy: (Math.random() - 0.5) * 1.5,
        radius: 1.5,
        alpha: 0.75,
        decay: 0.06,
        color: '#60A5FA'
      });
    }

    player.x += player.vx;
    player.y += player.vy;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > levelWidth) player.x = levelWidth - player.width;
    if (player.y > 410) {
      triggerDeath();
      return;
    }

    player.isGrounded = false;
    for (const plat of platforms) {
      if (rectsOverlap(playerRect(), plat)) {
        
        const overlapX = Math.min(player.x + player.width - plat.x, plat.x + plat.w - player.x);
        const overlapY = Math.min(player.y + player.height - plat.y, plat.y + plat.h - player.y);

        if (overlapY < overlapX) {
          if (player.vy > 0) {
            player.y -= overlapY;
            player.vy = 0;
            player.isGrounded = true;
            player.doubleJumpAvailable = true;
            player.x += plat.x - plat.prevX;
          } else if (player.vy < 0) {
            player.y += overlapY;
            player.vy = 0;
          }
        } else {
          if (player.vx > 0) player.x -= overlapX;
          else if (player.vx < 0) player.x += overlapX;
        }
      }
    }

    for (const spike of hazards) {
      if (rectsOverlap(playerRect(), spike)) {
        if (consumeShieldOrDie(spike.x + spike.w / 2, spike.y)) {
          return;
        }
        break;
      }
    }

    for (const checkpoint of checkpoints) {
      if (checkpoint.active) continue;
      if (rectsOverlap(playerRect(), checkpoint)) {
        checkpoint.active = true;
        player.checkpoint = { x: checkpoint.x - 12, y: checkpoint.y - 40 };
        createParticleExplosion(checkpoint.x + checkpoint.w / 2, checkpoint.y + checkpoint.h / 2, '#A78BFA', 24);
        playArcadeSound('checkpoint');
        setGameStatus('CHECKPOINT', '#A78BFA');
        addRunnerScore(160, 'CHECKPOINT', { combo: true, comboMs: 3400 });
        resolveRunnerContract('checkpoint');
      }
    }

    for (const powerUp of powerUps) {
      if (powerUp.collected) continue;
      if (rectsOverlap(playerRect(), powerUp)) {
        powerUp.collected = true;
        if (powerUp.type === 'shield') {
          player.shield = Math.min(player.shield + 1, 3);
          updateShieldDisplay();
          setGameStatus('SHIELD +1', '#34D399');
          createParticleExplosion(powerUp.x + powerUp.w / 2, powerUp.y + powerUp.h / 2, '#34D399', 18);
          playArcadeSound('shield');
          addRunnerScore(130, 'SHIELD CELL', { combo: true, comboMs: 3200 });
        } else {
          player.dashReady = true;
          player.dashCooldownUntil = 0;
          setGameStatus('DASH READY', '#60A5FA');
          createParticleExplosion(powerUp.x + powerUp.w / 2, powerUp.y + powerUp.h / 2, '#60A5FA', 18);
          playArcadeSound('dash');
          addRunnerScore(120, 'DASH CELL', { combo: true, comboMs: 3200 });
        }
        resolveRunnerContract('powerup');
      }
    }

    for (const coin of coins) {
      if (coin.collected) continue;
      if (rectsOverlap(playerRect(), coin)) {
        coin.collected = true;
        player.coinsCollected++;
        if (gameCoinsSpan) gameCoinsSpan.textContent = player.coinsCollected;
        
        createParticleExplosion(coin.x + coin.w/2, coin.y + coin.h/2, '#FBBF24', 12);
        playArcadeSound('coin');
        addRunnerScore(95, 'CRYSTAL', { combo: true, comboMs: 3000 });
        resolveRunnerContract('crystal');
        if (player.coinsCollected === targetCoins) {
          setGameStatus('PORTAL OPEN', '#10B981');
        }
      }
    }

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      
      enemy.x += enemy.vx;
      if (enemy.x <= enemy.rangeStart || enemy.x + enemy.w >= enemy.rangeEnd) {
        enemy.vx = -enemy.vx;
      }

      if (rectsOverlap(playerRect(), enemy)) {
        
        const playerBottom = player.y + player.height;
        const enemyTopThreshold = enemy.y + 10;

        if (player.vy > 0 && playerBottom - player.vy <= enemyTopThreshold) {
          enemy.isDead = true;
          player.vy = -6.5;
          player.dashReady = true;
          
          createParticleExplosion(enemy.x + enemy.w/2, enemy.y + enemy.h/2, '#EF4444', 16);
          playArcadeSound('squash');
          setGameStatus('BOUNCE', '#EF4444');
          addRunnerScore(190, 'STOMP', { combo: true, comboMs: 3600 });
          resolveRunnerContract('stomp');
        } else {
          if (consumeShieldOrDie(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2)) {
            return;
          }
          break;
        }
      }
    }

    if (player.coinsCollected >= targetCoins &&
        rectsOverlap(playerRect(), exitPortal)) {
      triggerWin();
      return;
    }

    if (gameTimerSpan) {
      gameTimerSpan.textContent = (getRunnerElapsedMs() / 1000).toFixed(1);
    }

    drawGame();
    gameLoopId = requestAnimationFrame(updateGame);
  }

  // Draw Game Board
  drawGame = function() {
    if (!gameCtx) return;

    const lvl = gameLevels[currentLevelIndex];
    const theme = lvl ? lvl.theme : {
      bg: '#080612', grid: 'rgba(6, 182, 212, 0.06)',
      platFill: '#0f172a', platStroke: '#06B6D4', skyStarColor: '#06B6D4'
    };

    let cameraX = player.x - arcadeCanvas.width / 2;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > levelWidth - arcadeCanvas.width) cameraX = levelWidth - arcadeCanvas.width;

    gameCtx.fillStyle = theme.bg;
    gameCtx.fillRect(0, 0, arcadeCanvas.width, arcadeCanvas.height);

    gameCtx.fillStyle = theme.skyStarColor;
    for (const star of starBackground) {
      const sx = (star.x - cameraX * star.speed) % (arcadeCanvas.width + 100);
      const drawX = sx < 0 ? sx + arcadeCanvas.width + 100 : sx;
      gameCtx.beginPath();
      gameCtx.arc(drawX, star.y, star.size, 0, Math.PI * 2);
      gameCtx.fill();
    }

    gameCtx.strokeStyle = theme.grid;
    gameCtx.lineWidth = 1;
    const spacing = 40;
    const startX = -(cameraX % spacing);
    for (let x = startX; x < arcadeCanvas.width; x += spacing) {
      gameCtx.beginPath();
      gameCtx.moveTo(x, 0);
      gameCtx.lineTo(x, arcadeCanvas.height);
      gameCtx.stroke();
    }

    for (const plat of platforms) {
      gameCtx.save();
      gameCtx.shadowColor = theme.platStroke;
      gameCtx.shadowBlur = 8;
      
      gameCtx.fillStyle = theme.platFill;
      gameCtx.fillRect(plat.x - cameraX, plat.y, plat.w, plat.h);

      gameCtx.strokeStyle = theme.platStroke;
      gameCtx.lineWidth = 2;
      gameCtx.strokeRect(plat.x - cameraX, plat.y, plat.w, plat.h);
      if (plat.moveAxis) {
        gameCtx.strokeStyle = 'rgba(255,255,255,0.18)';
        gameCtx.lineWidth = 1;
        if (plat.moveAxis === 'x') {
          gameCtx.beginPath();
          gameCtx.moveTo(plat.minX - cameraX, plat.y + plat.h + 8);
          gameCtx.lineTo(plat.maxX + plat.w - cameraX, plat.y + plat.h + 8);
          gameCtx.stroke();
        } else {
          gameCtx.beginPath();
          gameCtx.moveTo(plat.x + plat.w + 8 - cameraX, plat.minY);
          gameCtx.lineTo(plat.x + plat.w + 8 - cameraX, plat.maxY + plat.h);
          gameCtx.stroke();
        }
      }
      gameCtx.restore();
    }

    for (const spike of hazards) {
      gameCtx.save();
      gameCtx.shadowColor = '#EF4444';
      gameCtx.shadowBlur = 8;
      gameCtx.fillStyle = '#EF4444';
      gameCtx.beginPath();
      const segments = spike.w / 10;
      for (let i = 0; i <= segments; i++) {
        const px = spike.x + i * 10 - cameraX;
        const py = spike.y;
        if (i === 0) gameCtx.moveTo(px, py + spike.h);
        else if (i % 2 === 1) gameCtx.lineTo(px + 5, py);
        else gameCtx.lineTo(px, py + spike.h);
      }
      gameCtx.closePath();
      gameCtx.fill();
      gameCtx.restore();
    }

    for (const checkpoint of checkpoints) {
      gameCtx.save();
      const cx = checkpoint.x + checkpoint.w / 2 - cameraX;
      const cy = checkpoint.y + checkpoint.h / 2;
      const pulse = Math.sin(Date.now() / 220) * 3;
      gameCtx.shadowColor = checkpoint.active ? '#A78BFA' : '#64748B';
      gameCtx.shadowBlur = checkpoint.active ? 18 : 6;
      gameCtx.strokeStyle = checkpoint.active ? '#A78BFA' : '#64748B';
      gameCtx.lineWidth = 2;
      gameCtx.beginPath();
      gameCtx.moveTo(cx, checkpoint.y - 2 - pulse);
      gameCtx.lineTo(checkpoint.x + checkpoint.w - cameraX + 6, cy);
      gameCtx.lineTo(cx, checkpoint.y + checkpoint.h + 2 + pulse);
      gameCtx.lineTo(checkpoint.x - cameraX - 6, cy);
      gameCtx.closePath();
      gameCtx.stroke();
      gameCtx.fillStyle = checkpoint.active ? 'rgba(167,139,250,0.18)' : 'rgba(100,116,139,0.12)';
      gameCtx.fill();
      gameCtx.restore();
    }

    for (const powerUp of powerUps) {
      if (powerUp.collected) continue;
      gameCtx.save();
      const cx = powerUp.x + powerUp.w / 2 - cameraX;
      const cy = powerUp.y + powerUp.h / 2;
      const color = powerUp.type === 'shield' ? '#34D399' : '#60A5FA';
      const bob = Math.sin(Date.now() / 180 + powerUp.x) * 2;
      gameCtx.translate(cx, cy + bob);
      gameCtx.shadowColor = color;
      gameCtx.shadowBlur = 14;
      gameCtx.fillStyle = color;
      if (powerUp.type === 'shield') {
        gameCtx.beginPath();
        gameCtx.arc(0, 0, 9, 0, Math.PI * 2);
        gameCtx.fill();
        gameCtx.fillStyle = '#052e2b';
        gameCtx.fillRect(-3, -6, 6, 12);
      } else {
        gameCtx.rotate(Math.PI / 4);
        gameCtx.fillRect(-7, -7, 14, 14);
        gameCtx.fillStyle = '#081225';
        gameCtx.fillRect(-2, -8, 4, 16);
      }
      gameCtx.restore();
    }

    for (const coin of coins) {
      if (coin.collected) continue;
      gameCtx.save();
      gameCtx.translate(coin.x + coin.w/2 - cameraX, coin.y + coin.h/2);
      
      const rotationAngle = (Date.now() / 300) % (Math.PI * 2);
      const pulseSize = Math.sin(Date.now() / 150) * 1.5;
      gameCtx.rotate(rotationAngle);

      gameCtx.shadowColor = '#FBBF24';
      gameCtx.shadowBlur = 10;
      gameCtx.fillStyle = '#FBBF24';
      gameCtx.beginPath();
      gameCtx.moveTo(0, -8 - pulseSize);
      gameCtx.lineTo(5 + pulseSize, 0);
      gameCtx.lineTo(0, 8 + pulseSize);
      gameCtx.lineTo(-5 - pulseSize, 0);
      gameCtx.closePath();
      gameCtx.fill();
      gameCtx.restore();
    }

    if (player.coinsCollected >= targetCoins) {
      gameCtx.save();
      gameCtx.translate(exitPortal.x + exitPortal.w/2 - cameraX, exitPortal.y + exitPortal.h/2);
      const swirl = (Date.now() / 350) % (Math.PI * 2);
      gameCtx.rotate(swirl);

      gameCtx.shadowColor = '#10B981';
      gameCtx.shadowBlur = 15;
      gameCtx.strokeStyle = '#10B981';
      gameCtx.lineWidth = 4;
      gameCtx.beginPath();
      gameCtx.arc(0, 0, 22, 0, Math.PI * 2);
      gameCtx.stroke();

      gameCtx.strokeStyle = '#34D399';
      gameCtx.lineWidth = 2;
      gameCtx.beginPath();
      gameCtx.arc(0, 0, 12, 0, Math.PI);
      gameCtx.stroke();
      gameCtx.restore();
    } else {
      gameCtx.strokeStyle = '#374151';
      gameCtx.lineWidth = 2;
      gameCtx.strokeRect(exitPortal.x - cameraX, exitPortal.y, exitPortal.w, exitPortal.h);
      gameCtx.fillStyle = '#111827';
      gameCtx.fillRect(exitPortal.x + 2 - cameraX, exitPortal.y + 2, exitPortal.w - 4, exitPortal.h - 4);
      
      gameCtx.fillStyle = '#4B5563';
      gameCtx.font = 'bold 9px monospace';
      gameCtx.fillText('LOCKED', exitPortal.x + 2 - cameraX, exitPortal.y + exitPortal.h/2 + 3);
    }

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      gameCtx.save();
      gameCtx.fillStyle = '#EF4444';
      gameCtx.fillRect(enemy.x - cameraX, enemy.y, enemy.w, enemy.h);

      gameCtx.fillStyle = '#FFF';
      gameCtx.fillRect(enemy.x + 3 - cameraX, enemy.y + 5, 4, 4);
      gameCtx.fillRect(enemy.x + 13 - cameraX, enemy.y + 5, 4, 4);
      
      gameCtx.fillStyle = '#FF0000';
      gameCtx.fillRect(enemy.x + (enemy.vx > 0 ? 5 : 2) - cameraX, enemy.y + 6, 2, 2);
      gameCtx.fillRect(enemy.x + (enemy.vx > 0 ? 15 : 12) - cameraX, enemy.y + 6, 2, 2);
      gameCtx.restore();
    }

    gameCtx.save();
    if (player.shield > 0 || Date.now() < player.invulnerableUntil) {
      gameCtx.globalAlpha = Date.now() < player.invulnerableUntil ? 0.72 : 1;
      gameCtx.shadowColor = '#34D399';
      gameCtx.shadowBlur = 14;
      gameCtx.strokeStyle = '#34D399';
      gameCtx.lineWidth = 2;
      gameCtx.beginPath();
      gameCtx.arc(player.x + player.width / 2 - cameraX, player.y + player.height / 2, 24, 0, Math.PI * 2);
      gameCtx.stroke();
    }
    gameCtx.shadowColor = '#06B6D4';
    gameCtx.shadowBlur = 8;
    gameCtx.fillStyle = '#06B6D4';
    gameCtx.fillRect(player.x - cameraX, player.y, player.width, player.height);

    gameCtx.fillStyle = '#EC4899';
    const isFacingRight = player.vx >= 0;
    gameCtx.fillRect(player.x + (isFacingRight ? 11 : 1) - cameraX, player.y + 5, 8, 7);
    gameCtx.restore();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }
      gameCtx.save();
      gameCtx.globalAlpha = p.alpha;
      gameCtx.fillStyle = p.color;
      gameCtx.beginPath();
      gameCtx.arc(p.x - cameraX, p.y, p.radius, 0, Math.PI * 2);
      gameCtx.fill();
      gameCtx.restore();
    }

    gameCtx.save();
    gameCtx.globalAlpha = 0.92;
    gameCtx.fillStyle = 'rgba(8, 13, 28, 0.72)';
    gameCtx.fillRect(12, 10, 188, 50);
    gameCtx.fillRect(arcadeCanvas.width - 210, 10, 198, 50);
    gameCtx.globalAlpha = 1;
    gameCtx.font = 'bold 11px monospace';
    gameCtx.textBaseline = 'top';
    gameCtx.fillStyle = '#BAE6FD';
    gameCtx.fillText(`SCORE ${Math.floor(runnerScore)}`, 20, 18, 170);
    gameCtx.fillStyle = runnerCombo >= 2 ? '#A7F3D0' : '#94A3B8';
    gameCtx.fillText(`COMBO ${runnerCombo}x`, 20, 38, 170);
    gameCtx.textAlign = 'right';
    gameCtx.fillStyle = runnerLastContract ? '#FDE68A' : '#CBD5E1';
    gameCtx.fillText(formatRunnerContract(), arcadeCanvas.width - 20, 18, 178);
    const actionText = runnerLastAction ? `${runnerLastAction}${runnerLastScoreGain > 0 ? ` +${runnerLastScoreGain}` : ''}` : 'ROUTE READY';
    gameCtx.fillStyle = runnerLastScoreGain > 0 ? '#FDE68A' : '#94A3B8';
    gameCtx.fillText(actionText, arcadeCanvas.width - 20, 38, 178);
    gameCtx.restore();
  };

  function startLevel() {
    gameRunning = false;
    cancelAnimationFrame(gameLoopId);
    cancelAnimationFrame(deathAnimationId);
    stopMusic();
    releaseArcadeButtonFocus();
    resetGameKeyState();
    clearRunnerPauseState();

    initLevelData();
    if (gameOverlay) gameOverlay.style.display = 'none';
    gameRunning = true;
    gameStartTime = Date.now();
    
    const songId = gameLevels[currentLevelIndex].musicId;
    if (musicSelect && musicSelect.value !== 'mute') {
      currentActiveSongIndex = songId;
      startMusic();
    }
    
    updateGame();
  }

  if (levelSelect) {
    levelSelect.addEventListener('change', (e) => {
      currentLevelIndex = parseInt(e.target.value) || 0;
      gameRunning = false;
      cancelAnimationFrame(gameLoopId);
      stopMusic();
      resetGameKeyState();
      clearRunnerPauseState();
      
      initLevelData();
      drawGame();
      
      if (gameOverlay) {
        document.getElementById('game-overlay-title').textContent = 'CYBER ASTRO-RUNNER';
        document.getElementById('game-overlay-title').style.color = '#fff';
        document.getElementById('game-overlay-title').style.textShadow = '0 0 15px var(--accent)';
        document.getElementById('game-overlay-subtitle').textContent = '按 [Enter] 或 点击此处 开始挑战关卡；Space 仅用于跳跃';
        gameOverlay.style.display = 'flex';
      }
    });
  }

  if (musicSelect) {
    musicSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'mute') {
        isMusicMuted = true;
        stopMusic();
      } else {
        isMusicMuted = false;
        currentActiveSongIndex = parseInt(val) || 0;
        if (gameRunning) {
          stopMusic();
          startMusic();
        }
      }
      updateRunnerPauseMuteLabel();
    });
  }

  if (gameOverlay) {
    gameOverlay.addEventListener('click', () => {
      runOverlayAction();
    });
  }

  if (gameRestartBtn) {
    gameRestartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      releaseArcadeButtonFocus();
      startLevel();
    });
  }

  if (btnJumpLed) {
    btnJumpLed.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setRunnerTouchButtonState(btnJumpLed, true);
      if (gameRunning) {
        triggerPlayerJump();
        if (joystickShaft) joystickShaft.style.transform = 'translate(0, -6px)';
      }
      try {
        btnJumpLed.setPointerCapture?.(e.pointerId);
      } catch (err) {
        // Pointer capture can fail for interrupted or synthetic pointer streams.
      }
      releaseArcadeButtonFocus();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
      btnJumpLed.addEventListener(type, () => {
        setRunnerTouchButtonState(btnJumpLed, false);
        if (joystickShaft) joystickShaft.style.transform = 'translate(0, 0)';
      });
    });
  }

  function bindRunnerHoldControl(button, control) {
    if (!button) return;
    const release = () => setRunnerDirection(control, false);
    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setRunnerDirection(control, true);
      try {
        button.setPointerCapture?.(e.pointerId);
      } catch (err) {
        // Pointer capture can fail for interrupted or synthetic pointer streams.
      }
      releaseArcadeButtonFocus();
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
  }

  bindRunnerHoldControl(btnLeftLed, 'left');
  bindRunnerHoldControl(btnRightLed, 'right');

  if (btnStartLed) {
    btnStartLed.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setRunnerTouchButtonState(btnStartLed, true);
      if (gamePaused) {
        resumeRunnerGame();
      } else if (!runOverlayAction() && !gameRunning) {
        startLevel();
      }
      releaseArcadeButtonFocus();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
      btnStartLed.addEventListener(type, () => setRunnerTouchButtonState(btnStartLed, false));
    });
  }

  if (btnPauseLed) {
    btnPauseLed.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setRunnerTouchButtonState(btnPauseLed, true);
      toggleRunnerPause();
      releaseArcadeButtonFocus();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
      btnPauseLed.addEventListener(type, () => setRunnerTouchButtonState(btnPauseLed, gamePaused));
    });
  }

  if (btnDashLed) {
    btnDashLed.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setRunnerTouchButtonState(btnDashLed, true);
      if (gameRunning) triggerPlayerDash();
      releaseArcadeButtonFocus();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
      btnDashLed.addEventListener(type, () => setRunnerTouchButtonState(btnDashLed, false));
    });
  }

  function toggleRunnerMusic() {
    if (!musicSelect) return;
    const curVal = musicSelect.value;
    if (curVal === 'mute') {
      isMusicMuted = false;
      musicSelect.value = gameLevels[currentLevelIndex].musicId;
      currentActiveSongIndex = gameLevels[currentLevelIndex].musicId;
      if (gameRunning) startMusic();
    } else {
      isMusicMuted = true;
      musicSelect.value = 'mute';
      stopMusic();
    }
    updateRunnerPauseMuteLabel();
  }

  if (gamePauseResumeBtn) {
    gamePauseResumeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resumeRunnerGame();
    });
  }

  if (gamePauseRestartBtn) {
    gamePauseRestartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      startLevel();
    });
  }

  if (gamePauseMuteBtn) {
    gamePauseMuteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleRunnerMusic();
    });
  }

  if (btnBgmLed) {
    btnBgmLed.addEventListener('click', () => {
      toggleRunnerMusic();
    });
  }

  if (gameLauncherCard) {
    gameLauncherCard.addEventListener('click', () => {
      navigateTo('game');
    });
  }

  runnerEngineReady = true;
  updateRunnerPauseMuteLabel();
  if (isGameSectionActive()) {
    initLevelData();
    drawGame();
  }

  // ==========================================
  // STARTUP INITIALIZATIONS
  // ==========================================
  checkAdminTokenOnStartup();
  loadBlogPosts();
  loadProjects();

}

// Page load listener setup
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
