export const FAILURE_MESSAGE = 'Diagram rendering unavailable. Source follows.';

function sourceFor(node) {
	return node.dataset.src ?? node.textContent ?? '';
}

function restoreSource(node) {
	node.textContent = sourceFor(node);
	node.removeAttribute('data-processed');
}

function failureNoticeFor(node) {
	const candidate = node.previousElementSibling;
	return candidate?.hasAttribute('data-mermaid-failure') ? candidate : undefined;
}

function showFailure(document, node) {
	let notice = failureNoticeFor(node);
	if (!notice) {
		notice = document.createElement('p');
		notice.setAttribute('data-mermaid-failure', '');
		notice.setAttribute('role', 'status');
		node.before(notice);
	}
	notice.textContent = FAILURE_MESSAGE;
}

function clearFailure(node) {
	failureNoticeFor(node)?.remove();
}

export function createMermaidRenderer({
	document = globalThis.document,
	MutationObserver = globalThis.MutationObserver,
	loadMermaid = () => import('mermaid').then(({ default: mermaid }) => mermaid),
} = {}) {
	let mermaidPromise;
	let renderVersion = 0;
	let renderQueue = Promise.resolve();
	let initialized = false;

	function getMermaid() {
		if (!mermaidPromise) {
			let retryable;
			const pending = Promise.resolve().then(loadMermaid);
			retryable = pending.catch((error) => {
				if (mermaidPromise === retryable) mermaidPromise = undefined;
				throw error;
			});
			mermaidPromise = retryable;
		}
		return mermaidPromise;
	}

	async function render(version) {
		if (version !== renderVersion) return;

		const nodes = [...document.querySelectorAll('pre.mermaid')];
		if (nodes.length === 0) return;

		try {
			const mermaid = await getMermaid();
			if (version !== renderVersion) return;

			for (const node of nodes) restoreSource(node);
			const dark = document.documentElement.dataset.theme === 'dark';
			mermaid.initialize({
				startOnLoad: false,
				theme: dark ? 'dark' : 'default',
				...(dark ? { themeVariables: { edgeLabelBackground: '#333333' } } : {}),
			});
			await mermaid.run({ nodes });
			for (const node of nodes) clearFailure(node);
		} catch {
			for (const node of nodes) {
				restoreSource(node);
				showFailure(document, node);
			}
		}
	}

	function schedule() {
		const version = ++renderVersion;
		renderQueue = renderQueue.then(
			() => render(version),
			() => render(version),
		).catch(() => undefined);
		return renderQueue;
	}

	function install() {
		if (initialized) return;
		initialized = true;
		document.addEventListener('astro:page-load', schedule);
		const themeObserver = new MutationObserver(schedule);
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme'],
		});
	}

	return { install, schedule };
}
