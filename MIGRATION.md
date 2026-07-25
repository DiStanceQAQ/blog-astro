# 旧博客内容迁移

新站不连接数据库。迁移只发生一次：从旧 PostgreSQL 读取已发布文章，保存为 JSON，再转成仓库中的 Markdown。

## 1. 在旧 Next.js 仓库导出

旧项目能够正常连接数据库时，使用 Prisma 执行：

```ts
const posts = await prisma.blog.findMany({
  where: { published: true },
  orderBy: { createdAt: 'desc' },
  include: {
    category: { select: { name: true } },
    tags: { select: { name: true } },
  },
});
```

把结果保存成 UTF-8 JSON。导入脚本接受以下结构：

```json
[
  {
    "title": "文章标题",
    "slug": "article-slug",
    "description": "摘要",
    "body": "# Markdown 正文",
    "cover": "https://example.com/cover.webp",
    "published": true,
    "createdAt": "2026-07-25T00:00:00.000Z",
    "updatedAt": "2026-07-25T00:00:00.000Z",
    "category": { "name": "可视化" },
    "tags": [{ "name": "WebGL" }]
  }
]
```

## 2. 转换为 Markdown

```bash
npm run import -- /absolute/path/to/legacy-posts.json
```

脚本会：

- 使用旧 `slug` 作为 Markdown 文件名
- 保留标题、摘要、时间、分类、标签和正文
- 将未发布文章标记为 `draft: true`
- 遇到同名 Markdown 时停止，不覆盖已有内容

## 3. 处理旧封面

导入脚本会暂时保留远程 `cover` URL。为了获得稳定的国内访问速度，建议下载图片，转换为 WebP 后放到 `public/images/covers/`，再把 frontmatter 改成本地路径。

## 4. 验证

```bash
npm run build
```

内容模型、失效字段、重复或过长标题都会在构建阶段被检查出来。
