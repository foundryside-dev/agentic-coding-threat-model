import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { checkRegistry, EXPECTED } from '../scripts/check-registry.mjs';

async function withRegistry(files, run) {
	const root = await mkdtemp(path.join(os.tmpdir(), 'registry-check-'));
	try {
		for (const [relativePath, contents] of Object.entries(files)) {
			const filePath = path.join(root, relativePath);
			await mkdir(path.dirname(filePath), { recursive: true });
			await writeFile(filePath, contents);
		}
		return await run(root);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}

const integralLattice = `
- id: integral
  rank: 0
  state: INTEGRAL
  origin: declared
  set_by: test
  meaning: test
  colour: "#000000"
`;

const latticeTuples = [
	['integral', 'INTEGRAL', 0, 'declared'],
	['assured', 'ASSURED', 1, 'declared'],
	['guarded', 'GUARDED', 2, 'declared'],
	['unknown-assured', 'UNKNOWN_ASSURED', 3, 'inferred'],
	['unknown-guarded', 'UNKNOWN_GUARDED', 4, 'inferred'],
	['external-raw', 'EXTERNAL_RAW', 5, 'declared'],
	['unknown-raw', 'UNKNOWN_RAW', 6, 'inferred'],
	['mixed-raw', 'MIXED_RAW', 7, 'inferred'],
];

const CANONICAL_ACF = {
	'ACF-S1': { name: 'Fabricated Default', stride: 'spoofing', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', portable_coverage: 'not-covered-bespoke-only', entry_status: 'core', language_generality: 'python-specific' },
	'ACF-S2': { name: 'Spurious Field Access', stride: 'spoofing', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', portable_coverage: 'not-covered-bespoke-only', entry_status: 'core', language_generality: 'python-specific' },
	'ACF-S3': { name: 'Structural Identity Spoofing', stride: 'spoofing', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', portable_coverage: 'not-covered-bespoke-only', entry_status: 'core', language_generality: 'python-specific' },
	'ACF-T1': { name: 'Authority Tier Conflation', stride: 'tampering', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'critical', detection_status: 'none', portable_coverage: 'covered', entry_status: 'core', language_generality: 'language-general' },
	'ACF-T2': { name: 'Silent Coercion', stride: 'tampering', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'medium', detection_status: 'partial', portable_coverage: 'not-covered-bespoke-only', entry_status: 'core', language_generality: 'language-general' },
	'ACF-T3': { name: 'Unstructured Signal Parsing', stride: 'tampering', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', portable_coverage: 'not-covered', entry_status: 'core', language_generality: 'language-general' },
	'ACF-R1': { name: 'Audit Trail Destruction', stride: 'repudiation', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'known-class-agent-amplified', risk_level: 'high', detection_status: 'partial', portable_coverage: 'partial', entry_status: 'core', language_generality: 'language-general' },
	'ACF-R2': { name: 'Partial Completion', stride: 'repudiation', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'known-class-agent-amplified', risk_level: 'high', detection_status: 'none', portable_coverage: 'partial', entry_status: 'core', language_generality: 'language-general' },
	'ACF-R3': { name: 'Verification Displacement', stride: 'repudiation', failure_layer: 'context-collapse', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', detection_note: 'Partial (R3a) / None (R3b)', portable_coverage: 'not-covered', entry_status: 'core', language_generality: 'language-general' },
	'ACF-R5': { name: 'Remediation-Induced Violation', stride: 'repudiation', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'none', portable_coverage: 'indirect-only', entry_status: 'core', language_generality: 'language-general' },
	'ACF-I1': { name: 'Verbose Error Response', stride: 'information-disclosure', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'known-class-agent-amplified', risk_level: 'medium', detection_status: 'partial', portable_coverage: 'not-covered', entry_status: 'core', language_generality: 'language-general' },
	'ACF-D1': { name: 'Finding Flood', stride: 'denial-of-service', failure_layer: 'process-volume', entry_type: 'process-threat', relation: 'agent-specific', risk_level: 'high', detection_status: 'na', portable_coverage: 'na-design-constraint', entry_status: 'core', language_generality: 'language-general' },
	'ACF-D2': { name: 'Review Capacity Exhaustion', stride: 'denial-of-service', failure_layer: 'process-volume', entry_type: 'process-threat', relation: 'agent-specific', risk_level: 'high', detection_status: 'na', portable_coverage: 'na-design-constraint', entry_status: 'core', language_generality: 'language-general' },
	'ACF-E1': { name: 'Implicit Privilege Grant', stride: 'elevation-of-privilege', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'critical', detection_status: 'none', portable_coverage: 'covered', entry_status: 'core', language_generality: 'language-general' },
	'ACF-E2': { name: 'Unvalidated Delegation', stride: 'elevation-of-privilege', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'known-class-agent-amplified', risk_level: 'high', detection_status: 'partial', portable_coverage: 'partial', entry_status: 'core', language_generality: 'language-general' },
	'ACF-S4': { name: 'Type Annotation Erosion', stride: 'spoofing', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', portable_coverage: 'not-covered', entry_status: 'provisional', language_generality: 'python-specific' },
	'ACF-S5': { name: 'Type Structure Avoidance', stride: 'spoofing', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', portable_coverage: 'not-covered-bespoke-only', entry_status: 'provisional', language_generality: 'language-general' },
	'ACF-T4': { name: 'Safety Guard Erosion', stride: 'tampering', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'medium', detection_status: 'none', portable_coverage: 'not-covered', entry_status: 'provisional', language_generality: 'language-general' },
	'ACF-R4': { name: 'Context Handover Assumption', stride: 'repudiation', failure_layer: 'context-collapse', entry_type: 'workflow-pattern', relation: 'agent-specific', risk_level: 'medium', detection_status: 'partial', portable_coverage: 'not-covered', entry_status: 'provisional', language_generality: 'language-general' },
	'ACF-R6': { name: 'Scope-Limited Triage', stride: 'repudiation', failure_layer: 'context-collapse', entry_type: 'workflow-pattern', relation: 'agent-specific', risk_level: 'medium', detection_status: 'none', portable_coverage: 'not-covered', entry_status: 'provisional', language_generality: 'language-general' },
};

const fallbackAcfMetadata = {
	name: 'Unknown test entry',
	stride: 'spoofing',
	failure_layer: 'training-bias',
	entry_type: 'code-pattern',
	relation: 'agent-specific',
	risk_level: 'high',
	detection_status: 'partial',
	portable_coverage: 'covered',
	entry_status: 'core',
};

function acf(id, { related = [], relatedValue, portableCoverage, metadataOverrides = {}, overrides = '' } = {}) {
	const metadata = { ...(CANONICAL_ACF[id] ?? fallbackAcfMetadata), ...metadataOverrides };
	if (portableCoverage !== undefined) metadata.portable_coverage = portableCoverage;
	return `---
title: ${id}
acf:
  id: ${id}
  name: ${metadata.name}
  stride: ${metadata.stride}
  failure_layer: ${metadata.failure_layer}
  entry_type: ${metadata.entry_type}
  relation: ${metadata.relation}
  risk_level: ${metadata.risk_level}
  detection_status: ${metadata.detection_status}
  detection_note: ${metadata.detection_note ?? 'test'}
  portable_coverage: ${metadata.portable_coverage}
  entry_status: ${metadata.entry_status}
  language_generality: ${metadata.language_generality ?? 'language-general'}
  related: ${relatedValue ?? `[${related.join(', ')}]`}
${overrides}---
Test.
`;
}

function rule(id, { covers = [], coversValue, cwes = [], language, family, overrides = '' } = {}) {
	const inferredLanguage = id.startsWith('RS-') ? 'rust' : 'python';
	const inferredFamily = EXPECTED.boundaryRules.includes(id) ? 'boundary' : 'sink';
	return `id: ${id}
language: ${language ?? inferredLanguage}
family: ${family ?? inferredFamily}
base_severity: ERROR
maturity: stable
summary: Test ${id}
cwes: [${cwes.join(', ')}]
covers_acf: ${coversValue ?? `[${covers.join(', ')}]`}
${overrides}`;
}

function lattice(rows = latticeTuples) {
	return rows.map(([id, state, rank, origin]) => `- id: ${id}
  rank: ${rank}
  state: ${state}
  origin: ${origin}
  set_by: test
  meaning: test
  colour: "#000000"`).join('\n');
}

function assertErrorsContain(result, ...substrings) {
	for (const substring of substrings) {
		assert.ok(
			result.errors.some((error) => error.includes(substring)),
			`Expected an error containing ${JSON.stringify(substring)}; got:\n${result.errors.join('\n')}`,
		);
	}
}

test('partial accepts no ACF or rules and one canonical lattice row', async () => {
	await withRegistry({ 'src/data/trust-lattice.yaml': integralLattice }, async (root) => {
		assert.deepEqual(await checkRegistry(root), {
			errors: [],
			counts: { acf: 0, rules: 0, lattice: 1 },
		});
	});
});

test('partial recursively scans ACF files, excludes nested indexes, and reports ACF-relative paths', async () => {
	await withRegistry({
		'src/content/docs/acf/nested/s1.md': acf('ACF-S1'),
		'src/content/docs/acf/nested/index.mdx': acf('ACF-X9'),
		'src/content/docs/acf/deeper/bad.md': '---\nacf: [unterminated\n---\n',
		'src/data/trust-lattice.yaml': integralLattice,
	}, async (root) => {
		const result = await checkRegistry(root);
		assert.equal(result.counts.acf, 1);
		assertErrorsContain(result, 'deeper/bad.md: malformed frontmatter:');
		assert.ok(!result.errors.some((error) => error.includes('index.mdx')), result.errors.join('\n'));
	});
});

test('loader parity accepts exact lowercase content extensions and ignores excluded names and uppercase variants', async () => {
	await withRegistry({
		'src/content/docs/acf/acf-s1.md': acf('ACF-S1'),
		'src/content/docs/acf/acf-s2.mdx': acf('ACF-S2'),
		'src/content/docs/acf/nested/acf-s3.markdown': acf('ACF-S3'),
		'src/content/docs/acf/acf-t1.mdown': acf('ACF-T1'),
		'src/content/docs/acf/acf-t2.mkdn': acf('ACF-T2'),
		'src/content/docs/acf/acf-t3.mkd': acf('ACF-T3'),
		'src/content/docs/acf/acf-r1.mdwn': acf('ACF-R1'),
		'src/content/docs/acf/_ignored.md': acf('ACF-X9'),
		'src/content/docs/acf/nested/index.markdown': acf('ACF-X8'),
		'src/content/docs/acf/uppercase.MD': acf('ACF-X7'),
		'src/data/wardline-rules/lower.yaml': rule('PY-WL-101'),
		'src/data/wardline-rules/upper.YAML': rule('PY-WL-999'),
		'src/data/trust-lattice.yaml': integralLattice,
	}, async (root) => {
		assert.deepEqual(await checkRegistry(root), {
			errors: [],
			counts: { acf: 7, rules: 1, lattice: 1 },
		});
	});
});

test('invalid mode throws an actionable error', async () => {
	await assert.rejects(() => checkRegistry('/unused', 'lenient'), /Invalid registry mode.*lenient/);
});

test('independent canonical ACF test catalog has the exact expected cardinality and IDs', () => {
	assert.equal(Object.keys(CANONICAL_ACF).length, 20);
	assert.deepEqual(Object.keys(CANONICAL_ACF).toSorted(), EXPECTED.acf.toSorted());
});

const invariantFields = ['name', 'stride', 'failure_layer', 'entry_type', 'relation', 'risk_level', 'detection_status', 'portable_coverage', 'entry_status', 'language_generality'];
const alternateValues = {
	name: (value) => `${value} altered`,
	stride: (value) => value === 'spoofing' ? 'tampering' : 'spoofing',
	failure_layer: (value) => value === 'training-bias' ? 'context-collapse' : 'training-bias',
	entry_type: (value) => value === 'code-pattern' ? 'workflow-pattern' : 'code-pattern',
	relation: (value) => value === 'agent-specific' ? 'known-class-agent-amplified' : 'agent-specific',
	risk_level: (value) => value === 'high' ? 'medium' : 'high',
	detection_status: (value) => value === 'partial' ? 'none' : 'partial',
	portable_coverage: (value) => value === 'covered' ? 'partial' : 'covered',
	entry_status: (value) => value === 'core' ? 'provisional' : 'core',
	language_generality: (value) => value === 'python-specific' ? 'language-general' : 'python-specific',
};

for (const [index, [id, metadata]] of Object.entries(CANONICAL_ACF).entries()) {
	const field = invariantFields[index % invariantFields.length];
	const mutated = alternateValues[field](metadata[field]);
	test(`partial rejects canonical metadata mutation for ${id} field ${field}`, async () => {
		await withRegistry({
			[`src/content/docs/acf/${id.toLowerCase()}.md`]: acf(id, { metadataOverrides: { [field]: mutated } }),
			'src/data/trust-lattice.yaml': integralLattice,
		}, async (root) => {
			assertErrorsContain(
				await checkRegistry(root),
				`${id.toLowerCase()}.md: ${id} ${field} must be ${JSON.stringify(metadata[field])}; got ${JSON.stringify(mutated)}`,
			);
		});
	});
}

test('partial rejects the exact canonical ACF-R3 detection note mutation', async () => {
	await withRegistry({
		'src/content/docs/acf/acf-r3.md': acf('ACF-R3', { metadataOverrides: { detection_note: 'Partial' } }),
		'src/data/trust-lattice.yaml': integralLattice,
	}, async (root) => {
		assertErrorsContain(
			await checkRegistry(root),
			'acf-r3.md: ACF-R3 detection_note must be "Partial (R3a) / None (R3b)"; got "Partial"',
		);
	});
});

test('partial reports malformed frontmatter and YAML with file names and keeps aggregating', async () => {
	await withRegistry({
		'src/content/docs/acf/bad.md': '---\nacf: [unterminated\n---\n',
		'src/data/wardline-rules/bad.yaml': 'id: [unterminated',
		'src/data/trust-lattice.yaml': '- id: [unterminated',
	}, async (root) => {
		const result = await checkRegistry(root);
		assertErrorsContain(
			result,
			'bad.md: malformed frontmatter:',
			'src/data/wardline-rules/bad.yaml: malformed YAML:',
			'src/data/trust-lattice.yaml: malformed YAML:',
		);
		assert.ok(result.errors.length >= 3, result.errors.join('\n'));
	});
});

test('diagnostics are deterministically ordered ACF then rules then lattice', async () => {
	await withRegistry({
		'src/content/docs/acf/bad.md': '---\nacf: [unterminated\n---\n',
		'src/data/wardline-rules/bad.yaml': 'id: [unterminated',
		'src/data/trust-lattice.yaml': '- id: [unterminated',
	}, async (root) => {
		const runs = [];
		for (let index = 0; index < 5; index += 1) runs.push(await checkRegistry(root));
		for (const result of runs) {
			assert.equal(result.errors.length, 3);
			assert.ok(result.errors[0].startsWith('bad.md: malformed frontmatter:'), result.errors.join('\n'));
			assert.ok(result.errors[1].startsWith('src/data/wardline-rules/bad.yaml: malformed YAML:'), result.errors.join('\n'));
			assert.ok(result.errors[2].startsWith('src/data/trust-lattice.yaml: malformed YAML:'), result.errors.join('\n'));
		}
		assert.ok(runs.every((result) => JSON.stringify(result.errors) === JSON.stringify(runs[0].errors)));
	});
});

test('partial reports an unterminated frontmatter fence as malformed', async () => {
	await withRegistry({
		'src/content/docs/acf/unterminated.md': '---\nacf:\n  id: ACF-S1\n',
		'src/data/trust-lattice.yaml': integralLattice,
	}, async (root) => {
		const result = await checkRegistry(root);
		assertErrorsContain(result, 'unterminated.md', 'malformed frontmatter: missing closing fence');
	});
});

test('partial rejects unknown and duplicate ACF and rule IDs without silent overwrite', async () => {
	await withRegistry({
		'src/content/docs/acf/one.md': acf('ACF-S1'),
		'src/content/docs/acf/two.mdx': acf('ACF-S1'),
		'src/content/docs/acf/unknown.md': acf('ACF-X9'),
		'src/content/docs/acf/index.md': acf('ACF-X8'),
		'src/data/wardline-rules/one.yaml': rule('PY-WL-101'),
		'src/data/wardline-rules/two.yaml': rule('PY-WL-101'),
		'src/data/wardline-rules/unknown.yaml': rule('PY-WL-999'),
		'src/data/trust-lattice.yaml': integralLattice,
	}, async (root) => {
		const result = await checkRegistry(root);
		assertErrorsContain(result, 'Duplicate ACF ID ACF-S1', 'Unexpected ACF ID ACF-X9');
		assertErrorsContain(result, 'Duplicate rule ID PY-WL-101', 'Unexpected rule ID PY-WL-999');
		assert.equal(result.counts.acf, 3);
		assert.equal(result.counts.rules, 3);
	});
});

test('partial rejects duplicate lattice IDs, states, and ranks and a wrong canonical tuple', async () => {
	await withRegistry({
		'src/data/trust-lattice.yaml': lattice([
			['integral', 'INTEGRAL', 0, 'declared'],
			['integral', 'ASSURED', 1, 'declared'],
			['guarded', 'INTEGRAL', 0, 'inferred'],
			['not-real', 'NOT_REAL', 7, 'declared'],
		]),
	}, async (root) => {
		const result = await checkRegistry(root);
		assertErrorsContain(result, 'Duplicate lattice ID integral');
		assertErrorsContain(result, 'Duplicate lattice state INTEGRAL');
		assertErrorsContain(result, 'Duplicate lattice rank 0');
		assertErrorsContain(result, 'Unexpected lattice ID not-real');
		assertErrorsContain(result, 'integral', 'expected state INTEGRAL');
		assertErrorsContain(result, 'guarded', 'expected rank 2', 'expected origin declared');
	});
});

test('partial permits known related and covers targets that are not authored yet', async () => {
	await withRegistry({
		'src/content/docs/acf/s1.md': acf('ACF-S1', { related: ['ACF-S2'] }),
		'src/data/wardline-rules/rule.yaml': rule('PY-WL-101', { covers: ['ACF-S2'] }),
		'src/data/trust-lattice.yaml': integralLattice,
	}, async (root) => {
		assert.deepEqual((await checkRegistry(root)).errors, []);
	});
});

test('partial rejects a noncanonical related target with a file-qualified diagnostic', async () => {
	await withRegistry({
		'src/content/docs/acf/s1.md': acf('ACF-S1', { related: ['ACF-X9'] }),
		'src/data/trust-lattice.yaml': integralLattice,
	}, async (root) => {
		assertErrorsContain(
			await checkRegistry(root),
			's1.md: ACF-S1 has unknown related ACF ID ACF-X9',
		);
	});
});

test('partial rejects a noncanonical covers target with a file-qualified diagnostic', async () => {
	await withRegistry({
		'src/data/wardline-rules/rule.yaml': rule('PY-WL-101', { covers: ['ACF-X9'] }),
		'src/data/trust-lattice.yaml': integralLattice,
	}, async (root) => {
		assertErrorsContain(
			await checkRegistry(root),
			'src/data/wardline-rules/rule.yaml: PY-WL-101 covers unknown ACF ID ACF-X9',
		);
	});
});

test('partial rejects self-related and duplicate related ACF values', async () => {
	await withRegistry({
		'src/content/docs/acf/acf-s1.md': acf('ACF-S1', { related: ['ACF-S1', 'ACF-S2', 'ACF-S2'] }),
		'src/data/trust-lattice.yaml': integralLattice,
	}, async (root) => {
		const result = await checkRegistry(root);
		assertErrorsContain(result, 'acf-s1.md: ACF-S1 related must not contain itself');
		assertErrorsContain(result, 'acf-s1.md: ACF-S1 has duplicate related ACF ID ACF-S2');
	});
});

test('partial rejects duplicate covers_acf and cwes within a rule', async () => {
	await withRegistry({
		'src/data/wardline-rules/rule.yaml': rule('PY-WL-101', {
			covers: ['ACF-S1', 'ACF-S1'],
			cwes: ['CWE-79', 'CWE-79'],
		}),
		'src/data/trust-lattice.yaml': integralLattice,
	}, async (root) => {
		const result = await checkRegistry(root);
		assertErrorsContain(result, 'src/data/wardline-rules/rule.yaml: PY-WL-101 has duplicate covers_acf ACF-S1');
		assertErrorsContain(result, 'src/data/wardline-rules/rule.yaml: PY-WL-101 has duplicate cwes CWE-79');
	});
});

test('strict reports every missing canonical ACF, rule, lattice ID, state, and rank', async () => {
	await withRegistry({ 'src/data/trust-lattice.yaml': '[]\n' }, async (root) => {
		const result = await checkRegistry(root, 'strict');
		for (const id of EXPECTED.acf) assertErrorsContain(result, `Missing ACF ID ${id}`);
		for (const id of EXPECTED.rules) assertErrorsContain(result, `Missing rule ID ${id}`);
		for (const id of EXPECTED.latticeIds) assertErrorsContain(result, `Missing lattice ID ${id}`);
		for (const state of EXPECTED.latticeStates) assertErrorsContain(result, `Missing lattice state ${state}`);
		for (let rank = 0; rank < 8; rank += 1) assertErrorsContain(result, `Missing lattice rank ${rank}`);
	});
});

test('strict rejects asymmetric related links', async () => {
	await withRegistry({
		'src/content/docs/acf/s1.md': acf('ACF-S1', { related: ['ACF-S2'] }),
		'src/content/docs/acf/s2.md': acf('ACF-S2'),
		'src/data/trust-lattice.yaml': lattice(),
	}, async (root) => {
		assertErrorsContain(await checkRegistry(root, 'strict'), 'ACF-S1 related target ACF-S2 is not symmetric');
	});
});

test('strict rejects a known canonical related target that is absent', async () => {
	await withRegistry({
		'src/content/docs/acf/s1.md': acf('ACF-S1', { related: ['ACF-S2'] }),
		'src/data/trust-lattice.yaml': lattice(),
	}, async (root) => {
		assertErrorsContain(
			await checkRegistry(root, 'strict'),
			's1.md: ACF-S1 related target ACF-S2 is absent',
		);
	});
});

test('strict rejects covered or partial ACF without a covering rule', async () => {
	await withRegistry({
		'src/content/docs/acf/covered.md': acf('ACF-S1', { portableCoverage: 'covered' }),
		'src/content/docs/acf/partial.md': acf('ACF-S2', { portableCoverage: 'partial' }),
		'src/data/trust-lattice.yaml': lattice(),
	}, async (root) => {
		const result = await checkRegistry(root, 'strict');
		assertErrorsContain(result, 'ACF-S1 is covered but has no covering rule');
		assertErrorsContain(result, 'ACF-S2 is partial but has no covering rule');
	});
});

for (const portableCoverage of ['not-covered', 'not-covered-bespoke-only', 'na-design-constraint']) {
	test(`strict rejects a rule contradicting ${portableCoverage} coverage`, async () => {
		await withRegistry({
			'src/content/docs/acf/s1.md': acf('ACF-S1', { portableCoverage }),
			'src/data/wardline-rules/rule.yaml': rule('PY-WL-101', { covers: ['ACF-S1'] }),
			'src/data/trust-lattice.yaml': lattice(),
		}, async (root) => {
			assertErrorsContain(
				await checkRegistry(root, 'strict'),
				`PY-WL-101 covers ACF-S1 but portable_coverage is ${portableCoverage}`,
			);
		});
	});
}

test('rejects PY and RS language mismatches and boundary and sink family mismatches', async () => {
	await withRegistry({
		'src/data/wardline-rules/py-language.yaml': rule('PY-WL-101', { language: 'rust' }),
		'src/data/wardline-rules/rs-language.yaml': rule('RS-WL-108', { language: 'python' }),
		'src/data/wardline-rules/boundary.yaml': rule('PY-WL-102', { family: 'sink' }),
		'src/data/wardline-rules/sink.yaml': rule('PY-WL-106', { family: 'boundary' }),
		'src/data/trust-lattice.yaml': integralLattice,
	}, async (root) => {
		const result = await checkRegistry(root);
		assertErrorsContain(result, 'PY-WL-101 language must be python');
		assertErrorsContain(result, 'RS-WL-108 language must be rust');
		assertErrorsContain(result, 'PY-WL-102 family must be boundary');
		assertErrorsContain(result, 'PY-WL-106 family must be sink');
	});
});

test('reports missing and invalid top-level lattice documents', async () => {
	await withRegistry({}, async (root) => {
		assertErrorsContain(await checkRegistry(root), 'trust-lattice.yaml', 'missing');
	});
	await withRegistry({ 'src/data/trust-lattice.yaml': 'id: integral\n' }, async (root) => {
		assertErrorsContain(await checkRegistry(root), 'trust-lattice.yaml', 'top level must be an array');
	});
});

test('rejects missing ACF blocks and record type-shape errors', async () => {
	await withRegistry({
		'src/content/docs/acf/missing.md': '---\ntitle: Missing\n---\n',
		'src/content/docs/acf/bad.md': acf('ACF-S1', { relatedValue: 'not-an-array' }),
		'src/data/wardline-rules/bad.yaml': rule('PY-WL-101', { coversValue: 'not-an-array' }),
		'src/data/trust-lattice.yaml': integralLattice,
	}, async (root) => {
		const result = await checkRegistry(root);
		assertErrorsContain(result, 'missing.md', 'missing acf block');
		assertErrorsContain(result, 'bad.md', 'related must be an array');
		assertErrorsContain(result, 'bad.yaml', 'covers_acf must be an array');
	});
});

test('strict rejects covers targets that are canonical but absent', async () => {
	await withRegistry({
		'src/data/wardline-rules/rule.yaml': rule('PY-WL-101', { covers: ['ACF-S1'] }),
		'src/data/trust-lattice.yaml': lattice(),
	}, async (root) => {
		assertErrorsContain(await checkRegistry(root, 'strict'), 'PY-WL-101 covers absent ACF target ACF-S1');
	});
});

test('complete canonical registry passes strict mode with exact counts', async () => {
	const files = { 'src/data/trust-lattice.yaml': lattice() };
	for (const id of Object.keys(CANONICAL_ACF)) {
		files[`src/content/docs/acf/${id.toLowerCase()}.md`] = acf(id);
	}
	const requiredCoverage = Object.entries(CANONICAL_ACF)
		.filter(([, metadata]) => metadata.portable_coverage === 'covered' || metadata.portable_coverage === 'partial')
		.map(([id]) => id);
	for (const [index, id] of EXPECTED.rules.entries()) {
		files[`src/data/wardline-rules/${id.toLowerCase()}.yaml`] = rule(id, {
			covers: requiredCoverage[index] ? [requiredCoverage[index]] : [],
		});
	}

	await withRegistry(files, async (root) => {
		assert.deepEqual(await checkRegistry(root, 'strict'), {
			errors: [],
			counts: { acf: 20, rules: 28, lattice: 8 },
		});
	});
});
