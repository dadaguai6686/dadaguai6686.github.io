const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const publicSiteUrl = 'https://dadaguai6686.github.io';
const defaultPageDescription = 'Atherix的个人主页与技术博客。集成精美的Bento Dashboard、数字化工具箱（JSON格式化、图片WebP压缩、Markdown编辑器、番茄钟）以及个人项目展示与留言板。';
const defaultOgImageUrl = `${publicSiteUrl}/assets/atherix-og-card.png`;

const staticPosts = [
  {
    id: 'post-1',
    title: '如何构建一个极速的无框架博客？',
    excerpt: '探索现代原生 Web API 的潜能，摆脱重度前端框架依赖，打造秒开的个人网站性能体验。',
    tag: '前端开发',
    date: '2026-05-18',
    readTime: '6 分钟阅读',
    pinned: true
  },
  {
    id: 'post-2',
    title: '基于 Web Audio API 实现沉浸式白噪音生成器',
    excerpt: '深入了解浏览器音频接口，不依赖音频文件也能实时合成雨声、风声和 Lofi 合成器背景音。',
    tag: '黑客技术',
    date: '2026-05-15',
    readTime: '8 分钟阅读',
    pinned: true
  },
  {
    id: 'post-3',
    title: 'Canvas 客户端图像压缩的原理与实战',
    excerpt: '探讨如何直接在前端对上传的 PNG/JPEG 进行高效压缩并转换为 WebP 格式，减小后端存储负担。',
    tag: '前端开发',
    date: '2026-05-10',
    readTime: '5 分钟阅读',
    pinned: false
  }
];

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripMarkdownText(value) {
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

function truncateMetaText(value, max = 180) {
  const text = stripMarkdownText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function replaceHtmlTagContent(html, tagName, value) {
  const safeValue = escapeXml(value);
  return html.replace(new RegExp(`<${tagName}>[\\s\\S]*?<\\/${tagName}>`, 'i'), () => `<${tagName}>${safeValue}</${tagName}>`);
}

function replaceMetaContent(html, attrName, attrValue, value) {
  const safeAttr = escapeXml(value);
  const pattern = new RegExp(`(<meta\\s+${attrName}="${attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content=")[^"]*("\\s*>)`, 'i');
  return html.replace(pattern, (_match, open, close) => `${open}${safeAttr}${close}`);
}

function replaceCanonicalHref(html, value) {
  return html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*("\s*>)/i, (_match, open, close) => `${open}${escapeXml(value)}${close}`);
}

function stripTrailingWhitespace(text) {
  return String(text || '').replace(/[ \t]+$/gm, '');
}

function serializeJsonLd(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function postDateValue(post) {
  const parsed = Date.parse(`${post.date || ''}T09:00:00+08:00`);
  return Number.isFinite(parsed) ? new Date(parsed) : new Date();
}

function publicArticleUrl(postId = '') {
  return `${publicSiteUrl}/posts/${encodeURIComponent(postId || '')}/`;
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeTemplateLiteralContent(value) {
  return String(value || '')
    .replace(/\\`/g, '`')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

function readDefaultPostContentById() {
  const appText = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
  const contentById = new Map();
  for (const post of staticPosts) {
    const pattern = new RegExp(`id:\\s*'${escapeRegExp(post.id)}',[\\s\\S]*?content:\\s*\`([\\s\\S]*?)\`,\\s*tag:`);
    const match = appText.match(pattern);
    if (match) contentById.set(post.id, decodeTemplateLiteralContent(match[1]));
  }
  return contentById;
}

function buildArticleJsonLd(post, url, description) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    },
    headline: truncateMetaText(post.title || '文章', 110),
    description,
    image: [defaultOgImageUrl],
    url,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: 'zh-CN',
    articleSection: post.tag || '未分类',
    keywords: [post.tag || '未分类'],
    author: {
      '@type': 'Person',
      name: 'Atherix',
      url: publicSiteUrl
    },
    publisher: {
      '@type': 'Organization',
      name: 'Atherix Digital Space',
      logo: {
        '@type': 'ImageObject',
        url: `${publicSiteUrl}/assets/atherix-icon-512.png`
      }
    }
  };
}

function stripInlineMarkdown(value) {
  return String(value ?? '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderFallbackArticleBody(markdown = '', title = '') {
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
  const normalizedTitle = stripInlineMarkdown(title);
  const parts = [];
  let paragraph = [];
  let listType = '';
  let inCode = false;
  let codeLines = [];
  let skippedTitleHeading = false;

  const closeParagraph = () => {
    const text = paragraph.join(' ').trim();
    if (text) parts.push(`<p>${escapeXml(stripInlineMarkdown(text))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (listType) {
      parts.push(`</${listType}>`);
      listType = '';
    }
  };
  const openList = (type) => {
    closeParagraph();
    if (listType !== type) {
      closeList();
      parts.push(`<${type}>`);
      listType = type;
    }
  };
  const closeCode = () => {
    parts.push(`<pre><code>${escapeXml(codeLines.join('\n').trimEnd())}</code></pre>`);
    codeLines = [];
    inCode = false;
  };

  lines.forEach(rawLine => {
    const line = rawLine.trimEnd();
    if (/^```/.test(line.trim())) {
      closeParagraph();
      closeList();
      if (inCode) closeCode();
      else {
        inCode = true;
        codeLines = [];
      }
      return;
    }
    if (inCode) {
      codeLines.push(rawLine);
      return;
    }
    if (!line.trim()) {
      closeParagraph();
      closeList();
      return;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeParagraph();
      closeList();
      const headingText = stripInlineMarkdown(heading[2]);
      if (!skippedTitleHeading && heading[1].length === 1 && headingText === normalizedTitle) {
        skippedTitleHeading = true;
        return;
      }
      const level = Math.min(4, Math.max(2, heading[1].length));
      parts.push(`<h${level}>${escapeXml(headingText)}</h${level}>`);
      return;
    }
    const quote = line.match(/^\s*>\s+(.+)$/);
    if (quote) {
      closeParagraph();
      closeList();
      parts.push(`<blockquote>${escapeXml(stripInlineMarkdown(quote[1]))}</blockquote>`);
      return;
    }
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      openList('ol');
      parts.push(`<li>${escapeXml(stripInlineMarkdown(ordered[1]))}</li>`);
      return;
    }
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (unordered) {
      openList('ul');
      parts.push(`<li>${escapeXml(stripInlineMarkdown(unordered[1]))}</li>`);
      return;
    }
    closeList();
    paragraph.push(line.trim());
  });

  closeParagraph();
  closeList();
  if (inCode) closeCode();
  return parts.join('\n          ');
}

function renderArticlePrerenderShell(post, url, description) {
  const tag = post?.tag || '未分类';
  const title = post?.title || '未命名文章';
  const readTime = post?.readTime || '';
  const date = post?.date || '';
  const body = renderFallbackArticleBody(post?.content || '', title);
  return `<article class="glass-card article-ssr-shell" id="article-ssr-shell" data-ssr-article-id="${escapeXml(post?.id || '')}" aria-labelledby="article-ssr-title">
      <a class="article-ssr-back" href="/#blog">返回博客列表</a>
      <div class="article-ssr-meta">
        <span>${escapeXml(tag)}</span>
        ${date ? `<span>${escapeXml(date)}</span>` : ''}
        ${readTime ? `<span>${escapeXml(readTime)}</span>` : ''}
      </div>
      <h1 id="article-ssr-title">${escapeXml(title)}</h1>
      <p class="article-ssr-description">${escapeXml(description)}</p>
      <div class="article-ssr-content">
          ${body || `<p>${escapeXml(description)}</p>`}
      </div>
      <a class="article-ssr-canonical" href="${escapeXml(url)}">文章永久链接</a>
    </article>`;
}

function renderArticlePrerenderedAppShell(html, post, url, description) {
  const shell = renderArticlePrerenderShell(post, url, description);
  return html
    .replace('<button type="button" class="nav-item active" data-target="home" aria-label="打开首页" title="首页" aria-current="page">', '<button type="button" class="nav-item" data-target="home" aria-label="打开首页" title="首页">')
    .replace('<button type="button" class="nav-item" data-target="blog" aria-label="打开博客" title="博客">', '<button type="button" class="nav-item active" data-target="blog" aria-label="打开博客" title="博客" aria-current="page">')
    .replace('<section class="view-section active" id="home">', '<section class="view-section" id="home">')
    .replace('<main id="main-content" tabindex="-1">', `<main id="main-content" tabindex="-1">\n    ${shell}`);
}

function renderArticleHtml(template, post) {
  const title = `${truncateMetaText(post.title || '文章', 90)} - Atherix`;
  const description = truncateMetaText(post.excerpt || defaultPageDescription, 180);
  const url = publicArticleUrl(post.id);
  const jsonLd = serializeJsonLd(buildArticleJsonLd(post, url, description));
  let html = template;
  html = replaceHtmlTagContent(html, 'title', title);
  html = replaceMetaContent(html, 'name', 'description', description);
  html = replaceMetaContent(html, 'property', 'og:title', title);
  html = replaceMetaContent(html, 'property', 'og:description', description);
  html = replaceMetaContent(html, 'property', 'og:type', 'article');
  html = replaceMetaContent(html, 'property', 'og:url', url);
  html = replaceMetaContent(html, 'property', 'og:image', defaultOgImageUrl);
  html = replaceMetaContent(html, 'property', 'og:image:secure_url', defaultOgImageUrl);
  html = replaceMetaContent(html, 'name', 'twitter:title', title);
  html = replaceMetaContent(html, 'name', 'twitter:description', description);
  html = replaceMetaContent(html, 'name', 'twitter:image', defaultOgImageUrl);
  html = replaceCanonicalHref(html, url);
  const extras = [
    '<meta property="article:author" content="Atherix">',
    `<meta property="article:published_time" content="${escapeXml(post.date || '')}">`,
    `<meta property="og:updated_time" content="${escapeXml(post.date || '')}">`,
    `<meta property="article:section" content="${escapeXml(post.tag || '未分类')}">`,
    `<meta property="article:tag" content="${escapeXml(post.tag || '未分类')}">`,
    `<script type="application/ld+json">${jsonLd}</script>`
  ].join('\n  ');
  html = html.replace('</head>', () => `  ${extras}\n</head>`);
  html = renderArticlePrerenderedAppShell(html, post, url, description);
  return stripTrailingWhitespace(html);
}

function renderFeedXml(posts) {
  const ordered = [...posts].sort((a, b) => postDateValue(b) - postDateValue(a));
  const lastBuild = ordered[0] ? postDateValue(ordered[0]).toUTCString() : new Date().toUTCString();
  const items = ordered.map(post => {
    const url = publicArticleUrl(post.id);
    return `    <item>
      <title>${escapeXml(post.title || '未命名文章')}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${postDateValue(post).toUTCString()}</pubDate>
      <category>${escapeXml(post.tag || '未分类')}</category>
      <description>${escapeXml(post.excerpt || '')}</description>
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Atherix Digital Space</title>
    <link>${escapeXml(publicSiteUrl)}/</link>
    <atom:link href="${escapeXml(publicSiteUrl)}/feed.xml" rel="self" type="application/rss+xml" />
    <description>个人博客、开发者工具箱、项目展示与互动游戏组成的原生 Web 数字空间。</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <generator>Atherix Vanilla Web Stack</generator>
    <image>
      <url>${escapeXml(publicSiteUrl)}/assets/atherix-og-card.png</url>
      <title>Atherix Digital Space</title>
      <link>${escapeXml(publicSiteUrl)}/</link>
      <width>144</width>
      <height>76</height>
    </image>
${items}
  </channel>
</rss>
`;
}

function renderSitemapXml(posts) {
  const ordered = [...posts].sort((a, b) => postDateValue(b) - postDateValue(a));
  const latest = ordered[0] ? postDateValue(ordered[0]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const articleUrls = ordered.map(post => `  <url>
    <loc>${escapeXml(publicArticleUrl(post.id))}</loc>
    <lastmod>${postDateValue(post).toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${post.pinned ? '0.9' : '0.7'}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(publicSiteUrl)}/</loc>
    <lastmod>${latest}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${articleUrls}
</urlset>
`;
}

function main() {
  const template = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const contentById = readDefaultPostContentById();
  const posts = staticPosts.map(post => ({
    ...post,
    content: contentById.get(post.id) || post.excerpt || ''
  }));
  for (const post of posts) {
    const articleDir = path.join(rootDir, 'posts', post.id);
    fs.mkdirSync(articleDir, { recursive: true });
    fs.writeFileSync(path.join(articleDir, 'index.html'), renderArticleHtml(template, post));
  }
  fs.writeFileSync(path.join(rootDir, 'feed.xml'), renderFeedXml(posts));
  fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), renderSitemapXml(posts));
  console.log(`Generated ${posts.length} static article pages, feed.xml, and sitemap.xml.`);
}

main();
