import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const options = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const separator = argument.indexOf('=');
    if (!argument.startsWith('--') || separator === -1) {
      throw new Error(`无法识别参数：${argument}`);
    }
    return [argument.slice(2, separator), argument.slice(separator + 1)];
  }),
);

const required = ['source', 'slug', 'title', 'description', 'date', 'category', 'tags'];
for (const key of required) {
  if (!options[key]) throw new Error(`缺少参数 --${key}=...`);
}

const escapeYaml = (value) => JSON.stringify(value);

const normalizeAdmonitions = (markdown) => {
  const lines = markdown.split('\n');
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== ':::warning') {
      output.push(lines[index]);
      continue;
    }

    const block = [];
    index += 1;
    while (index < lines.length && lines[index].trim() !== ':::') {
      block.push(lines[index]);
      index += 1;
    }

    output.push('> **注意**');
    for (const line of block) output.push(line ? `> ${line}` : '>');
  }

  return output.join('\n');
};

const cleanMarkdown = (markdown) => normalizeAdmonitions(markdown)
  .replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')
  .replace(/<font\b[^>]*>/gi, '')
  .replace(/<\/font>/gi, '')
  .replace(/\t+$/gm, '')
  .replace(/\n{4,}/g, '\n\n\n')
  .trim();

const sourcePath = resolve(options.source);
const destinationDirectory = resolve('src/content/posts');
const destinationPath = resolve(destinationDirectory, `${options.slug}.md`);
const body = cleanMarkdown(await readFile(sourcePath, 'utf8'));
const tags = options.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
const useFirstImage = options.cover === 'first';
const cover = useFirstImage ? '__FIRST_IMAGE__' : '/images/covers/default.webp';
const coverAlt = options.coverAlt || `${options.title}封面`;

const frontmatter = [
  '---',
  `title: ${escapeYaml(options.title)}`,
  `description: ${escapeYaml(options.description)}`,
  `date: ${options.date}`,
  `category: ${escapeYaml(options.category)}`,
  `tags: ${JSON.stringify(tags)}`,
  `cover: ${escapeYaml(cover)}`,
  `coverAlt: ${escapeYaml(coverAlt)}`,
  'featured: false',
  'draft: false',
  '---',
  '',
].join('\n');

await mkdir(destinationDirectory, { recursive: true });
await writeFile(destinationPath, `${frontmatter}${body}\n`, 'utf8');
console.log(`已导入 ${basename(sourcePath)} -> ${destinationPath}`);
