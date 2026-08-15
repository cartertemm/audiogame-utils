const DEFAULT_NODE_SIZE = 16;

export function createRTree(bounds, count, node_size = DEFAULT_NODE_SIZE) {
	if (node_size < 2) throw new Error(`map: createRTree node_size must be at least 2, got ${node_size}`);
	if (count === 0) return { search: () => [] };

	const level_bounds = [count * 4];
	let level_count = count;
	let node_count = count;
	do {
		level_count = Math.ceil(level_count / node_size);
		node_count += level_count;
		level_bounds.push(node_count * 4);
	} while (level_count !== 1);

	const boxes = new Int32Array(node_count * 4);
	const indices = new Int32Array(node_count);

	const order = sort_items(bounds, count, node_size);
	for (let i = 0; i < count; i++) {
		const src = order[i] * 4;
		const dst = i * 4;
		boxes[dst] = bounds[src];
		boxes[dst + 1] = bounds[src + 1];
		boxes[dst + 2] = bounds[src + 2];
		boxes[dst + 3] = bounds[src + 3];
		indices[i] = order[i];
	}

	let read = 0;
	let write = count * 4;
	for (let level = 0; level < level_bounds.length - 1; level++) {
		const end = level_bounds[level];
		while (read < end) {
			const node_start = read;
			let minx = Infinity;
			let maxx = -Infinity;
			let miny = Infinity;
			let maxy = -Infinity;
			for (let i = 0; i < node_size && read < end; i++) {
				if (boxes[read] < minx) minx = boxes[read];
				if (boxes[read + 1] > maxx) maxx = boxes[read + 1];
				if (boxes[read + 2] < miny) miny = boxes[read + 2];
				if (boxes[read + 3] > maxy) maxy = boxes[read + 3];
				read += 4;
			}
			indices[write >> 2] = node_start;
			boxes[write] = minx;
			boxes[write + 1] = maxx;
			boxes[write + 2] = miny;
			boxes[write + 3] = maxy;
			write += 4;
		}
	}

	function level_end(position) {
		for (let i = 0; i < level_bounds.length; i++) {
			if (level_bounds[i] > position) return level_bounds[i];
		}
		return boxes.length;
	}

	function search(minx, maxx, miny, maxy) {
		const results = [];
		const queue = [];
		let node = boxes.length - 4;
		for (;;) {
			const end = Math.min(node + node_size * 4, level_end(node));
			for (let pos = node; pos < end; pos += 4) {
				if (maxx < boxes[pos] || minx > boxes[pos + 1]) continue;
				if (maxy < boxes[pos + 2] || miny > boxes[pos + 3]) continue;
				const index = indices[pos >> 2];
				if (node >= count * 4) queue.push(index);
				else results.push(index);
			}
			if (queue.length === 0) return results;
			node = queue.pop();
		}
	}

	return { search };
}

// Sort-tile-recursive ordering: sort by center x, cut into vertical slices,
// then sort each slice by center y. Consecutive runs of node_size items then
// form leaves with tight bounding boxes.
function sort_items(bounds, count, node_size) {
	const order = Array.from({ length: count }, (unused, i) => i);
	const center_x = (i) => (bounds[i * 4] + bounds[i * 4 + 1]) / 2;
	const center_y = (i) => (bounds[i * 4 + 2] + bounds[i * 4 + 3]) / 2;
	order.sort((a, b) => center_x(a) - center_x(b));
	const slice_count = Math.ceil(Math.sqrt(Math.ceil(count / node_size)));
	const slice_size = Math.ceil(count / slice_count);
	for (let start = 0; start < count; start += slice_size) {
		const slice = order.slice(start, start + slice_size);
		slice.sort((a, b) => center_y(a) - center_y(b));
		for (let i = 0; i < slice.length; i++) order[start + i] = slice[i];
	}
	return Int32Array.from(order);
}
