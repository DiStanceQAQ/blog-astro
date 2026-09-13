import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative, resolve } from 'node:path';

/**
 * 将 Obsidian 知识库中的公开笔记同步为博客文章。
 *
 * 这个脚本只负责可重复的格式转换：不会修改 Obsidian 原文件，也不会把
 * 个人信息和账号笔记带进博客。图片本地化由 npm run localize 另行完成。
 */

const vault = resolve(process.env.OBSIDIAN_VAULT || '/Users/ljn/Documents/Obsidian Vault');
const destination = resolve('src/content/posts');
const publicPath = resolve('public/images/posts');

const excluded = new Set([
  '个人信息/简历.md',
  '毕业论文/scnet账号.md',
]);

const existingSlugBySource = new Map([
  ['Agent/开源项目学习/opencode/opencode源码解析——一些概念.md', 'opencode-core-concepts'],
  ['Agent/开源项目学习/opencode/opencode源码解析——模块设计.md', 'opencode-module-design'],
  ['Agent/开源项目学习/opencode/opencode源码解析——总体概览.md', 'opencode-source-overview'],
  ['日常工具记录/ReactNatvie 开发环境搭建.md', 'react-native-environment-setup'],
  ['日常工具记录/将其他盘的空间迁移至C盘.md', 'extend-windows-c-drive'],
]);

const titleOverrides = new Map([
  ['日常工具记录/ReactNatvie 开发环境搭建.md', 'React Native 开发环境搭建'],
  ['日常工具记录/将其他盘的空间迁移至C盘.md', '将其他盘的空间迁移至 C 盘'],
  ['日常工具记录/使用 Tailscale 和 SSH 访问异地电脑方法.md', '使用 Tailscale 和 SSH 访问异地电脑'],
  ['计算机相关知识/工程实践/RPC 与 SDK：把远程调用包装成本地体验之后.md', 'RPC 与 SDK：把远程调用包装成本地体验'],
  ['Agent/开源项目学习/各主流agent架构异同和优劣势分析.md', '各主流 Agent 架构的异同与取舍'],
  ['Agent/langgrapgh/5.0 完整案例： GIS 数据处理 Agent.md', 'LangGraph 实战：GIS 数据处理 Agent'],
]);

const coverByCategory = {
  '全栈基础': '/images/covers/editorial-architecture.webp',
  '工程实践': '/images/covers/build-boundaries.webp',
  LangGraph: '/images/covers/shader-light.webp',
  源码解析: '/images/covers/spatial-web.webp',
  'AI Agent': '/images/covers/shader-light.webp',
  工具实践: '/images/covers/performance-lines.webp',
  毕业论文: '/images/covers/spatial-web.webp',
};

const categoryFor = (source) => {
  if (source.startsWith('计算机相关知识/从零开始全栈/')) return '全栈基础';
  if (source.startsWith('计算机相关知识/工程实践/')) return '工程实践';
  if (source.startsWith('Agent/langgrapgh/')) return 'LangGraph';
  if (source.startsWith('Agent/开源项目学习/opencode/')) return '源码解析';
  if (source.startsWith('Agent/开源项目学习/')) return 'AI Agent';
  if (source.startsWith('日常工具记录/')) {
    if (source.includes('ReactNatvie')) return '移动开发';
    return '实用工具';
  }
  if (source.startsWith('毕业论文/')) return '毕业论文';
  return '未分类';
};

const titleClean = (value) => String(value ?? '')
  .replace(/^#+\s*/, '')
  .replace(/^\*\*(.*?)\*\*$/, '$1')
  .replace(/`/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const canonical = (value) => titleClean(value)
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[\s\u200b_-]+/g, '')
  .replace(/[：:，,。.!！？?、（）()【】\[\]「」“”"'`]/g, '');

const yamlScalar = (value) => String(value ?? '')
  .trim()
  .replace(/^['"]|['"]$/g, '');

const parseTags = (value) => {
  const inline = String(value ?? '').trim();
  if (!inline) return [];
  if (inline.startsWith('[') && inline.endsWith(']')) {
    return inline.slice(1, -1).split(',').map(yamlScalar).filter(Boolean);
  }
  return [yamlScalar(inline)].filter(Boolean);
};

function parseFrontmatter(markdown) {
  if (!markdown.startsWith('---\n')) return { data: {}, body: markdown };
  const end = markdown.indexOf('\n---\n', 4);
  if (end === -1) return { data: {}, body: markdown };

  const lines = markdown.slice(4, end).split('\n');
  const data = {};
  let activeList = null;
  for (const line of lines) {
    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem && activeList) {
      data[activeList].push(yamlScalar(listItem[1]));
      continue;
    }
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (key === 'tags') {
      data.tags = parseTags(raw);
      activeList = raw.trim() ? null : 'tags';
      if (!raw.trim()) data.tags = [];
    } else {
      data[key] = yamlScalar(raw);
      activeList = null;
    }
  }
  return { data, body: markdown.slice(end + 5) };
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (extname(entry.name).toLowerCase() === '.md') files.push(path);
  }
  return files;
}

function findFirstHeading(body) {
  let fenced = false;
  for (const line of body.split('\n')) {
    if (line.trim().startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) {
      const match = line.match(/^#\s+(.+)$/);
      if (match) return titleClean(match[1]);
    }
  }
  return '';
}

function findTitle(source, data, body) {
  if (titleOverrides.has(source)) return titleOverrides.get(source);
  if (data.title) return titleClean(data.title);
  const heading = findFirstHeading(body);
  if (heading) return heading;
  return titleClean(basename(source, '.md'));
}

function plainText(value) {
  return String(value ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target)
    .replace(/`/g, '')
    .replace(/[*_>#|~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizePublicText(value) {
  return String(value ?? '')
    .replace(/\/Users\/ljn\/[^\s)]+/g, '本地路径')
    .replace(/codex:\/\/[^\s)]+/g, '历史任务链接')
    .replace(/\b[A-Za-z]:\\[^\s)]+/g, '本地路径');
}

function isPlaceholderDescription(value) {
  const text = plainText(value);
  return /^(?:这一[篇节]回答了|学完这一[篇节]，?你应该能(?:回答)?|本篇目标|一句话理解)$/.test(text);
}

function findDescription(title, body) {
  const abstract = body.match(/^>\s*\[!abstract\]\s*(.+)$/m);
  if (abstract) {
    const abstractText = plainText(abstract[1]);
    const genericAbstract = /^(?:这一[篇节]回答了|学完这一[篇节]，?你应该能(?:回答)?|本篇目标|一句话理解)$/;
    if (abstractText && !genericAbstract.test(abstractText)) {
      return [...sanitizePublicText(abstractText)].slice(0, 118).join('');
    }
  }
  let fenced = false;
  const candidates = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (fenced || !line || line.startsWith('#') || line.startsWith('>') || line.startsWith('|')) continue;
    if (/^(?:[-*+]\s+|\d+[、.)]\s+|!\[)/.test(line)) continue;
    const text = plainText(line);
    if (text.length >= 12) candidates.push(text);
    if (candidates.length >= 2) break;
  }
  const description = candidates.join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!description) return `${title}的实践与思考。`;
  return [...sanitizePublicText(description)].slice(0, 118).join('');
}

function slugify(value) {
  const slug = String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '');
  return slug || 'post';
}

function derivedTags(source, title, data) {
  const tags = [...(data.tags || [])];
  if (source.startsWith('计算机相关知识/从零开始全栈/')) {
    tags.push('计算机基础');
    const file = basename(source, '.md');
    if (file.startsWith('2.')) tags.push('前端');
    if (file.startsWith('3.')) tags.push('Web');
    if (file.startsWith('4.')) tags.push('数据库');
    if (file.startsWith('5.')) tags.push('工程实践');
    if (file.startsWith('6.')) tags.push('运维');
  } else if (source.startsWith('计算机相关知识/工程实践/')) {
    tags.push('软件工程', '架构');
    if (/RPC|SDK/i.test(title)) tags.push('RPC');
    if (/Monorepo|Polyrepo/i.test(title)) tags.push('Monorepo');
  } else if (source.startsWith('日常工具记录/')) {
    tags.push('工具实践');
    if (/React/i.test(title)) tags.push('React Native', 'Android');
    if (/Tailscale|SSH/i.test(title)) tags.push('网络', '远程访问');
    if (/C 盘|磁盘/i.test(title)) tags.push('Windows', '磁盘管理');
  } else if (source.startsWith('Agent/开源项目学习/opencode/')) {
    tags.push('OpenCode', '源码阅读');
  } else if (source.startsWith('Agent/开源项目学习/')) {
    tags.push('AI Agent', '架构');
  } else if (source.startsWith('毕业论文/')) {
    tags.push('毕业论文', '研究笔记');
  }
  return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 8);
}

function dateFrom(value, fallback) {
  const candidate = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : fallback;
}

function normalizeAdmonitions(body) {
  const labels = {
    abstract: '摘要',
    info: '提示',
    note: '说明',
    tip: '技巧',
    warning: '注意',
    important: '重点',
    caution: '注意',
  };
  return body.replace(/^>\s*\[!(\w+)\]\s*(.*)$/gm, (_, type, text) => {
    const label = labels[type.toLowerCase()] || '说明';
    return `> **${text.trim() || label}**`;
  });
}

function cleanBody(body, title, linkMap) {
  let output = body
    .replace(/%%[\s\S]*?%%/g, '')
    .replace(/!\[\[([^\]]+)\]\]/g, (_, target) => `*图片：${target.trim()}*`)
    .replace(/\n{4,}/g, '\n\n\n');
  output = output
    .replace(/\[([^\]]+)\]\(<\/Users\/[^>]+>\)/g, '$1')
    .replace(/\[([^\]]+)\]\(codex:\/\/[^)]+\)/g, '$1')
    .replace(/`\/Users\/ljn\/[^`]+`/g, '`本地路径`')
    .replace(/\/Users\/ljn\/[^\s)]+/g, '本地路径')
    .replace(/`[A-Za-z]:\\[^`]+`/g, '`本地路径`');
  output = normalizeAdmonitions(output);

  output = output.replace(/\[\[([^\]]+)\]\]/g, (_, raw) => {
    const [targetPart, aliasPart] = raw.split('|');
    const targetWithHeading = targetPart.trim();
    const [target, heading] = targetWithHeading.split('#', 2);
    const alias = (aliasPart || target || '').trim();
    const slug = linkMap.get(canonical(target)) || linkMap.get(canonical(targetWithHeading));
    if (!slug) return alias;
    const fragment = heading ? `#${slugify(heading)}` : '';
    return `[${alias}](/blog/${slug}${fragment})`;
  });

  const firstHeading = output.match(/^#\s+(.+)$/m);
  if (firstHeading && canonical(firstHeading[1]) === canonical(title)) {
    output = output.replace(firstHeading[0], '').replace(/^\s+/, '');
  }
  return sanitizePublicText(output).trim();
}

function parseExisting(markdown) {
  const { data } = parseFrontmatter(markdown);
  return data;
}

async function readExistingPosts() {
  const result = new Map();
  for (const file of await readdir(destination)) {
    if (!file.endsWith('.md')) continue;
    const path = join(destination, file);
    const data = parseExisting(await readFile(path, 'utf8'));
    if (data.title) result.set(canonical(data.title), { slug: basename(file, '.md'), data });
  }
  return result;
}

function buildFrontmatter({ title, description, date, updated, category, tags, cover, coverAlt, featured }) {
  return [
    '---',
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(description)}`,
    `date: ${date}`,
    ...(updated ? [`updated: ${updated}`] : []),
    `category: ${JSON.stringify(category)}`,
    `tags: ${JSON.stringify(tags)}`,
    `cover: ${JSON.stringify(cover)}`,
    `coverAlt: ${JSON.stringify(coverAlt)}`,
    `featured: ${featured ? 'true' : 'false'}`,
    'draft: false',
    '---',
    '',
  ].join('\n');
}

await mkdir(destination, { recursive: true });
await mkdir(publicPath, { recursive: true });

const existing = await readExistingPosts();
const sourceFiles = (await walk(vault))
  .map((path) => ({ path, source: relative(vault, path) }))
  .filter(({ source }) => !excluded.has(source));

const entries = [];
const usedSlugs = new Set([...existing.values()].map(({ slug }) => slug));
for (const { path, source } of sourceFiles) {
  const markdown = await readFile(path, 'utf8');
  if (!markdown.trim()) continue;
  const parsed = parseFrontmatter(markdown);
  const title = findTitle(source, parsed.data, parsed.body);
  const explicitSlug = existingSlugBySource.get(source);
  const existingEntry = existing.get(canonical(title))
    || [...existing.values()].find(({ slug }) => slug === explicitSlug);
  let slug = explicitSlug || existingEntry?.slug || slugify(title);
  if (!explicitSlug && !existingEntry) {
    const baseSlug = slug;
    let suffix = 2;
    while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
  }
  usedSlugs.add(slug);
  const fileStat = await stat(path);
  const fallbackDate = new Date(fileStat.mtimeMs).toISOString().slice(0, 10);
  const date = dateFrom(existingEntry?.data.date || parsed.data.created, fallbackDate);
  const updated = dateFrom(parsed.data.updated || existingEntry?.data.updated, '');
  const generatedDescription = findDescription(title, parsed.body);
  const existingDescription = existingEntry?.data.description;
  const description = parsed.data.description
    || (existingDescription && !isPlaceholderDescription(existingDescription) ? existingDescription : generatedDescription);
  const category = existingEntry?.data.category || categoryFor(source);
  const existingTags = Array.isArray(existingEntry?.data.tags)
    ? existingEntry.data.tags
    : parseTags(existingEntry?.data.tags);
  const tags = parsed.data.tags?.length
    ? derivedTags(source, title, parsed.data)
    : (existingTags.length ? existingTags : derivedTags(source, title, parsed.data));
  const hasImage = /!\[[^\]]*\]\((?:https?:\/\/|\/images\/)/.test(parsed.body);
  const cover = existingEntry?.data.cover || (hasImage ? '__FIRST_IMAGE__' : (coverByCategory[category] || '/images/covers/default.webp'));
  const coverAlt = existingEntry?.data.coverAlt || `${title}封面`;
  entries.push({ source, path, parsed, title, description, slug, date, updated, category, tags, cover, coverAlt, existingEntry });
}

const linkMap = new Map();
for (const entry of entries) {
  linkMap.set(canonical(entry.title), entry.slug);
  linkMap.set(canonical(basename(entry.source, '.md')), entry.slug);
  linkMap.set(canonical(entry.source.replace(/\.md$/i, '')), entry.slug);
}
for (const entry of existing.values()) linkMap.set(canonical(entry.data.title), entry.slug);

let written = 0;
for (const entry of entries) {
  const body = cleanBody(entry.parsed.body, entry.title, linkMap);
  const frontmatter = buildFrontmatter({
    ...entry,
    featured: entry.existingEntry?.data.featured === 'true',
  });
  const output = `${frontmatter}${body}\n`;
  const file = join(destination, `${entry.slug}.md`);
  const old = await readFile(file, 'utf8').catch(() => '');
  if (old !== output) {
    await writeFile(file, output, 'utf8');
    written += 1;
  }
}

console.log(JSON.stringify({
  sourceFiles: sourceFiles.length,
  imported: entries.length,
  written,
  excluded: [...excluded],
  destination,
}, null, 2));
