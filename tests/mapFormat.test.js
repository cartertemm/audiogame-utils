import { describe, test, expect } from 'vitest';
import { parseJSON, serializeJSON } from '../src/map/format.js';

const file = {
	name: 'city',
	maxx: 1000,
	maxy: 1000,
	maxz: 3,
	entries: [
		{ type: 'tile', minx: 0, maxx: 50, miny: 0, maxy: 50, minz: 0, maxz: 0, tile: 'concrete' },
	],
};

describe('parseJSON', () => {
	test('parses a JSON string', () => {
		expect(parseJSON(JSON.stringify(file))).toEqual(file);
	});

	test('accepts an already parsed object', () => {
		expect(parseJSON(file)).toEqual(file);
	});

	test('defaults a missing entries list to empty', () => {
		const { entries } = parseJSON({ name: 'a', maxx: 1, maxy: 1, maxz: 1 });
		expect(entries).toEqual([]);
	});

	test.each(['name', 'maxx', 'maxy', 'maxz'])('rejects a file missing %s', (key) => {
		const broken = { ...file };
		delete broken[key];
		expect(() => parseJSON(broken)).toThrow(new RegExp(key));
	});
});

describe('serializeJSON', () => {
	test('round trips through parseJSON', () => {
		const out = serializeJSON({ name: 'city', maxx: 1000, maxy: 1000, maxz: 3 }, file.entries);
		expect(parseJSON(JSON.stringify(out))).toEqual(file);
	});
});
