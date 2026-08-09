// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import { mermaidFences } from './plugins/remark-mermaid.mjs';
import { sidebar } from './src/data/sidebar.mjs';

export default defineConfig({
	site: 'https://semanticdefects.foundryside.dev',
	base: process.env.ASTRO_BASE ?? '/',
	markdown: {
		processor: unified({ remarkPlugins: [mermaidFences] }),
	},
	integrations: [
		starlight({
			// The site deliberately uses content-relative URLs so links remain beneath
			// either `/` or `/preview/`; page and hash validity is exercised after build.
			plugins: [starlightLinksValidator({ errorOnRelativeLinks: false })],
			title: 'Semantic Defects in AI-Generated Code',
			description:
				'A threat model and assurance framework for high-reliability systems that use AI to generate code',
			customCss: ['./src/styles/custom.css'],
			components: {
				Banner: './src/components/Banner.astro',
				Footer: './src/components/Footer.astro',
				MarkdownContent: './src/components/MarkdownContent.astro',
			},
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/foundryside-dev/agentic-coding-threat-model',
				},
			],
			sidebar,
		}),
	],
});
