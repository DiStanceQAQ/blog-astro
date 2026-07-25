# 刘家宁的静态博客

从原 Next.js + Prisma 博客迁移而来的 Astro 静态站。首页保留原有视觉，博客、文章、分类与关于页采用黑白冷灰、摄影主导的编辑式设计。

构建结果只有 HTML、CSS、图片和少量浏览器交互脚本，不依赖数据库、登录系统、API 或 Node.js 服务器。

## 开始使用

```bash
npm install
npm run dev
```

本地地址默认为 `http://localhost:4321`。

## 写一篇文章

最快的方式：

```bash
npm run new -- "文章标题"
```

命令会在 `src/content/posts/` 创建 Markdown 草稿。也可以直接复制现有 `.md` 文件。

```md
---
title: "文章标题"
description: "不超过 120 字的摘要"
date: 2026-07-25
category: "可视化"
tags: ["WebGL", "浏览器"]
cover: "/images/covers/my-cover.webp"
coverAlt: "封面图片描述"
featured: false
draft: false
---

从这里开始写 Markdown。
```

字段约束由 `src/content.config.ts` 校验。标题最长 42 个字符，摘要最长 120 个字符；`draft: true` 的文章不会进入构建结果。

图片放在 `public/images/`，文章中使用以 `/images/` 开头的路径。优先使用 WebP 或 AVIF，避免远程图床影响中国内地访问速度。

迁移来的文章仍含远程图片时，可以先安装 `cwebp`，再运行 `npm run localize`，自动下载、压缩并改写 Markdown 图片路径。

## 发布

```bash
npm run build
```

静态文件生成到 `dist/`。把这个目录整体上传到以下任一静态托管即可：

- 阿里云 OSS + CDN（中国内地访问最稳定，需要备案域名）
- 腾讯云 COS + CDN
- EdgeOne Makers
- 任意 Nginx、对象存储或静态托管平台

提交代码前，GitHub Actions 也会运行完整类型检查和静态构建。

## 上线前配置

修改以下两处占位地址：

1. `astro.config.mjs` 中的 `site`
2. `src/config.ts` 中的 `SITE.url`

站点会自动生成：

- `/rss.xml`
- `/sitemap-index.xml`
- Open Graph 元信息
- BlogPosting JSON-LD
- 分类与标签静态路由
- 浏览器端静态搜索

## 从旧数据库迁移文章

旧仓库没有本地数据库或环境变量，因此无法直接读取线上 PostgreSQL 内容。先从旧系统导出包含文章、分类和标签的 JSON，再运行：

```bash
npm run import -- ./legacy-posts.json
```

具体 JSON 格式与导出查询见 [MIGRATION.md](./MIGRATION.md)。

## 目录

```text
src/
├── content/posts/      # Markdown 文章
├── components/         # 导航、文章卡片与交互组件
├── layouts/            # HTML、SEO 与全站布局
├── pages/              # 所有静态路由
├── styles/global.css   # Runway-inspired 设计系统
└── content.config.ts   # Markdown 字段约束
```
