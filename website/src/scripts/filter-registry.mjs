/**
 * Create a root-scoped, idempotent controller for a progressively enhanced
 * faceted table. The caller supplies selectors so independent registries can
 * share lifecycle behaviour without sharing state.
 */
export function createFilterRegistryController({
	document = globalThis.document,
	rootSelector,
	filterSelector,
	rowSelector,
	statusSelector,
	emptySelector,
	noun,
	pluralNoun = `${noun}s`,
}) {
	const initializedRoots = new WeakSet();
	let installed = false;

	function init(root) {
		if (initializedRoots.has(root)) return false;

		const selects = [...root.querySelectorAll(filterSelector)];
		const rows = [...root.querySelectorAll(rowSelector)];
		const status = root.querySelector(statusSelector);
		const empty = root.querySelector(emptySelector);

		function applyFilters() {
			const activeFilters = selects
				.filter((select) => select.value !== '')
				.map((select) => [select.dataset.facet, select.value]);
			let count = 0;

			for (const row of rows) {
				const visible = activeFilters.every(([field, value]) => row.dataset[field] === value);
				row.hidden = !visible;
				if (visible) count += 1;
			}

			if (status) status.textContent = `${count} ${count === 1 ? noun : pluralNoun} shown`;
			if (empty) empty.hidden = count !== 0;
		}

		for (const select of selects) select.addEventListener('change', applyFilters);
		root.setAttribute?.('data-enhanced', '');
		initializedRoots.add(root);
		applyFilters();
		return true;
	}

	function initAll() {
		for (const root of document.querySelectorAll(rootSelector)) init(root);
	}

	function install() {
		if (installed) return;
		installed = true;
		document.addEventListener('astro:page-load', initAll);
	}

	return { init, initAll, install };
}
