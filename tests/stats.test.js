import { describe, test, expect } from 'vitest';
import { Stat, StatSet, createStatSet, STAT_SORT_MODE } from '../src/stats.js';

describe('Stat', () => {
	test('formats default text replacing %0 with val', () => {
		const s = new Stat('score', 100, 'Score: %0');
		expect(s.format()).toBe('Score: 100');
		expect(s.toString()).toBe('Score: 100');
		expect(s.valueOf()).toBe(100);
	});

	test('executes custom formatting callback', () => {
		const s = new Stat('health', 75, '%0', stat => `HP: ${stat.val}/100`);
		expect(s.format()).toBe('HP: 75/100');
	});
});

describe('StatSet', () => {
	test('adds and updates stats', () => {
		const set = createStatSet();
		const s = set.add('score', 0, 'Score: %0');
		expect(s).not.toBeNull();
		expect(set.exists('score')).toBe(true);
		expect(set.size).toBe(1);

		// Adding duplicate name returns null
		expect(set.add('score', 50)).toBeNull();

		set.update('score', 50);
		expect(set.get('score').val).toBe(50);

		set.mod('score', 25);
		expect(set.get('score').val).toBe(75);
	});

	test('deletes and resets stats', () => {
		const set = createStatSet();
		set.add('a', 1);
		set.add('b', 2);
		expect(set.size).toBe(2);

		expect(set.delete('a')).toBe(true);
		expect(set.size).toBe(1);

		set.reset();
		expect(set.size).toBe(0);
	});

	test('sorts list by add order and value with front/behind overrides', () => {
		const set = createStatSet();
		set.add('z', 30);
		set.add('a', 10);
		set.add('m', 20);

		// ADD_ORDER: 'z', 'a', 'm'
		expect(set.list(STAT_SORT_MODE.ADD_ORDER)).toEqual(['z', 'a', 'm']);

		// VALUE: 'a' (10), 'm' (20), 'z' (30)
		expect(set.list(STAT_SORT_MODE.VALUE)).toEqual(['a', 'm', 'z']);

		// Override with sortInFront and sortBehind
		expect(set.list(STAT_SORT_MODE.VALUE, ['m'], ['a'])).toEqual(['m', 'z', 'a']);
	});

	test('merges another StatSet with addSet', () => {
		const set1 = createStatSet();
		set1.add('coins', 10, 'Coins: %0');
		set1.add('gems', 2);

		const set2 = createStatSet();
		set2.add('coins', 5);
		set2.add('keys', 1);

		set1.addSet(set2);
		expect(set1.get('coins').val).toBe(15);
		expect(set1.get('gems').val).toBe(2);
		expect(set1.get('keys').val).toBe(1);
	});

	test('adds a plain object of name and value pairs', () => {
		const set = createStatSet({ score: 10, hp: 5 });
		expect(set.size).toBe(2);
		expect(set.get('score').val).toBe(10);
		expect(set.get('hp').val).toBe(5);
	});

	test('adds an object whose values are stat shaped objects', () => {
		const set = createStatSet({ score: { name: 'score', val: 10, text: 'Score: %0' } });
		expect(set.get('score').val).toBe(10);
		expect(set.get('score').format()).toBe('Score: 10');
	});

	test('does not share user data between a set and its copy', () => {
		const orig = createStatSet();
		orig.add('x', 1, '%0', null, { tag: 'original' });

		const copy = createStatSet(orig);
		copy.get('x').user.tag = 'changed';

		expect(orig.get('x').user.tag).toBe('original');
	});

	test('serializes and deserializes linear format', () => {
		const set = createStatSet();
		set.add('level', 5);
		set.add('title', 'Hero');

		const linear = set.serializeLinear();
		expect(linear).toContain('level=5');
		expect(linear).toContain('title=Hero');

		const loaded = createStatSet();
		loaded.add('level', 1);
		expect(loaded.deserializeLinear(linear)).toBe(true);
		expect(loaded.get('level').val).toBe(5);
		expect(loaded.get('title').val).toBe('Hero');
	});

	test('serializes and deserializes JSON format', () => {
		const set = createStatSet();
		set.add('xp', 500, 'XP: %0');

		const jsonStr = set.serialize();
		const loaded = createStatSet();
		expect(loaded.deserialize(jsonStr)).toBe(true);
		expect(loaded.get('xp').val).toBe(500);
		expect(loaded.get('xp').text).toBe('XP: %0');
	});
});
