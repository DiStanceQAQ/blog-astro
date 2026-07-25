import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.GITHUB_PAGES === 'true' ? '/blog-astro' : '';
const outputDirectory = fileURLToPath(new URL('../dist/', import.meta.url));

if (!base) {
  process.exit(0);
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(path));
    } else if (['.html', '.xml'].includes(extname(entry.name))) {
      files.push(path);
    }
  }

  return files;
}

const files = await collectFiles(outputDirectory);
const rootUrl = /(\b(?:href|src)=["'])\/(?!\/|blog-astro(?:\/|["']))/g;

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const prefixed = source.replace(rootUrl, `$1${base}/`);

  if (prefixed !== source) {
    await writeFile(file, prefixed);
  }
}
