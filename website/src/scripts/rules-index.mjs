import { createFilterRegistryController } from './filter-registry.mjs';

/** Return the rules matching every non-empty facet value. */
export function filterRules(rules, filters) {
	const activeFilters = Object.entries(filters).filter(([, value]) => value !== '');
	return rules.filter((rule) => activeFilters.every(([field, value]) => rule[field] === value));
}

/** Build a rule anchor under Astro's deployment base. */
export function ruleHref(base, rule) {
	const normalizedBase = `/${String(base).replace(/^\/+|\/+$/g, '')}`;
	const prefix = normalizedBase === '/' ? '' : normalizedBase;
	const page = rule.language === 'rust' ? 'rust-rules' : `${rule.family}-rules`;
	return `${prefix}/wardline/rules/${page}/#${rule.id.toLowerCase()}`;
}

/** Enhance every Rules Index independently across Astro page swaps. */
export function createRulesIndexController({ document = globalThis.document } = {}) {
	return createFilterRegistryController({
		document,
		rootSelector: '[data-rules-index]',
		filterSelector: '[data-rules-filters] select[data-facet]',
		rowSelector: '[data-rule-entry]',
		statusSelector: '[data-rules-results]',
		emptySelector: '[data-rules-empty]',
		noun: 'rule',
	});
}
