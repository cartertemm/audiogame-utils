import { describe, test, expect } from 'vitest';
import { createTypes } from '../src/map/types.js';
import { createStore } from '../src/map/store.js';

function zone(name, minx, maxx, miny, maxy, minz = 0, maxz = 0) {
	return { type: 'zone', minx, maxx, miny, maxy, minz, maxz, name };
}

function fresh() {
	const types = createTypes();
	return { types, store: createStore(types) };
}

describe('createStore', () => {
	test('a point query finds the box that covers it', () => {
		const { store } = fresh();
		const id = store.add(zone('lobby', 0, 10, 0, 10));
		expect(store.query('zone', 5, 5, 5, 5, 0, 0)).toEqual([id]);
	});

	test('read rebuilds the entry it was given', () => {
		const { store } = fresh();
		const id = store.add(zone('lobby', 0, 10, 2, 4, 1, 3));
		expect(store.read(id)).toEqual(zone('lobby', 0, 10, 2, 4, 1, 3));
	});

	test('returns overlapping entries in insertion order', () => {
		const { store } = fresh();
		store.add(zone('outer', 0, 100, 0, 100));
		store.add(zone('inner', 5, 10, 5, 10));
		const names = store.query('zone', 7, 7, 7, 7, 0, 0).map((id) => store.read(id).name);
		expect(names).toEqual(['outer', 'inner']);
	});

	test('filters by z after the x/y search', () => {
		const { store } = fresh();
		store.add(zone('ground', 0, 10, 0, 10, 0, 0));
		store.add(zone('upstairs', 0, 10, 0, 10, 10, 19));
		const hits = store.query('zone', 5, 5, 5, 5, 12, 12).map((id) => store.read(id).name);
		expect(hits).toEqual(['upstairs']);
	});

	test('a range query returns every box it touches', () => {
		const { store } = fresh();
		store.add(zone('a', 0, 4, 0, 4));
		store.add(zone('b', 6, 9, 0, 4));
		store.add(zone('c', 50, 60, 50, 60));
		expect(store.query('zone', 0, 10, 0, 10, 0, 0)).toHaveLength(2);
	});

	test('an unused type queries empty', () => {
		const { store } = fresh();
		expect(store.query('src', 0, 10, 0, 10, 0, 0)).toEqual([]);
	});

	test('interns repeated values instead of holding one string each', () => {
		const { store } = fresh();
		for (let i = 0; i < 100; i++) store.add(zone('lobby', i, i, 0, 0));
		expect(store.valueCount()).toBeLessThan(20);
	});

	test('grows past its initial capacity', () => {
		const { store } = fresh();
		for (let i = 0; i < 5000; i++) store.add(zone(`z${i % 7}`, i, i, 0, 0));
		expect(store.size()).toBe(5000);
		expect(store.query('zone', 4999, 4999, 0, 0, 0, 0)).toHaveLength(1);
	});

	test('clear empties the store', () => {
		const { store } = fresh();
		store.add(zone('lobby', 0, 10, 0, 10));
		store.clear();
		expect(store.size()).toBe(0);
		expect(store.query('zone', 5, 5, 5, 5, 0, 0)).toEqual([]);
	});
});

describe('createStore: edits after the index is built', () => {
	test('an entry added after a query still gets found', () => {
		const { store } = fresh();
		store.add(zone('first', 0, 10, 0, 10));
		store.query('zone', 5, 5, 5, 5, 0, 0);
		const id = store.add(zone('second', 20, 30, 20, 30));
		expect(store.query('zone', 25, 25, 25, 25, 0, 0)).toEqual([id]);
	});

	test('overlay entries keep insertion order with indexed ones', () => {
		const { store } = fresh();
		store.add(zone('outer', 0, 100, 0, 100));
		store.query('zone', 7, 7, 7, 7, 0, 0);
		store.add(zone('inner', 5, 10, 5, 10));
		const names = store.query('zone', 7, 7, 7, 7, 0, 0).map((id) => store.read(id).name);
		expect(names).toEqual(['outer', 'inner']);
	});

	test('a long overlay triggers a rebuild and results stay correct', () => {
		const { store } = fresh();
		store.add(zone('base', 0, 1000, 0, 1000));
		store.query('zone', 5, 5, 5, 5, 0, 0);
		for (let i = 0; i < 500; i++) store.add(zone(`z${i}`, i, i, 0, 0));
		expect(store.query('zone', 0, 1000, 0, 1000, 0, 0)).toHaveLength(501);
		expect(store.query('zone', 250, 250, 0, 0, 0, 0)).toHaveLength(2);
	});

	test('removed entries disappear from queries', () => {
		const { store } = fresh();
		const id = store.add(zone('lobby', 0, 10, 0, 10));
		store.query('zone', 5, 5, 5, 5, 0, 0);
		store.remove([id]);
		expect(store.query('zone', 5, 5, 5, 5, 0, 0)).toEqual([]);
	});

	test('removed entries stay gone after a rebuild', () => {
		const { store } = fresh();
		const id = store.add(zone('lobby', 0, 10, 0, 10));
		store.query('zone', 5, 5, 5, 5, 0, 0);
		store.remove([id]);
		for (let i = 0; i < 200; i++) store.add(zone(`z${i}`, 100 + i, 100 + i, 0, 0));
		expect(store.query('zone', 5, 5, 5, 5, 0, 0)).toEqual([]);
		expect(store.liveIds()).toHaveLength(200);
	});

	test('assertNoOverlap passes when boxes only sit next to each other', () => {
		const { store } = fresh();
		store.add({ type: 'tile', minx: 0, maxx: 9, miny: 0, maxy: 9, minz: 0, maxz: 0, tile: 'grass' });
		store.add({ type: 'tile', minx: 10, maxx: 19, miny: 0, maxy: 9, minz: 0, maxz: 0, tile: 'road' });
		expect(() => store.assertNoOverlap('tile')).not.toThrow();
	});

	test('assertNoOverlap throws when boxes touch, and says bounds are inclusive', () => {
		const { store } = fresh();
		store.add({ type: 'tile', minx: 0, maxx: 10, miny: 0, maxy: 9, minz: 0, maxz: 0, tile: 'grass' });
		store.add({ type: 'tile', minx: 10, maxx: 19, miny: 0, maxy: 9, minz: 0, maxz: 0, tile: 'road' });
		expect(() => store.assertNoOverlap('tile')).toThrow(/inclusive/);
	});

	test('assertNoOverlap ignores boxes separated by z', () => {
		const { store } = fresh();
		store.add({ type: 'tile', minx: 0, maxx: 9, miny: 0, maxy: 9, minz: 0, maxz: 0, tile: 'grass' });
		store.add({ type: 'tile', minx: 0, maxx: 9, miny: 0, maxy: 9, minz: 1, maxz: 1, tile: 'road' });
		expect(() => store.assertNoOverlap('tile')).not.toThrow();
	});
});
