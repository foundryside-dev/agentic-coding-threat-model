import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateBuiltLinks } from '../scripts/check-built-links.mjs';

async function outputFixture(t, files) {
	const outputDir = await mkdtemp(path.join(tmpdir(), 'built-links-'));
	t.after(() => rm(outputDir, { recursive: true, force: true }));
	for (const [relativePath, contents] of Object.entries(files)) {
		const filePath = path.join(outputDir, relativePath);
		await mkdir(path.dirname(filePath), { recursive: true });
		await writeFile(filePath, contents);
	}
	return outputDir;
}

test('accepts relative targets, assets, and fragments at root and preview bases', async (t) => {
	for (const base of ['/', '/preview/']) {
		const outputDir = await outputFixture(t, {
			'index.html': '<h1 id="home">Home</h1><a href="guide/#answer">Guide</a><a href="404/">Fallback</a><img src="asset.svg">',
			'guide/index.html': '<h2 id="answer">Answer</h2><a href="../#home">Home</a>',
			'404.html': '<h1>Not found</h1>',
			'asset.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
		});
		assert.deepEqual(await validateBuiltLinks({ outputDir, expectedBase: base }), []);
	}
});

test('reports every missing target', async (t) => {
	const outputDir = await outputFixture(t, {
		'index.html': '<a href="missing/">Missing page</a><img src="missing.svg">',
	});
	const diagnostics = await validateBuiltLinks({ outputDir, expectedBase: '/' });
	assert.equal(diagnostics.length, 2);
	assert.ok(diagnostics.every(({ kind }) => kind === 'missing-target'));
	assert.deepEqual(new Set(diagnostics.map(({ url }) => url)), new Set(['missing/', 'missing.svg']));
});

test('reports a missing fragment on an existing generated page', async (t) => {
	const outputDir = await outputFixture(t, {
		'index.html': '<a href="guide/#absent">Broken anchor</a>',
		'guide/index.html': '<h2 id="present">Present</h2>',
	});
	const diagnostics = await validateBuiltLinks({ outputDir, expectedBase: '/' });
	assert.equal(diagnostics.length, 1);
	assert.equal(diagnostics[0].kind, 'missing-fragment');
	assert.equal(diagnostics[0].fragment, 'absent');
});

test('reports same-origin links that escape the configured deployment base', async (t) => {
	const outputDir = await outputFixture(t, {
		'index.html': '<a href="/outside/">Escaped</a><a href="https://semanticdefects.foundryside.dev/also-outside/">Also escaped</a>',
	});
	const diagnostics = await validateBuiltLinks({ outputDir, expectedBase: '/preview/' });
	assert.equal(diagnostics.length, 2);
	assert.ok(diagnostics.every(({ kind }) => kind === 'base-escape'));
});
