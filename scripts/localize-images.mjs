import { readdir, readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const postsDirectory = resolve('src/content/posts');
const imageDirectory = resolve('public/images/posts');
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'blog-images-'));
const imagePattern = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+["'][^"']*["'])?\)/g;

await mkdir(imageDirectory, { recursive: true });

const run = (command, args) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(command, args, { stdio: 'inherit' });
  child.on('error', rejectRun);
  child.on('exit', (code) => code === 0 ? resolveRun() : rejectRun(new Error(`${command} 退出码 ${code}`)));
});

const localized = new Map();
let count = 0;

try {
  const files = (await readdir(postsDirectory)).filter((file) => /\.mdx?$/.test(file));
  for (const file of files) {
    const path = join(postsDirectory, file);
    const source = await readFile(path, 'utf8');
    const matches = [...source.matchAll(imagePattern)];
    let output = source;

    for (const match of matches) {
      const [original, alt, url] = match;
      let publicPath = localized.get(url);
      if (!publicPath) {
        const hash = createHash('sha256').update(url).digest('hex').slice(0, 12);
        const inputPath = join(temporaryDirectory, `${hash}.source`);
        const outputPath = join(imageDirectory, `${hash}.webp`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`下载失败 ${response.status}: ${url}`);
        await writeFile(inputPath, Buffer.from(await response.arrayBuffer()));
        await run('cwebp', ['-quiet', '-q', '82', inputPath, '-o', outputPath]);
        publicPath = `/images/posts/${hash}.webp`;
        localized.set(url, publicPath);
        count += 1;
      }
      output = output.replace(original, `![${alt}](${publicPath})`);
    }

    if (output !== source) await writeFile(path, output, 'utf8');
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log(`已本地化 ${count} 张图片`);
