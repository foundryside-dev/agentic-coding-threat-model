const linearChannel = (channel) => {
	const srgb = channel / 255;
	return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

const contrastingTextColour = (hexColour) => {
	const [red, green, blue] = [1, 3, 5].map((offset) =>
		linearChannel(Number.parseInt(hexColour.slice(offset, offset + 2), 16)),
	);
	const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
	const blackContrast = (luminance + 0.05) / 0.05;
	const whiteContrast = 1.05 / (luminance + 0.05);
	return blackContrast >= whiteContrast ? '#000' : '#fff';
};

const nodeId = (id) => id.replaceAll('-', '_');

export function buildLatticeDiagramSource(states) {
	const nodes = states.map(
		(state) => `${nodeId(state.id)}["${state.state}<br/><i>rank ${state.rank}</i>"]`,
	);
	const edges = nodes.slice(0, -1).map((node, index) => `${node} --> ${nodes[index + 1]}`);
	const styles = states.map(
		(state) =>
			`style ${nodeId(state.id)} fill:${state.colour},color:${contrastingTextColour(state.colour)}`,
	);
	return ['flowchart TD', ...edges, ...styles].join('\n');
}
