import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'parse5';

const DEFAULT_SITE_ORIGIN = 'https://semanticdefects.foundryside.dev';
const URL_ATTRIBUTES = new Set(['href', 'src', 'srcset', 'action', 'formaction', 'poster']);
const SKIPPED_SCHEMES = new Set(['blob', 'data', 'javascript', 'mailto', 'tel']);

function validateBase(expectedBase) {
	if (
		typeof expectedBase !== 'string'
		|| !expectedBase.startsWith('/')
		|| expectedBase.startsWith('//')
		|| !expectedBase.endsWith('/')
		|| expectedBase.includes('?')
		|| expectedBase.includes('#')
		|| expectedBase.includes('\\')
	) throw new TypeError(`Invalid deployment base ${JSON.stringify(expectedBase)}.`);
	return expectedBase;
}

function validateOrigin(siteOrigin) {
	const parsed = new URL(siteOrigin);
	if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== siteOrigin.replace(/\/$/u, '')) {
		throw new TypeError(`Invalid site origin ${JSON.stringify(siteOrigin)}.`);
	}
	return parsed.origin;
}

async function findFiles(directory, prefix = '') {
	const files = [];
	for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
		const relativePath = path.posix.join(prefix.split(path.sep).join('/'), entry.name);
		if (entry.isDirectory()) files.push(...await findFiles(directory, relativePath));
		else if (entry.isFile()) files.push(relativePath);
	}
	return files.sort();
}

function publicUrlForFile(file, publicBaseUrl) {
	if (file === 'index.html') return publicBaseUrl;
	if (file.endsWith('/index.html')) return new URL(`${file.slice(0, -'index.html'.length)}`, publicBaseUrl);
	return new URL(file, publicBaseUrl);
}

function parseSrcset(srcset) {
	const urls = [];
	let cursor = 0;
	while (cursor < srcset.length) {
		while (cursor < srcset.length && /[\s,]/u.test(srcset[cursor])) cursor += 1;
		if (cursor >= srcset.length) break;
		const start = cursor;
		while (cursor < srcset.length && !/\s/u.test(srcset[cursor])) cursor += 1;
		let url = srcset.slice(start, cursor);
		const trailingCommas = url.match(/,+$/u)?.[0].length ?? 0;
		if (trailingCommas > 0) url = url.slice(0, -trailingCommas);
		if (url) urls.push(url);
		if (trailingCommas === 0) while (cursor < srcset.length && srcset[cursor] !== ',') cursor += 1;
		if (srcset[cursor] === ',') cursor += 1;
	}
	return urls;
}

function documentNodes(html) {
	const pending = [{ node: parse(html), canSetBase: true }];
	const nodes = [];
	while (pending.length > 0) {
		const current = pending.pop();
		nodes.push(current);
		if (current.node.childNodes) {
			pending.push(...current.node.childNodes.toReversed().map((node) => ({
				node,
				canSetBase: current.canSetBase,
			})));
		}
		if (current.node.content) pending.push({ node: current.node.content, canSetBase: false });
	}
	return nodes;
}

function inspectDocument(html, sourcePublicUrl) {
	const nodes = documentNodes(html);
	const anchors = new Set();
	let documentBaseUrl = sourcePublicUrl;
	let activeBaseAttribute;

	for (const { node, canSetBase } of nodes) {
		if (!canSetBase || node.tagName !== 'base') continue;
		activeBaseAttribute = node.attrs?.find(({ name }) => name.toLowerCase() === 'href');
		if (activeBaseAttribute) {
			try {
				documentBaseUrl = new URL(activeBaseAttribute.value.trim(), sourcePublicUrl);
			} catch {
				documentBaseUrl = sourcePublicUrl;
			}
			break;
		}
	}

	const references = [];
	for (const { node } of nodes) {
		for (const { name, value } of node.attrs ?? []) {
			const attribute = name.toLowerCase();
			if (attribute === 'id' || (node.tagName === 'a' && attribute === 'name')) anchors.add(value);
			if (!URL_ATTRIBUTES.has(attribute)) continue;
			const urls = attribute === 'srcset' ? parseSrcset(value) : [value];
			for (const url of urls) references.push({
				attribute,
				isBase: node.tagName === 'base' && attribute === 'href' && activeBaseAttribute?.value === value,
				resolutionBase: activeBaseAttribute === node.attrs?.find((entry) => entry.name === name && entry.value === value)
					? sourcePublicUrl
					: documentBaseUrl,
				url,
			});
		}
	}
	return { anchors, references };
}

function isWithinBase(pathname, expectedBase) {
	return pathname === expectedBase.slice(0, -1) || pathname.startsWith(expectedBase);
}

function outputTarget(url, expectedBase, files) {
	const encodedRelative = url.pathname === expectedBase.slice(0, -1)
		? ''
		: url.pathname.slice(expectedBase.length);
	let relative;
	try {
		relative = decodeURIComponent(encodedRelative);
	} catch {
		return undefined;
	}
	if (!relative) return files.has('index.html') ? 'index.html' : undefined;
	if (relative.endsWith('/')) {
		const indexFile = `${relative}index.html`;
		if (files.has(indexFile)) return indexFile;
		const standaloneHtml = `${relative.slice(0, -1)}.html`;
		return files.has(standaloneHtml) ? standaloneHtml : undefined;
	}
	if (files.has(relative)) return relative;
	const cleanUrlIndex = `${relative}/index.html`;
	return files.has(cleanUrlIndex) ? cleanUrlIndex : undefined;
}

function diagnosticSort(left, right) {
	return `${left.file}\0${left.attribute}\0${left.url}\0${left.kind}`
		.localeCompare(`${right.file}\0${right.attribute}\0${right.url}\0${right.kind}`);
}

export async function validateBuiltLinks({
	outputDir,
	expectedBase = '/',
	siteOrigin = DEFAULT_SITE_ORIGIN,
}) {
	const validatedBase = validateBase(expectedBase);
	const validatedOrigin = validateOrigin(siteOrigin);
	const publicBaseUrl = new URL(validatedBase, `${validatedOrigin}/`);
	const fileList = await findFiles(outputDir);
	const files = new Set(fileList);
	const documents = new Map();

	for (const file of fileList.filter((candidate) => candidate.endsWith('.html'))) {
		const sourcePublicUrl = publicUrlForFile(file, publicBaseUrl);
		documents.set(file, inspectDocument(await readFile(path.join(outputDir, file), 'utf8'), sourcePublicUrl));
	}

	const diagnostics = [];
	for (const [file, { references }] of documents) {
		const sourcePublicUrl = publicUrlForFile(file, publicBaseUrl);
		for (const { attribute, isBase, resolutionBase, url: rawUrl } of references) {
			const url = rawUrl.trim();
			if (!url) continue;
			const scheme = url.match(/^([a-z][\w+.-]*):/iu)?.[1].toLowerCase();
			if (scheme && SKIPPED_SCHEMES.has(scheme)) continue;

			let resolved;
			try {
				resolved = new URL(url, resolutionBase ?? sourcePublicUrl);
			} catch {
				diagnostics.push({ kind: 'invalid-url', file, attribute, url });
				continue;
			}
			if (!['http:', 'https:'].includes(resolved.protocol) || resolved.origin !== validatedOrigin) continue;
			if (!isWithinBase(resolved.pathname, validatedBase)) {
				diagnostics.push({ kind: 'base-escape', file, attribute, url });
				continue;
			}
			if (isBase) continue;

			const target = outputTarget(resolved, validatedBase, files);
			if (!target) {
				diagnostics.push({ kind: 'missing-target', file, attribute, url });
				continue;
			}
			if (attribute !== 'href' || !resolved.hash || !target.endsWith('.html')) continue;
			let fragment;
			try {
				fragment = decodeURIComponent(resolved.hash.slice(1));
			} catch {
				diagnostics.push({ kind: 'invalid-url', file, attribute, url });
				continue;
			}
			if (fragment && !documents.get(target)?.anchors.has(fragment)) {
				diagnostics.push({ kind: 'missing-fragment', file, attribute, url, target, fragment });
			}
		}
	}
	return diagnostics.sort(diagnosticSort);
}

function parseArguments(args) {
	const options = { outputDir: path.resolve(process.cwd(), 'dist'), expectedBase: '/' };
	for (const argument of args) {
		if (argument.startsWith('--base=')) options.expectedBase = argument.slice('--base='.length);
		else if (argument.startsWith('--output=')) options.outputDir = path.resolve(argument.slice('--output='.length));
		else if (argument.startsWith('--site-origin=')) options.siteOrigin = argument.slice('--site-origin='.length);
		else throw new TypeError(`Unknown argument ${JSON.stringify(argument)}.`);
	}
	return options;
}

async function main() {
	const options = parseArguments(process.argv.slice(2));
	const diagnostics = await validateBuiltLinks(options);
	if (diagnostics.length === 0) {
		console.log(`Built-link check passed (${options.expectedBase}).`);
		return;
	}
	console.error(`Built-link check found ${diagnostics.length} failure(s) (${options.expectedBase}):`);
	for (const diagnostic of diagnostics) {
		const suffix = diagnostic.fragment ? ` (fragment ${JSON.stringify(diagnostic.fragment)})` : '';
		console.error(`${diagnostic.file}: ${diagnostic.attribute}: ${diagnostic.url}: ${diagnostic.kind}${suffix}`);
	}
	process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
