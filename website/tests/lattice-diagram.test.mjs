import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parse } from 'yaml';

test('generates a WCAG-contrasting text colour for every canonical lattice node', async () => {
	let buildLatticeDiagramSource;
	try {
		({ buildLatticeDiagramSource } = await import('../src/lib/lattice-diagram.mjs'));
	} catch (error) {
		assert.fail(`Expected a testable lattice diagram source generator: ${error.message}`);
	}

	const states = parse(await readFile(new URL('../src/data/trust-lattice.yaml', import.meta.url), 'utf8'));
	const source = buildLatticeDiagramSource(states);
	const styleLines = source.split('\n').filter((line) => line.startsWith('style '));

	assert.deepEqual(styleLines, [
		'style integral fill:#1565C0,color:#fff',
		'style assured fill:#2E7D32,color:#fff',
		'style guarded fill:#7CB342,color:#000',
		'style unknown_assured fill:#FFB300,color:#000',
		'style unknown_guarded fill:#FFA000,color:#000',
		'style external_raw fill:#F57C00,color:#000',
		'style unknown_raw fill:#E64A19,color:#000',
		'style mixed_raw fill:#D32F2F,color:#fff',
	]);
});
