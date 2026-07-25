import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export async function getPublishedPosts() {
  return (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
}

export function postSlug(post: Post) {
  return post.id.replace(/\.(md|mdx)$/i, '');
}

export function postHref(post: Post) {
  return `/blog/${postSlug(post)}`;
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replaceAll('/', '.');
}

export function splitDate(date: Date) {
  const [year, month, day] = formatDate(date).split('.');
  return { year, short: `${month}/${day}` };
}

export function readingTime(post: Post) {
  const text = post.body ?? '';
  const han = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
  const latin = text.replace(/[\u3400-\u9fff]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(han / 350 + latin / 220));
}

export function uniqueCategories(posts: Post[]) {
  return [...new Set(posts.map((post) => post.data.category))].sort();
}

export function uniqueTags(posts: Post[]) {
  return [...new Set(posts.flatMap((post) => post.data.tags))].sort();
}
