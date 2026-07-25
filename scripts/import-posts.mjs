import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const input = process.argv[2];
if (!input) {
  console.error('用法：npm run import -- /absolute/path/to/legacy-posts.json');
  process.exit(1);
}

const posts = JSON.parse(await readFile(resolve(input), 'utf8'));
if (!Array.isArray(posts)) throw new TypeError('JSON 根节点必须是文章数组');
const output = resolve('src/content/posts');
await mkdir(output, { recursive: true });

const yamlString = (value) => JSON.stringify(String(value ?? ''));
const slugify = (value) => String(value ?? '')
  .normalize('NFKC').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-|-$/g, '');

let imported = 0;
for (const post of posts) {
  if (!post?.title || !post?.body) throw new TypeError('每篇文章必须包含 title 和 body');
  const slug = slugify(post.slug || post.title) || `post-${Date.now()}-${imported}`;
  const file = resolve(output, `${slug}.md`);
  if (existsSync(file)) throw new Error(`目标文件已存在，未覆盖：${file}`);
  const tags = Array.isArray(post.tags) ? post.tags.map((tag) => String(tag?.name ?? tag)).filter(Boolean) : [];
  const date = new Date(post.createdAt ?? Date.now()).toISOString().slice(0, 10);
  const updated = post.updatedAt ? new Date(post.updatedAt).toISOString().slice(0, 10) : undefined;
  const frontmatter = [
    '---',
    `title: ${yamlString(post.title)}`,
    `description: ${yamlString(post.description ?? '')}`,
    `date: ${date}`,
    ...(updated ? [`updated: ${updated}`] : []),
    `category: ${yamlString(post.category?.name ?? post.category ?? '未分类')}`,
    `tags: ${JSON.stringify(tags)}`,
    ...(post.cover ? [`cover: ${yamlString(post.cover)}`] : []),
    'featured: false',
    `draft: ${post.published === false}`,
    '---',
    '',
  ].join('\n');
  await writeFile(file, `${frontmatter}${String(post.body).trim()}\n`, 'utf8');
  imported += 1;
}

console.log(`已导入 ${imported} 篇文章到 ${output}`);
