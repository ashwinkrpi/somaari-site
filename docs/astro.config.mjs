// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { readFileSync } from 'node:fs';

// Written by scripts/import-guides.mjs from the somaari-common app manifest: one sidebar entry per
// app with a guide, in manifest order. Empty until the first import.
let apps = [];
try {
	apps = JSON.parse(readFileSync(new URL('./src/generated/apps.json', import.meta.url), 'utf8'));
} catch {
	// not imported yet
}

export default defineConfig({
	site: 'https://docs.somaari.in',
	// No syntax highlighting: both highlighters write style="" attributes, which the CSP blocks.
	// somaari.in's guides have none today either.
	markdown: { syntaxHighlight: false },
	integrations: [
		starlight({
			title: 'somaari docs',
			social: [],
			expressiveCode: false,
			customCss: ['./src/styles/somaari.css'],
			components: {
				ThemeProvider: './src/components/ThemeProvider.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
			},
			// Order matters: themes.css first, so the bridge can read the theme's color-scheme.
			head: [
				{ tag: 'meta', attrs: { name: 'theme-color', content: '#EDE3D3' } },
				{ tag: 'link', attrs: { rel: 'stylesheet', href: '/theme/themes.css' } },
				{ tag: 'script', attrs: { src: '/theme/theme.js' } },
				{ tag: 'script', attrs: { src: '/sl-theme-bridge.js' } },
			],
			sidebar: apps.filter((a) => a.guide).map((a) => ({ label: a.title, link: `/${a.repo}/` })),
		}),
	],
});
