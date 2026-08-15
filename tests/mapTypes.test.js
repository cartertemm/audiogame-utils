import { describe, test, expect } from 'vitest';
import { createTypes } from '../src/map/types.js';

const tile = { type: 'tile', minx: 0, maxx: 9, miny: 0, maxy: 9, minz: 0, maxz: 0, file: 'concrete.ogg' };

describe('createTypes', () => {
	test('registers the three built-ins', () => {
		const types = createTypes();
		expect(types.get('tile').fields).toEqual(['file']);
		expect(types.get('src').fields).toEqual(['file', 'loop']);
		expect(types.get('zone').fields).toEqual(['name']);
	});

	test('tile rejects overlap, src and zone allow it', () => {
		const types = createTypes();
		expect(types.get('tile').overlap).toBe('error');
		expect(types.get('src').overlap).toBe('allow');
		expect(types.get('zone').overlap).toBe('allow');
	});

	test('registers a custom type that defaults to allowing overlap', () => {
		const types = createTypes();
		types.register('spawn', { fields: ['item', 'count'] });
		expect(types.get('spawn').overlap).toBe('allow');
	});

	test('rejects a duplicate name', () => {
		const types = createTypes();
		expect(() => types.register('tile', { fields: [] })).toThrow(/already registered/);
	});

	test('rejects an unknown overlap policy', () => {
		const types = createTypes();
		expect(() => types.register('spawn', { overlap: 'maybe' })).toThrow(/overlap/);
	});

	test('rejects an unknown type on get', () => {
		const types = createTypes();
		expect(() => types.get('nope')).toThrow(/unknown type "nope"/);
	});

	test('accepts a valid entry', () => {
		const types = createTypes();
		expect(() => types.validate(tile, 0)).not.toThrow();
	});

	test('rejects an entry missing a declared field, naming field and index', () => {
		const types = createTypes();
		const broken = { ...tile };
		delete broken.file;
		expect(() => types.validate(broken, 7)).toThrow(/"tile".*entry 7/);
	});

	test('rejects a non-integer bound', () => {
		const types = createTypes();
		expect(() => types.validate({ ...tile, maxx: 1.5 }, 3)).toThrow(/maxx/);
	});

	test('rejects min greater than max', () => {
		const types = createTypes();
		expect(() => types.validate({ ...tile, minx: 10, maxx: 0 }, 3)).toThrow(/minx.*maxx/);
	});
});
