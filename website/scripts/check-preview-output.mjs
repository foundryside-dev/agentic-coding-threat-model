import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'parse5';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

const DEFAULT_EXPECTED_BASE = '/preview/';
const DEFAULT_SITE_ORIGIN = 'https://semanticdefects.foundryside.dev';
const HTML_URL_ATTRIBUTES = new Set(['href', 'src', 'srcset', 'action', 'formaction', 'poster']);

function invalidConfiguration(name, value, requirement) {
	throw new TypeError(`Invalid ${name} ${JSON.stringify(value)}: ${requirement}.`);
}

function validateExpectedBase(expectedBase) {
	if (typeof expectedBase !== 'string' || expectedBase.length === 0) {
		invalidConfiguration('EXPECTED_BASE', expectedBase, 'must be a non-empty absolute path');
	}
	if (expectedBase.trim() !== expectedBase) {
		invalidConfiguration('EXPECTED_BASE', expectedBase, 'must not contain leading or trailing whitespace');
	}
	if (!expectedBase.startsWith('/') || !expectedBase.endsWith('/') || expectedBase.startsWith('//')) {
		invalidConfiguration('EXPECTED_BASE', expectedBase, 'must begin with one slash and end with a slash');
	}
	if (expectedBase.includes('?') || expectedBase.includes('#')) {
		invalidConfiguration('EXPECTED_BASE', expectedBase, 'must not contain a query or fragment');
	}
	if (expectedBase.includes('\\')) {
		invalidConfiguration('EXPECTED_BASE', expectedBase, 'must not contain backslashes');
	}
	if (hasMalformedPercentEncoding(expectedBase)) {
		invalidConfiguration('EXPECTED_BASE', expectedBase, 'must contain only valid percent encoding');
	}

	const segments = expectedBase.slice(1, -1).split('/');
	if (expectedBase !== '/' && segments.some((segment) => segment.length === 0)) {
		invalidConfiguration('EXPECTED_BASE', expectedBase, 'must not contain empty path segments');
	}
	for (const segment of segments) {
		const decoded = decodeURIComponent(segment);
		if (decoded === '.' || decoded === '..') {
			invalidConfiguration('EXPECTED_BASE', expectedBase, 'must not contain dot segments');
		}
		if (decoded.includes('/') || decoded.includes('\\')) {
			invalidConfiguration('EXPECTED_BASE', expectedBase, 'must not contain encoded path separators');
		}
	}

	return expectedBase;
}

function validateSiteOrigin(siteOrigin) {
	if (typeof siteOrigin !== 'string' || siteOrigin.length === 0) {
		invalidConfiguration('SITE_ORIGIN', siteOrigin, 'must be a non-empty HTTP(S) origin');
	}
	if (siteOrigin.trim() !== siteOrigin || siteOrigin.includes('?') || siteOrigin.includes('#')) {
		invalidConfiguration('SITE_ORIGIN', siteOrigin, 'must be an origin without whitespace, query, or fragment');
	}
	if (siteOrigin.includes('\\') || !/^https?:\/\/[^/?#\\]+\/?$/iu.test(siteOrigin)) {
		invalidConfiguration('SITE_ORIGIN', siteOrigin, 'must not contain a path or backslash');
	}

	let parsed;
	try {
		parsed = new URL(siteOrigin);
	} catch {
		invalidConfiguration('SITE_ORIGIN', siteOrigin, 'must be an absolute HTTP(S) origin');
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		invalidConfiguration('SITE_ORIGIN', siteOrigin, 'must use the http or https scheme');
	}
	if (parsed.username || parsed.password) {
		invalidConfiguration('SITE_ORIGIN', siteOrigin, 'must not contain credentials');
	}
	if (parsed.pathname !== '/') {
		invalidConfiguration('SITE_ORIGIN', siteOrigin, 'must not contain a path');
	}

	return parsed.origin;
}

function isPathWithinBase(pathname, expectedBase) {
	return pathname === expectedBase.slice(0, -1) || pathname.startsWith(expectedBase);
}

function hasMalformedPercentEncoding(value) {
	return /%(?![\da-f]{2})/iu.test(value);
}

function isOffendingUrl(rawUrl, expectedBase, siteOrigin, sourcePublicUrl) {
	const url = rawUrl.trim();
	if (!url || url.startsWith('#') || url.startsWith('?')) return false;
	const scheme = url.match(/^([a-z][\w+.-]*):/iu)?.[1].toLowerCase();
	if (scheme && scheme !== 'http' && scheme !== 'https') return false;

	let parsed;
	try {
		parsed = new URL(url, sourcePublicUrl);
	} catch {
		return false;
	}

	if (parsed.origin !== siteOrigin) return false;
	return hasMalformedPercentEncoding(url) || !isPathWithinBase(parsed.pathname, expectedBase);
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

		if (trailingCommas === 0) {
			while (cursor < srcset.length && srcset[cursor] !== ',') cursor += 1;
		}
		if (srcset[cursor] === ',') cursor += 1;
	}

	return urls;
}

function inspectHtml(html, file, expectedBase, siteOrigin, sourcePublicUrl) {
	const diagnostics = [];
	const pending = [{ node: parse(html), canSetDocumentBase: true }];
	const parsedNodes = [];
	let documentBaseUrl = sourcePublicUrl;

	while (pending.length > 0) {
		const { node, canSetDocumentBase } = pending.pop();
		parsedNodes.push({ node, canSetDocumentBase });
		if (node.childNodes) {
			pending.push(
				...node.childNodes.toReversed().map((child) => ({ node: child, canSetDocumentBase })),
			);
		}
		if (node.content) pending.push({ node: node.content, canSetDocumentBase: false });
	}

	let activeBaseAttribute;
	for (const { node, canSetDocumentBase } of parsedNodes) {
		if (
			canSetDocumentBase
			&& node.namespaceURI === 'http://www.w3.org/1999/xhtml'
			&& node.tagName === 'base'
		) {
			activeBaseAttribute = node.attrs?.find((attribute) => attribute.name.toLowerCase() === 'href');
			if (activeBaseAttribute) {
				try {
					documentBaseUrl = new URL(activeBaseAttribute.value.trim(), sourcePublicUrl);
				} catch {
					documentBaseUrl = sourcePublicUrl;
				}
				break;
			}
		}
	}

	for (const { node } of parsedNodes) {
		for (const attribute of node.attrs ?? []) {
			const location = attribute.name.toLowerCase();
			if (!HTML_URL_ATTRIBUTES.has(location)) continue;
			const value = attribute.value;
			const urls = location === 'srcset' ? parseSrcset(value) : [value];
			const resolutionBaseUrl = attribute === activeBaseAttribute ? sourcePublicUrl : documentBaseUrl;
			for (const url of urls) {
				if (isOffendingUrl(url, expectedBase, siteOrigin, resolutionBaseUrl)) {
					diagnostics.push({ file, location, url });
				}
			}
		}
	}

	return diagnostics;
}

function decodeCssEscapes(value) {
	let decoded = '';
	let cursor = 0;

	while (cursor < value.length) {
		if (value[cursor] !== '\\') {
			decoded += value[cursor];
			cursor += 1;
			continue;
		}

		cursor += 1;
		if (cursor >= value.length) {
			decoded += '\uFFFD';
			break;
		}
		if (value[cursor] === '\n' || value[cursor] === '\f') {
			cursor += 1;
			continue;
		}
		if (value[cursor] === '\r') {
			cursor += value[cursor + 1] === '\n' ? 2 : 1;
			continue;
		}

		let hexadecimal = '';
		while (cursor < value.length && hexadecimal.length < 6 && /[\da-f]/iu.test(value[cursor])) {
			hexadecimal += value[cursor];
			cursor += 1;
		}
		if (hexadecimal) {
			const codePoint = Number.parseInt(hexadecimal, 16);
			decoded += codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)
				? '\uFFFD'
				: String.fromCodePoint(codePoint);
			if (/[\t\n\f\r ]/u.test(value[cursor] ?? '')) {
				if (value[cursor] === '\r' && value[cursor + 1] === '\n') cursor += 1;
				cursor += 1;
			}
			continue;
		}

		decoded += value[cursor];
		cursor += 1;
	}

	return decoded;
}

function cssUrlFunctionValue(node) {
	const significantNodes = node.nodes.filter((child) => child.type !== 'comment' && child.type !== 'space');
	if (significantNodes.length === 1 && significantNodes[0].type === 'string') {
		return significantNodes[0].value;
	}
	return valueParser.stringify(significantNodes).trim();
}

function isSingleCssWhitespace(value) {
	return /^(?:[\t\n\f ]|\r\n?)$/u.test(value);
}

function endsWithHexEscape(value) {
	const match = value.match(/(\\+)[\da-f]{1,6}$/iu);
	return Boolean(match && match[1].length % 2 === 1);
}

function decodedCssFunctionIdentifier(node, index, siblings) {
	let identifier = node.value;
	if (
		index >= 2
		&& siblings[index - 2].type === 'word'
		&& endsWithHexEscape(siblings[index - 2].value)
		&& siblings[index - 1].type === 'space'
		&& isSingleCssWhitespace(siblings[index - 1].value)
	) {
		identifier = `${siblings[index - 2].value}${siblings[index - 1].value}${identifier}`;
	}
	return decodeCssEscapes(identifier).toLowerCase();
}

function inspectCss(css, file, expectedBase, siteOrigin, sourcePublicUrl) {
	const diagnostics = [];
	const stylesheet = postcss.parse(css, { from: file });

	function inspectUrl(url, location) {
		if (isOffendingUrl(decodeCssEscapes(url), expectedBase, siteOrigin, sourcePublicUrl)) {
			diagnostics.push({ file, location, url });
		}
	}

	stylesheet.walk((node) => {
		if (node.type === 'decl') {
			valueParser(node.value).walk((valueNode, index, siblings) => {
				if (valueNode.type !== 'function' || decodedCssFunctionIdentifier(valueNode, index, siblings) !== 'url') {
					return undefined;
				}
				inspectUrl(cssUrlFunctionValue(valueNode), node.prop);
				return false;
			});
		} else if (node.type === 'atrule' && node.name.toLowerCase() === 'import') {
			const importNodes = valueParser(node.params).nodes;
			const targetIndex = importNodes.findIndex(
				(valueNode) => valueNode.type !== 'space' && valueNode.type !== 'comment',
			);
			const target = importNodes[targetIndex];
			if (target?.type === 'string') {
				inspectUrl(target.value, '@import');
			} else {
				const functionIndex = target?.type === 'function' ? targetIndex : targetIndex + 2;
				const targetFunction = importNodes[functionIndex];
				if (
					targetFunction?.type === 'function'
					&& decodedCssFunctionIdentifier(targetFunction, functionIndex, importNodes) === 'url'
				) {
					inspectUrl(cssUrlFunctionValue(targetFunction), '@import');
				}
			}
		}
	});

	return diagnostics;
}

async function findOutputFiles(directory) {
	const files = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await findOutputFiles(entryPath)));
		} else if (entry.isFile() && /\.(?:css|html)$/iu.test(entry.name)) {
			files.push(entryPath);
		}
	}
	return files.sort();
}

export async function scanPreviewOutput({
	outputDir,
	expectedBase = DEFAULT_EXPECTED_BASE,
	siteOrigin = DEFAULT_SITE_ORIGIN,
}) {
	const validatedBase = validateExpectedBase(expectedBase);
	const validatedOrigin = validateSiteOrigin(siteOrigin);
	const publicBaseUrl = new URL(validatedBase, validatedOrigin);
	const diagnostics = [];

	for (const filePath of await findOutputFiles(outputDir)) {
		const file = path.relative(outputDir, filePath).split(path.sep).join('/');
		const contents = await readFile(filePath, 'utf8');
		const sourcePublicUrl = new URL(file, publicBaseUrl);
		const inspect = filePath.toLowerCase().endsWith('.html') ? inspectHtml : inspectCss;
		diagnostics.push(...inspect(contents, file, validatedBase, validatedOrigin, sourcePublicUrl));
	}

	return diagnostics;
}

async function main() {
	const outputDir = path.resolve(process.cwd(), 'dist');
	const expectedBase = process.env.EXPECTED_BASE ?? DEFAULT_EXPECTED_BASE;
	const siteOrigin = process.env.SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN;
	const diagnostics = await scanPreviewOutput({ outputDir, expectedBase, siteOrigin });

	if (diagnostics.length === 0) {
		console.log(`Preview output URL check passed (${expectedBase}).`);
		return;
	}

	console.error(`Preview output contains ${diagnostics.length} URL(s) outside ${expectedBase}:`);
	for (const { file, location, url } of diagnostics) {
		console.error(`${file}: ${location}: ${url}`);
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
