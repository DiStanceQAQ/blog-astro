// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const site = isGitHubPages ? 'https://distanceqaq.github.io' : 'https://example.com';
const base = isGitHubPages ? '/blog-astro' : '/';

export default defineConfig({
	site,
	base,
	output: 'static',
	trailingSlash: 'never',
	devToolbar: {
		enabled: false,
	},
	integrations: [sitemap()],
	vite: {
		plugins: [tailwindcss()],
	},
});
