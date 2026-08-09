#!/usr/bin/env node

import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(scriptDirectory, '..');
const defaultRepositoryRoot = path.resolve(websiteRoot, '..');

function asPath(value) {
	return value instanceof URL ? fileURLToPath(value) : value;
}

function canonicalPathProblem(value) {
	if (!value.startsWith('/') || !value.endsWith('/')) return 'must begin and end with "/"';
	if (value.includes('\\') || value.includes('?') || value.includes('#') || value.slice(1).includes('//')) {
		return 'contains a forbidden separator, query, fragment, or empty segment';
	}
	let decoded;
	try {
		decoded = decodeURIComponent(value);
	} catch {
		return 'contains malformed percent encoding';
	}
	if ((decoded.match(/\//gu) ?? []).length !== (value.match(/\//gu) ?? []).length || decoded.includes('\\')) {
		return 'percent decoding introduces a path separator';
	}
	if (/[\u0000-\u001f\u007f]/u.test(decoded)) return 'contains a control character';
	if (decoded.split('/').some((segment) => segment === '.' || segment === '..')) return 'contains a dot segment';
	return null;
}

function isCanonicalRoute(route) {
	return canonicalPathProblem(route) === null;
}

export async function loadRoutes(file) {
	const rows = (await readFile(file, 'utf8'))
		.split(/\r?\n/u)
		.map((row) => row.trim())
		.filter((row) => row && !row.startsWith('#'));
	const seen = new Set();
	for (const route of rows) {
		if (!isCanonicalRoute(route)) {
			throw new Error(`${route}: expected a canonical absolute route beginning and ending with "/"`);
		}
		if (seen.has(route)) throw new Error(`duplicate route in expected-routes.txt: ${route}`);
		seen.add(route);
	}
	return rows;
}

function routeOutputPath(distDirectory, route) {
	const relativeRoute = route.replace(/^\/+|\/+$/gu, '');
	return path.join(distDirectory, relativeRoute, 'index.html');
}

export async function checkFilesystemInventory(routes, distDirectory = path.join(websiteRoot, 'dist')) {
	const failures = [];
	for (const route of routes) {
		const problem = canonicalPathProblem(route);
		if (problem) {
			failures.push(`${route}: invalid canonical route (${problem})`);
			continue;
		}
		const output = routeOutputPath(asPath(distDirectory), route);
		try {
			await access(output);
		} catch {
			const relative = path.relative(asPath(distDirectory), output).split(path.sep).join('/');
			failures.push(`${route}: missing dist/${relative}`);
		}
	}
	return failures;
}

function validatedBaseUrl(input) {
	const rawInput = input instanceof URL ? input.href : input;
	let base;
	try {
		base = new URL(rawInput);
	} catch {
		throw new Error('--base-url must be an absolute HTTP(S) URL ending in "/"');
	}
	const rawPath = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(\/[^?#]*)?/iu.exec(rawInput)?.[1] ?? '/';
	if (!['http:', 'https:'].includes(base.protocol) || !rawInput.endsWith('/') || base.username || base.password || base.search || base.hash || canonicalPathProblem(rawPath)) {
		throw new Error('--base-url must be an absolute HTTP(S) URL ending in "/"');
	}
	return base;
}

function escapedBase(finalUrl, baseUrl) {
	return finalUrl.origin !== baseUrl.origin || !finalUrl.pathname.startsWith(baseUrl.pathname);
}

export async function checkRemoteInventory(routes, baseInput, fetchImplementation = fetch) {
	const baseUrl = validatedBaseUrl(baseInput);
	const failures = [];
	for (const route of routes) {
		const problem = canonicalPathProblem(route);
		if (problem) {
			failures.push(`${route}: invalid canonical route (${problem})`);
			continue;
		}
		const requestedUrl = new URL(route.replace(/^\/+/, ''), baseUrl);
		if (escapedBase(requestedUrl, baseUrl)) {
			failures.push(`${route}: requested URL escaped base (${requestedUrl.href})`);
			continue;
		}
		try {
			const response = await fetchImplementation(requestedUrl, { redirect: 'follow' });
			if (!response.ok) failures.push(`${route}: HTTP ${response.status}`);
			const finalUrl = new URL(response.url || requestedUrl);
			if (escapedBase(finalUrl, baseUrl)) failures.push(`${route}: final URL escaped base (${finalUrl.href})`);
		} catch (error) {
			failures.push(`${route}: request failed (${error instanceof Error ? error.message : String(error)})`);
		}
	}
	return failures;
}

async function markdownFiles(root, relativeDirectory, excludedDirectories = new Set()) {
	const absoluteRoot = path.join(root, relativeDirectory);
	const found = [];
	async function walk(directory) {
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
			const absolute = path.join(directory, entry.name);
			if (entry.isDirectory()) await walk(absolute);
			else if (entry.isFile() && entry.name.endsWith('.md')) {
				found.push(path.relative(root, absolute).split(path.sep).join('/'));
			}
		}
	}
	try {
		await walk(absoluteRoot);
	} catch (error) {
		if (!(error && typeof error === 'object' && error.code === 'ENOENT')) throw error;
	}
	return found;
}

async function loadLegacySources(file) {
	const sources = (await readFile(file, 'utf8'))
		.split(/\r?\n/u)
		.map((row) => row.trim())
		.filter((row) => row && !row.startsWith('#'));
	const seen = new Set();
	for (const source of sources) {
		if (!(source.startsWith('docs/') || source.startsWith('reference-site/content/'))
			|| !source.endsWith('.md')
			|| source.includes('\\')
			|| source.startsWith('/')
			|| source.split('/').some((segment) => segment === '.' || segment === '..')) {
			throw new Error(`${source}: expected a canonical legacy Markdown source path`);
		}
		if (seen.has(source)) throw new Error(`duplicate source in legacy-markdown-sources.txt: ${source}`);
		seen.add(source);
	}
	return sources;
}

async function loadTsv(file, expectedHeader) {
	const rows = (await readFile(file, 'utf8')).split(/\r?\n/u);
	if (rows.shift()?.trim() !== expectedHeader) throw new Error(`${asPath(file)}: expected TSV header '${expectedHeader}'`);
	return rows
		.map((row, index) => ({ row: row.trim(), line: index + 2 }))
		.filter(({ row }) => row && !row.startsWith('#'))
		.map(({ row, line }) => {
			const columns = row.split('\t');
			if (columns.length !== 2 || columns.some((column) => !column.trim())) {
				throw new Error(`${asPath(file)}:${line}: expected exactly two non-empty tab-separated columns`);
			}
			return columns.map((column) => column.trim());
		});
}

function addRepresentation(representations, source, disposition) {
	const entries = representations.get(source) ?? [];
	entries.push(disposition);
	representations.set(source, entries);
}

export async function inspectSourceCoverage({
	repositoryRoot = defaultRepositoryRoot,
	expectedRoutes,
	legacySourcesPath = path.join(websiteRoot, 'tests', 'legacy-markdown-sources.txt'),
	routeMapPath = path.join(websiteRoot, 'tests', 'source-route-map.tsv'),
	droppedSourcesPath = path.join(websiteRoot, 'tests', 'dropped-sources.tsv'),
}) {
	const root = asPath(repositoryRoot);
	const oldMarkdown = await loadLegacySources(legacySourcesPath);
	const oldMarkdownSet = new Set(oldMarkdown);
	const liveMarkdown = [
		...await markdownFiles(root, 'docs', new Set(['superpowers'])),
		...await markdownFiles(root, path.join('reference-site', 'content')),
	].sort();
	const liveMarkdownSet = new Set(liveMarkdown);
	const routeRows = await loadTsv(routeMapPath, 'source\troute');
	const droppedRows = await loadTsv(droppedSourcesPath, 'source\treason');
	const expectedRouteSet = new Set(expectedRoutes);
	const representations = new Map();
	const mappedRoutes = new Map();
	const failures = [];
	if (liveMarkdown.length > 0 && (liveMarkdown.length !== oldMarkdown.length || liveMarkdown.some((source) => !oldMarkdownSet.has(source)))) {
		if (liveMarkdown.length < oldMarkdown.length) {
			failures.push(`legacy Markdown tree is partially present (${liveMarkdown.length} of ${oldMarkdown.length} manifest pages)`);
		} else {
			failures.push(`live legacy Markdown tree differs from the frozen ${oldMarkdown.length}-page manifest`);
		}
		for (const source of liveMarkdown) {
			if (!oldMarkdownSet.has(source)) failures.push(`${source}: live legacy source is absent from legacy-markdown-sources.txt`);
		}
		for (const source of oldMarkdown) {
			if (!liveMarkdownSet.has(source)) failures.push(`${source}: manifest source is absent from the partially retained legacy tree`);
		}
	}

	for (const [source, route] of routeRows) {
		addRepresentation(representations, source, `mapped to ${route}`);
		const sources = mappedRoutes.get(route) ?? [];
		sources.push(source);
		mappedRoutes.set(route, sources);
		if (!oldMarkdownSet.has(source)) failures.push(`${source}: mapped source is not in legacy-markdown-sources.txt`);
		if (!expectedRouteSet.has(route)) failures.push(`${route}: mapped route is not in expected-routes.txt`);
	}
	for (const [source] of droppedRows) {
		addRepresentation(representations, source, 'dropped');
		if (!source.startsWith('reference-site/generated/') && !oldMarkdownSet.has(source)) {
			failures.push(`${source}: dropped source is not in legacy-markdown-sources.txt`);
		}
	}

	for (const source of oldMarkdown) {
		const entries = representations.get(source) ?? [];
		if (entries.length === 0) failures.push(`${source}: absent from source mapping`);
		else if (entries.length > 1) failures.push(`${source}: represented more than once (${entries.join(', ')})`);
	}
	for (const source of representations.keys()) {
		if (!source.startsWith('reference-site/generated/') && !oldMarkdownSet.has(source)) continue;
		if ((representations.get(source) ?? []).length > 1 && !oldMarkdownSet.has(source)) {
			failures.push(`${source}: represented more than once`);
		}
	}
	for (const route of expectedRoutes) {
		const sources = mappedRoutes.get(route) ?? [];
		if (sources.length === 0) failures.push(`${route}: no winning old source mapped to route`);
		else if (sources.length > 1) failures.push(`${route}: more than one winning old source (${sources.join(', ')})`);
	}

	return {
		failures,
		markdownCount: oldMarkdown.length,
		mappedCount: routeRows.length,
		droppedMarkdownCount: droppedRows.filter(([source]) => oldMarkdownSet.has(source)).length,
		generatedDropCount: droppedRows.filter(([source]) => source.startsWith('reference-site/generated/')).length,
	};
}

export async function checkSourceCoverage(options) {
	return (await inspectSourceCoverage(options)).failures;
}

async function main() {
	const baseArguments = process.argv.slice(2).filter((argument) => argument.startsWith('--base-url='));
	const unknownArguments = process.argv.slice(2).filter((argument) => !argument.startsWith('--base-url='));
	if (baseArguments.length > 1 || unknownArguments.length) {
		throw new Error('usage: node scripts/check-route-inventory.mjs [--base-url=https://example.test/base/]');
	}
	const routes = await loadRoutes(path.join(websiteRoot, 'tests', 'expected-routes.txt'));
	const sourceCoverage = await inspectSourceCoverage({ repositoryRoot: defaultRepositoryRoot, expectedRoutes: routes });
	const routeFailures = baseArguments.length
		? await checkRemoteInventory(routes, baseArguments[0].slice('--base-url='.length))
		: await checkFilesystemInventory(routes);
	const failures = [...sourceCoverage.failures, ...routeFailures];
	if (failures.length) {
		for (const failure of failures) console.error(`- ${failure}`);
		process.exitCode = 1;
		return;
	}
	const mode = baseArguments.length ? `base URL ${baseArguments[0].slice('--base-url='.length)}` : 'filesystem';
	console.log(`Route inventory OK (${mode}: ${routes.length} routes)`);
	console.log(`Source disposition OK (${sourceCoverage.markdownCount} Markdown pages: ${sourceCoverage.mappedCount} mapped, ${sourceCoverage.droppedMarkdownCount} dropped; ${sourceCoverage.generatedDropCount} generated Hugo taxonomy families dropped)`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
