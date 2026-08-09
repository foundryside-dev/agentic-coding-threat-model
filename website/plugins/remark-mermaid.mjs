import { visit } from 'unist-util-visit';

function escapeText(source) {
	return source.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttribute(source) {
	return escapeText(source).replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function mermaidFences() {
	return (tree) => {
		visit(tree, 'code', (node, index, parent) => {
			if (
				node.lang !== 'mermaid' ||
				typeof node.value !== 'string' ||
				parent === undefined ||
				index === undefined ||
				!Array.isArray(parent.children) ||
				parent.children[index] !== node
			) {
				return;
			}

			parent.children[index] = {
				type: 'html',
				value: `<pre class="mermaid" data-src="${escapeAttribute(node.value)}">${escapeText(node.value)}</pre>`,
			};
		});
	};
}
