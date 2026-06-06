// app.js - Atherix Digital Space Frontend Logic (Integrated API & Premium UI Version)

function init() {
  let iconRenderQueued = false;

  // Safe helper to create icons without throwing ReferenceError
  function safeCreateIcons() {
    if (typeof lucide === 'undefined' || iconRenderQueued) return;
    iconRenderQueued = true;

    requestAnimationFrame(() => {
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
  let gameLoopId = null;
  let deathAnimationId = null;
  let stopMusic = () => {};
  let initLevelData = () => {};
  let drawGame = () => {};

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

  function normalizeUrl(value, { allowRelativeUpload = false } = {}) {
    const raw = String(value || '').trim();
    if (!raw || raw === '#') return '';
    if (allowRelativeUpload && raw.startsWith('/uploads/')) return raw;
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
      resetGameKeyState();
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
    modalEl.style.display = 'flex';
    setTimeout(() => {
      modalEl.classList.add('active');
    }, 50);
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('active');
    setTimeout(() => {
      modalEl.style.display = 'none';
    }, 300);
  }

  // Close modals on clicking outside content card
  document.querySelectorAll('.project-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

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
  const blogReader = document.getElementById('blog-reader');
  const blogReaderCard = document.getElementById('blog-reader-card');
  const blogListSection = document.getElementById('blog');
  const readerBackBtn = document.getElementById('reader-back-btn');
  const readerContentEl = document.getElementById('reader-post-content');
  const readerToc = document.getElementById('reader-toc');
  const readerProgressPercent = document.getElementById('reader-progress-percent');
  const readerCopyLinkBtn = document.getElementById('reader-copy-link-btn');
  const readerBookmarkBtn = document.getElementById('reader-bookmark-btn');
  let readerProgressFrame = 0;

  // Blog creation modals and controls
  const addPostBtn = document.getElementById('add-post-btn');
  const blogEditModal = document.getElementById('blog-edit-modal');
  const blogEditClose = document.getElementById('blog-edit-close');
  const blogEditForm = document.getElementById('blog-edit-form');

  let selectedTag = 'all';

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

  function updateReaderBookmarkState() {
    if (!readerBookmarkBtn || !currentPostId) return;
    const isSaved = getReaderBookmarks().includes(currentPostId);
    readerBookmarkBtn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
    readerBookmarkBtn.innerHTML = isSaved
      ? '<i data-lucide="bookmark-check"></i> 已稍后读'
      : '<i data-lucide="bookmark"></i> 稍后读';
    safeCreateIcons();
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
    const percent = Math.max(0, Math.min(100, Math.round(scrolled / total * 100)));
    readerProgressPercent.textContent = `${percent}%`;
    if (currentPostId) localStorage.setItem(readerProgressKey(currentPostId), String(percent));

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
      const link = `${window.location.origin}${window.location.pathname}#post/${encodeURIComponent(currentPostId)}`;
      copyText(link, '文章链接已复制');
    });
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
    });
  }

  window.addEventListener('scroll', updateReaderProgress, { passive: true });

  if (readerBackBtn) {
    readerBackBtn.addEventListener('click', () => {
      if (blogReaderCard) blogReaderCard.classList.remove('active');
      document.title = 'Atherix - 个人博客与数字空间';
      navigateTo('blog');
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

    const query = blogSearch ? blogSearch.value.trim().toLowerCase() : '';
    const filtered = blogPosts.filter(post => {
      const title = String(post.title || '').toLowerCase();
      const excerpt = String(post.excerpt || '').toLowerCase();
      const content = String(post.content || '').toLowerCase();
      const tag = post.tag || '未分类';
      const matchQuery = title.includes(query) ||
                         excerpt.includes(query) ||
                         content.includes(query);
      const matchTag = selectedTag === 'all' || tag === selectedTag;
      return matchQuery && matchTag;
    });

    if (filtered.length === 0) {
      blogPostsContainer.innerHTML = '<div class="glass-card" style="text-align: center; color: var(--text-secondary); padding: 3rem 1rem;">没有找到匹配的文章。</div>';
      return;
    }

    filtered.forEach(post => {
      const card = document.createElement('div');
      card.className = 'glass-card blog-post-card glow-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      const postId = escapeHTML(post.id || '');
      const title = escapeHTML(post.title || '未命名文章');
      const tag = escapeHTML(post.tag || '未分类');
      const date = escapeHTML(post.date || '');
      const readTime = escapeHTML(post.readTime || '');
      const excerpt = escapeHTML(post.excerpt || '');
      
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
        <span class="post-read-more">阅读全文 <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i></span>
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
  const avatarOptions = document.querySelectorAll('.avatar-option');

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

    try {
      comments = await fetchAPI('/api/comments');
    } catch (e) {
      comments = getLocalArray('fallback_comments', [
        { id: 1, nickname: 'GeekLover', avatar: '👨‍💻', website: 'https://github.com', content: '这个Bento看板设计得也太酷炫了吧！毛玻璃的模糊度和系统CPU波形图太搭配了。', date: '2026-05-19 12:30' }
      ]);
    }
    
    localStorage.setItem('fallback_comments', JSON.stringify(comments));

    guestbookComments.innerHTML = '';
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

      if (!nickname || !content) return;

      try {
        await fetchAPI('/api/comments', {
          method: 'POST',
          body: { nickname, website, avatar, content }
        });
        
        guestbookForm.reset();
        // Reset avatar status
        avatarOptions.forEach(o => o.classList.remove('active'));
        avatarOptions[0].classList.add('active');
        document.getElementById('gb-avatar-val').value = '👨‍💻';

        loadComments();
        showToast('留言发表成功', 'success');
      } catch (err) {
        showToast(`留言发表失败: ${err.message}`, 'error');
      }
    });
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
    });
  });

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
          <p>四个高级街机模式：生存构筑、Boss 弹幕、潜行劫取、连锁解谜。每局都有阶段事件、局内成长、特殊道具和最佳纪录。</p>
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
        </div>
        <div class="career-daily-card">
          <span>今日挑战</span>
          <strong id="premium-daily-challenge">加载挑战中...</strong>
          <small id="premium-daily-status">完成后解锁限定徽章</small>
        </div>
        <div class="career-achievements" id="premium-achievement-feed" aria-live="polite"></div>
      </div>
      <div class="mini-game-tabs" role="tablist" aria-label="精品小游戏选择">
        <button type="button" class="mini-game-tab active" data-premium-game="survivor">星核幸存者</button>
        <button type="button" class="mini-game-tab" data-premium-game="boss">棱镜 Boss</button>
        <button type="button" class="mini-game-tab" data-premium-game="heist">赛博潜入</button>
        <button type="button" class="mini-game-tab" data-premium-game="chain">连锁炼金</button>
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
              <span>危机 <strong id="premium-survivor-threat">WAVE 1</strong></span>
            </div>
            <div class="mini-actions">
              <button type="button" class="action-btn action-btn-primary" id="premium-survivor-start">部署 / 重开</button>
              <button type="button" class="action-btn" id="premium-survivor-pause">暂停</button>
            </div>
          </div>
          <canvas class="mini-canvas mini-canvas-wide" id="premium-survivor-canvas" width="560" height="360"></canvas>
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
              <span>闪避 <strong id="premium-boss-dash">READY</strong></span>
            </div>
            <div class="mini-actions">
              <button type="button" class="action-btn action-btn-primary" id="premium-boss-start">开战 / 重开</button>
            </div>
          </div>
          <canvas class="mini-canvas mini-canvas-wide" id="premium-boss-canvas" width="560" height="340"></canvas>
        </div>
        <div class="mini-game-panel" id="premium-heist">
          <div class="mini-game-copy">
            <h3>Cyber Heist</h3>
            <p>潜入数据金库。WASD / 方向键移动，Space 启动短暂隐身；黑入终端、绕过视野锥，偷走 4 枚密钥后撤离。</p>
            <div class="mini-stats">
              <span>密钥 <strong id="premium-heist-keys">0</strong>/4</span>
              <span>最佳 <strong id="premium-heist-best">0</strong></span>
              <span>警戒 <strong id="premium-heist-alert">LOW</strong></span>
              <span>步数 <strong id="premium-heist-steps">0</strong></span>
              <span>工具 <strong id="premium-heist-tools">CLOAK 2</strong></span>
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
            <p>点击相邻同色能量团触发连锁爆破。大连锁会生成炸弹与棱镜，30 步内完成目标分数。</p>
            <div class="mini-stats">
              <span>步数 <strong id="premium-chain-moves">30</strong></span>
              <span>分数 <strong id="premium-chain-score">0</strong></span>
              <span>最佳 <strong id="premium-chain-best">0</strong></span>
              <span>连锁 <strong id="premium-chain-combo">0</strong></span>
              <span>目标 <strong id="premium-chain-target">9000</strong></span>
            </div>
            <div class="mini-actions">
              <button type="button" class="action-btn action-btn-primary" id="premium-chain-new">重置能量场</button>
            </div>
          </div>
          <div class="memory-board chain-board" id="premium-chain-board" aria-label="连锁消除棋盘"></div>
        </div>
        <div class="premium-touch-controls" aria-label="触控街机控制器">
          <div class="premium-dpad">
            <button type="button" data-premium-control="up" aria-label="上">▲</button>
            <button type="button" data-premium-control="left" aria-label="左">◀</button>
            <button type="button" data-premium-control="right" aria-label="右">▶</button>
            <button type="button" data-premium-control="down" aria-label="下">▼</button>
          </div>
          <button type="button" class="premium-action-pad" data-premium-control="action" aria-label="动作">ACT</button>
        </div>
      </div>`;

    safeCreateIcons();

    const stage = document.getElementById('premium-game-stage');
    const title = document.getElementById('premium-active-title');
    const premiumKeys = { up: false, down: false, left: false, right: false, action: false };
    let premiumActive = 'survivor';
    const titles = {
      survivor: '星核幸存者 Starcore Survivor',
      boss: '棱镜 Boss Rush',
      heist: '赛博潜入 Cyber Heist',
      chain: '连锁炼金 Alchemy Chain',
      runner: '主线远征 Cyber Astro-Runner'
    };
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
      runner: [
        { name: 'gold', threshold: 2600 },
        { name: 'silver', threshold: 1800 },
        { name: 'bronze', threshold: 900 }
      ]
    };
    const achievementDefs = [
      { id: 'survivor_level_4', label: '星核觉醒', desc: '星核幸存者达到 4 级' },
      { id: 'survivor_90', label: '深空存活', desc: '坚持完整 90 秒' },
      { id: 'boss_phase_2', label: '棱镜破相', desc: 'Boss 进入第二阶段' },
      { id: 'boss_clear', label: '碎光终结', desc: '击破棱镜核心' },
      { id: 'heist_ghost', label: '幽影协议', desc: '成功启动隐身装置' },
      { id: 'heist_clean', label: '无声撤离', desc: '低步数完成潜入' },
      { id: 'chain_combo_9', label: '九连炼成', desc: '一次连锁爆破 9 格以上' },
      { id: 'chain_clear', label: '贤者能场', desc: '完成连锁炼金目标' },
      { id: 'runner_final', label: '星门远征', desc: '通关主线最终关' },
      { id: 'daily_clear', label: '今日制霸', desc: '完成每日街机挑战' }
    ];
    const dailyChallenges = [
      { id: 'survivor_1200', label: '星核幸存者得分 1200+', game: 'survivor', check: (game, score) => game === 'survivor' && score >= 1200 },
      { id: 'boss_900', label: '棱镜 Boss 得分 900+', game: 'boss', check: (game, score) => game === 'boss' && score >= 900 },
      { id: 'heist_700', label: '赛博潜入评分 700+', game: 'heist', check: (game, score) => game === 'heist' && score >= 700 },
      { id: 'chain_6000', label: '连锁炼金得分 6000+', game: 'chain', check: (game, score) => game === 'chain' && score >= 6000 },
      { id: 'runner_1500', label: '主线关卡评分 1500+', game: 'runner', check: (game, score) => game === 'runner' && score >= 1500 }
    ];

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

    function createDefaultCareer() {
      return {
        totalScore: 0,
        plays: 0,
        best: {},
        medals: {},
        achievements: [],
        daily: {}
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
        totalEl.textContent = `总声望 ${career.totalScore || 0}${medals ? ` · ${medals}` : ''}`;
      }
      if (challengeEl) challengeEl.textContent = daily.label;
      if (dailyStatusEl) {
        dailyStatusEl.textContent = career.daily?.date === daily.date && career.daily?.id === daily.id
          ? '今日挑战已完成'
          : '完成后解锁限定徽章';
      }
      renderAchievementFeed();
    }

    function unlockAchievement(id) {
      if (!id || career.achievements.includes(id)) return false;
      career.achievements.push(id);
      saveCareer();
      updateCareerPanel();
      return true;
    }

    function recordPremiumResult(game, score, details = {}) {
      const value = Math.max(0, Math.floor(score || 0));
      career.totalScore = Math.max(0, (career.totalScore || 0) + value);
      career.plays = (career.plays || 0) + 1;
      career.best[game] = Math.max(Number(career.best[game] || 0), value);
      const medal = medalFor(game, value);
      if ((medalRank[medal] || 0) > (medalRank[career.medals[game] || 'none'] || 0)) {
        career.medals[game] = medal;
      }
      const daily = getDailyChallenge();
      if ((!career.daily || career.daily.date !== daily.date || career.daily.id !== daily.id) && daily.check(game, value, details)) {
        career.daily = { date: daily.date, id: daily.id, done: true };
        unlockAchievement('daily_clear');
      }
      saveCareer();
      updateCareerPanel();
    }

    window.atherixArcadeCareer = {
      recordResult: recordPremiumResult,
      unlock: unlockAchievement,
      update: updateCareerPanel
    };
    updateCareerPanel();

    function focusStage() {
      if (stage) stage.focus({ preventScroll: true });
    }

    function clearPremiumKeys() {
      Object.keys(premiumKeys).forEach(key => {
        premiumKeys[key] = false;
      });
    }

    function switchPremiumGame(name) {
      premiumActive = name;
      clearPremiumKeys();
      library.querySelectorAll('[data-premium-game]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.premiumGame === name);
      });
      library.querySelectorAll('.mini-game-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `premium-${name}`);
      });
      if (title) title.textContent = titles[name];
      focusStage();
    }

    library.querySelectorAll('[data-premium-game]').forEach(btn => {
      btn.addEventListener('click', () => switchPremiumGame(btn.dataset.premiumGame));
    });

    function applyPremiumControl(control, pressed) {
      if (control === 'up') premiumKeys.up = pressed;
      if (control === 'down') premiumKeys.down = pressed;
      if (control === 'left') premiumKeys.left = pressed;
      if (control === 'right') premiumKeys.right = pressed;
      if (control === 'action') premiumKeys.action = pressed;
      if (pressed && premiumActive === 'heist') {
        if (control === 'up') moveHeist(0, -1);
        if (control === 'down') moveHeist(0, 1);
        if (control === 'left') moveHeist(-1, 0);
        if (control === 'right') moveHeist(1, 0);
        if (control === 'action') triggerHeistCloak();
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
      player: null,
      enemies: [],
      bullets: [],
      orbs: [],
      pickups: [],
      particles: []
    };

    function setSurvivorUi() {
      document.getElementById('premium-survivor-score').textContent = Math.floor(survivor.score);
      document.getElementById('premium-survivor-best').textContent = localStorage.getItem(survivor.bestKey) || '0';
      document.getElementById('premium-survivor-level').textContent = survivor.player?.level || 1;
      document.getElementById('premium-survivor-hp').textContent = Math.max(0, Math.ceil(survivor.player?.hp || 100));
      document.getElementById('premium-survivor-build').textContent = survivor.player?.build || 'Pulse I';
      document.getElementById('premium-survivor-threat').textContent = `WAVE ${Math.max(1, Math.floor(survivor.elapsed / 18000) + 1)}`;
    }

    function startSurvivor() {
      survivor.running = true;
      survivor.paused = false;
      survivor.last = performance.now();
      survivor.elapsed = 0;
      survivor.spawn = 0;
      survivor.shot = 0;
      survivor.score = 0;
      survivor.player = {
        x: 280,
        y: 180,
        r: 12,
        hp: 100,
        xp: 0,
        level: 1,
        fireRate: 240,
        damage: 18,
        bulletSpeed: 390,
        speed: 198,
        build: 'Pulse I',
        magnet: 85,
        novaCooldown: 0,
        novaFlash: 0,
        drones: 0,
        pierce: 0
      };
      survivor.enemies = [];
      survivor.bullets = [];
      survivor.orbs = [];
      survivor.pickups = [];
      survivor.particles = [];
      document.getElementById('premium-survivor-pause').textContent = '暂停';
      setSurvivorUi();
      cancelAnimationFrame(survivor.raf);
      focusStage();
      survivor.raf = requestAnimationFrame(runSurvivor);
    }

    function spawnSurvivorEnemy() {
      const c = survivor.canvas;
      const side = Math.floor(Math.random() * 4);
      const p = [
        { x: Math.random() * c.width, y: -24 },
        { x: c.width + 24, y: Math.random() * c.height },
        { x: Math.random() * c.width, y: c.height + 24 },
        { x: -24, y: Math.random() * c.height }
      ][side];
      const wave = Math.floor(survivor.elapsed / 18000);
      const type = pick(wave > 3 ? ['swarm', 'swarm', 'brute', 'charger', 'warden'] : wave > 1 ? ['swarm', 'swarm', 'brute', 'charger'] : ['swarm', 'swarm', 'brute']);
      const elite = Math.random() < Math.min(0.34, 0.08 + survivor.elapsed / 125000);
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
        hp: stats.hp * (elite ? 1.55 : 1),
        maxHp: stats.hp * (elite ? 1.55 : 1),
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

    function levelUpSurvivor() {
      const p = survivor.player;
      p.level++;
      p.xp = 0;
      const upgrade = p.level % 5;
      if (upgrade === 0) {
        p.drones++;
        p.build = `Drone ${p.drones}`;
      } else if (upgrade === 1) {
        p.pierce++;
        p.damage += 6;
        p.build = `Rail ${p.pierce + 1}`;
      } else if (upgrade === 2) {
        p.fireRate = Math.max(72, p.fireRate - 30);
        p.build = `Pulse ${p.level}`;
      } else if (upgrade === 3) {
        p.magnet += 28;
        p.speed += 12;
        p.build = 'Magnet+';
      } else {
        p.hp = Math.min(115, p.hp + 30);
        p.damage += 9;
        p.build = 'Overcharge';
      }
      if (p.level >= 4) unlockAchievement('survivor_level_4');
      survivorBurst(p.x, p.y, '#34D399', 42);
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
      if (!p || p.novaCooldown > 0) return;
      p.novaCooldown = 6200;
      p.novaFlash = 320;
      survivor.enemies.forEach(enemy => {
        const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
        if (d < 138) enemy.hp -= 95;
      });
      survivorBurst(p.x, p.y, '#BAE6FD', 68);
    }

    function finishSurvivor(text) {
      survivor.running = false;
      cancelAnimationFrame(survivor.raf);
      const finalScore = Math.floor(survivor.score + survivor.elapsed / 120);
      localStorage.setItem(survivor.bestKey, String(Math.max(Number(localStorage.getItem(survivor.bestKey) || 0), finalScore)));
      if (survivor.elapsed >= 90000) unlockAchievement('survivor_90');
      recordPremiumResult('survivor', finalScore, { elapsed: survivor.elapsed, level: survivor.player?.level || 1 });
      setSurvivorUi();
      drawSurvivor();
      overlay(survivor.ctx, survivor.canvas.width, survivor.canvas.height, text, `Score ${finalScore} · 点击部署再来一局`);
    }

    function runSurvivor(now) {
      if (!survivor.running) return;
      const dt = Math.min(34, now - survivor.last);
      survivor.last = now;
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
      if (premiumKeys.action) triggerSurvivorNova();
      let mx = (premiumKeys.right ? 1 : 0) - (premiumKeys.left ? 1 : 0);
      let my = (premiumKeys.down ? 1 : 0) - (premiumKeys.up ? 1 : 0);
      const len = Math.hypot(mx, my) || 1;
      p.x = Math.max(16, Math.min(c.width - 16, p.x + mx / len * p.speed * dt / 1000));
      p.y = Math.max(16, Math.min(c.height - 16, p.y + my / len * p.speed * dt / 1000));
      while (survivor.spawn > Math.max(210, 700 - survivor.elapsed / 130)) {
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
        const strafe = enemy.type === 'charger' ? Math.sin(enemy.pulse) * 0.85 : enemy.type === 'warden' ? Math.sin(enemy.pulse) * 0.35 : 0;
        enemy.x += (Math.cos(a) * enemy.speed + Math.cos(a + Math.PI / 2) * enemy.speed * strafe) * dt / 1000;
        enemy.y += (Math.sin(a) * enemy.speed + Math.sin(a + Math.PI / 2) * enemy.speed * strafe) * dt / 1000;
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
              survivor.score += enemy.value;
              survivor.orbs.push({ x: enemy.x, y: enemy.y, r: 6, value: enemy.value });
              if (Math.random() < (enemy.elite ? 0.42 : 0.08)) survivor.pickups.push({ x: enemy.x, y: enemy.y, r: 8, type: pick(['heal', 'bomb', 'haste']) });
              survivorBurst(enemy.x, enemy.y, enemy.color, 14);
              survivor.enemies.splice(i, 1);
            }
            break;
          }
        }
      }
      survivor.enemies = survivor.enemies.filter(enemy => {
        if (enemy.hp > 0) return true;
        survivor.orbs.push({ x: enemy.x, y: enemy.y, r: 6, value: enemy.value });
        survivorBurst(enemy.x, enemy.y, enemy.color, 18);
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
        if (item.type === 'heal') p.hp = Math.min(115, p.hp + 24);
        if (item.type === 'bomb') survivor.enemies.forEach(enemy => enemy.hp -= 72);
        if (item.type === 'haste') {
          p.fireRate = Math.max(70, p.fireRate - 12);
          p.speed += 8;
        }
        survivorBurst(item.x, item.y, item.type === 'heal' ? '#34D399' : item.type === 'bomb' ? '#F97316' : '#BAE6FD', 26);
        return false;
      });
      survivor.orbs = survivor.orbs.filter(orb => {
        if (Math.hypot(p.x - orb.x, p.y - orb.y) < p.r + orb.r) {
          p.xp += orb.value;
          survivor.score += orb.value;
          if (p.xp >= 90 + p.level * 38) {
            levelUpSurvivor();
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
      survivor.orbs.forEach(o => { ctx.fillStyle = '#FBBF24'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill(); });
      survivor.pickups.forEach(item => {
        ctx.fillStyle = item.type === 'heal' ? '#34D399' : item.type === 'bomb' ? '#F97316' : '#BAE6FD';
        ctx.beginPath();
        ctx.moveTo(item.x, item.y - 10);
        ctx.lineTo(item.x + 10, item.y);
        ctx.lineTo(item.x, item.y + 10);
        ctx.lineTo(item.x - 10, item.y);
        ctx.closePath();
        ctx.fill();
      });
      survivor.bullets.forEach(b => { ctx.fillStyle = '#BAE6FD'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); });
      survivor.enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + (e.elite ? Math.sin(e.pulse) * 2 : 0), 0, Math.PI * 2);
        ctx.fill();
        if (e.elite || e.type === 'warden') {
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2, 3);
          ctx.fillStyle = '#fff';
          ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2 * Math.max(0, e.hp / e.maxHp), 3);
        }
      });
      survivor.particles.forEach(pt => { ctx.globalAlpha = Math.max(0, pt.life / 420); ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
      const p = survivor.player || { x: 280, y: 180, r: 12, hp: 100 };
      if (p.novaFlash > 0) {
        ctx.strokeStyle = `rgba(186, 230, 253, ${p.novaFlash / 320})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 138 * (1 - p.novaFlash / 480), 0, Math.PI * 2);
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
      ctx.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2 * (p.hp / 100));
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '700 12px JetBrains Mono, monospace';
      ctx.fillText(`${Math.max(0, 90 - survivor.elapsed / 1000).toFixed(0)}s`, 14, 22);
      ctx.fillText(`NOVA ${p.novaCooldown > 0 ? Math.ceil(p.novaCooldown / 1000) : 'READY'}`, 14, 40);
    }

    document.getElementById('premium-survivor-start').addEventListener('click', startSurvivor);
    document.getElementById('premium-survivor-pause').addEventListener('click', () => {
      if (!survivor.running) return;
      survivor.paused = !survivor.paused;
      document.getElementById('premium-survivor-pause').textContent = survivor.paused ? '继续' : '暂停';
      focusStage();
    });
    setSurvivorUi();
    drawSurvivor();
    overlay(survivor.ctx, survivor.canvas.width, survivor.canvas.height, '部署星核机体', 'WASD 移动 · 自动射击 · 吸收星核升级');

    const bossMode = {
      canvas: document.getElementById('premium-boss-canvas'),
      ctx: document.getElementById('premium-boss-canvas')?.getContext('2d'),
      bestKey: 'atherix_premium_boss_best',
      running: false,
      raf: null,
      last: 0,
      t: 0,
      score: 0,
      player: { x: 280, y: 300, r: 12, lives: 3, invuln: 0, dash: 0, dashCooldown: 0, graze: 0 },
      boss: { x: 280, y: 92, r: 38, hp: 1000, maxHp: 1000, phase: 1 },
      shots: [],
      bullets: [],
      particles: [],
      shotTimer: 0,
      patternTimer: 0
    };

    function setBossUi() {
      document.getElementById('premium-boss-score').textContent = Math.floor(bossMode.score);
      document.getElementById('premium-boss-lives').textContent = bossMode.player.lives;
      document.getElementById('premium-boss-best').textContent = localStorage.getItem(bossMode.bestKey) || '0';
      document.getElementById('premium-boss-hp').textContent = `${Math.max(0, Math.ceil(bossMode.boss.hp / bossMode.boss.maxHp * 100))}%`;
      document.getElementById('premium-boss-phase').textContent = ['I', 'II', 'III'][bossMode.boss.phase - 1] || 'III';
      document.getElementById('premium-boss-dash').textContent = bossMode.player.dashCooldown > 0 ? `${Math.ceil(bossMode.player.dashCooldown / 1000)}s` : 'READY';
    }

    function startBoss() {
      bossMode.running = true;
      bossMode.last = performance.now();
      bossMode.t = 0;
      bossMode.score = 0;
      bossMode.player = { x: 280, y: 300, r: 12, lives: 3, invuln: 1000, dash: 0, dashCooldown: 0, graze: 0 };
      bossMode.boss = { x: 280, y: 92, r: 38, hp: 1000, maxHp: 1000, phase: 1 };
      bossMode.shots = [];
      bossMode.bullets = [];
      bossMode.particles = [];
      bossMode.shotTimer = 0;
      bossMode.patternTimer = 0;
      setBossUi();
      cancelAnimationFrame(bossMode.raf);
      focusStage();
      bossMode.raf = requestAnimationFrame(runBoss);
    }

    function finishBoss(text) {
      bossMode.running = false;
      cancelAnimationFrame(bossMode.raf);
      localStorage.setItem(bossMode.bestKey, String(Math.max(Number(localStorage.getItem(bossMode.bestKey) || 0), Math.floor(bossMode.score))));
      if (text === 'PRISM BROKEN') unlockAchievement('boss_clear');
      recordPremiumResult('boss', bossMode.score, { phase: bossMode.boss.phase, graze: bossMode.player.graze });
      setBossUi();
      drawBoss();
      overlay(bossMode.ctx, bossMode.canvas.width, bossMode.canvas.height, text, `Score ${Math.floor(bossMode.score)} · 点击开战再来一局`);
    }

    function bossSpark(x, y, color, count = 8) {
      for (let i = 0; i < count; i++) {
        bossMode.particles.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, r: Math.random() * 2 + 1, life: 360, color });
      }
    }

    function spawnBossPattern() {
      const b = bossMode.boss;
      const phase = b.hp < 330 ? 3 : (b.hp < 660 ? 2 : 1);
      b.phase = phase;
      if (phase >= 2) unlockAchievement('boss_phase_2');
      const pattern = pick(phase === 1 ? ['ring', 'snipe'] : phase === 2 ? ['ring', 'snipe', 'rain'] : ['ring', 'snipe', 'rain', 'sweep']);
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
    }

    function runBoss(now) {
      if (!bossMode.running) return;
      const dt = Math.min(34, now - bossMode.last);
      bossMode.last = now;
      const p = bossMode.player;
      const b = bossMode.boss;
      bossMode.t += dt;
      bossMode.shotTimer += dt;
      bossMode.patternTimer += dt;
      p.invuln = Math.max(0, p.invuln - dt);
      p.dash = Math.max(0, p.dash - dt);
      p.dashCooldown = Math.max(0, p.dashCooldown - dt);
      const speed = p.dash > 0 ? 410 : 225;
      p.x = clamp(p.x + ((premiumKeys.right ? 1 : 0) - (premiumKeys.left ? 1 : 0)) * speed * dt / 1000, 16, bossMode.canvas.width - 16);
      p.y = clamp(p.y + ((premiumKeys.down ? 1 : 0) - (premiumKeys.up ? 1 : 0)) * speed * 0.72 * dt / 1000, 178, bossMode.canvas.height - 18);
      if (premiumKeys.action && p.dashCooldown <= 0) {
        p.dash = 210;
        p.dashCooldown = 1150;
        p.invuln = Math.max(p.invuln, 280);
        bossSpark(p.x, p.y, '#34D399', 16);
      }
      b.x = bossMode.canvas.width / 2 + Math.sin(bossMode.t / 850) * 130;
      b.y = 84 + Math.sin(bossMode.t / 520) * 18;
      if (bossMode.shotTimer > 88) {
        bossMode.shotTimer = 0;
        bossMode.shots.push({ x: p.x, y: p.y - 16, vy: -470, r: 4, damage: 9 + Math.floor(p.graze / 9) });
      }
      if (bossMode.patternTimer > Math.max(520, 1150 - b.phase * 170)) {
        bossMode.patternTimer = 0;
        spawnBossPattern();
      }
      bossMode.shots.forEach(s => s.y += s.vy * dt / 1000);
      bossMode.bullets.forEach(s => { s.x += s.vx * dt / 1000; s.y += s.vy * dt / 1000; });
      bossMode.particles.forEach(pt => { pt.x += pt.vx * dt / 1000; pt.y += pt.vy * dt / 1000; pt.life -= dt; });
      bossMode.particles = bossMode.particles.filter(pt => pt.life > 0);
      bossMode.shots = bossMode.shots.filter(s => s.y > -20);
      bossMode.bullets = bossMode.bullets.filter(s => s.x > -40 && s.x < bossMode.canvas.width + 40 && s.y > -40 && s.y < bossMode.canvas.height + 40);
      bossMode.shots = bossMode.shots.filter(s => {
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
          p.graze++;
          bossMode.score += 18;
        }
        if (p.invuln <= 0 && Math.hypot(s.x - p.x, s.y - p.y) < s.r + p.r) {
          p.lives--;
          p.invuln = 1400;
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
      bossMode.shots.forEach(s => { ctx.fillStyle = '#BAE6FD'; ctx.fillRect(s.x - 2, s.y - 8, 4, 12); });
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
      ctx.fillText(`PHASE ${b.phase}  GRAZE ${p.graze}`, 18, 42);
    }

    document.getElementById('premium-boss-start').addEventListener('click', startBoss);
    setBossUi();
    drawBoss();
    overlay(bossMode.ctx, bossMode.canvas.width, bossMode.canvas.height, '棱镜核心等待挑战', 'A/D 移动 · Space 冲刺无敌 · 自动射击');

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
      terminals: [],
      doors: [],
      collected: 0,
      steps: 0,
      cloaks: 2,
      cloakTurns: 0,
      alert: 'LOW',
      won: false
    };

    function setHeistUi() {
      document.getElementById('premium-heist-keys').textContent = heist.collected;
      document.getElementById('premium-heist-best').textContent = localStorage.getItem(heist.bestKey) || '0';
      document.getElementById('premium-heist-steps').textContent = heist.steps;
      document.getElementById('premium-heist-tools').textContent = heist.cloakTurns > 0 ? `GHOST ${heist.cloakTurns}` : `CLOAK ${heist.cloaks}`;
      const alertEl = document.getElementById('premium-heist-alert');
      alertEl.textContent = heist.alert;
      alertEl.style.color = heist.alert === 'HIGH' ? '#EF4444' : (heist.alert === 'MID' ? '#FBBF24' : '#34D399');
    }

    function newHeist() {
      heist.grid = Array.from({ length: 13 }, (_, y) => Array.from({ length: 20 }, (_, x) => (x === 0 || y === 0 || x === 19 || y === 12 || (x % 4 === 0 && y % 3 !== 1)) ? 1 : 0));
      heist.player = { x: 1, y: 1 };
      heist.keys = [{ x: 5, y: 2 }, { x: 10, y: 5 }, { x: 15, y: 3 }, { x: 13, y: 10 }];
      heist.exit = { x: 18, y: 11 };
      heist.guards = [
        { x: 7, y: 8, dir: 1, axis: 'x', min: 5, max: 11, cone: 3 },
        { x: 16, y: 7, dir: -1, axis: 'y', min: 3, max: 10, cone: 4 },
        { x: 2, y: 10, dir: 1, axis: 'x', min: 2, max: 8, cone: 3 },
        { x: 11, y: 2, dir: 1, axis: 'y', min: 2, max: 7, cone: 2 }
      ];
      heist.terminals = [{ x: 3, y: 5, used: false }, { x: 17, y: 9, used: false }];
      heist.doors = [{ x: 9, y: 8, open: false }, { x: 12, y: 4, open: false }];
      heist.collected = 0;
      heist.steps = 0;
      heist.cloaks = 2;
      heist.cloakTurns = 0;
      heist.alert = 'LOW';
      heist.won = false;
      setHeistUi();
      focusStage();
      drawHeist();
    }

    function heistTileBlocked(x, y) {
      return !heist.grid[y] ||
        heist.grid[y][x] === 1 ||
        heist.doors.some(door => !door.open && door.x === x && door.y === y);
    }

    function heistVisionReach(g) {
      for (let i = 1; i <= g.cone; i++) {
        const x = g.axis === 'x' ? g.x + g.dir * i : g.x;
        const y = g.axis === 'y' ? g.y + g.dir * i : g.y;
        if (heistTileBlocked(x, y)) return i - 1;
      }
      return g.cone;
    }

    function guardSeesPlayer(g) {
      if (heist.cloakTurns > 0) return false;
      const dx = heist.player.x - g.x;
      const dy = heist.player.y - g.y;
      if (g.axis === 'x') {
        const forwardDistance = dx * g.dir;
        if (forwardDistance <= 0 || forwardDistance > g.cone || Math.abs(dy) > 1) return false;
        return forwardDistance <= heistVisionReach(g);
      }
      const forwardDistance = dy * g.dir;
      if (forwardDistance <= 0 || forwardDistance > g.cone || Math.abs(dx) > 1) return false;
      return forwardDistance <= heistVisionReach(g);
    }

    function triggerHeistCloak() {
      if (premiumActive !== 'heist' || heist.won || heist.cloakTurns > 0 || heist.cloaks <= 0) return;
      heist.cloaks--;
      heist.cloakTurns = 4;
      heist.alert = 'GHOST';
      unlockAchievement('heist_ghost');
      setHeistUi();
      drawHeist();
    }

    function moveHeist(dx, dy) {
      if (premiumActive !== 'heist' || heist.won) return;
      const nx = heist.player.x + dx;
      const ny = heist.player.y + dy;
      if (!heist.grid[ny] || heist.grid[ny][nx]) return;
      if (heist.doors.some(door => !door.open && door.x === nx && door.y === ny)) return;
      heist.player = { x: nx, y: ny };
      heist.steps++;
      heist.cloakTurns = Math.max(0, heist.cloakTurns - 1);
      heist.guards.forEach(g => {
        g[g.axis] += g.dir;
        if (g[g.axis] < g.min || g[g.axis] > g.max) {
          g.dir *= -1;
          g[g.axis] += g.dir * 2;
        }
      });
      heist.keys = heist.keys.filter(k => {
        const got = k.x === heist.player.x && k.y === heist.player.y;
        if (got) heist.collected++;
        return !got;
      });
      heist.terminals.forEach(t => {
        if (!t.used && t.x === heist.player.x && t.y === heist.player.y) {
          t.used = true;
          const door = heist.doors.find(d => !d.open);
          if (door) door.open = true;
          heist.cloaks = Math.min(3, heist.cloaks + 1);
        }
      });
      const seen = heist.guards.some(guardSeesPlayer);
      heist.alert = heist.cloakTurns > 0 ? 'GHOST' : seen ? 'HIGH' : (heist.guards.some(g => Math.abs(g.x - heist.player.x) + Math.abs(g.y - heist.player.y) <= 4) ? 'MID' : 'LOW');
      if (heist.guards.some(g => g.x === heist.player.x && g.y === heist.player.y) || seen) {
        heist.collected = Math.max(0, heist.collected - 1);
        heist.player = { x: 1, y: 1 };
        heist.cloakTurns = 0;
        heist.alert = 'HIGH';
      }
      if (heist.collected >= 4 && heist.player.x === heist.exit.x && heist.player.y === heist.exit.y) {
        heist.won = true;
        const score = Math.max(100, 1200 - heist.steps * 18);
        localStorage.setItem(heist.bestKey, String(Math.max(Number(localStorage.getItem(heist.bestKey) || 0), score)));
        if (heist.steps <= 42) unlockAchievement('heist_clean');
        recordPremiumResult('heist', score, { steps: heist.steps });
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
      heist.keys.forEach(k => { ctx.fillStyle = '#FBBF24'; ctx.beginPath(); ctx.arc(k.x * tile + 14, k.y * tile + 14, 7, 0, Math.PI * 2); ctx.fill(); });
      heist.guards.forEach(g => {
        const reach = heistVisionReach(g);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
        ctx.beginPath();
        ctx.arc(g.x * tile + 14, g.y * tile + 14, tile * Math.max(1.25, reach * 0.72), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
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
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(g.x * tile + 6, g.y * tile + 6, 16, 16);
      });
      ctx.fillStyle = heist.cloakTurns > 0 ? '#A78BFA' : '#06B6D4';
      ctx.fillRect(heist.player.x * tile + 5, heist.player.y * tile + 5, 18, 18);
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
      target: 9000,
      finished: false,
      recorded: false
    };

    function randomChainCell() {
      const roll = Math.random();
      if (roll < 0.035) return 'bomb';
      if (roll < 0.06) return 'prism';
      return chain.colors[Math.floor(Math.random() * chain.colors.length)];
    }

    function newChain() {
      chain.score = 0;
      chain.moves = 30;
      chain.combo = 0;
      chain.finished = false;
      chain.recorded = false;
      chain.grid = Array.from({ length: 7 }, () => Array.from({ length: 7 }, randomChainCell));
      chain.grid[2][2] = 'cyan';
      chain.grid[2][3] = 'cyan';
      chain.grid[2][4] = 'cyan';
      chain.grid[3][3] = 'bomb';
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

    function collectChainBlast(r, c, kind) {
      const cells = new Set();
      if (kind === 'bomb') {
        for (let y = r - 1; y <= r + 1; y++) {
          for (let x = c - 1; x <= c + 1; x++) {
            if (y >= 0 && x >= 0 && y < 7 && x < 7) cells.add(`${y},${x}`);
          }
        }
      } else {
        const color = pick(chain.colors);
        chain.grid.forEach((row, rowIndex) => row.forEach((value, colIndex) => {
          if (value === color) cells.add(`${rowIndex},${colIndex}`);
        }));
      }
      return [...cells];
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
          recordPremiumResult('chain', chain.score, { movesLeft: chain.moves, combo: chain.combo });
        }
      }
    }

    function popChain(r, c) {
      if (chain.moves <= 0 || chain.finished) return;
      const value = chain.grid[r][c];
      const group = value === 'bomb' || value === 'prism' ? collectChainBlast(r, c, value) : [...floodChain(r, c, value)];
      if (group.length < 3) {
        chain.combo = 0;
        renderChain();
        return;
      }
      chain.moves--;
      chain.combo = group.length;
      if (group.length >= 9) unlockAchievement('chain_combo_9');
      chain.score += group.length * group.length * (value === 'bomb' || value === 'prism' ? 18 : 12);
      group.forEach(item => {
        const [row, col] = item.split(',').map(Number);
        chain.grid[row][col] = null;
      });
      if (group.length >= 7) {
        const [row, col] = group[0].split(',').map(Number);
        chain.grid[row][col] = group.length >= 11 ? 'prism' : 'bomb';
      }
      settleChain();
      finishChainIfNeeded();
      renderChain();
    }

    function renderChain() {
      chain.board.innerHTML = '';
      chain.grid.forEach((row, r) => row.forEach((color, c) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `chain-cell chain-${color}`;
        btn.setAttribute('aria-label', color === 'bomb' ? '爆裂核心' : color === 'prism' ? '棱镜核心' : `${color} 能量`);
        btn.addEventListener('click', () => popChain(r, c));
        chain.board.appendChild(btn);
      }));
      document.getElementById('premium-chain-moves').textContent = chain.moves;
      document.getElementById('premium-chain-score').textContent = chain.score;
      document.getElementById('premium-chain-best').textContent = localStorage.getItem(chain.bestKey) || '0';
      document.getElementById('premium-chain-combo').textContent = chain.combo;
      document.getElementById('premium-chain-target').textContent = chain.score >= chain.target ? 'CLEAR' : chain.target;
      chain.board.classList.toggle('chain-cleared', chain.finished && chain.score >= chain.target);
    }

    document.getElementById('premium-chain-new').addEventListener('click', newChain);
    newChain();

    window.addEventListener('keydown', (e) => {
      if (!isGameSectionActive() || isEditableTarget(e.target) || !document.activeElement?.closest?.('#premium-game-stage')) return;
      const codes = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'];
      if (!codes.includes(e.code)) return;
      e.preventDefault();
      if (e.code === 'ArrowUp' || e.code === 'KeyW') premiumKeys.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') premiumKeys.down = true;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') premiumKeys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') premiumKeys.right = true;
      if (e.code === 'Space') premiumKeys.action = true;
      if (premiumActive === 'heist') {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') moveHeist(0, -1);
        if (e.code === 'ArrowDown' || e.code === 'KeyS') moveHeist(0, 1);
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveHeist(-1, 0);
        if (e.code === 'ArrowRight' || e.code === 'KeyD') moveHeist(1, 0);
        if (e.code === 'Space') triggerHeistCloak();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') premiumKeys.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') premiumKeys.down = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') premiumKeys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') premiumKeys.right = false;
      if (e.code === 'Space') premiumKeys.action = false;
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
  const gameRestartBtn = document.getElementById('game-restart-btn');
  const gameTimerSpan = document.getElementById('game-timer');
  const gameCoinsSpan = document.getElementById('game-coins');
  const gameBestTimeSpan = document.getElementById('game-best-time');

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
  const btnBgmLed = document.getElementById('btn-bgm-led');
  const joystickShaft = document.getElementById('joystick-shaft');

  const gameCtx = arcadeCanvas ? arcadeCanvas.getContext('2d') : null;
  let currentLevelIndex = 0;
  let targetCoins = 5;
  let levelWidth = 1600;
  let gameStartTime = 0;
  let statusTimeoutId = null;

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
      get player() {
        return { ...player };
      },
      gameRunning: () => gameRunning
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
    const gameControlCodes = ['Space', 'Enter', 'KeyW', 'KeyA', 'KeyD', 'KeyK', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
    const isGameControlKey = gameControlCodes.includes(e.code);
    const gameIsActive = isGameSectionActive();
    const miniGameHasFocus = isMiniGameFocus();

    if (gameIsActive && isGameControlKey && !isEditableTarget(e.target) && !miniGameHasFocus) {
      e.preventDefault();
      e.stopPropagation();
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
    if (isGameSectionActive() && !isEditableTarget(e.target) && !isMiniGameFocus() && ['Space', 'Enter', 'KeyW', 'KeyA', 'KeyD', 'KeyK', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
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
    gameRunning = true;
    setGameStatus('CHECKPOINT', '#A78BFA');
    if (musicSelect && musicSelect.value !== 'mute') startMusic();
    updateGame();
  }

  function triggerWin() {
    gameRunning = false;
    playArcadeSound('win');
    cancelAnimationFrame(gameLoopId);
    stopMusic();

    const finishTime = ((Date.now() - gameStartTime) / 1000).toFixed(1);
    
    const bestLvlTime = localStorage.getItem(`atherix_astro_runner_best_lvl_${currentLevelIndex}`);
    if (!bestLvlTime || parseFloat(finishTime) < parseFloat(bestLvlTime)) {
      localStorage.setItem(`atherix_astro_runner_best_lvl_${currentLevelIndex}`, finishTime);
      if (gameBestTimeSpan) gameBestTimeSpan.textContent = `${finishTime}s`;
    }
    const campaignScore = Math.max(120, Math.round(2200 - parseFloat(finishTime) * 24 + currentLevelIndex * 260 + player.shield * 80));
    if (window.atherixArcadeCareer) {
      window.atherixArcadeCareer.recordResult('runner', campaignScore, {
        level: currentLevelIndex + 1,
        finishTime: parseFloat(finishTime)
      });
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
        } else {
          player.dashReady = true;
          player.dashCooldownUntil = 0;
          setGameStatus('DASH READY', '#60A5FA');
          createParticleExplosion(powerUp.x + powerUp.w / 2, powerUp.y + powerUp.h / 2, '#60A5FA', 18);
          playArcadeSound('dash');
        }
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
      gameTimerSpan.textContent = ((Date.now() - gameStartTime) / 1000).toFixed(1);
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
  };

  function startLevel() {
    gameRunning = false;
    cancelAnimationFrame(gameLoopId);
    cancelAnimationFrame(deathAnimationId);
    stopMusic();
    releaseArcadeButtonFocus();
    resetGameKeyState();

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
    btnJumpLed.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (gameRunning) {
        triggerPlayerJump();
        if (joystickShaft) joystickShaft.style.transform = 'translate(0, -6px)';
      } else {
        startLevel();
      }
      releaseArcadeButtonFocus();
    });
    btnJumpLed.addEventListener('mouseup', () => {
      if (joystickShaft) joystickShaft.style.transform = 'translate(0, 0)';
    });
    btnJumpLed.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (gameRunning) {
        triggerPlayerJump();
        if (joystickShaft) joystickShaft.style.transform = 'translate(0, -6px)';
      } else {
        startLevel();
      }
      releaseArcadeButtonFocus();
    });
    btnJumpLed.addEventListener('touchend', () => {
      if (joystickShaft) joystickShaft.style.transform = 'translate(0, 0)';
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
      if (!runOverlayAction() && !gameRunning) startLevel();
      releaseArcadeButtonFocus();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
      btnStartLed.addEventListener(type, () => setRunnerTouchButtonState(btnStartLed, false));
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

  if (btnBgmLed) {
    btnBgmLed.addEventListener('click', () => {
      if (musicSelect) {
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
      }
    });
  }

  if (gameLauncherCard) {
    gameLauncherCard.addEventListener('click', () => {
      navigateTo('game');
    });
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
