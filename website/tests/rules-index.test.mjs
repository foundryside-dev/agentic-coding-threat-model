import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

import { parse } from 'yaml';
import { checkRegistry } from '../scripts/check-registry.mjs';

let rulesIndex = {};
try {
	rulesIndex = await import('../src/scripts/rules-index.mjs');
} catch {
	// RED begins before the production module exists. Assertions below report
	// the missing public seam rather than aborting this test file at import time.
}

function requiredExport(name) {
	assert.equal(typeof rulesIndex[name], 'function', `rules-index.mjs must export ${name}()`);
	return rulesIndex[name];
}

const EXPECTED_ROWS = [
	['PY-WL-101', 'python', 'boundary', 'ERROR', 'stable', 'A trust-anchored function returns data less trusted than the level it declares — untrusted data reaches a trusted producer with no validation', [], ['ACF-T1', 'ACF-E1']],
	['PY-WL-102', 'python', 'boundary', 'ERROR', 'stable', 'A trust boundary has no rejection path (no raise, no falsy-constant return) — so it cannot validate', [], []],
	['PY-WL-103', 'python', 'boundary', 'WARN', 'stable', 'A broad exception handler (bare except / Exception / BaseException) in a trusted-tier function', [], ['ACF-R1', 'ACF-R2']],
	['PY-WL-104', 'python', 'boundary', 'WARN', 'stable', 'An exception handler that silently swallows the error — body is only pass/.../continue/break or a bare constant expression', [], ['ACF-R1', 'ACF-R2']],
	['PY-WL-105', 'python', 'boundary', 'ERROR', 'stable', 'Untrusted data passed as an argument to a trusted producer at a call site', ['CWE-501'], ['ACF-T1', 'ACF-E1']],
	['PY-WL-106', 'python', 'sink', 'WARN', 'stable', 'Deserialisation — pickle/Unpickler/marshal/yaml.load/shelve, plus a curated third-party table (dill, jsonpickle, joblib, torch.load, numpy.load(allow_pickle=True))', ['CWE-502'], ['ACF-E2']],
	['PY-WL-107', 'python', 'sink', 'WARN', 'stable', 'Dynamic code execution — eval/exec/compile', ['CWE-95'], ['ACF-E2']],
	['PY-WL-108', 'python', 'sink', 'ERROR', 'stable', 'Command/program execution — os.system/os.popen/subprocess.getoutput, os.exec*/os.spawn*/os.posix_spawn/pty.spawn', ['CWE-78'], ['ACF-E2']],
	['PY-WL-109', 'python', 'boundary', 'WARN', 'stable', 'A trusted producer has both a value-bearing return and a None-yielding return — None leaks from a function declaring trusted output', ['CWE-394'], []],
	['PY-WL-110', 'python', 'boundary', 'WARN', 'stable', 'An entity carries two or more distinct trust markers (e.g. @trusted + @external_boundary) — a contradictory declaration the engine resolves silently', [], []],
	['PY-WL-111', 'python', 'boundary', 'ERROR', 'stable', "A trust boundary's only rejection path is assert, which python -O strips — the validation silently vanishes in production", ['CWE-617'], []],
	['PY-WL-112', 'python', 'sink', 'ERROR', 'stable', 'Conditional shell — a subprocess call with a literal shell=True', ['CWE-78'], ['ACF-E2']],
	['PY-WL-113', 'python', 'boundary', 'ERROR', 'stable', 'A trust boundary fails open — an exception handler swallows the failure and returns a substitute value instead of re-raising, so the boundary can be bypassed by triggering the exception', ['CWE-636'], []],
	['PY-WL-114', 'python', 'boundary', 'ERROR', 'stable', 'A builtin trust decorator has a level argument that is statically readable but invalid or out of range', [], []],
	['PY-WL-115', 'python', 'sink', 'WARN', 'stable', 'Dynamic code/module load — importlib.import_module, __import__, runpy.run_path, runpy.run_module, importlib.util.spec_from_file_location', ['CWE-829', 'CWE-94'], ['ACF-E2']],
	['PY-WL-116', 'python', 'sink', 'WARN', 'preview', 'Path/filesystem traversal — open/os.path.join/pathlib.Path, mutation via os.remove/os.rename/shutil.*, methods on a tainted pathlib.Path, and tarfile/zipfile extraction (Zip Slip)', ['CWE-22'], []],
	['PY-WL-117', 'python', 'sink', 'WARN', 'preview', 'SSRF — the URL slot of an HTTP client sink: requests/httpx/aiohttp/urllib, module-level calls, constructed client/session methods, and client base_url=', ['CWE-918'], []],
	['PY-WL-118', 'python', 'sink', 'ERROR', 'preview', 'SQL/database execution — execute/executemany/executescript', ['CWE-89'], []],
	['PY-WL-119', 'python', 'boundary', 'ERROR', 'preview', 'No-op validator boundary — the return is equivalent to the input', [], []],
	['PY-WL-120', 'python', 'boundary', 'ERROR', 'preview', 'Stored or persisted taint reaches trusted state without validation', [], []],
	['PY-WL-121', 'python', 'sink', 'ERROR', 'preview', 'XML parsing — XXE and billion-laughs', ['CWE-611'], []],
	['PY-WL-122', 'python', 'sink', 'ERROR', 'preview', 'Server-side template compilation — jinja2.Template/Environment.from_string, mako Template (SSTI)', ['CWE-1336'], []],
	['PY-WL-123', 'python', 'sink', 'WARN', 'preview', 'Reflective attribute access — untrusted data used as the attribute name in setattr/getattr; dynamic attribute injection / mass assignment', ['CWE-915'], []],
	['PY-WL-124', 'python', 'sink', 'ERROR', 'preview', 'Native-library load — ctypes.CDLL/WinDLL/OleDLL/PyDLL, ctypes.cdll.LoadLibrary', ['CWE-114', 'CWE-829'], ['ACF-E2']],
	['PY-WL-125', 'python', 'sink', 'INFO', 'preview', 'Log injection — untrusted data used as the log message format string', ['CWE-117'], []],
	['PY-WL-126', 'python', 'sink', 'WARN', 'preview', 'Mail/header injection — untrusted recipient or message reaching smtplib.SMTP.sendmail', ['CWE-93'], []],
	['RS-WL-108', 'rust', 'sink', 'ERROR', 'preview', 'Untrusted data reaches the program of Command::new — an attacker chooses which executable runs', ['CWE-78'], []],
	['RS-WL-112', 'rust', 'sink', 'WARN', 'preview', 'Untrusted data reaches a sh -c style shell command line', ['CWE-78'], []],
];

const EXPECTED = Object.fromEntries(EXPECTED_ROWS.map(
	([id, language, family, base_severity, maturity, summary, cwes, covers_acf]) => [
		id,
		{ id, language, family, base_severity, maturity, summary, cwes, covers_acf },
	],
));

async function canonicalRules() {
	const directory = new URL('../src/data/wardline-rules/', import.meta.url);
	const files = (await readdir(directory)).filter((file) => file.endsWith('.yaml')).sort();
	return Promise.all(files.map(async (file) => parse(await readFile(new URL(file, directory), 'utf8'))));
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
	constructor(rows, facets = ['language']) {
		this.rows = rows.map((dataset) => ({ dataset, hidden: false }));
		this.selects = facets.map((facet) => new FakeSelect(facet));
		this.status = { textContent: '' };
		this.empty = { hidden: true };
	}

	querySelectorAll(selector) {
		if (selector === '[data-rules-filters] select[data-facet]') return this.selects;
		if (selector === '[data-rule-entry]') return this.rows;
		throw new Error(`Unexpected selector: ${selector}`);
	}

	querySelector(selector) {
		if (selector === '[data-rules-results]') return this.status;
		if (selector === '[data-rules-empty]') return this.empty;
		throw new Error(`Unexpected selector: ${selector}`);
	}

	setAttribute() {}
}

class FakeDocument {
	constructor(roots) {
		this.roots = roots;
		this.listeners = new Map();
	}

	querySelectorAll(selector) {
		assert.equal(selector, '[data-rules-index]');
		return this.roots;
	}

	addEventListener(name, listener) {
		this.listeners.set(name, listener);
	}

	dispatch(name) {
		this.listeners.get(name)?.();
	}
}

test('YAML catalogue exactly matches the independently derived authoritative 28-rule metadata', async () => {
	const rules = await canonicalRules();
	assert.equal(Object.keys(EXPECTED).length, 28);
	assert.equal(rules.length, 28);
	assert.deepEqual(
		Object.fromEntries(rules.map((rule) => [rule.id, rule])),
		EXPECTED,
	);
});

test('catalogue counts and authoritative ACF coverage sets are exact', async () => {
	const rules = await canonicalRules();
	const count = (field, value, language) => rules.filter((rule) => rule[field] === value && (!language || rule.language === language)).length;

	assert.deepEqual(['python', 'rust'].map((value) => count('language', value)), [26, 2]);
	assert.deepEqual([
		count('family', 'boundary', 'python'), count('family', 'sink', 'python'), count('family', 'sink', 'rust'),
	], [12, 14, 2]);
	assert.deepEqual(['ERROR', 'WARN', 'INFO'].map((value) => count('base_severity', value, 'python')), [14, 11, 1]);
	assert.deepEqual(['stable', 'preview'].map((value) => count('maturity', value, 'python')), [15, 11]);
	assert.deepEqual(['stable', 'preview'].map((value) => count('maturity', value, 'rust')), [0, 2]);

	const covering = (acf) => rules.filter((rule) => rule.covers_acf.includes(acf)).map((rule) => rule.id).sort();
	assert.deepEqual(covering('ACF-T1'), ['PY-WL-101', 'PY-WL-105']);
	assert.deepEqual(covering('ACF-E1'), ['PY-WL-101', 'PY-WL-105']);
	assert.deepEqual(covering('ACF-R1'), ['PY-WL-103', 'PY-WL-104']);
	assert.deepEqual(covering('ACF-R2'), ['PY-WL-103', 'PY-WL-104']);
	assert.deepEqual(covering('ACF-E2'), ['PY-WL-106', 'PY-WL-107', 'PY-WL-108', 'PY-WL-112', 'PY-WL-115', 'PY-WL-124']);
	assert.deepEqual(covering('ACF-R5'), []);
});

test('the completed on-disk catalogue passes strict cross-registry validation', async () => {
	const result = await checkRegistry(new URL('..', import.meta.url).pathname, 'strict');
	assert.deepEqual(result, { errors: [], counts: { acf: 20, rules: 28, lattice: 8 } });
});

test('rules view filters conjunctively and creates base-safe family anchors', async () => {
	const filterRules = requiredExport('filterRules');
	const ruleHref = requiredExport('ruleHref');
	const rules = await canonicalRules();

	assert.deepEqual(filterRules(rules, { language: 'rust' }).map((rule) => rule.id), ['RS-WL-108', 'RS-WL-112']);
	assert.equal(filterRules(rules, { language: 'rust', family: 'boundary' }).length, 0);
	assert.equal(ruleHref('/preview/', EXPECTED['PY-WL-101']), '/preview/wardline/rules/boundary-rules/#py-wl-101');
	assert.equal(ruleHref('/preview/', EXPECTED['PY-WL-106']), '/preview/wardline/rules/sink-rules/#py-wl-106');
	assert.equal(ruleHref('/preview/', EXPECTED['RS-WL-108']), '/preview/wardline/rules/rust-rules/#rs-wl-108');
	assert.equal(ruleHref('/', EXPECTED['PY-WL-121']), '/wardline/rules/sink-rules/#py-wl-121');
});

test('rules controller isolates two instances and exposes a visible zero state', () => {
	const createRulesIndexController = requiredExport('createRulesIndexController');
	const first = new FakeRoot([
		{ language: 'python', family: 'boundary' }, { language: 'rust', family: 'sink' },
	], ['language', 'family']);
	const second = new FakeRoot([{ language: 'python' }, { language: 'rust' }]);
	const controller = createRulesIndexController({ document: new FakeDocument([first, second]) });
	controller.initAll();

	first.selects[0].value = 'rust';
	first.selects[0].dispatchChange();
	assert.deepEqual(first.rows.map((row) => row.hidden), [true, false]);
	assert.deepEqual(second.rows.map((row) => row.hidden), [false, false]);
	assert.equal(first.status.textContent, '1 rule shown');

	first.selects[1].value = 'boundary';
	first.selects[1].dispatchChange();
	assert.equal(first.status.textContent, '0 rules shown');
	assert.equal(first.empty.hidden, false);
});

test('rules lifecycle is idempotent and enhances new roots after an Astro page swap', () => {
	const createRulesIndexController = requiredExport('createRulesIndexController');
	const original = new FakeRoot([{ language: 'python' }]);
	const document = new FakeDocument([original]);
	const controller = createRulesIndexController({ document });
	controller.install();
	controller.install();
	controller.initAll();
	controller.initAll();
	assert.equal(original.selects[0].listeners.length, 1);
	assert.equal(document.listeners.size, 1);

	const replacement = new FakeRoot([{ language: 'rust' }, { language: 'python' }]);
	document.roots = [replacement];
	document.dispatch('astro:page-load');
	assert.equal(replacement.selects[0].listeners.length, 1);
	assert.equal(replacement.status.textContent, '2 rules shown');
});

test('RulesIndex and RuleTable declare semantic progressive-enhancement markup', async () => {
	const component = await readFile(new URL('../src/components/RulesIndex.astro', import.meta.url), 'utf8').catch(() => '');
	const table = await readFile(new URL('../src/components/RuleTable.astro', import.meta.url), 'utf8');
	assert.match(component, /type RuleEntry\s*=/);
	assert.match(component, /<caption>/);
	assert.match(component, /<th scope="col">/);
	assert.match(component, /aria-live="polite"/);
	assert.match(component, /data-rules-empty/);
	assert.match(component, /data-rules-filters/);
	assert.match(table, /<caption>/);
	assert.match(table, /<th scope="col">/);
	assert.match(table, /id=\{rule\.id\.toLowerCase\(\)\}/);
});

test('migrated pages retain source-governed rules commentary and generated components', async () => {
	const directory = new URL('../src/content/docs/wardline/rules/', import.meta.url);
	const [index, boundary, sink, rust, engine] = await Promise.all([
		'index.mdx', 'boundary-rules.mdx', 'sink-rules.mdx', 'rust-rules.mdx', 'engine-findings.md',
	].map((file) => readFile(new URL(file, directory), 'utf8').catch(() => '')));

	assert.match(index, /<RulesIndex\s*\/>/);
	assert.match(index, /There is no `WL-001`–`WL-008`/);
	assert.match(index, /Severity is a product, not a table/);
	assert.match(boundary, /<RuleTable family="boundary"\s*\/>/);
	assert.match(boundary, /The rules were built from the code rather than from the archive/);
	assert.match(sink, /<RuleTable family="sink"\s*\/>/);
	assert.match(sink, /developer-freedom zone/);
	assert.match(rust, /<RuleTable family="sink" language="rust"\s*\/>/);
	assert.match(rust, /Rust is a \*scanned target\*/);
	assert.match(engine, /WLN-ENGINE-POLICY-CONFIG/);
});

test('linkable rule mentions use Rule components while fenced literals remain untouched', async () => {
	const directory = new URL('../src/content/docs/wardline/rules/', import.meta.url);
	const pages = Object.fromEntries(await Promise.all(
		['index.mdx', 'boundary-rules.mdx', 'sink-rules.mdx', 'rust-rules.mdx'].map(async (file) => [
			file,
			await readFile(new URL(file, directory), 'utf8'),
		]),
	));

	for (const [file, source] of Object.entries(pages)) {
		assert.match(source, /import Rule from '\.\.\/\.\.\/\.\.\/\.\.\/components\/Rule\.astro';/, file);
		const withoutFences = source.replace(/```[\s\S]*?```/g, '');
		assert.doesNotMatch(withoutFences, /`(?:PY|RS)-WL-\d{3}`/, `${file} has an unlinked rule ID`);
	}

	assert.match(pages['index.mdx'], /<Rule id="PY-WL-125"\s*\/>/);
	assert.match(pages['boundary-rules.mdx'], /<Rule id="PY-WL-111"\s*\/>/);
	assert.match(pages['sink-rules.mdx'], /<Rule id="PY-WL-121"\s*\/>/);
	assert.match(pages['rust-rules.mdx'], /<Rule id="RS-WL-108"\s*\/>/);

	const ruleComponent = await readFile(new URL('../src/components/Rule.astro', import.meta.url), 'utf8');
	assert.match(ruleComponent, /import \{ ruleHref \} from '\.\.\/scripts\/rules-index\.mjs';/);
	assert.match(ruleComponent, /href=\{ruleHref\(base, rule\.data\)\}/);
});

test('rules index preserves implementation-specific analysis and de-confliction mechanics', async () => {
	const source = await readFile(
		new URL('../src/content/docs/wardline/rules/index.mdx', import.meta.url),
		'utf8',
	);

	assert.match(source, /Both value combiners \(`BinOp`, `IfExp`, `BoolOp`, containers, `\.get` defaults, `\+=`, container writes\) and control-flow merges \(`if`\/`else`, loop back-edges, `match` arms, `except` handlers\) use the rank-meet `least_trusted`\./);
	assert.match(source, /same-project classmethod calls through a class object, and variable-typed dispatch through a flow-sensitive reaching-definitions pass/);
	assert.match(source, /the designed CI-attestation path was discarded outright/);
	assert.match(source, /`_return_delegated_to_101` mirrors 101's own gate including enablement/);
	assert.match(source, /when `rules\.enable` has excluded <Rule id="PY-WL-101" \/>/);
});
