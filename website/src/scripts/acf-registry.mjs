/**
 * Return the entries matching every non-empty facet value.
 *
 * @template {object} T
 * @param {T[]} entries
 * @param {Record<string, string>} filters
 */
export function filterEntries(entries, filters) {
	const activeFilters = Object.entries(filters).filter(([, value]) => value !== '');
	return entries.filter((entry) => activeFilters.every(
		([field, value]) => /** @type {Record<string, unknown>} */ (entry)[field] === value,
	));
}

/**
 * Prepare a deterministic registry view. A STRIDE-specific registry is fixed
 * to that category, so it intentionally has no interactive filters.
 *
 * @template {{ id: string, stride: string }} T
 * @param {T[]} entries
 * @param {string | undefined} stride
 */
export function createRegistryView(entries, stride) {
	const selected = stride ? filterEntries(entries, { stride }) : entries;
	return {
		entries: [...selected].sort((left, right) => left.id.localeCompare(right.id)),
		showFilters: stride === undefined,
	};
}

/** Build an ACF entry URL from Astro's deployment base and the real content ID. */
export function acfHref(base, contentId) {
	const normalizedBase = `/${String(base).replace(/^\/+|\/+$/g, '')}`;
	return `${normalizedBase === '/' ? '' : normalizedBase}/${contentId.replace(/^\/+|\/+$/g, '')}/`;
}

/**
 * Enhance every registry currently in the document. Root-scoped state keeps
 * multiple registries independent; a WeakSet makes repeated page-load events
 * idempotent while allowing swapped-out DOM to be collected.
 */
export function createAcfRegistryController({ document = globalThis.document } = {}) {
	return createFilterRegistryController({
		document,
		rootSelector: '[data-acf-registry]',
		filterSelector: '[data-acf-filters] select[data-facet]',
		rowSelector: '[data-acf-entry]',
		statusSelector: '[data-acf-results]',
		emptySelector: '[data-acf-empty]',
		noun: 'entry',
		pluralNoun: 'entries',
	});
}
import { createFilterRegistryController } from './filter-registry.mjs';
