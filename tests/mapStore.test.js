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
