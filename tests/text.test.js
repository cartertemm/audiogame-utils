import { describe, test, expect } from 'vitest';
import { prettySequence, formatTime, prettyNumber, stringDistance, closestMatch } from '../src/text.js';

describe('prettySequence', () => {
	test('returns an empty string for an empty list', () => {
		expect(prettySequence([])).toBe('');
	});

	test('returns a single item unchanged', () => {
		expect(prettySequence(['potion'])).toBe('potion');
	});

	test('joins two items with the conjunction', () => {
		expect(prettySequence(['sword', 'shield'], 'and')).toBe('sword and shield');
	});

	test('uses commas before the conjunction', () => {
		expect(prettySequence(['python', 'c++', 'basic', 'assembly'], 'and')).toBe('python, c++, basic and assembly');
	});

	test('falls back to a comma when no conjunction is given', () => {
		expect(prettySequence(['a', 'b', 'c'])).toBe('a, b, c');
	});

	test('accepts any conjunction', () => {
		expect(prettySequence(['north', 'south'], 'or')).toBe('north or south');
	});

	test('converts values to strings', () => {
		expect(prettySequence([1, 2, 3], 'and')).toBe('1, 2 and 3');
	});

	test('accepts any iterable', () => {
		expect(prettySequence(new Set(['a', 'b']), 'and')).toBe('a and b');
	});

	test('leaves the caller list untouched', () => {
		const items = ['a', 'b'];
		prettySequence(items, 'and');
		expect(items).toEqual(['a', 'b']);
	});
});

describe('formatTime', () => {
	test('describes a duration in words', () => {
		expect(formatTime(10000000)).toBe('2 hours, 46 minutes and 40 seconds');
	});

	test('skips units that are zero', () => {
		expect(formatTime(3600000)).toBe('1 hour');
	});

	test('uses singular names for a count of one', () => {
		expect(formatTime(61000)).toBe('1 minute and 1 second');
	});

	test('counts weeks and days', () => {
		expect(formatTime(694800000)).toBe('1 week, 1 day and 1 hour');
	});

	test('reports durations under a second as no time at all', () => {
		expect(formatTime(0)).toBe('no time at all');
		expect(formatTime(999)).toBe('no time at all');
	});

	test('drops the conjunction when pretty is false', () => {
		expect(formatTime(10000000, false)).toBe('2 hours 46 minutes 40 seconds');
	});

	test('treats negative durations as elapsed time', () => {
		expect(formatTime(-61000)).toBe('1 minute and 1 second');
	});

	test('ignores fractional milliseconds', () => {
		expect(formatTime(1999.9)).toBe('1 second');
	});
});

describe('prettyNumber', () => {
	test('names the scale of a large number', () => {
		expect(prettyNumber(1271334251, 2)).toBe('1.27 billion');
	});

	test('leaves small numbers alone', () => {
		expect(prettyNumber(999)).toBe('999');
		expect(prettyNumber(0)).toBe('0');
	});

	test('rounds away the decimals of a small number', () => {
		expect(prettyNumber(12.7)).toBe('13');
	});

	test('starts a scale at its exact value', () => {
		expect(prettyNumber(1000)).toBe('1 thousand');
		expect(prettyNumber(1000000)).toBe('1 million');
	});

	test('drops trailing zeros', () => {
		expect(prettyNumber(1500000, 2)).toBe('1.5 million');
		expect(prettyNumber(2000000, 2)).toBe('2 million');
	});

	test('honors a request for whole numbers', () => {
		expect(prettyNumber(1271334251, 0)).toBe('1 billion');
	});

	test('defaults to two decimal places', () => {
		expect(prettyNumber(1271334251)).toBe('1.27 billion');
	});

	test('moves up a scale when rounding reaches it', () => {
		expect(prettyNumber(999999, 2)).toBe('1 million');
		expect(prettyNumber(999.6)).toBe('1 thousand');
	});

	test('keeps the sign of a negative number', () => {
		expect(prettyNumber(-1500000, 2)).toBe('-1.5 million');
		expect(prettyNumber(-5)).toBe('-5');
	});

	test('reaches the largest scale it knows', () => {
		expect(prettyNumber(1e63, 2)).toBe('1 vigintillion');
	});

	test('stays at the largest scale for anything above it', () => {
		expect(prettyNumber(1e66, 2)).toBe('1000 vigintillion');
	});

	test('names the scale of a BigInt', () => {
		expect(prettyNumber(1271334251n, 2)).toBe('1.27 billion');
		expect(prettyNumber(1500000n)).toBe('1.5 million');
	});

	test('leaves a small BigInt alone', () => {
		expect(prettyNumber(999n)).toBe('999');
		expect(prettyNumber(0n)).toBe('0');
		expect(prettyNumber(-5n)).toBe('-5');
	});

	test('keeps every digit of a BigInt that a float would lose', () => {
		expect(prettyNumber(9007199254740993n, 6)).toBe('9.007199 quadrillion');
		expect(prettyNumber(123456789012345678901n, 3)).toBe('123.457 quintillion');
	});

	test('rounds a BigInt half away from zero', () => {
		expect(prettyNumber(1005n, 2)).toBe('1.01 thousand');
		expect(prettyNumber(1004n, 2)).toBe('1 thousand');
		expect(prettyNumber(-1005n, 2)).toBe('-1.01 thousand');
	});

	test('moves a BigInt up a scale when rounding reaches it', () => {
		expect(prettyNumber(999999n, 2)).toBe('1 million');
	});

	test('counts a BigInt past vigintillion exactly', () => {
		expect(prettyNumber(10n ** 63n)).toBe('1 vigintillion');
		expect(prettyNumber(10n ** 66n)).toBe('1000 vigintillion');
		expect(prettyNumber(10n ** 100n)).toBe('10000000000000000000000000000000000000 vigintillion');
	});
});

describe('stringDistance', () => {
	test('reports zero for identical strings', () => {
		expect(stringDistance('sword', 'sword')).toBe(0);
	});

	test('reports the length when one string is empty', () => {
		expect(stringDistance('', 'sword')).toBe(5);
		expect(stringDistance('sword', '')).toBe(5);
		expect(stringDistance('', '')).toBe(0);
	});

	test('counts a substitution as one edit', () => {
		expect(stringDistance('cat', 'cot')).toBe(1);
	});

	test('counts an insertion as one edit', () => {
		expect(stringDistance('cat', 'cart')).toBe(1);
	});

	test('counts a deletion as one edit', () => {
		expect(stringDistance('cart', 'cat')).toBe(1);
	});

	test('counts an adjacent swap as one edit', () => {
		expect(stringDistance('form', 'from')).toBe(1);
	});

	test('measures unrelated words', () => {
		expect(stringDistance('kitten', 'sitting')).toBe(3);
	});

	test('is symmetric', () => {
		expect(stringDistance('inventory', 'invetnory')).toBe(stringDistance('invetnory', 'inventory'));
	});

	test('compares by code point', () => {
		expect(stringDistance('a', '\u{1F600}')).toBe(1);
		expect(stringDistance('\u{1F600}\u{1F601}', '\u{1F600}')).toBe(1);
	});

	test('is case sensitive', () => {
		expect(stringDistance('Sword', 'sword')).toBe(1);
	});
});

describe('closestMatch', () => {
	const commands = ['inventory', 'interact', 'inspect'];

	test('finds the candidate a typo meant', () => {
		expect(closestMatch('invetnory', commands)).toEqual({ match: 'inventory', distance: 1 });
	});

	test('reports a distance of zero for an exact match', () => {
		expect(closestMatch('inspect', commands)).toEqual({ match: 'inspect', distance: 0 });
	});

	test('ignores case on both sides', () => {
		expect(closestMatch('INSPECT', ['Inspect'])).toEqual({ match: 'Inspect', distance: 0 });
	});

	test('returns the candidate as it was given', () => {
		expect(closestMatch('north', ['North Gate', 'South Gate']).match).toBe('North Gate');
	});

	test('rejects a match beyond maxDistance', () => {
		expect(closestMatch('zzzzz', commands, 2)).toBe(null);
	});

	test('accepts a match within maxDistance', () => {
		expect(closestMatch('inspct', commands, 2)).toEqual({ match: 'inspect', distance: 1 });
	});

	test('returns null for no candidates', () => {
		expect(closestMatch('inspect', [])).toBe(null);
	});

	test('keeps the earlier candidate when distances tie', () => {
		expect(closestMatch('bat', ['cat', 'rat']).match).toBe('cat');
	});

	test('accepts any iterable of candidates', () => {
		expect(closestMatch('inspect', new Set(commands)).match).toBe('inspect');
	});
});
