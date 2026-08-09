import assert from 'node:assert/strict';
import test from 'node:test';

import { mermaidFences } from '../plugins/remark-mermaid.mjs';

function transform(tree) {
	mermaidFences()(tree);
	return tree;
}

test('transforms an exactly-labelled Mermaid code block into an escaped pre element', () => {
	const source = 'graph LR\nA --> B';
	const tree = { type: 'root', children: [{ type: 'code', lang: 'mermaid', value: source }] };

	transform(tree);

	assert.deepEqual(tree.children, [
		{
			type: 'html',
			value: '<pre class="mermaid" data-src="graph LR\nA --&gt; B">graph LR\nA --&gt; B</pre>',
		},
	]);
});

test('preserves source in data-src while escaping quotes, ampersands, and angle brackets', () => {
	const source = 'graph LR\nA["A & <B>"] --> C';
	const tree = { type: 'root', children: [{ type: 'code', lang: 'mermaid', value: source }] };

	transform(tree);

	assert.equal(
		tree.children[0].value,
		'<pre class="mermaid" data-src="graph LR\nA[&quot;A &amp; &lt;B&gt;&quot;] --&gt; C">graph LR\nA["A &amp; &lt;B&gt;"] --&gt; C</pre>',
	);
});

test('leaves non-Mermaid code blocks and non-code nodes untouched', () => {
	const javascript = { type: 'code', lang: 'javascript', value: 'const graph = true;' };
	const capitalized = { type: 'code', lang: 'Mermaid', value: 'graph LR' };
	const paragraph = { type: 'paragraph', children: [{ type: 'text', value: 'Mermaid' }] };
	const tree = { type: 'root', children: [javascript, capitalized, paragraph] };

	transform(tree);

	assert.strictEqual(tree.children[0], javascript);
	assert.strictEqual(tree.children[1], capitalized);
	assert.strictEqual(tree.children[2], paragraph);
});

test('safely ignores a Mermaid code node without a parent or child index', () => {
	const orphan = { type: 'code', lang: 'mermaid', value: 'graph LR' };

	assert.doesNotThrow(() => transform(orphan));
	assert.strictEqual(orphan.type, 'code');
});

test('transforms every Mermaid block in a mixed tree', () => {
	const tree = {
		type: 'root',
		children: [
			{ type: 'code', lang: 'mermaid', value: 'graph LR\nA --> B' },
			{ type: 'code', lang: 'text', value: 'not a diagram' },
			{ type: 'blockquote', children: [{ type: 'code', lang: 'mermaid', value: 'graph TD\nC --> D' }] },
		],
	};

	transform(tree);

	assert.equal(tree.children[0].type, 'html');
	assert.equal(tree.children[1].type, 'code');
	assert.equal(tree.children[2].children[0].type, 'html');
});
