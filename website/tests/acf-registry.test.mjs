import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

import matter from 'gray-matter';

let registry = {};
try {
	registry = await import('../src/scripts/acf-registry.mjs');
} catch {
	// RED begins with the production module absent. Individual assertions below
	// report the required API instead of failing this test file during loading.
}

function requiredExport(name) {
	assert.equal(typeof registry[name], 'function', `acf-registry.mjs must export ${name}()`);
	return registry[name];
}

async function canonicalEntries() {
	const directory = new URL('../src/content/docs/acf/', import.meta.url);
	const files = (await readdir(directory)).filter((file) => file.endsWith('.md')).sort();
	return Promise.all(files.map(async (file) => {
		const parsed = matter(await readFile(new URL(file, directory), 'utf8'));
		return { contentId: `acf/${file.slice(0, -3)}`, ...parsed.data.acf };
	}));
}

class FakeSelect {
	constructor(facet) {
		this.dataset = { facet };
		this.value = '';
		this.listeners = [];
	}

	addEventListener(name, listener) {
		assert.equal(name, 'change');
		this.listeners.push(listener);
	}

	dispatchChange() {
		for (const listener of this.listeners) listener({ type: 'change', target: this });
	}
}

class FakeRoot {
	constructor(rows, facets = ['risk_level']) {
		this.rows = rows.map((dataset) => ({ dataset, hidden: false }));
		this.selects = facets.map((facet) => new FakeSelect(facet));
		this.status = { textContent: '' };
		this.empty = { hidden: true };
	}

	querySelectorAll(selector) {
		if (selector === '[data-acf-filters] select[data-facet]') return this.selects;
		if (selector === '[data-acf-entry]') return this.rows;
		throw new Error(`Unexpected selector: ${selector}`);
	}

	querySelector(selector) {
		if (selector === '[data-acf-results]') return this.status;
		if (selector === '[data-acf-empty]') return this.empty;
		throw new Error(`Unexpected selector: ${selector}`);
	}
}

class FakeDocument {
	constructor(roots) {
		this.roots = roots;
		this.listeners = new Map();
	}

	querySelectorAll(selector) {
		assert.equal(selector, '[data-acf-registry]');
		return this.roots;
	}

	addEventListener(name, listener) {
		this.listeners.set(name, listener);
	}

	dispatch(name) {
		this.listeners.get(name)?.();
	}
}

test('canonical registry prepares all 20 rows in deterministic ACF ID order', async () => {
	const createRegistryView = requiredExport('createRegistryView');
	const view = createRegistryView(await canonicalEntries());

	assert.equal(view.entries.length, 20);
	assert.deepEqual(view.entries.map((entry) => entry.id), [
		'ACF-D1', 'ACF-D2', 'ACF-E1', 'ACF-E2', 'ACF-I1', 'ACF-R1', 'ACF-R2',
		'ACF-R3', 'ACF-R4', 'ACF-R5', 'ACF-R6', 'ACF-S1', 'ACF-S2', 'ACF-S3',
		'ACF-S4', 'ACF-S5', 'ACF-T1', 'ACF-T2', 'ACF-T3', 'ACF-T4',
	]);
	assert.equal(view.showFilters, true);
});

test('canonical facets have the exact documented counts and critical means T1 plus E1', async () => {
	const filterEntries = requiredExport('filterEntries');
	const entries = await canonicalEntries();
	const count = (field, value) => filterEntries(entries, { [field]: value }).length;

	assert.deepEqual(['spoofing', 'tampering', 'repudiation', 'information-disclosure', 'denial-of-service', 'elevation-of-privilege'].map((value) => count('stride', value)), [5, 4, 6, 1, 2, 2]);
	assert.deepEqual(['critical', 'high', 'medium'].map((value) => count('risk_level', value)), [2, 13, 5]);
	assert.deepEqual(['none', 'partial', 'na'].map((value) => count('detection_status', value)), [6, 12, 2]);
	assert.deepEqual(['core', 'provisional'].map((value) => count('entry_status', value)), [15, 5]);
	assert.deepEqual(filterEntries(entries, { risk_level: 'critical' }).map((entry) => entry.id).sort(), ['ACF-E1', 'ACF-T1']);
});

test('combined filters intersect and an impossible combination produces zero rows', async () => {
	const filterEntries = requiredExport('filterEntries');
	const entries = await canonicalEntries();

	assert.deepEqual(
		filterEntries(entries, { risk_level: 'high', detection_status: 'none' }).map((entry) => entry.id).sort(),
		['ACF-R2', 'ACF-R5'],
	);
	assert.equal(filterEntries(entries, { risk_level: 'critical', detection_status: 'partial' }).length, 0);
});

test('two registry instances filter independently', () => {
	const createAcfRegistryController = requiredExport('createAcfRegistryController');
	const first = new FakeRoot([
		{ risk_level: 'critical' }, { risk_level: 'high' }, { risk_level: 'critical' },
	]);
	const second = new FakeRoot([{ risk_level: 'medium' }, { risk_level: 'high' }]);
	const document = new FakeDocument([first, second]);
	const controller = createAcfRegistryController({ document });

	controller.initAll();
	first.selects[0].value = 'critical';
	first.selects[0].dispatchChange();

	assert.deepEqual(first.rows.map((row) => row.hidden), [false, true, false]);
	assert.deepEqual(second.rows.map((row) => row.hidden), [false, false]);
	assert.equal(first.status.textContent, '2 entries shown');
	assert.equal(second.status.textContent, '2 entries shown');
});

test('install is idempotent and astro:page-load initialises replacement registry roots', () => {
	const createAcfRegistryController = requiredExport('createAcfRegistryController');
	const original = new FakeRoot([{ risk_level: 'high' }]);
	const document = new FakeDocument([original]);
	const controller = createAcfRegistryController({ document });

	controller.install();
	controller.install();
	controller.initAll();
	controller.initAll();
	assert.equal(original.selects[0].listeners.length, 1);
	assert.equal(document.listeners.size, 1);

	const replacement = new FakeRoot([{ risk_level: 'medium' }, { risk_level: 'high' }]);
	document.roots = [replacement];
	document.dispatch('astro:page-load');
	assert.equal(replacement.selects[0].listeners.length, 1);
	assert.equal(replacement.status.textContent, '2 entries shown');
});

test('fixed-category views expose exact counts and disable filter controls', async () => {
	const createRegistryView = requiredExport('createRegistryView');
	const entries = await canonicalEntries();
	const expected = new Map([
		['spoofing', 5], ['tampering', 4], ['repudiation', 6],
		['information-disclosure', 1], ['denial-of-service', 2], ['elevation-of-privilege', 2],
	]);

	for (const [stride, count] of expected) {
		const view = createRegistryView(entries, stride);
		assert.equal(view.entries.length, count, stride);
		assert.equal(view.showFilters, false, stride);
	}
});

test('entry hrefs use real content IDs and remain under the preview base', () => {
	const acfHref = requiredExport('acfHref');

	assert.equal(acfHref('/preview/', 'acf/s1-fabricated-default'), '/preview/acf/s1-fabricated-default/');
	assert.equal(acfHref('/preview/', 'acf/s2-spurious-field-access'), '/preview/acf/s2-spurious-field-access/');
	assert.equal(acfHref('/', 'acf/t1-authority-tier-conflation'), '/acf/t1-authority-tier-conflation/');
});

test('keyboard-compatible change updates visible status and zero state', () => {
	const createAcfRegistryController = requiredExport('createAcfRegistryController');
	const root = new FakeRoot([
		{ risk_level: 'critical', detection_status: 'none' },
		{ risk_level: 'high', detection_status: 'partial' },
	], ['risk_level', 'detection_status']);
	const controller = createAcfRegistryController({ document: new FakeDocument([root]) });
	controller.initAll();

	root.selects[0].value = 'critical';
	root.selects[0].dispatchChange();
	assert.equal(root.status.textContent, '1 entry shown');
	assert.equal(root.empty.hidden, true);

	root.selects[1].value = 'partial';
	root.selects[1].dispatchChange();
	assert.equal(root.status.textContent, '0 entries shown');
	assert.equal(root.empty.hidden, false);
});

test('component source declares typed props and semantic progressive-enhancement markup', async () => {
	let source = '';
	try {
		source = await readFile(new URL('../src/components/AcfRegistry.astro', import.meta.url), 'utf8');
	} catch {
		// The assertions below produce a focused RED when the component is absent.
	}

	assert.match(source, /type AcfPage\s*=/);
	assert.match(source, /interface Props/);
	assert.match(source, /<caption>/);
	assert.match(source, /<th scope="col">/);
	assert.match(source, /aria-live="polite"/);
	assert.match(source, /data-acf-empty/);
	assert.match(source, /\{!stride && \(/);
});

test('STRIDE index retains the source-governed across-time compounding evidence', async () => {
	const source = await readFile(
		new URL('../src/content/docs/threat-model/stride/index.mdx', import.meta.url),
		'utf8',
	);

	assert.match(source, /upstream representational choices can collapse the semantic distinctions that downstream code needs/);
	assert.match(source, /passed all automated checks and was only surfaced through four rounds of operator challenge/);
	assert.match(source, /\[case study evidence\]\(\.\.\/\.\.\/respond\/case-study\/\)/);
});

test('ACF index links Appendix A through the surviving About route', async () => {
	const source = await readFile(
		new URL('../src/content/docs/acf/index.mdx', import.meta.url),
		'utf8',
	);

	assert.match(source, /\[discussion paper's Appendix A\]\(\.\.\/reference\/about\/#the-paper\)/);
	assert.doesNotMatch(source, /understand\/paper/);
});
