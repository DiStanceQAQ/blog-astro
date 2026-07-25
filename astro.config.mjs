// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com',
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
