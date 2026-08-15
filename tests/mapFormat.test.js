import { describe, test, expect } from 'vitest';
import { parseJSON, serializeJSON } from '../src/map/format.js';

const file = {
	name: 'city',
	maxx: 1000,
	maxy: 1000,
	maxz: 3,
	entries: [
		{ type: 'tile', minx: 0, maxx: 50, miny: 0, maxy: 50, minz: 0, maxz: 0, file: 'concrete.ogg' },
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

	test('rejects a string that is not valid JSON', () => {
		expect(() => parseJSON('{not json')).toThrow('map: file is not valid JSON');
	});

	test('a JSON syntax error is kept as the cause', () => {
		try {
			parseJSON('{not json');
			throw new Error('expected parseJSON to throw');
		} catch (err) {
			expect(err.cause).toBeInstanceOf(SyntaxError);
		}
	});

	test.each(['maxx', 'maxy', 'maxz'])('rejects a non-integer %s', (key) => {
		expect(() => parseJSON({ ...file, [key]: '5' })).toThrow(new RegExp(`^map: .*"${key}"`));
	});

	test.each(['maxx', 'maxy', 'maxz'])('rejects a negative %s', (key) => {
		expect(() => parseJSON({ ...file, [key]: -1 })).toThrow(new RegExp(`^map: .*"${key}"`));
	});

	test('rejects a non-string name', () => {
		expect(() => parseJSON({ ...file, name: 5 })).toThrow(/^map: .*"name"/);
	});
});

describe('serializeJSON', () => {
	test('round trips through parseJSON', () => {
		const out = serializeJSON({ name: 'city', maxx: 1000, maxy: 1000, maxz: 3 }, file.entries);
		expect(parseJSON(JSON.stringify(out))).toEqual(file);
	});
});
