import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
	checkFilesystemInventory,
	checkRemoteInventory,
	checkSourceCoverage,
	loadRoutes,
} from '../scripts/check-route-inventory.mjs';

const website = new URL('../', import.meta.url);
const repository = new URL('../../', import.meta.url);

async function temporaryDirectory(t) {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'route-inventory-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	return directory;
}

async function listen(t, handler) {
	const server = http.createServer(handler);
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
	const { port } = server.address();
	return new URL(`http://127.0.0.1:${port}/preview/`);
}

test('loadRoutes accepts canonical routes and rejects duplicates or non-canonical rows', async (t) => {
	const directory = await temporaryDirectory(t);
	const valid = path.join(directory, 'valid.txt');
	await writeFile(valid, '# comment\n/\n/acf/\n/acf/t1-authority-tier-conflation/\n');
	assert.deepEqual(await loadRoutes(valid), ['/', '/acf/', '/acf/t1-authority-tier-conflation/']);

	const duplicate = path.join(directory, 'duplicate.txt');
	await writeFile(duplicate, '/acf/\n/acf/\n');
	await assert.rejects(loadRoutes(duplicate), /duplicate route.*\/acf\//i);

	for (const [name, row] of [
		['relative', 'acf/'],
		['missing-slash', '/acf'],
		['dot-segment', '/acf/../wardline/'],
		['encoded-dot-segment', '/acf/%2e%2e/wardline/'],
		['encoded-slash', '/acf%2fwardline/'],
		['encoded-backslash', '/acf%5cwardline/'],
		['encoded-control', '/acf/%0aentry/'],
		['malformed-percent', '/acf/%zz/'],
	]) {
		const invalid = path.join(directory, `${name}.txt`);
		await writeFile(invalid, `${row}\n`);
		await assert.rejects(loadRoutes(invalid), /canonical absolute route/i);
	}
});

test('filesystem mode reports every absent dist route while accepting present index files', async (t) => {
	const directory = await temporaryDirectory(t);
	await mkdir(path.join(directory, 'acf'), { recursive: true });
	await writeFile(path.join(directory, 'index.html'), 'home');
	await writeFile(path.join(directory, 'acf', 'index.html'), 'acf');

	assert.deepEqual(
		await checkFilesystemInventory(['/', '/acf/', '/missing-one/', '/missing-two/'], directory),
		[
			"/missing-one/: missing dist/missing-one/index.html",
			"/missing-two/: missing dist/missing-two/index.html",
		],
	);
});

test('base-url mode follows redirects and reports non-2xx responses and base escapes together', async (t) => {
	const baseUrl = await listen(t, (request, response) => {
		if (request.url === '/preview/good/') {
			response.writeHead(200).end('good');
		} else if (request.url === '/preview/missing/') {
			response.writeHead(404).end('missing');
		} else if (request.url === '/preview/escape/') {
			response.writeHead(302, { location: '/outside/' }).end();
		} else if (request.url === '/outside/') {
			response.writeHead(200).end('escaped');
		} else {
			response.writeHead(500).end('unexpected');
		}
	});

	assert.deepEqual(
		await checkRemoteInventory(['/good/', '/missing/', '/escape/'], baseUrl),
		[
			'/missing/: HTTP 404',
			`/escape/: final URL escaped base (${baseUrl.origin}/outside/)`,
		],
	);
});

test('base-url mode requires an HTTP(S) URL ending in a slash', async () => {
	for (const input of [
		'https://example.test/preview',
		'ftp://example.test/preview/',
		'/preview/',
		'https://example.test/preview/%2e%2e/',
		'https://example.test/preview%2fescape/',
		'https://example.test/preview/%00/',
		'https://example.test/preview/%zz/',
	]) {
		await assert.rejects(checkRemoteInventory(['/'], input), /HTTP\(S\).*ending in "\/"/);
	}
});

test('base-url mode rejects unsafe routes before invoking fetch', async () => {
	let fetchCalls = 0;
	const failures = await checkRemoteInventory([
		'/acf/%2e%2e/escape/',
		'/acf%2fescape/',
		'/acf%5cescape/',
		'/acf/%00entry/',
		'/acf/%zz/',
	], 'https://example.test/preview/', async () => {
		fetchCalls += 1;
		throw new Error('fetch must not run');
	});
	assert.equal(fetchCalls, 0);
	assert.equal(failures.length, 5);
	assert.ok(failures.every((failure) => failure.includes('invalid canonical route')));
});

test('source coverage reports missing, duplicate, unknown, and invalid-route rows without stopping early', async (t) => {
	const directory = await temporaryDirectory(t);
	const repositoryRoot = path.join(directory, 'repo');
	await mkdir(path.join(repositoryRoot, 'docs'), { recursive: true });
	await mkdir(path.join(repositoryRoot, 'reference-site', 'content'), { recursive: true });
	await writeFile(path.join(repositoryRoot, 'docs', 'mapped.md'), 'mapped');
	await writeFile(path.join(repositoryRoot, 'docs', 'duplicated.md'), 'duplicate');
	await writeFile(path.join(repositoryRoot, 'reference-site', 'content', 'missing.md'), 'missing');

	const routeMap = path.join(directory, 'source-route-map.tsv');
	const dropped = path.join(directory, 'dropped-sources.tsv');
	const legacySources = path.join(directory, 'legacy-markdown-sources.txt');
	await writeFile(legacySources, 'docs/mapped.md\ndocs/duplicated.md\nreference-site/content/missing.md\n');
	await writeFile(routeMap, [
		'source\troute',
		'docs/mapped.md\t/mapped/',
		'docs/duplicated.md\t/not-in-inventory/',
		'docs/unknown.md\t/mapped/',
	].join('\n'));
	await writeFile(dropped, [
		'source\treason',
		'docs/duplicated.md\tduplicate',
		'docs/also-unknown.md\tunknown',
	].join('\n'));

	const failures = await checkSourceCoverage({
		repositoryRoot,
		expectedRoutes: ['/mapped/'],
		legacySourcesPath: legacySources,
		routeMapPath: routeMap,
		droppedSourcesPath: dropped,
	});
	assert.ok(failures.some((failure) => failure.includes('reference-site/content/missing.md: absent from source mapping')));
	assert.ok(failures.some((failure) => failure.includes('docs/duplicated.md: represented more than once')));
	assert.ok(failures.some((failure) => failure.includes('docs/unknown.md: mapped source is not in legacy-markdown-sources.txt')));
	assert.ok(failures.some((failure) => failure.includes('docs/also-unknown.md: dropped source is not in legacy-markdown-sources.txt')));
	assert.ok(failures.some((failure) => failure.includes('/not-in-inventory/: mapped route is not in expected-routes.txt')));
});

test('durable source disposition remains valid after complete legacy-tree removal', async (t) => {
	const repositoryRoot = await temporaryDirectory(t);
	const routes = await loadRoutes(new URL('tests/expected-routes.txt', website));
	assert.deepEqual(await checkSourceCoverage({
		repositoryRoot,
		expectedRoutes: routes,
		legacySourcesPath: new URL('tests/legacy-markdown-sources.txt', website),
		routeMapPath: new URL('tests/source-route-map.tsv', website),
		droppedSourcesPath: new URL('tests/dropped-sources.tsv', website),
	}), []);
});

test('live legacy parity rejects partial removal and unknown drift', async (t) => {
	const directory = await temporaryDirectory(t);
	const repositoryRoot = path.join(directory, 'repo');
	await mkdir(path.join(repositoryRoot, 'docs'), { recursive: true });
	await mkdir(path.join(repositoryRoot, 'reference-site', 'content'), { recursive: true });
	await writeFile(path.join(repositoryRoot, 'docs', 'one.md'), 'one');

	const legacySources = path.join(directory, 'legacy-markdown-sources.txt');
	const routeMap = path.join(directory, 'source-route-map.tsv');
	const dropped = path.join(directory, 'dropped-sources.tsv');
	await writeFile(legacySources, 'docs/one.md\nreference-site/content/two.md\n');
	await writeFile(routeMap, 'source\troute\ndocs/one.md\t/one/\n');
	await writeFile(dropped, 'source\treason\nreference-site/content/two.md\tdropped\n');

	let failures = await checkSourceCoverage({
		repositoryRoot,
		expectedRoutes: ['/one/'],
		legacySourcesPath: legacySources,
		routeMapPath: routeMap,
		droppedSourcesPath: dropped,
	});
	assert.ok(failures.some((failure) => failure.includes('legacy Markdown tree is partially present (1 of 2 manifest pages)')));

	await writeFile(path.join(repositoryRoot, 'reference-site', 'content', 'two.md'), 'two');
	await writeFile(path.join(repositoryRoot, 'docs', 'rogue.md'), 'rogue');
	failures = await checkSourceCoverage({
		repositoryRoot,
		expectedRoutes: ['/one/'],
		legacySourcesPath: legacySources,
		routeMapPath: routeMap,
		droppedSourcesPath: dropped,
	});
	assert.ok(failures.some((failure) => failure.includes('docs/rogue.md: live legacy source is absent from legacy-markdown-sources.txt')));
});

test('tracked inventories cover every corrected route and every old Markdown page exactly once', async () => {
	const routes = await loadRoutes(new URL('tests/expected-routes.txt', website));
	assert.equal(routes.length, 69);
	assert.equal(routes.filter((route) => route === '/acf/' || /^\/acf\/[^/]+\/$/.test(route)).length, 21);
	for (const route of [
		'/acf/s1-fabricated-default/',
		'/acf/s2-spurious-field-access/',
		'/reference/about/',
		'/respond/case-study/',
		'/wardline/rules/rust-rules/',
	]) assert.ok(routes.includes(route), route);
	for (const forbidden of ['/acf/s1-competence-spoofing/', '/acf/s2-hallucinated-field-access/', '/understand/paper/', '/understand/taxonomy/', '/appendices/autonomy-assessment/']) {
		assert.ok(!routes.includes(forbidden), forbidden);
	}

	assert.deepEqual(await checkSourceCoverage({
		repositoryRoot: repository,
		expectedRoutes: routes,
		legacySourcesPath: new URL('tests/legacy-markdown-sources.txt', website),
		routeMapPath: new URL('tests/source-route-map.tsv', website),
		droppedSourcesPath: new URL('tests/dropped-sources.tsv', website),
	}), []);

	const droppedText = await readFile(new URL('tests/dropped-sources.tsv', website), 'utf8');
	for (const required of [
		'docs/understand/paper.md',
		'docs/understand/taxonomy.md',
		'reference-site/content/appendices/glossary.md',
		'reference-site/content/appendices/case-study.md',
		'reference-site/content/appendices/autonomy-assessment.md',
		'docs/wardline/specification.md',
		'reference-site/generated/audiences/**',
		'reference-site/generated/detection_statuses/**',
		'reference-site/generated/entry_statuses/**',
		'reference-site/generated/entry_types/**',
		'reference-site/generated/risk_levels/**',
	]) assert.ok(droppedText.includes(required), required);
});

test('package checks exercise the route-inventory test suite', async () => {
	const packageJson = JSON.parse(await readFile(new URL('package.json', website), 'utf8'));
	assert.equal(packageJson.scripts['test:route-inventory'], 'node --test tests/route-inventory.test.mjs');
	assert.match(packageJson.scripts.check, /npm run test:route-inventory/);
});
