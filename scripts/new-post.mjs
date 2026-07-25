import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const raw = process.argv.slice(2).join(' ').trim();
if (!raw) {
  console.error('用法：npm run new -- "文章标题"');
  process.exit(1);
}

const slug = raw
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
  .replace(/^-|-$/g, '') || `post-${Date.now()}`;
const directory = resolve('src/content/posts');
const file = resolve(directory, `${slug}.md`);
if (existsSync(file)) {
  console.error(`文件已存在：${file}`);
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const content = `---
title: "${raw.replaceAll('"', '\\"')}"
description: "请填写不超过 120 字的文章摘要。"
date: ${date}
category: "前端工程"
tags: []
cover: "/images/covers/default.webp"
coverAlt: "文章封面"
featured: false
draft: true
---

从这里开始写正文。
`;

await mkdir(directory, { recursive: true });
await writeFile(file, content, 'utf8');
console.log(`已创建：${file}`);
