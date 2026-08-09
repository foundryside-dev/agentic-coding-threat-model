import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import matter from 'gray-matter';
import { parse } from 'yaml';

const ACF_IDS = [
	'ACF-S1', 'ACF-S2', 'ACF-S3', 'ACF-T1', 'ACF-T2', 'ACF-T3', 'ACF-R1', 'ACF-R2',
	'ACF-R3', 'ACF-R5', 'ACF-I1', 'ACF-D1', 'ACF-D2', 'ACF-E1', 'ACF-E2', 'ACF-S4',
	'ACF-S5', 'ACF-T4', 'ACF-R4', 'ACF-R6',
];
const ACF_METADATA_VALUES = {
	'ACF-S1': { name: 'Fabricated Default', stride: 'spoofing', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', portable_coverage: 'not-covered-bespoke-only', entry_status: 'core' },
	'ACF-S2': { name: 'Spurious Field Access', stride: 'spoofing', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', portable_coverage: 'not-covered-bespoke-only', entry_status: 'core' },
	'ACF-S3': { name: 'Structural Identity Spoofing', stride: 'spoofing', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', portable_coverage: 'not-covered-bespoke-only', entry_status: 'core' },
	'ACF-T1': { name: 'Authority Tier Conflation', stride: 'tampering', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'critical', detection_status: 'none', portable_coverage: 'covered', entry_status: 'core' },
	'ACF-T2': { name: 'Silent Coercion', stride: 'tampering', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'medium', detection_status: 'partial', portable_coverage: 'not-covered-bespoke-only', entry_status: 'core' },
	'ACF-T3': { name: 'Unstructured Signal Parsing', stride: 'tampering', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', portable_coverage: 'not-covered', entry_status: 'core' },
	'ACF-R1': { name: 'Audit Trail Destruction', stride: 'repudiation', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'known-class-agent-amplified', risk_level: 'high', detection_status: 'partial', portable_coverage: 'partial', entry_status: 'core' },
	'ACF-R2': { name: 'Partial Completion', stride: 'repudiation', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'known-class-agent-amplified', risk_level: 'high', detection_status: 'none', portable_coverage: 'partial', entry_status: 'core' },
	'ACF-R3': { name: 'Verification Displacement', stride: 'repudiation', failure_layer: 'context-collapse', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', detection_note: 'Partial (R3a) / None (R3b)', portable_coverage: 'not-covered', entry_status: 'core' },
	'ACF-R5': { name: 'Remediation-Induced Violation', stride: 'repudiation', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'none', portable_coverage: 'indirect-only', entry_status: 'core' },
	'ACF-I1': { name: 'Verbose Error Response', stride: 'information-disclosure', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'known-class-agent-amplified', risk_level: 'medium', detection_status: 'partial', portable_coverage: 'not-covered', entry_status: 'core' },
	'ACF-D1': { name: 'Finding Flood', stride: 'denial-of-service', failure_layer: 'process-volume', entry_type: 'process-threat', relation: 'agent-specific', risk_level: 'high', detection_status: 'na', portable_coverage: 'na-design-constraint', entry_status: 'core' },
	'ACF-D2': { name: 'Review Capacity Exhaustion', stride: 'denial-of-service', failure_layer: 'process-volume', entry_type: 'process-threat', relation: 'agent-specific', risk_level: 'high', detection_status: 'na', portable_coverage: 'na-design-constraint', entry_status: 'core' },
	'ACF-E1': { name: 'Implicit Privilege Grant', stride: 'elevation-of-privilege', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'critical', detection_status: 'none', portable_coverage: 'covered', entry_status: 'core' },
	'ACF-E2': { name: 'Unvalidated Delegation', stride: 'elevation-of-privilege', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'known-class-agent-amplified', risk_level: 'high', detection_status: 'partial', portable_coverage: 'partial', entry_status: 'core' },
	'ACF-S4': { name: 'Type Annotation Erosion', stride: 'spoofing', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', portable_coverage: 'not-covered', entry_status: 'provisional' },
	'ACF-S5': { name: 'Type Structure Avoidance', stride: 'spoofing', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'high', detection_status: 'partial', portable_coverage: 'not-covered-bespoke-only', entry_status: 'provisional' },
	'ACF-T4': { name: 'Safety Guard Erosion', stride: 'tampering', failure_layer: 'training-bias', entry_type: 'code-pattern', relation: 'agent-specific', risk_level: 'medium', detection_status: 'none', portable_coverage: 'not-covered', entry_status: 'provisional' },
	'ACF-R4': { name: 'Context Handover Assumption', stride: 'repudiation', failure_layer: 'context-collapse', entry_type: 'workflow-pattern', relation: 'agent-specific', risk_level: 'medium', detection_status: 'partial', portable_coverage: 'not-covered', entry_status: 'provisional' },
	'ACF-R6': { name: 'Scope-Limited Triage', stride: 'repudiation', failure_layer: 'context-collapse', entry_type: 'workflow-pattern', relation: 'agent-specific', risk_level: 'medium', detection_status: 'none', portable_coverage: 'not-covered', entry_status: 'provisional' },
};
const PYTHON_SPECIFIC_ACF = new Set(['ACF-S1', 'ACF-S2', 'ACF-S3', 'ACF-S4']);
export const ACF_METADATA = Object.freeze(Object.fromEntries(
	Object.entries(ACF_METADATA_VALUES).map(([id, metadata]) => [id, Object.freeze({
		...metadata,
		language_generality: PYTHON_SPECIFIC_ACF.has(id) ? 'python-specific' : 'language-general',
	})]),
));
const RULE_IDS = [
	...Array.from({ length: 26 }, (_, index) => `PY-WL-${101 + index}`),
	'RS-WL-108',
	'RS-WL-112',
];
const BOUNDARY_RULE_IDS = [
	'PY-WL-101', 'PY-WL-102', 'PY-WL-103', 'PY-WL-104', 'PY-WL-105', 'PY-WL-109',
	'PY-WL-110', 'PY-WL-111', 'PY-WL-113', 'PY-WL-114', 'PY-WL-119', 'PY-WL-120',
];
const LATTICE_TUPLES = [
	['integral', 'INTEGRAL', 0, 'declared'],
	['assured', 'ASSURED', 1, 'declared'],
	['guarded', 'GUARDED', 2, 'declared'],
	['unknown-assured', 'UNKNOWN_ASSURED', 3, 'inferred'],
	['unknown-guarded', 'UNKNOWN_GUARDED', 4, 'inferred'],
	['external-raw', 'EXTERNAL_RAW', 5, 'declared'],
	['unknown-raw', 'UNKNOWN_RAW', 6, 'inferred'],
	['mixed-raw', 'MIXED_RAW', 7, 'inferred'],
];

export const EXPECTED = Object.freeze({
	acf: Object.freeze(ACF_IDS),
	rules: Object.freeze(RULE_IDS),
	boundaryRules: Object.freeze(BOUNDARY_RULE_IDS),
	latticeIds: Object.freeze(LATTICE_TUPLES.map(([id]) => id)),
	latticeStates: Object.freeze(LATTICE_TUPLES.map(([, state]) => state)),
});

const expectedAcf = new Set(EXPECTED.acf);
const expectedRules = new Set(EXPECTED.rules);
const expectedBoundaryRules = new Set(EXPECTED.boundaryRules);
const expectedLatticeIds = new Set(EXPECTED.latticeIds);
const expectedLatticeStates = new Set(EXPECTED.latticeStates);
const expectedLatticeById = new Map(LATTICE_TUPLES.map((tuple) => [tuple[0], tuple]));
const forbiddenCoverage = new Set(['not-covered', 'not-covered-bespoke-only', 'na-design-constraint']);
const ACF_EXTENSIONS = new Set(['.md', '.mdx', '.markdown', '.mdown', '.mkdn', '.mkd', '.mdwn']);

const ACF_FIELDS = new Set([
	'id', 'name', 'stride', 'failure_layer', 'entry_type', 'relation', 'risk_level',
	'detection_status', 'detection_note', 'portable_coverage', 'entry_status',
	'language_generality', 'related',
]);
const RULE_FIELDS = new Set([
	'id', 'language', 'family', 'base_severity', 'maturity', 'summary', 'cwes', 'covers_acf',
]);
const LATTICE_FIELDS = new Set(['id', 'rank', 'state', 'origin', 'set_by', 'meaning', 'colour']);

function isRecord(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function relativeName(root, file) {
	return path.relative(root, file).split(path.sep).join('/');
}

function diagnostic(errors, file, message) {
	errors.push(`${file}: ${message}`);
}

function requireString(record, field, file, errors) {
	if (typeof record[field] !== 'string' || record[field].trim() === '') {
		diagnostic(errors, file, `${field} must be a non-empty string`);
		return false;
	}
	return true;
}

function requireEnum(record, field, values, file, errors) {
	if (!values.includes(record[field])) {
		diagnostic(errors, file, `${field} must be one of ${values.join(', ')}`);
		return false;
	}
	return true;
}

function requireStringArray(record, field, file, errors, { defaultEmpty = false } = {}) {
	if (defaultEmpty && record[field] === undefined) {
		record[field] = [];
		return true;
	}
	if (!Array.isArray(record[field]) || record[field].some((value) => typeof value !== 'string')) {
		diagnostic(errors, file, `${field} must be an array of strings`);
		return false;
	}
	return true;
}

function rejectUnknownFields(record, allowed, file, errors) {
	for (const field of Object.keys(record)) {
		if (!allowed.has(field)) diagnostic(errors, file, `unexpected field ${field}`);
	}
}

function validateAcfShape(record, file, errors) {
	if (!isRecord(record)) {
		diagnostic(errors, file, 'acf block must be an object');
		return false;
	}
	rejectUnknownFields(record, ACF_FIELDS, file, errors);
	requireString(record, 'id', file, errors);
	requireString(record, 'name', file, errors);
	requireEnum(record, 'stride', ['spoofing', 'tampering', 'repudiation', 'information-disclosure', 'denial-of-service', 'elevation-of-privilege'], file, errors);
	requireEnum(record, 'failure_layer', ['training-bias', 'context-collapse', 'process-volume'], file, errors);
	requireEnum(record, 'entry_type', ['code-pattern', 'process-threat', 'workflow-pattern'], file, errors);
	requireEnum(record, 'relation', ['agent-specific', 'known-class-agent-amplified'], file, errors);
	requireEnum(record, 'risk_level', ['critical', 'high', 'medium'], file, errors);
	requireEnum(record, 'detection_status', ['none', 'partial', 'na'], file, errors);
	if (record.detection_note !== undefined && (typeof record.detection_note !== 'string' || record.detection_note.trim() === '')) {
		diagnostic(errors, file, 'detection_note must be a non-empty string when present');
	}
	requireEnum(record, 'portable_coverage', ['covered', 'partial', 'not-covered', 'not-covered-bespoke-only', 'na-design-constraint', 'indirect-only'], file, errors);
	requireEnum(record, 'entry_status', ['core', 'provisional'], file, errors);
	requireEnum(record, 'language_generality', ['language-general', 'python-specific'], file, errors);
	requireStringArray(record, 'related', file, errors, { defaultEmpty: true });
	return typeof record.id === 'string';
}

function validateRuleShape(record, file, errors) {
	if (!isRecord(record)) {
		diagnostic(errors, file, 'rule document must be an object');
		return false;
	}
	rejectUnknownFields(record, RULE_FIELDS, file, errors);
	requireString(record, 'id', file, errors);
	requireEnum(record, 'language', ['python', 'rust'], file, errors);
	requireEnum(record, 'family', ['boundary', 'sink'], file, errors);
	requireEnum(record, 'base_severity', ['ERROR', 'WARN', 'INFO'], file, errors);
	requireEnum(record, 'maturity', ['stable', 'preview'], file, errors);
	requireString(record, 'summary', file, errors);
	if (requireStringArray(record, 'cwes', file, errors, { defaultEmpty: true })) {
		for (const cwe of record.cwes) {
			if (!/^CWE-\d+$/u.test(cwe)) diagnostic(errors, file, `invalid CWE ID ${cwe}`);
		}
	}
	requireStringArray(record, 'covers_acf', file, errors, { defaultEmpty: true });
	return typeof record.id === 'string';
}

function validateLatticeShape(record, file, errors, index) {
	const location = `${file}[${index}]`;
	if (!isRecord(record)) {
		diagnostic(errors, location, 'lattice row must be an object');
		return false;
	}
	rejectUnknownFields(record, LATTICE_FIELDS, location, errors);
	requireString(record, 'id', location, errors);
	if (!Number.isInteger(record.rank) || record.rank < 0 || record.rank > 7) {
		diagnostic(errors, location, 'rank must be an integer from 0 through 7');
	}
	requireString(record, 'state', location, errors);
	requireEnum(record, 'origin', ['declared', 'inferred'], location, errors);
	requireString(record, 'set_by', location, errors);
	requireString(record, 'meaning', location, errors);
	if (typeof record.colour !== 'string' || !/^#[0-9a-f]{6}$/iu.test(record.colour)) {
		diagnostic(errors, location, 'colour must be a six-digit hexadecimal colour');
	}
	return typeof record.id === 'string';
}

async function flatFiles(directory, predicate) {
	try {
		return (await readdir(directory, { withFileTypes: true }))
			.filter((entry) => entry.isFile() && predicate(entry.name))
			.map((entry) => path.join(directory, entry.name))
			.sort();
	} catch (error) {
		if (error?.code === 'ENOENT') return [];
		throw error;
	}
}

async function recursiveFiles(directory, predicate) {
	let entries;
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch (error) {
		if (error?.code === 'ENOENT') return [];
		throw error;
	}
	const files = [];
	for (const entry of entries.toSorted((left, right) => left.name.localeCompare(right.name))) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...await recursiveFiles(entryPath, predicate));
		else if (entry.isFile() && predicate(entry.name)) files.push(entryPath);
	}
	return files;
}

function reportDuplicates(items, field, label, errors) {
	const firstFile = new Map();
	for (const item of items) {
		const value = item.record[field];
		if (value === undefined) continue;
		if (firstFile.has(value)) {
			diagnostic(errors, item.file, `Duplicate ${label} ${value}; first declared in ${firstFile.get(value)}`);
		} else {
			firstFile.set(value, item.file);
		}
	}
}

function reportMissing(expected, present, label, errors) {
	for (const value of expected) {
		if (!present.has(value)) errors.push(`Missing ${label} ${value}`);
	}
}

async function loadAcf(root, errors) {
	const directory = path.join(root, 'src/content/docs/acf');
	const files = await recursiveFiles(directory, (name) => {
		const extension = path.extname(name);
		const basename = path.basename(name, extension);
		return ACF_EXTENSIONS.has(extension) && basename !== 'index' && !basename.startsWith('_');
	});
	const entries = [];
	for (const absoluteFile of files) {
		const file = relativeName(directory, absoluteFile);
		try {
			const contents = await readFile(absoluteFile, 'utf8');
			const lines = contents.replace(/^\uFEFF/u, '').split(/\r?\n/u);
			if (lines[0] === '---' && !lines.slice(1).some((line) => line === '---')) {
				diagnostic(errors, file, 'malformed frontmatter: missing closing fence');
				continue;
			}
			const parsed = matter(contents, {});
			if (!Object.hasOwn(parsed.data, 'acf')) {
				diagnostic(errors, file, 'missing acf block in frontmatter');
				continue;
			}
			if (validateAcfShape(parsed.data.acf, file, errors)) entries.push({ file, record: parsed.data.acf });
		} catch (error) {
			diagnostic(errors, file, `malformed frontmatter: ${error.message}`);
		}
	}
	return entries;
}

async function loadRules(root, errors) {
	const directory = path.join(root, 'src/data/wardline-rules');
	const files = await flatFiles(directory, (name) => path.extname(name) === '.yaml');
	const entries = [];
	for (const absoluteFile of files) {
		const file = relativeName(root, absoluteFile);
		try {
			const record = parse(await readFile(absoluteFile, 'utf8'));
			if (validateRuleShape(record, file, errors)) entries.push({ file, record });
		} catch (error) {
			diagnostic(errors, file, `malformed YAML: ${error.message}`);
		}
	}
	return entries;
}

async function loadLattice(root, errors) {
	const absoluteFile = path.join(root, 'src/data/trust-lattice.yaml');
	const file = relativeName(root, absoluteFile);
	let document;
	try {
		document = parse(await readFile(absoluteFile, 'utf8'));
	} catch (error) {
		if (error?.code === 'ENOENT') diagnostic(errors, file, 'missing lattice document');
		else diagnostic(errors, file, `malformed YAML: ${error.message}`);
		return [];
	}
	if (!Array.isArray(document)) {
		diagnostic(errors, file, 'top level must be an array');
		return [];
	}
	const entries = [];
	for (const [index, record] of document.entries()) {
		if (validateLatticeShape(record, file, errors, index)) entries.push({ file: `${file}[${index}]`, record });
	}
	return entries;
}

function validateAcf(entries, errors) {
	reportDuplicates(entries, 'id', 'ACF ID', errors);
	for (const { file, record } of entries) {
		if (!expectedAcf.has(record.id)) diagnostic(errors, file, `Unexpected ACF ID ${record.id}`);
		const expectedMetadata = ACF_METADATA[record.id];
		if (expectedMetadata) {
			for (const [field, expectedValue] of Object.entries(expectedMetadata)) {
				if (record[field] !== expectedValue) {
					diagnostic(errors, file, `${record.id} ${field} must be ${JSON.stringify(expectedValue)}; got ${JSON.stringify(record[field])}`);
				}
			}
		}
		if (Array.isArray(record.related)) {
			const seenRelated = new Set();
			for (const target of record.related) {
				if (!expectedAcf.has(target)) diagnostic(errors, file, `${record.id} has unknown related ACF ID ${target}`);
				if (target === record.id) diagnostic(errors, file, `${record.id} related must not contain itself`);
				if (seenRelated.has(target)) diagnostic(errors, file, `${record.id} has duplicate related ACF ID ${target}`);
				seenRelated.add(target);
			}
		}
	}
}

function validateRules(entries, errors) {
	reportDuplicates(entries, 'id', 'rule ID', errors);
	for (const { file, record } of entries) {
		if (!expectedRules.has(record.id)) diagnostic(errors, file, `Unexpected rule ID ${record.id}`);
		const expectedLanguage = record.id.startsWith('PY-') ? 'python' : record.id.startsWith('RS-') ? 'rust' : undefined;
		if (expectedLanguage && record.language !== expectedLanguage) {
			diagnostic(errors, file, `${record.id} language must be ${expectedLanguage}; got ${record.language}`);
		}
		if (expectedRules.has(record.id)) {
			const expectedFamily = expectedBoundaryRules.has(record.id) ? 'boundary' : 'sink';
			if (record.family !== expectedFamily) {
				diagnostic(errors, file, `${record.id} family must be ${expectedFamily}; got ${record.family}`);
			}
		}
		if (Array.isArray(record.covers_acf)) {
			const seenCoverage = new Set();
			for (const target of record.covers_acf) {
				if (!expectedAcf.has(target)) diagnostic(errors, file, `${record.id} covers unknown ACF ID ${target}`);
				if (seenCoverage.has(target)) diagnostic(errors, file, `${record.id} has duplicate covers_acf ${target}`);
				seenCoverage.add(target);
			}
		}
		if (Array.isArray(record.cwes)) {
			const seenCwes = new Set();
			for (const cwe of record.cwes) {
				if (seenCwes.has(cwe)) diagnostic(errors, file, `${record.id} has duplicate cwes ${cwe}`);
				seenCwes.add(cwe);
			}
		}
	}
}

function validateLattice(entries, errors) {
	reportDuplicates(entries, 'id', 'lattice ID', errors);
	reportDuplicates(entries, 'state', 'lattice state', errors);
	reportDuplicates(entries, 'rank', 'lattice rank', errors);
	for (const { file, record } of entries) {
		if (!expectedLatticeIds.has(record.id)) diagnostic(errors, file, `Unexpected lattice ID ${record.id}`);
		if (!expectedLatticeStates.has(record.state)) diagnostic(errors, file, `Unexpected lattice state ${record.state}`);
		if (!Number.isInteger(record.rank) || record.rank < 0 || record.rank > 7) {
			diagnostic(errors, file, `Unexpected lattice rank ${record.rank}`);
		}
		const tuple = expectedLatticeById.get(record.id);
		if (!tuple) continue;
		const [, state, rank, origin] = tuple;
		if (record.state !== state) diagnostic(errors, file, `${record.id} expected state ${state}; got ${record.state}`);
		if (record.rank !== rank) diagnostic(errors, file, `${record.id} expected rank ${rank}; got ${record.rank}`);
		if (record.origin !== origin) diagnostic(errors, file, `${record.id} expected origin ${origin}; got ${record.origin}`);
	}
}

function validateCrossRegistry(acfEntries, ruleEntries, mode, errors) {
	const acfById = new Map();
	for (const entry of acfEntries) if (!acfById.has(entry.record.id)) acfById.set(entry.record.id, entry);
	const coveredBy = new Map();
	for (const rule of ruleEntries) {
		if (!Array.isArray(rule.record.covers_acf)) continue;
		for (const target of rule.record.covers_acf) {
			if (!coveredBy.has(target)) coveredBy.set(target, []);
			coveredBy.get(target).push(rule);
			const acf = acfById.get(target);
			if (acf && forbiddenCoverage.has(acf.record.portable_coverage)) {
				diagnostic(errors, rule.file, `${rule.record.id} covers ${target} but portable_coverage is ${acf.record.portable_coverage}`);
			}
			if (mode === 'strict' && expectedAcf.has(target) && !acf) {
				diagnostic(errors, rule.file, `${rule.record.id} covers absent ACF target ${target}`);
			}
		}
	}

	if (mode !== 'strict') return;
	for (const { file, record } of acfEntries) {
		if (Array.isArray(record.related)) {
			for (const target of record.related) {
				const targetEntry = acfById.get(target);
				if (!targetEntry) {
					diagnostic(errors, file, `${record.id} related target ${target} is absent`);
				} else if (!Array.isArray(targetEntry.record.related) || !targetEntry.record.related.includes(record.id)) {
					diagnostic(errors, file, `${record.id} related target ${target} is not symmetric`);
				}
			}
		}
		if (record.portable_coverage === 'covered' || record.portable_coverage === 'partial') {
			if (!coveredBy.has(record.id)) {
				diagnostic(errors, file, `${record.id} is ${record.portable_coverage} but has no covering rule`);
			}
		}
	}
}

export async function checkRegistry(root, mode = 'partial') {
	if (mode !== 'partial' && mode !== 'strict') {
		throw new TypeError(`Invalid registry mode ${JSON.stringify(mode)}; expected partial or strict`);
	}
	const errors = [];
	const acfEntries = await loadAcf(root, errors);
	validateAcf(acfEntries, errors);
	const ruleEntries = await loadRules(root, errors);
	validateRules(ruleEntries, errors);
	const latticeEntries = await loadLattice(root, errors);
	validateLattice(latticeEntries, errors);
	validateCrossRegistry(acfEntries, ruleEntries, mode, errors);

	if (mode === 'strict') {
		reportMissing(EXPECTED.acf, new Set(acfEntries.map(({ record }) => record.id)), 'ACF ID', errors);
		reportMissing(EXPECTED.rules, new Set(ruleEntries.map(({ record }) => record.id)), 'rule ID', errors);
		reportMissing(EXPECTED.latticeIds, new Set(latticeEntries.map(({ record }) => record.id)), 'lattice ID', errors);
		reportMissing(EXPECTED.latticeStates, new Set(latticeEntries.map(({ record }) => record.state)), 'lattice state', errors);
		reportMissing([...Array(8).keys()], new Set(latticeEntries.map(({ record }) => record.rank)), 'lattice rank', errors);
	}

	return {
		errors,
		counts: { acf: acfEntries.length, rules: ruleEntries.length, lattice: latticeEntries.length },
	};
}

async function main() {
	const modeArgument = process.argv.slice(2).find((argument) => argument.startsWith('--mode='));
	const unexpectedArguments = process.argv.slice(2).filter((argument) => argument !== modeArgument);
	if (unexpectedArguments.length > 0) throw new TypeError(`Unexpected argument ${unexpectedArguments[0]}`);
	const mode = modeArgument?.slice('--mode='.length) ?? 'partial';
	const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
	const result = await checkRegistry(root, mode);
	if (result.errors.length > 0) {
		for (const error of result.errors) console.error(error);
		process.exitCode = 1;
		return;
	}
	const { acf, rules, lattice: latticeCount } = result.counts;
	console.log(`Registry consistency OK [${mode}] (${acf} ACF entries, ${rules} rules, ${latticeCount} lattice states)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
