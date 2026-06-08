// db.js - SQLite Database Initialization and Configuration
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(process.env.DB_PATH || path.join(__dirname, 'blog.db'));
const dbDir = path.dirname(dbPath);
const isProduction = process.env.NODE_ENV === 'production';
const dbStatus = {
  connected: false,
  ready: false,
  error: null,
  lastCheckedAt: null
};

function passwordComplexityScore(password) {
  return [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length;
}

function isUnsafeAdminPassword(password, username = 'admin') {
  const value = String(password || '').trim();
  const normalized = value.toLowerCase();
  const normalizedUser = String(username || '').trim().toLowerCase();
  return value.length < 12 ||
    passwordComplexityScore(value) < 3 ||
    (normalizedUser && normalized === normalizedUser) ||
    normalized.includes('replace-with') ||
    normalized.includes('change-me') ||
    normalized.includes('changeme') ||
    [
      'admin',
      'admin123',
      'password',
      'password123',
      'your-password',
      'test-password'
    ].includes(normalized);
}

if (isProduction && process.env.ADMIN_PASSWORD && isUnsafeAdminPassword(process.env.ADMIN_PASSWORD, process.env.ADMIN_USERNAME || 'admin')) {
  throw new Error('ADMIN_PASSWORD must be a non-placeholder production password with at least 12 characters and mixed character classes.');
}

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

function rememberDbError(err) {
  if (!err) return;
  dbStatus.ready = false;
  dbStatus.error = err.message || String(err);
}

function markDbReady() {
  dbStatus.connected = true;
  dbStatus.ready = true;
  dbStatus.error = null;
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    rememberDbError(err);
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    dbStatus.connected = true;
    console.log('Connected to the SQLite database blog.db');
  }
});

try {
  db.configure('busyTimeout', 5000);
} catch (err) {
  rememberDbError(err);
}

function dbHealthSnapshot() {
  return {
    connected: dbStatus.connected,
    ready: dbStatus.ready,
    lastCheckedAt: dbStatus.lastCheckedAt,
    error: dbStatus.error
  };
}

function healthCheck(callback) {
  dbStatus.lastCheckedAt = new Date().toISOString();
  let settled = false;
  const finish = (err, snapshot) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    callback(err, snapshot);
  };
  const timer = setTimeout(() => {
    const err = new Error('SQLite health query timed out.');
    rememberDbError(err);
    finish(err, dbHealthSnapshot());
  }, 1500);
  db.get('SELECT 1 AS ok', (err, row) => {
    if (err || row?.ok !== 1) {
      rememberDbError(err || new Error('SQLite health query failed.'));
      finish(err || new Error('SQLite health query failed.'), dbHealthSnapshot());
      return;
    }
    markDbReady();
    finish(null, dbHealthSnapshot());
  });
}

function closeGracefully(callback = () => {}) {
  db.close((err) => {
    if (err) {
      rememberDbError(err);
      callback(err);
      return;
    }
    dbStatus.connected = false;
    dbStatus.ready = false;
    callback(null);
  });
}

// Run database migrations/initialization sequentially
db.serialize(() => {
  db.run('PRAGMA busy_timeout = 5000', rememberDbError);
  db.run('PRAGMA journal_mode = WAL', rememberDbError);
  db.run('PRAGMA foreign_keys = ON', rememberDbError);

  // 1. Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL
    )
  `);

  // Seed admin user if none exists. Development keeps the old convenience
  // default, while production requires explicit ADMIN_PASSWORD.
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) {
      console.error('Error checking users:', err);
    } else if (row.count === 0) {
      const defaultPasswordAllowed = !isProduction;
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || (defaultPasswordAllowed ? 'admin123' : '');
      if (!adminPassword) {
        console.warn('Skipping admin seed: set ADMIN_PASSWORD before first production deployment.');
        return;
      }
      if (isProduction && isUnsafeAdminPassword(adminPassword, adminUsername)) {
        throw new Error('Refusing to seed production admin user with an unsafe ADMIN_PASSWORD.');
      }
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(adminPassword, salt);
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', [adminUsername, hash], (err) => {
        if (err) console.error('Error seeding admin user:', err);
        else if (defaultPasswordAllowed && !process.env.ADMIN_PASSWORD) {
          console.log('Seeded development admin user (admin / admin123). Set ADMIN_PASSWORD before deployment.');
        } else {
          console.log(`Successfully seeded admin user "${adminUsername}".`);
        }
      });
    }
  });

  // 2. Posts Table
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      excerpt TEXT,
      content TEXT NOT NULL,
      tag TEXT,
      date TEXT,
      readTime TEXT,
      pinned INTEGER DEFAULT 0
    )
  `);

  // Seed mock blog posts if empty
  db.get('SELECT COUNT(*) as count FROM posts', (err, row) => {
    if (err) {
      console.error('Error checking posts count:', err);
    } else if (row.count === 0) {
      const mockPosts = [
        {
          id: 'post-1',
          title: '如何构建一个极速的无框架博客？',
          excerpt: '探索现代原生 Web API 的潜能，摆脱重度前端框架依赖，打造秒开的个人网站性能体验。',
          content: `# 如何构建一个极速的无框架博客？\n\n在现代 Web 开发中，我们经常陷入“框架过载”的境地。为了展示几篇文字和几个交互组件，我们常常打包数百 KB 甚至数 MB 的 JavaScript 代码。\n\n本篇文章将探讨如何回归初心，利用原生 Web 技术的卓越性能，打造极致速度的个人数字花园。\n\n## 为什么选择无框架？\n\n1. **零构建步骤**：你可以直接用文本编辑器编写 HTML、CSS 和 JS，在任何浏览器中双击即可运行。\n2. **瞬时加载 (Instant Load)**：没有复杂的运行时加载、虚拟 DOM 对比或巨大的第三方库。Lighthouse 性能评分轻松拉满 100 分。\n3. **极佳的可读性与复古情怀**：代码干净纯粹，对搜索引擎爬虫极度友好，维护生命周期几乎是无限的。\n\n## 核心技术选型\n\n要实现极致的无框架体验，我们可以依赖以下现代 Web 标准：\n\n- **CSS Grid & Custom Properties (变量)**：轻松解决复杂布局和暗黑模式切换。\n- **Vanilla ES6 JavaScript**：用于局部路由管理、交互式小工具及数据同步。\n- **Lucide Icons**：矢量化、轻量级的图标管理方案。\n\n\`\`\`javascript\n// 极简的原生路由实现\nfunction navigateTo(routeId) {\n  document.querySelectorAll('.view-section').forEach(sec => {\n    sec.classList.remove('active');\n  });\n  const target = document.getElementById(routeId);\n  if (target) target.classList.add('active');\n}\n\`\`\`\n\n## 结论\n\n无框架并不是倒退，而是一种对性能、掌控力以及环保编码（Green Coding）的追求。欢迎你在我的工具箱里尝试这些纯原生开发的实用组件！`,
          tag: '前端开发',
          date: '2026-05-18',
          readTime: '6 分钟阅读',
          pinned: 1
        },
        {
          id: 'post-2',
          title: '基于 Web Audio API 实现沉浸式白噪音生成器',
          excerpt: '深入了解浏览器音频接口，不依赖音频文件也能实时合成雨声、风声和 Lofi 合成器背景音。',
          content: `# 基于 Web Audio API 实现沉浸式白噪音生成器\n\n在我们的番茄钟和音乐播放器中，你可能会注意到好听的雨声和伴奏。其实，这些音效很多不需要通过加载大型 MP3 文件来播放。我们可以直接在浏览器中利用 Web Audio API 合成它们！\n\n## 什么是 Web Audio API？\n\nWeb Audio API 是浏览器提供的一个高级音频处理系统，允许开发者在音频上下文中创建音频源、添加音效节点（如滤波器、延迟器、空间化器），并将最终音轨输出到扬声器。\n\n## 如何生成“雨声”（粉色噪音 + 滤波器）\n\n雨声本质上接近于**粉色噪音 (Pink Noise)**，并辅以随机的低频振荡来模拟雷声或大雨滴。\n\n### 1. 粉色噪音的合成算法\n\n粉色噪音的频谱随着频率的增加而衰减（每倍频程衰减3分贝）。我们可以用一段白噪音，通过特殊滤波器进行处理：\n\n\`\`\`javascript\nconst audioCtx = new (window.AudioContext || window.webkitAudioContext)();\nconst bufferSize = 2 * audioCtx.sampleRate;\nconst noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);\nconst output = noiseBuffer.getChannelData(0);\n\nlet b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;\nfor (let i = 0; i < bufferSize; i++) {\n  const white = Math.random() * 2 - 1;\n  b0 = 0.99886 * b0 + white * 0.0555179;\n  b1 = 0.99332 * b1 + white * 0.0750759;\n  b2 = 0.96900 * b2 + white * 0.1538520;\n  b3 = 0.86650 * b3 + white * 0.3104856;\n  b4 = 0.55000 * b4 + white * 0.5329522;\n  b5 = -0.7616 * b5 - white * 0.0168980;\n  output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;\n  output[i] *= 0.11; // 调整音量平衡\n  b6 = white * 0.115926;\n}\n\`\`\`\n\n有了这段噪音缓存，我们只需用 \`AudioBufferSourceNode\` 循环播放它，并用 \`BiquadFilterNode\` 设置一个低通滤波，就能模仿出雨滴击打在窗户上的柔和声音。\n\n## 总结\n\n利用 Web API 合成声音不仅节省带宽，还能让声音产生无穷的变化而不重复。在我的番茄钟里，我已经内置了这种合成机制，快去体验一下吧！`,
          tag: '黑客技术',
          date: '2026-05-15',
          readTime: '8 分钟阅读',
          pinned: 1
        },
        {
          id: 'post-3',
          title: 'Canvas 客户端图像压缩的原理与实战',
          excerpt: '探讨如何直接在前端对上传的 PNG/JPEG 进行高效压缩并转换为 WebP 格式，减小后端存储负担。',
          content: `# Canvas 客户端图像压缩的原理与实战\n\n在这个充满高分辨率照片的时代，将几兆大小的图片直接上传到服务器会消耗极大的带宽与存储。为了优化，我们应该在前端对图片先进行一层“预压缩”。\n\n本博客将详解本站“图片 WebP 压缩”工具的核心算法。\n\n## Canvas 图像绘制与读取\n\n压缩的第一步是将用户上传的 File 对象转换为 \`HTMLImageElement\`，并绘制到 \`<canvas>\` 画布上。\n\n\`\`\`javascript\nconst img = new Image();\nimg.src = URL.createObjectURL(file);\nimg.onload = () => {\n  const canvas = document.createElement('canvas');\n  const ctx = canvas.getContext('2d');\n  \n  // 可以根据需要缩放宽高\n  canvas.width = img.naturalWidth;\n  canvas.height = img.naturalHeight;\n  \n  ctx.drawImage(img, 0, 0);\n};\n\`\`\`\n\n## 压缩并转为 WebP\n\nCanvas 提供了一个极其强大的 API：\`toDataURL(type, encoderOptions)\` 或 \`toBlob(callback, type, encoderOptions)\`。\n\n- **type**：目标格式（推荐使用 \`image/webp\`，体积比 JPEG/PNG 小很多）。\n- **encoderOptions**：压缩质量数值，范围从 0.0 到 1.0。\n\n\`\`\`javascript\ncanvas.toBlob((blob) => {\n  // blob 即为压缩后的二进制图片数据\n  const compressedUrl = URL.createObjectURL(blob);\n  // 可提供下载或直接上传\n}, 'image/webp', 0.8); // 0.8 代表 80% 质量\n\`\`\`\n\n## 跨浏览器支持与性能调优\n\n通过这个机制，本站的工具能帮您瞬间将 3MB 的大图压缩到 200KB 左右，且视觉上几乎没有无损压缩痕迹！`,
          tag: '前端开发',
          date: '2026-05-10',
          readTime: '5 分钟阅读',
          pinned: 0
        }
      ];

      const stmt = db.prepare('INSERT INTO posts (id, title, excerpt, content, tag, date, readTime, pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      mockPosts.forEach(post => {
        stmt.run(post.id, post.title, post.excerpt, post.content, post.tag, post.date, post.readTime, post.pinned);
      });
      stmt.finalize();
      console.log('Successfully seeded initial blog posts.');
    }
  });

  // 3. Projects Table
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      desc TEXT,
      tag TEXT,
      tags TEXT,
      img TEXT,
      pain TEXT,
      solution TEXT,
      github TEXT,
      live TEXT
    )
  `);

  // Seed mock projects if empty
  db.get('SELECT COUNT(*) as count FROM projects', (err, row) => {
    if (err) {
      console.error('Error checking projects count:', err);
    } else if (row.count === 0) {
      const mockProjects = [
        {
          id: 'proj-1',
          title: 'Atherix System Bento Dashboard',
          desc: '基于微光玻璃态风格设计的个人主页看板，包含系统指标可视化、白噪音播放器等丰富微交互。',
          tag: 'UI/UX设计',
          tags: JSON.stringify(['Vanilla JS', 'Bento Grid', 'CSS variables', 'SVG Graph']),
          img: '/assets/project-bento-dashboard.webp',
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
          tags: JSON.stringify(['HTML5 Canvas', 'WebP encoder', 'Drag & Drop API']),
          img: '/assets/project-webp-converter.webp',
          pain: '常用图片压缩网站要么限制上传大小，要么需要将敏感图片上传到第三方服务器，存在泄露隐私隐患。',
          solution: '在浏览器中使用 Canvas API 完成无损/有损缩放，并以 image/webp 进行二次编码，全程在用户本地沙箱环境内运行，隐私安全率 100%。',
          github: 'https://github.com',
          live: '#'
        },
        {
          id: 'proj-3',
          title: 'Interactive Focus Noise Synthesizer',
          desc: '番茄工作钟与 Web Audio 合成器组合，实时生成雨声、Lofi 与深空氛围，不依赖大型音频文件。',
          tag: '黑客技术',
          tags: JSON.stringify(['Web Audio API', 'Focus Timer', 'Synth UI']),
          img: '/assets/project-focus-synth.webp',
          pain: '普通专注工具只有单调倒计时，外链音频又容易加载失败、循环突兀，还会拖慢首屏体验。',
          solution: '使用浏览器原生音频节点合成连续氛围声，并把计时、状态和本地偏好保存整合到同一套轻量交互里。',
          github: 'https://github.com',
          live: '#'
        },
        {
          id: 'proj-4',
          title: 'Atherix Premium Arcade Suite',
          desc: '七款精品浏览器小游戏，带生涯成长、每日挑战、奖牌路线、触控/键盘/手柄输入和沉浸反馈系统。',
          tag: '前端开发',
          tags: JSON.stringify(['Canvas Games', 'Gamepad Input', 'PWA Ready', 'Arcade UX']),
          img: '/assets/project-arcade-suite.webp',
          pain: '多数个人站小游戏只是玩具原型，缺少长期目标、移动端控制、反馈手感与可复查的稳定性保障。',
          solution: '把跑酷、幸存者、Boss Rush、漂移、潜入、连锁和战术玩法统一到街机生涯系统里，并用 smoke 测试覆盖核心玩法路径。',
          github: 'https://github.com',
          live: 'https://dadaguai6686.github.io/#game'
        }
      ];

      const stmt = db.prepare('INSERT INTO projects (id, title, desc, tag, tags, img, pain, solution, github, live) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      mockProjects.forEach(proj => {
        stmt.run(proj.id, proj.title, proj.desc, proj.tag, proj.tags, proj.img, proj.pain, proj.solution, proj.github, proj.live);
      });
      stmt.finalize();
      console.log('Successfully seeded initial projects.');
    } else {
      db.run(
        "UPDATE projects SET img = ? WHERE id = 'proj-1' AND img LIKE 'https://images.unsplash.com/%'",
        ['/assets/project-bento-dashboard.webp']
      );
      db.run(
        "UPDATE projects SET img = ? WHERE id = 'proj-2' AND img LIKE 'https://images.unsplash.com/%'",
        ['/assets/project-webp-converter.webp']
      );
      db.run(
        `UPDATE projects
         SET title = ?, desc = ?, tag = ?, tags = ?, img = ?, pain = ?, solution = ?, github = ?, live = ?
         WHERE id = 'proj-3'
           AND (title = 'Interactive Pomodoro & Noise Synthesizer' OR img LIKE 'https://images.unsplash.com/%')`,
        [
          'Interactive Focus Noise Synthesizer',
          '番茄工作钟与 Web Audio 合成器组合，实时生成雨声、Lofi 与深空氛围，不依赖大型音频文件。',
          '黑客技术',
          JSON.stringify(['Web Audio API', 'Focus Timer', 'Synth UI']),
          '/assets/project-focus-synth.webp',
          '普通专注工具只有单调倒计时，外链音频又容易加载失败、循环突兀，还会拖慢首屏体验。',
          '使用浏览器原生音频节点合成连续氛围声，并把计时、状态和本地偏好保存整合到同一套轻量交互里。',
          'https://github.com',
          '#'
        ]
      );
      db.run(
        `INSERT OR IGNORE INTO projects (id, title, desc, tag, tags, img, pain, solution, github, live)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'proj-4',
          'Atherix Premium Arcade Suite',
          '七款精品浏览器小游戏，带生涯成长、每日挑战、奖牌路线、触控/键盘/手柄输入和沉浸反馈系统。',
          '前端开发',
          JSON.stringify(['Canvas Games', 'Gamepad Input', 'PWA Ready', 'Arcade UX']),
          '/assets/project-arcade-suite.webp',
          '多数个人站小游戏只是玩具原型，缺少长期目标、移动端控制、反馈手感与可复查的稳定性保障。',
          '把跑酷、幸存者、Boss Rush、漂移、潜入、连锁和战术玩法统一到街机生涯系统里，并用 smoke 测试覆盖核心玩法路径。',
          'https://github.com',
          'https://dadaguai6686.github.io/#game'
        ]
      );
    }
  });

  // 4. Guestbook Comments Table
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      avatar TEXT,
      website TEXT,
      content TEXT NOT NULL,
      date TEXT
    )
  `);

  // Seed mock comments if empty
  db.get('SELECT COUNT(*) as count FROM comments', (err, row) => {
    if (err) {
      console.error('Error checking comments count:', err);
    } else if (row.count === 0) {
      const mockComments = [
        {
          nickname: 'GeekLover',
          avatar: '👨‍💻',
          website: 'https://github.com',
          content: '这个Bento看板设计得也太酷炫了吧！毛玻璃的模糊度和系统CPU波形图太搭配了。支持支持！',
          date: '2026-05-19 12:30'
        },
        {
          nickname: '网页极客',
          avatar: '🚀',
          website: '',
          content: '发现这个番茄钟生成的白噪音很有用，比以前下载大文件播放好多了，加油！',
          date: '2026-05-18 18:45'
        }
      ];

      const stmt = db.prepare('INSERT INTO comments (nickname, avatar, website, content, date) VALUES (?, ?, ?, ?, ?)');
      mockComments.forEach(c => {
        stmt.run(c.nickname, c.avatar, c.website, c.content, c.date);
      });
      stmt.finalize();
      console.log('Successfully seeded initial comments.');
    }
  });

  db.get('SELECT 1 AS ok', (err, row) => {
    if (err || row?.ok !== 1) rememberDbError(err || new Error('SQLite startup health query failed.'));
    else markDbReady();
  });
});

db.healthCheck = healthCheck;
db.healthSnapshot = dbHealthSnapshot;
db.closeGracefully = closeGracefully;

module.exports = db;
