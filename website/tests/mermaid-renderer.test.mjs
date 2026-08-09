import assert from 'node:assert/strict';
import test from 'node:test';

import { createMermaidRenderer, FAILURE_MESSAGE } from '../src/scripts/mermaid-renderer.mjs';

class FakeNotice {
	attributes = new Map();
	textContent = '';

	setAttribute(name, value) {
		this.attributes.set(name, value);
	}

	hasAttribute(name) {
		return this.attributes.has(name);
	}

	getAttribute(name) {
		return this.attributes.get(name) ?? null;
	}

	remove() {
		if (this.owner?.previousElementSibling === this) this.owner.previousElementSibling = null;
	}
}

class FakePre {
	attributes = new Map([['data-processed', 'true']]);
	previousElementSibling = null;

	constructor(source, textContent = '<svg>partial</svg>') {
		this.dataset = { src: source };
		this.textContent = textContent;
	}

	setAttribute(name, value) {
		this.attributes.set(name, value);
	}

	getAttribute(name) {
		return this.attributes.get(name) ?? null;
	}

	removeAttribute(name) {
		this.attributes.delete(name);
	}

	before(notice) {
		notice.owner = this;
		this.previousElementSibling = notice;
	}
}

function fakeDocument(nodes) {
	return {
		documentElement: { dataset: { theme: 'light' } },
		listeners: new Map(),
		querySelectorAll(selector) {
			assert.equal(selector, 'pre.mermaid');
			return nodes;
		},
		createElement(tag) {
			assert.equal(tag, 'p');
			return new FakeNotice();
		},
		addEventListener(name, listener) {
			this.listeners.set(name, listener);
		},
	};
}

function fakeObserver() {
	return class {
		observe() {}
	};
}

test('does not import Mermaid when the current page has no Mermaid blocks', async () => {
	let loadCalls = 0;
	const renderer = createMermaidRenderer({
		document: fakeDocument([]),
		MutationObserver: fakeObserver(),
		loadMermaid: async () => {
			loadCalls += 1;
			return {};
		},
	});

	await renderer.schedule();

	assert.equal(loadCalls, 0);
});

test('an import failure is handled, restores source, and adds one accessible notice', async () => {
	const source = 'graph LR\nA --> B';
	const node = new FakePre(source);
	let loadCalls = 0;
	const renderer = createMermaidRenderer({
		document: fakeDocument([node]),
		MutationObserver: fakeObserver(),
		loadMermaid: async () => {
			loadCalls += 1;
			throw new Error('chunk unavailable');
		},
	});

	await assert.doesNotReject(renderer.schedule());
	await assert.doesNotReject(renderer.schedule());

	assert.equal(loadCalls, 2, 'a rejected import must not remain cached');
	assert.equal(node.textContent, source);
	assert.equal(node.getAttribute('data-processed'), null);
	assert.equal(node.previousElementSibling?.getAttribute('role'), 'status');
	assert.equal(node.previousElementSibling?.textContent, FAILURE_MESSAGE);
});

test('a later successful retry renders the diagram and removes the failure notice', async () => {
	const node = new FakePre('graph LR\nA --> B');
	let loadCalls = 0;
	const mermaid = {
		initialize() {},
		async run({ nodes }) {
			for (const diagram of nodes) {
				diagram.textContent = '<svg>rendered</svg>';
				diagram.setAttribute('data-processed', 'true');
			}
		},
	};
	const renderer = createMermaidRenderer({
		document: fakeDocument([node]),
		MutationObserver: fakeObserver(),
		loadMermaid: async () => {
			loadCalls += 1;
			if (loadCalls === 1) throw new Error('first import fails');
			return mermaid;
		},
	});

	await renderer.schedule();
	assert.ok(node.previousElementSibling);

	await renderer.schedule();

	assert.equal(loadCalls, 2);
	assert.equal(node.textContent, '<svg>rendered</svg>');
	assert.equal(node.getAttribute('data-processed'), 'true');
	assert.equal(node.previousElementSibling, null);
});

test('a render failure restores every affected source and does not duplicate notices', async () => {
	const first = new FakePre('graph LR\nA --> B');
	const second = new FakePre('graph TD\nC --> D');
	const mermaid = {
		initialize() {},
		async run({ nodes }) {
			for (const diagram of nodes) {
				diagram.textContent = '<svg>partial</svg>';
				diagram.setAttribute('data-processed', 'true');
			}
			throw new Error('render failed');
		},
	};
	const renderer = createMermaidRenderer({
		document: fakeDocument([first, second]),
		MutationObserver: fakeObserver(),
		loadMermaid: async () => mermaid,
	});

	await renderer.schedule();
	const firstNotice = first.previousElementSibling;
	await renderer.schedule();

	assert.equal(first.textContent, first.dataset.src);
	assert.equal(second.textContent, second.dataset.src);
	assert.equal(first.getAttribute('data-processed'), null);
	assert.equal(second.getAttribute('data-processed'), null);
	assert.strictEqual(first.previousElementSibling, firstNotice);
	assert.equal(first.previousElementSibling?.getAttribute('role'), 'status');
	assert.equal(second.previousElementSibling?.getAttribute('role'), 'status');
});

test('coalesces queued schedules and renders only the newest request', async () => {
	const node = new FakePre('graph LR\nA --> B');
	let renderCalls = 0;
	const renderer = createMermaidRenderer({
		document: fakeDocument([node]),
		MutationObserver: fakeObserver(),
		loadMermaid: async () => ({
			initialize() {},
			async run() {
				renderCalls += 1;
			},
		}),
	});

	const first = renderer.schedule();
	const second = renderer.schedule();
	await Promise.all([first, second]);

	assert.equal(renderCalls, 1);
});

test('dark diagrams use a WCAG-contrasting edge-label background', async () => {
	const node = new FakePre('graph LR\nA -->|label| B');
	const document = fakeDocument([node]);
	document.documentElement.dataset.theme = 'dark';
	let options;
	const renderer = createMermaidRenderer({
		document,
		MutationObserver: fakeObserver(),
		loadMermaid: async () => ({
			initialize(value) { options = value; },
			async run() {},
		}),
	});

	await renderer.schedule();

	assert.deepEqual(options, {
		startOnLoad: false,
		theme: 'dark',
		themeVariables: { edgeLabelBackground: '#333333' },
	});
});
