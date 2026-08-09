import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { scanPreviewOutput } from '../scripts/check-preview-output.mjs';

async function withOutput(files, run) {
	const outputDir = await mkdtemp(path.join(os.tmpdir(), 'preview-output-'));

	try {
		for (const [relativePath, contents] of Object.entries(files)) {
			const filePath = path.join(outputDir, relativePath);
			await mkdir(path.dirname(filePath), { recursive: true });
			await writeFile(filePath, contents);
		}
		return await run(outputDir);
	} finally {
		await rm(outputDir, { recursive: true, force: true });
	}
}

test('accepts root-relative and same-origin URLs beneath the expected base', async () => {
	await withOutput(
		{
			'index.html': `
				<a href="/preview/">Home</a>
				<img src="/preview/images/logo.svg">
				<a href="https://semanticdefects.foundryside.dev/preview/acf/">ACF</a>
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), []);
		},
	);
});

test('rejects a root-relative URL outside the expected base', async () => {
	await withOutput({ 'index.html': '<a href="/acf/">ACF</a>' }, async (outputDir) => {
		assert.deepEqual(await scanPreviewOutput({ outputDir }), [
			{ file: 'index.html', location: 'href', url: '/acf/' },
		]);
	});
});

test('rejects a same-origin absolute URL outside the expected base', async () => {
	await withOutput(
		{ 'index.html': '<a href="https://semanticdefects.foundryside.dev/acf/">ACF</a>' },
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{
					file: 'index.html',
					location: 'href',
					url: 'https://semanticdefects.foundryside.dev/acf/',
				},
			]);
		},
	);
});

test('ignores external, external protocol-relative, fragment, query-only, and non-http URLs', async () => {
	await withOutput(
		{
			'index.html': `
				<a href="https://example.com/acf/">External HTTPS</a>
				<a href="http://example.com/acf/">External HTTP</a>
				<a href="//example.com/acf/">External protocol relative</a>
				<a href="#section">Fragment</a>
				<a href="?page=2">Query</a>
				<img src="data:image/svg+xml,/acf/">
				<a href="mailto:security@example.com">Mail</a>
				<a href="tel:+61000000000">Telephone</a>
				<a href="javascript:void(0)">Script</a>
				<a href="blob:https://semanticdefects.foundryside.dev/id">Blob</a>
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), []);
		},
	);
});

test('resolves path-relative URLs from each output file public URL', async () => {
	await withOutput(
		{
			'index.html': '<a href="../root-escape/">Root escape</a>',
			'nested/page/index.html': `
				<a href="../../safe.html">Safe relative URL</a>
				<a href="../../../deep-escape/">Excessive traversal</a>
				<a href="..\\..\\..\\backslash-escape/">Browser-normalized backslashes</a>
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'index.html', location: 'href', url: '../root-escape/' },
				{ file: 'nested/page/index.html', location: 'href', url: '../../../deep-escape/' },
				{
					file: 'nested/page/index.html',
					location: 'href',
					url: '..\\..\\..\\backslash-escape/',
				},
			]);
		},
	);
});

test('rejects a same-origin protocol-relative escape after resolution', async () => {
	await withOutput(
		{ 'index.html': '<a href="//semanticdefects.foundryside.dev/acf/">Escape</a>' },
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{
					file: 'index.html',
					location: 'href',
					url: '//semanticdefects.foundryside.dev/acf/',
				},
			]);
		},
	);
});

test('rejects malformed percent encoding in a same-origin URL', async () => {
	await withOutput({ 'index.html': '<a href="/preview/%ZZ">Malformed</a>' }, async (outputDir) => {
		assert.deepEqual(await scanPreviewOutput({ outputDir }), [
			{ file: 'index.html', location: 'href', url: '/preview/%ZZ' },
		]);
	});
});

test('ignores similarly named data attributes', async () => {
	await withOutput(
		{
			'index.html': '<div data-href="/escape/" data-src="/image.png" data-srcset="/image-2x.png 2x"></div>',
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), []);
		},
	);
});

test('does not scan markup-looking strings inside HTML raw-text elements', async () => {
	await withOutput(
		{
			'index.html': `
				<script>const template = '<a href="/script-escape/">';</script>
				<style>.example::before { content: '<img src="/style-escape.png">'; }</style>
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), []);
		},
	);
});

test('uses browser-standard entity decoding for actual URL attributes', async () => {
	await withOutput({ 'index.html': '<a href="&sol;entity-escape&sol;">Escape</a>' }, async (outputDir) => {
		assert.deepEqual(await scanPreviewOutput({ outputDir }), [
			{ file: 'index.html', location: 'href', url: '/entity-escape/' },
		]);
	});
});

test('resolves relative HTML URLs against a safe first base href', async () => {
	await withOutput(
		{ 'nested/index.html': '<base href="/preview/docs/"><a href="guide/">Guide</a>' },
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), []);
		},
	);
});

test('applies the first document base to URL attributes that precede it', async () => {
	await withOutput(
		{
			'nested/page/index.html': `
				<a href="../escape/">Preceding link</a>
				<base href="/preview/">
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'nested/page/index.html', location: 'href', url: '../escape/' },
			]);
		},
	);
});

test('diagnoses an escaping base href and URLs subsequently resolved against it', async () => {
	await withOutput(
		{ 'index.html': '<base href="/outside/"><a href="child.html">Child</a>' },
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'index.html', location: 'href', url: '/outside/' },
				{ file: 'index.html', location: 'href', url: 'child.html' },
			]);
		},
	);
});

test('catches traversal that escapes only after applying a safe base href', async () => {
	await withOutput(
		{ 'nested/page/index.html': '<base href="/preview/"><a href="../escape/">Escape</a>' },
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'nested/page/index.html', location: 'href', url: '../escape/' },
			]);
		},
	);
});

test('uses only the first base href while still inspecting later base attributes', async () => {
	await withOutput(
		{
			'index.html': `
				<base href="/preview/one/">
				<base href="/outside/">
				<a href="../safe/">Safe via first base</a>
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'index.html', location: 'href', url: '/outside/' },
			]);
		},
	);
});

test('lets an external first base make subsequent relative URLs external', async () => {
	await withOutput(
		{ 'index.html': '<base href="https://example.com/docs/"><a href="../external/">External</a>' },
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), []);
		},
	);
});

test('uses a parseable malformed-percent base after diagnosing it', async () => {
	await withOutput(
		{ 'nested/page/index.html': '<base href="/preview/%ZZ/"><a href="../../escape/">Escape</a>' },
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'nested/page/index.html', location: 'href', url: '/preview/%ZZ/' },
				{ file: 'nested/page/index.html', location: 'href', url: '../../escape/' },
			]);
		},
	);
});

test('falls back to the source public URL for an unparseable first base', async () => {
	await withOutput(
		{ 'nested/page/index.html': '<base href="http://["><a href="../../../escape/">Escape</a>' },
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'nested/page/index.html', location: 'href', url: '../../../escape/' },
			]);
		},
	);
});

test('does not activate a base href inside template contents', async () => {
	await withOutput(
		{
			'nested/page/index.html': `
				<template><base href="https://example.com/"></template>
				<a href="../../../escape/">Escape</a>
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'nested/page/index.html', location: 'href', url: '../../../escape/' },
			]);
		},
	);
});

test('inspects every srcset candidate without splitting a data URL', async () => {
	await withOutput(
		{
			'index.html': `
				<img srcset="/preview/small.png 1x, /large.png 2x, https://semanticdefects.foundryside.dev/huge.png 3x">
				<img srcset="data:image/png,/acf/ 1x, /preview/fallback.png 2x">
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'index.html', location: 'srcset', url: '/large.png' },
				{
					file: 'index.html',
					location: 'srcset',
					url: 'https://semanticdefects.foundryside.dev/huge.png',
				},
			]);
		},
	);
});

test('inspects form actions, formactions, and posters', async () => {
	await withOutput(
		{
			'forms/index.html': `
				<form action="/submit/"><button formaction="/alternate/">Submit</button></form>
				<video poster="/poster.jpg"></video>
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'forms/index.html', location: 'action', url: '/submit/' },
				{ file: 'forms/index.html', location: 'formaction', url: '/alternate/' },
				{ file: 'forms/index.html', location: 'poster', url: '/poster.jpg' },
			]);
		},
	);
});

test('recursively inspects CSS url values and reports their property names', async () => {
	await withOutput(
		{
			'nested/assets/site.css': `
				.hero { background-image: url('/hero.png'); }
				.icon { mask: url("/preview/icon.svg"); }
				.external { background: url(https://example.com/image.png); }
			`,
			'ignored.txt': 'url(/not-inspected.png)',
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{
					file: 'nested/assets/site.css',
					location: 'background-image',
					url: '/hero.png',
				},
			]);
		},
	);
});

test('ignores url-like text in CSS comments and quoted strings', async () => {
	await withOutput(
		{
			'assets/site.css': `
				/* url('/comment-escape.png') */
				/* u\\72l('/escaped-comment-escape.png') */
				.example::before { content: "url('/string-escape.png') u\\72l('/escaped-string-escape.png')"; }
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), []);
		},
	);
});

test('inspects CSS import string and url targets as at-rule diagnostics', async () => {
	await withOutput(
		{
			'assets/site.css': `
				@import "/import-string-escape.css";
				@import url('/import-url-escape.css');
				@import "https://example.com/external.css";
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'assets/site.css', location: '@import', url: '/import-string-escape.css' },
				{ file: 'assets/site.css', location: '@import', url: '/import-url-escape.css' },
			]);
		},
	);
});

test('decodes CSS escapes before checking URL paths', async () => {
	await withOutput(
		{ 'assets/site.css': '.escaped { background-image: url(\\2f escaped.png); }' },
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{
					file: 'assets/site.css',
					location: 'background-image',
					url: '\\2f escaped.png',
				},
			]);
		},
	);
});

test('decodes CSS escapes in url function identifiers before recognizing them', async () => {
	await withOutput(
		{
			'assets/site.css': `
				@import u\\72l(/import-escape.css);
				.lower { background: u\\72l(/lower-escape.png); }
				.upper { mask: U\\000052L(/upper-escape.svg); }
				.leading { border-image-source: \\75rl(/leading-escape.png); }
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'assets/site.css', location: '@import', url: '/import-escape.css' },
				{ file: 'assets/site.css', location: 'background', url: '/lower-escape.png' },
				{ file: 'assets/site.css', location: 'mask', url: '/upper-escape.svg' },
				{ file: 'assets/site.css', location: 'border-image-source', url: '/leading-escape.png' },
			]);
		},
	);
});

test('consumes a CSS hex escape whitespace terminator in url function identifiers', async () => {
	await withOutput(
		{
			'assets/site.css': `
				@import \\75 rl(/import-whitespace-escape.css);
				.escape { background: \\75 rl(/whitespace-escape.png); }
				.safe { mask: \\75 rl(/preview/safe.svg); }
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'assets/site.css', location: '@import', url: '/import-whitespace-escape.css' },
				{ file: 'assets/site.css', location: 'background', url: '/whitespace-escape.png' },
			]);
		},
	);
});

test('resolves CSS URLs relative to the stylesheet public URL', async () => {
	await withOutput(
		{
			'nested/assets/site.css': `
				.safe { background: url(../safe.png); }
				.escape { background: url(../../../escape.png); }
			`,
		},
		async (outputDir) => {
			assert.deepEqual(await scanPreviewOutput({ outputDir }), [
				{ file: 'nested/assets/site.css', location: 'background', url: '../../../escape.png' },
			]);
		},
	);
});

test('aggregates diagnostics from every HTML and CSS file', async () => {
	await withOutput(
		{
			'a.html': '<a href="/one/">One</a><img src="/two.png">',
			'nested/b.html': '<video poster="/three.jpg"></video>',
			'nested/styles.css': '.x { background: url(/four.svg) }',
		},
		async (outputDir) => {
			const diagnostics = await scanPreviewOutput({ outputDir });
			assert.equal(diagnostics.length, 4);
			assert.deepEqual(
				diagnostics.map(({ file, location, url }) => `${file}: ${location}=${url}`),
				[
					'a.html: href=/one/',
					'a.html: src=/two.png',
					'nested/b.html: poster=/three.jpg',
					'nested/styles.css: background=/four.svg',
				],
			);
		},
	);
});

test('honors custom expected base and site origin values', async () => {
	await withOutput(
		{
			'index.html': `
				<a href="/staging/ok/">OK</a>
				<a href="https://docs.example.test/staging/ok/">Absolute OK</a>
				<a href="https://docs.example.test/escape/">Escape</a>
			`,
		},
		async (outputDir) => {
			assert.deepEqual(
				await scanPreviewOutput({
					outputDir,
					expectedBase: '/staging/',
					siteOrigin: 'https://docs.example.test',
				}),
				[
					{
						file: 'index.html',
						location: 'href',
						url: 'https://docs.example.test/escape/',
					},
				],
			);
		},
	);
});

for (const [label, expectedBase] of [
	['missing leading slash', 'preview/'],
	['missing trailing slash', '/preview'],
	['protocol-relative form', '//preview/'],
	['query', '/preview/?mode=test'],
	['fragment', '/preview/#section'],
	['backslash', '/preview\\nested/'],
	['dot segment', '/preview/../nested/'],
	['encoded dot segment', '/preview/%2e%2e/nested/'],
	['absolute URL', 'https://example.com/preview/'],
	['malformed percent encoding', '/preview/%ZZ/'],
]) {
	test(`rejects EXPECTED_BASE with ${label}`, async () => {
		await withOutput({ 'index.html': '<p>Test</p>' }, async (outputDir) => {
			await assert.rejects(() => scanPreviewOutput({ outputDir, expectedBase }), /Invalid EXPECTED_BASE/u);
		});
	});
}

for (const [label, siteOrigin] of [
	['a non-HTTP scheme', 'ftp://semanticdefects.foundryside.dev'],
	['credentials', 'https://user:secret@semanticdefects.foundryside.dev'],
	['a path', 'https://semanticdefects.foundryside.dev/path'],
	['a query', 'https://semanticdefects.foundryside.dev?mode=test'],
	['a fragment', 'https://semanticdefects.foundryside.dev#section'],
	['a browser-normalized dot path', 'https://semanticdefects.foundryside.dev/.'],
	['a browser-normalized backslash path', 'https://semanticdefects.foundryside.dev\\'],
	['a relative value', 'semanticdefects.foundryside.dev'],
]) {
	test(`rejects SITE_ORIGIN with ${label}`, async () => {
		await withOutput({ 'index.html': '<p>Test</p>' }, async (outputDir) => {
			await assert.rejects(() => scanPreviewOutput({ outputDir, siteOrigin }), /Invalid SITE_ORIGIN/u);
		});
	});
}
