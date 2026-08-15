import { describe, test, expect } from 'vitest';
import { createRTree } from '../src/physics/rtree.js';

// Builds an Int32Array of minx,maxx,miny,maxy rows from an array of arrays.
function pack(rows) {
	const bounds = new Int32Array(rows.length * 4);
	rows.forEach((row, i) => bounds.set(row, i * 4));
	return bounds;
}

function brute(rows, minx, maxx, miny, maxy) {
	const out = [];
	rows.forEach((row, i) => {
		if (maxx < row[0] || minx > row[1] || maxy < row[2] || miny > row[3]) return;
		out.push(i);
	});
	return out;
}

describe('createRTree', () => {
	test('finds a box containing the query point', () => {
		const rows = [[0, 10, 0, 10], [20, 30, 20, 30]];
		const tree = createRTree(pack(rows), rows.length);
		expect(tree.search(5, 5, 5, 5)).toEqual([0]);
	});

	test('treats touching boxes as overlapping', () => {
		const rows = [[0, 10, 0, 10], [10, 20, 0, 10]];
		const tree = createRTree(pack(rows), rows.length);
		expect(tree.search(10, 10, 5, 5).sort()).toEqual([0, 1]);
	});

	test('returns nothing for an empty region', () => {
		const rows = [[0, 10, 0, 10]];
		const tree = createRTree(pack(rows), rows.length);
		expect(tree.search(100, 100, 100, 100)).toEqual([]);
	});

	test('handles an empty tree', () => {
		expect(createRTree(new Int32Array(0), 0).search(0, 0, 0, 0)).toEqual([]);
	});

	test('rejects a node_size below 2', () => {
		const rows = [[0, 10, 0, 10], [20, 30, 20, 30]];
		expect(() => createRTree(pack(rows), rows.length, 1)).toThrow(/map: /);
		expect(() => createRTree(pack(rows), rows.length, 0)).toThrow(/map: /);
	});

	test('handles a single box', () => {
		const tree = createRTree(pack([[3, 3, 3, 3]]), 1);
		expect(tree.search(3, 3, 3, 3)).toEqual([0]);
		expect(tree.search(4, 4, 4, 4)).toEqual([]);
	});

	test('handles many identical boxes', () => {
		const rows = Array.from({ length: 100 }, () => [5, 5, 5, 5]);
		const tree = createRTree(pack(rows), rows.length);
		expect(tree.search(5, 5, 5, 5)).toHaveLength(100);
	});

	test('matches brute force on random boxes', () => {
		let seed = 12345;
		// Deterministic generator so a failure is reproducible.
		const next = (n) => {
			seed = (seed * 1103515245 + 12345) & 0x7fffffff;
			return seed % n;
		};
		const rows = Array.from({ length: 3000 }, () => {
			const x = next(100000);
			const y = next(100000);
			return [x, x + next(500), y, y + next(500)];
		});
		const tree = createRTree(pack(rows), rows.length);
		for (let q = 0; q < 200; q++) {
			const x = next(100000);
			const y = next(100000);
			const box = [x, x + next(2000), y, y + next(2000)];
			const got = [...tree.search(...box)].sort((a, b) => a - b);
			expect(got).toEqual(brute(rows, ...box));
		}
	});
});
