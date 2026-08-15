import { describe, test, expect, vi, afterEach } from 'vitest';
import { createMap } from '../src/map/index.js';

const city = {
	name: 'city',
	maxx: 1000,
	maxy: 1000,
	maxz: 10,
	entries: [
		{ type: 'tile', minx: 0, maxx: 99, miny: 0, maxy: 99, minz: 0, maxz: 0, tile: 'grass' },
		{ type: 'zone', minx: 0, maxx: 50, miny: 0, maxy: 50, minz: 0, maxz: 0, name: 'west' },
		{ type: 'zone', minx: 10, maxx: 20, miny: 10, maxy: 20, minz: 0, maxz: 0, name: 'shop' },
		{ type: 'src', minx: 5, maxx: 5, miny: 5, maxy: 5, minz: 0, maxz: 0, file: 'truck.ogg', loop: true },
	],
};

async function loaded() {
	const map = createMap();
	await map.loadMap({ data: city });
	return map;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('createMap: loading', () => {
	test('loads from an object', async () => {
		const map = await loaded();
		expect(map.getDataAt('tile', 5, 5, 5, 5, 0, 0)).toHaveLength(1);
	});

	test('loads from a JSON string', async () => {
		const map = createMap();
		await map.loadMap({ data: JSON.stringify(city) });
		expect(map.getOneAt('tile', 5, 5, 0).tile).toBe('grass');
	});

	test('loads from a function', async () => {
		const map = createMap();
		await map.loadMap({ from: () => city });
		expect(map.getOneAt('tile', 5, 5, 0).tile).toBe('grass');
	});

	test('loads from a url', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => JSON.stringify(city) })));
		const map = createMap();
		await map.loadMap({ url: 'city.json' });
		expect(map.getOneAt('tile', 5, 5, 0).tile).toBe('grass');
	});

	test('a failed fetch rejects with the url', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
		const map = createMap();
		await expect(map.loadMap({ url: 'missing.json' })).rejects.toThrow(/missing\.json/);
	});

	test('rejects zero or several sources', async () => {
		const map = createMap();
		await expect(map.loadMap({})).rejects.toThrow(/exactly one/);
		await expect(map.loadMap({ data: city, from: () => city })).rejects.toThrow(/exactly one/);
	});

	test('a second load merges and widens the header', async () => {
		const map = await loaded();
		await map.loadMap({
			data: {
				name: 'suburb',
				maxx: 5000,
				maxy: 1000,
				maxz: 10,
				entries: [{ type: 'zone', minx: 200, maxx: 210, miny: 0, maxy: 10, minz: 0, maxz: 0, name: 'park' }],
			},
		});
		expect(map.getOneAt('zone', 205, 5, 0).name).toBe('park');
		expect(map.header()).toEqual({ name: 'city', maxx: 5000, maxy: 1000, maxz: 10 });
	});

	test('clear empties the map', async () => {
		const map = await loaded();
		map.clear();
		expect(map.getDataAt('tile', 5, 5, 5, 5, 0, 0)).toEqual([]);
	});

	test('a load rejected by a bad entry leaves the map unchanged', async () => {
		const map = await loaded();
		const before = map.serialize();
		await expect(
			map.loadMap({
				data: {
					name: 'bad', maxx: 100, maxy: 100, maxz: 0,
					entries: [{ type: 'zone', minx: 60, maxx: 61, miny: 60, maxy: 61, minz: 0, maxz: 0 }],
				},
			}),
		).rejects.toThrow(/"name"/);
		expect(map.serialize()).toEqual(before);
		expect(map.header()).toEqual({ name: 'city', maxx: 1000, maxy: 1000, maxz: 10 });
	});

	test('a load rejected by the overlap pass leaves the map unchanged', async () => {
		const map = await loaded();
		const before = map.serialize();
		await expect(
			map.loadMap({
				data: {
					name: 'bad', maxx: 1000, maxy: 1000, maxz: 10,
					entries: [
						{ type: 'tile', minx: 300, maxx: 310, miny: 0, maxy: 10, minz: 0, maxz: 0, tile: 'road' },
						{ type: 'tile', minx: 305, maxx: 315, miny: 0, maxy: 10, minz: 0, maxz: 0, tile: 'path' },
					],
				},
			}),
		).rejects.toThrow(/does not allow overlap/);
		expect(map.serialize()).toEqual(before);
		expect(map.header()).toEqual({ name: 'city', maxx: 1000, maxy: 1000, maxz: 10 });
	});

	test('a failed first load leaves the header null', async () => {
		const map = createMap();
		await expect(
			map.loadMap({
				data: {
					name: 'bad', maxx: 100, maxy: 100, maxz: 0,
					entries: [
						{ type: 'tile', minx: 0, maxx: 10, miny: 0, maxy: 10, minz: 0, maxz: 0, tile: 'grass' },
						{ type: 'tile', minx: 5, maxx: 15, miny: 0, maxy: 10, minz: 0, maxz: 0, tile: 'road' },
					],
				},
			}),
		).rejects.toThrow(/does not allow overlap/);
		expect(map.header()).toBeNull();
		expect(map.getDataAt('tile', 0, 10, 0, 10, 0, 0)).toEqual([]);
	});
});

describe('createMap: reading', () => {
	test('getDataAt returns overlapping entries in insertion order', async () => {
		const map = await loaded();
		const names = map.getDataAt('zone', 15, 15, 15, 15, 0, 0).map((e) => e.name);
		expect(names).toEqual(['west', 'shop']);
	});

	test('getOneAt returns the last match', async () => {
		const map = await loaded();
		expect(map.getOneAt('zone', 15, 15, 0).name).toBe('shop');
	});

	test('getOneAt returns undefined when nothing is there', async () => {
		const map = await loaded();
		expect(map.getOneAt('zone', 900, 900, 0)).toBeUndefined();
	});

	test('an empty region returns an empty array', async () => {
		const map = await loaded();
		expect(map.getDataAt('tile', 900, 910, 900, 910, 0, 0)).toEqual([]);
	});

	test('a range query returns everything it touches', async () => {
		const map = await loaded();
		expect(map.getDataAt('zone', 0, 100, 0, 100, 0, 0)).toHaveLength(2);
	});

	test('getDataAt on an unknown type throws', async () => {
		const map = await loaded();
		expect(() => map.getDataAt('nope', 0, 0, 0, 0, 0, 0)).toThrow(/unknown type/);
	});
});

describe('createMap: writing', () => {
	test('setDataAt adds an entry that queries find', async () => {
		const map = await loaded();
		map.setDataAt({ type: 'zone', minx: 300, maxx: 310, miny: 0, maxy: 10, minz: 0, maxz: 0, name: 'dock' });
		expect(map.getOneAt('zone', 305, 5, 0).name).toBe('dock');
	});

	test('setDataAt on an allow type stacks and sorts last', async () => {
		const map = await loaded();
		map.setDataAt({ type: 'zone', minx: 0, maxx: 50, miny: 0, maxy: 50, minz: 0, maxz: 0, name: 'later' });
		expect(map.getOneAt('zone', 5, 5, 0).name).toBe('later');
	});

	test('setDataAt on an error type rejects an overlap', async () => {
		const map = await loaded();
		expect(() =>
			map.setDataAt({ type: 'tile', minx: 0, maxx: 9, miny: 0, maxy: 9, minz: 0, maxz: 0, tile: 'road' }),
		).toThrow(/does not allow overlap/);
	});

	test('setDataAt on an error type accepts a free cell', async () => {
		const map = await loaded();
		map.setDataAt({ type: 'tile', minx: 200, maxx: 209, miny: 0, maxy: 9, minz: 0, maxz: 0, tile: 'road' });
		expect(map.getOneAt('tile', 205, 5, 0).tile).toBe('road');
	});

	test('removeDataAt drops every overlapping entry of that type', async () => {
		const map = await loaded();
		map.removeDataAt('zone', 0, 100, 0, 100, 0, 0);
		expect(map.getDataAt('zone', 0, 100, 0, 100, 0, 0)).toEqual([]);
		expect(map.getDataAt('tile', 5, 5, 5, 5, 0, 0)).toHaveLength(1);
	});

	test('removeDataAt frees a cell on an error type', async () => {
		const map = await loaded();
		map.removeDataAt('tile', 0, 99, 0, 99, 0, 0);
		expect(() =>
			map.setDataAt({ type: 'tile', minx: 0, maxx: 9, miny: 0, maxy: 9, minz: 0, maxz: 0, tile: 'road' }),
		).not.toThrow();
	});
});

describe('createMap: types and validation', () => {
	test('a custom type loads and queries like a built-in', async () => {
		const map = createMap();
		map.registerType('spawn', { fields: ['item', 'count'] });
		await map.loadMap({
			data: {
				name: 'a', maxx: 100, maxy: 100, maxz: 0,
				entries: [{ type: 'spawn', minx: 1, maxx: 1, miny: 1, maxy: 1, minz: 0, maxz: 0, item: 'ammo', count: 5 }],
			},
		});
		expect(map.getOneAt('spawn', 1, 1, 0)).toMatchObject({ item: 'ammo', count: 5 });
	});

	test('registering an existing type throws', () => {
		const map = createMap();
		expect(() => map.registerType('tile', { fields: [] })).toThrow(/already registered/);
	});

	test('an unregistered type in a file throws', async () => {
		const map = createMap();
		await expect(
			map.loadMap({
				data: { name: 'a', maxx: 10, maxy: 10, maxz: 0, entries: [{ type: 'ghost', minx: 0, maxx: 0, miny: 0, maxy: 0, minz: 0, maxz: 0 }] },
			}),
		).rejects.toThrow(/unknown type "ghost"/);
	});

	test('a missing field throws, naming field and entry index', async () => {
		const map = createMap();
		await expect(
			map.loadMap({
				data: { name: 'a', maxx: 10, maxy: 10, maxz: 0, entries: [{ type: 'zone', minx: 0, maxx: 0, miny: 0, maxy: 0, minz: 0, maxz: 0 }] },
			}),
		).rejects.toThrow(/"name".*entry 0/);
	});

	test('min above max throws', async () => {
		const map = createMap();
		await expect(
			map.loadMap({
				data: { name: 'a', maxx: 10, maxy: 10, maxz: 0, entries: [{ type: 'zone', minx: 5, maxx: 1, miny: 0, maxy: 0, minz: 0, maxz: 0, name: 'x' }] },
			}),
		).rejects.toThrow(/minx 5 above maxx 1/);
	});

	test('bounds outside the declared map size throw', async () => {
		const map = createMap();
		await expect(
			map.loadMap({
				data: { name: 'a', maxx: 10, maxy: 10, maxz: 0, entries: [{ type: 'zone', minx: 0, maxx: 50, miny: 0, maxy: 0, minz: 0, maxz: 0, name: 'x' }] },
			}),
		).rejects.toThrow(/outside the map/);
	});

	test('overlapping tiles in a file throw at load time', async () => {
		const map = createMap();
		await expect(
			map.loadMap({
				data: {
					name: 'a', maxx: 100, maxy: 100, maxz: 0,
					entries: [
						{ type: 'tile', minx: 0, maxx: 10, miny: 0, maxy: 10, minz: 0, maxz: 0, tile: 'grass' },
						{ type: 'tile', minx: 10, maxx: 20, miny: 0, maxy: 10, minz: 0, maxz: 0, tile: 'road' },
					],
				},
			}),
		).rejects.toThrow(/does not allow overlap/);
	});

	test('stacked tiles on different z levels load fine', async () => {
		const map = createMap();
		await map.loadMap({
			data: {
				name: 'tower', maxx: 100, maxy: 100, maxz: 100,
				entries: [
					{ type: 'tile', minx: 0, maxx: 10, miny: 0, maxy: 10, minz: 0, maxz: 9, tile: 'floor1' },
					{ type: 'tile', minx: 0, maxx: 10, miny: 0, maxy: 10, minz: 10, maxz: 19, tile: 'floor2' },
				],
			},
		});
		expect(map.getOneAt('tile', 5, 5, 15).tile).toBe('floor2');
	});
});

describe('createMap: serialize', () => {
	test('round trips to an equal map', async () => {
		const map = await loaded();
		const out = map.serialize();
		const again = createMap();
		await again.loadMap({ data: out });
		expect(again.serialize()).toEqual(out);
	});

	test('drops removed entries', async () => {
		const map = await loaded();
		map.removeDataAt('src', 0, 1000, 0, 1000, 0, 0);
		expect(map.serialize().entries.some((e) => e.type === 'src')).toBe(false);
	});

	test('round trips a custom type', async () => {
		const map = createMap();
		map.registerType('spawn', { fields: ['item', 'count'] });
		await map.loadMap({
			data: {
				name: 'a', maxx: 100, maxy: 100, maxz: 0,
				entries: [{ type: 'spawn', minx: 1, maxx: 1, miny: 1, maxy: 1, minz: 0, maxz: 0, item: 'ammo', count: 5 }],
			},
		});
		expect(map.serialize().entries[0]).toEqual({
			type: 'spawn', minx: 1, maxx: 1, miny: 1, maxy: 1, minz: 0, maxz: 0, item: 'ammo', count: 5,
		});
	});
});

// These budgets are deliberately loose. They exist so a future regression is
// loud, not to pin down a number on any particular machine.
describe('createMap: performance', () => {
	test('loads 200k entries, builds the index, and answers 1000 point queries', async () => {
		const entries = [];
		for (let i = 0; i < 200000; i++) {
			const x = (i * 37) % 100000;
			const y = (i * 71) % 100000;
			entries.push({ type: 'zone', minx: x, maxx: x + 3, miny: y, maxy: y + 3, minz: 0, maxz: 0, name: `z${i % 50}` });
		}
		const map = createMap();

		// Ingesting entries into the store does not force the R-tree build for types
		// that allow overlap, so this only times parsing and insertion.
		const load_start = performance.now();
		await map.loadMap({ data: { name: 'big', maxx: 100010, maxy: 100010, maxz: 0, entries } });
		const load_ms = performance.now() - load_start;

		// The tree builds lazily on first query. Pay for that here, on its own,
		// so it does not leak into the steady state numbers below.
		const build_start = performance.now();
		map.getDataAt('zone', 0, 0, 0, 0, 0, 0);
		const build_ms = performance.now() - build_start;

		// Sparse queries: coordinates picked independently of where entries landed,
		// so most of these miss. Exercises the empty-result path.
		const sparse_start = performance.now();
		let sparse_hits = 0;
		for (let i = 0; i < 1000; i++) {
			sparse_hits += map.getDataAt('zone', (i * 97) % 100000, (i * 97) % 100000, (i * 13) % 100000, (i * 13) % 100000, 0, 0).length;
		}
		const sparse_ms = performance.now() - sparse_start;

		// Dense queries: coordinates taken from entries we just generated, so every
		// query hits. Exercises the cost of materializing matches in getDataAt.
		const dense_start = performance.now();
		let dense_hits = 0;
		for (let i = 0; i < 1000; i++) {
			const x = (i * 37) % 100000;
			const y = (i * 71) % 100000;
			dense_hits += map.getDataAt('zone', x, x + 3, y, y + 3, 0, 0).length;
		}
		const dense_ms = performance.now() - dense_start;

		console.log(
			`load 200k: ${load_ms.toFixed(0)}ms, index build: ${build_ms.toFixed(1)}ms, ` +
			`1000 sparse queries: ${sparse_ms.toFixed(1)}ms (hits ${sparse_hits}), ` +
			`1000 dense queries: ${dense_ms.toFixed(1)}ms (hits ${dense_hits})`,
		);
		expect(load_ms).toBeLessThan(10000);
		expect(build_ms).toBeLessThan(5000);
		expect(sparse_ms).toBeLessThan(1000);
		expect(dense_ms).toBeLessThan(1000);
		// The coordinate generator has period 100000 over 200000 entries, so each of
		// the first 1000 boxes has exactly one duplicate at i + 100000: 2 hits each.
		expect(dense_hits).toBe(2000);
		expect(map.memoryBytes()).toBeLessThan(6 * 1024 * 1024);
	}, 60000);

	test('measures the cost of z filtering on 500 stacked levels', async () => {
		const QUERY_COUNT = 1000;
		const entries = [];
		for (let level = 0; level < 500; level++) {
			entries.push({
				type: 'zone',
				minx: 0, maxx: 20, miny: 0, maxy: 20,
				minz: level * 10, maxz: level * 10 + 9,
				name: `level${level}`,
			});
		}
		const map = createMap();
		await map.loadMap({ data: { name: 'tower', maxx: 100, maxy: 100, maxz: 5000, entries } });

		const start = performance.now();
		for (let i = 0; i < QUERY_COUNT; i++) map.getOneAt('zone', 10, 10, (i % 500) * 10);
		const total_ms = performance.now() - start;

		console.log(`500 stacked levels: ${(total_ms / QUERY_COUNT * 1000).toFixed(1)}us per point query`);
		expect(total_ms).toBeLessThan(2000);
	}, 60000);
});
