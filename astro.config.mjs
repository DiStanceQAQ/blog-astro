// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeMermaid from 'rehype-mermaid';

/** @type {import('rehype-mermaid').RehypeMermaidOptions['errorFallback']} */
const mermaidErrorFallback = (element, _diagram, error, file) => {
	file.message(`Mermaid diagram was left as source because it could not be rendered: ${String(error)}`, {
		ruleId: 'rehype-mermaid',
		source: 'rehype-mermaid',
	});
	return element;
};

// https://astro.build/config
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const site = isGitHubPages ? 'https://distanceqaq.github.io' : 'https://example.com';
const base = isGitHubPages ? '/blog-astro' : '/';

export default defineConfig({
	site,
	base,
	output: 'static',
	trailingSlash: 'never',
	markdown: {
		syntaxHighlight: {
			type: 'shiki',
			excludeLangs: ['mermaid'],
		},
		processor: unified({
			rehypePlugins: [[rehypeMermaid, {
				strategy: 'inline-svg',
				mermaidConfig: {
					fontFamily: 'ui-sans-serif, system-ui, sans-serif',
					theme: 'neutral',
					securityLevel: 'strict',
				},
				errorFallback: mermaidErrorFallback,
			}]],
		}),
	},
	devToolbar: {
		enabled: false,
	},
	integrations: [sitemap()],
	vite: {
		plugins: [tailwindcss()],
	},
});
