import { describe, test, expect, afterEach, vi } from 'vitest';
import {
	clamp,
	lerp,
	inverse_lerp,
	range_convert,
	angle_difference,
	wrap,
	random_int,
	random_float,
	random_choice,
	weighted_choice,
	shuffle,
	random_generator,
} from '../src/math.js';

// Feeds Math.random a fixed queue so the random helpers stay deterministic.
function fakeRandom(...values) {
	let i = 0;
	vi.spyOn(Math, 'random').mockImplementation(() => values[i++ % values.length]);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('math: clamp', () => {
	test('leaves a value inside the range alone', () => {
		expect(clamp(5, 0, 10)).toBe(5);
	});

	test('pulls a low value up to the minimum', () => {
		expect(clamp(-3, 0, 10)).toBe(0);
	});

	test('pulls a high value down to the maximum', () => {
		expect(clamp(42, 0, 10)).toBe(10);
	});
});

describe('math: lerp', () => {
	test('returns the start at 0 and the end at 1', () => {
		expect(lerp(10, 20, 0)).toBe(10);
		expect(lerp(10, 20, 1)).toBe(20);
	});

	test('returns the midpoint at 0.5', () => {
		expect(lerp(10, 20, 0.5)).toBe(15);
	});

	test('extrapolates past the range', () => {
		expect(lerp(0, 10, 2)).toBe(20);
		expect(lerp(0, 10, -1)).toBe(-10);
	});
});

describe('math: inverse_lerp', () => {
	test('reports where a value sits in the range', () => {
		expect(inverse_lerp(10, 20, 15)).toBe(0.5);
		expect(inverse_lerp(10, 20, 10)).toBe(0);
		expect(inverse_lerp(10, 20, 20)).toBe(1);
	});

	test('returns 0 for an empty range instead of dividing by zero', () => {
		expect(inverse_lerp(5, 5, 5)).toBe(0);
	});
});

describe('math: range_convert', () => {
	test('maps a value from one range onto another', () => {
		expect(range_convert(5, 0, 10, 0, 100)).toBe(50);
	});

	test('handles an inverted output range', () => {
		expect(range_convert(0, 0, 100, 1, 0)).toBe(1);
		expect(range_convert(100, 0, 100, 1, 0)).toBe(0);
	});

	test('returns the output minimum for an empty input range', () => {
		expect(range_convert(5, 5, 5, 0, 100)).toBe(0);
	});
});

describe('math: angle_difference', () => {
	test('measures a short turn to the right as positive', () => {
		expect(angle_difference(0, 90)).toBe(90);
	});

	test('measures a short turn to the left as negative', () => {
		expect(angle_difference(0, 270)).toBe(-90);
	});

	test('takes the short way around the wrap point', () => {
		expect(angle_difference(350, 10)).toBe(20);
		expect(angle_difference(10, 350)).toBe(-20);
	});

	test('reports 180 for a straight reversal', () => {
		expect(angle_difference(0, 180)).toBe(180);
	});

	test('accepts angles outside 0 to 360', () => {
		expect(angle_difference(-10, 10)).toBe(20);
		expect(angle_difference(720, 45)).toBe(45);
	});
});

describe('math: wrap', () => {
	test('leaves a value inside the range alone', () => {
		expect(wrap(5, 0, 10)).toBe(5);
	});

	test('wraps a value above the maximum back to the minimum', () => {
		expect(wrap(370, 0, 360)).toBe(10);
	});

	test('wraps a negative value up into the range', () => {
		expect(wrap(-10, 0, 360)).toBe(350);
	});

	test('treats the maximum as the start of the next lap', () => {
		expect(wrap(360, 0, 360)).toBe(0);
	});

	test('works with a range that does not start at zero', () => {
		expect(wrap(200, -180, 180)).toBe(-160);
	});
});

describe('math: random_int', () => {
	test('returns the minimum when the roll is lowest', () => {
		fakeRandom(0);
		expect(random_int(1, 6)).toBe(1);
	});

	test('returns the maximum when the roll is highest', () => {
		fakeRandom(0.999999);
		expect(random_int(1, 6)).toBe(6);
	});

	test('includes both ends over many rolls', () => {
		const seen = new Set();
		for (let i = 0; i < 500; i++) seen.add(random_int(1, 3));
		expect([...seen].sort()).toEqual([1, 2, 3]);
	});
});

describe('math: random_float', () => {
	test('returns the minimum when the roll is lowest', () => {
		fakeRandom(0);
		expect(random_float(2, 4)).toBe(2);
	});

	test('scales the roll across the range', () => {
		fakeRandom(0.5);
		expect(random_float(2, 4)).toBe(3);
	});

	test('defaults to 0 through 1', () => {
		fakeRandom(0.25);
		expect(random_float()).toBe(0.25);
	});
});

describe('math: random_choice', () => {
	test('picks the item the roll lands on', () => {
		fakeRandom(0.5);
		expect(random_choice(['a', 'b', 'c', 'd'])).toBe('c');
	});

	test('returns undefined for an empty list', () => {
		expect(random_choice([])).toBe(undefined);
	});
});

describe('math: weighted_choice', () => {
	test('picks the item whose weight covers the roll', () => {
		fakeRandom(0.1);
		expect(weighted_choice(['common', 'rare'], [9, 1])).toBe('common');
		vi.restoreAllMocks();
		fakeRandom(0.95);
		expect(weighted_choice(['common', 'rare'], [9, 1])).toBe('rare');
	});

	test('never picks an item weighted zero', () => {
		const items = ['never', 'always'];
		for (let i = 0; i < 200; i++) {
			expect(weighted_choice(items, [0, 1])).toBe('always');
		}
	});

	test('returns undefined for an empty list', () => {
		expect(weighted_choice([], [])).toBe(undefined);
	});

	test('returns undefined when every weight is zero', () => {
		expect(weighted_choice(['a', 'b'], [0, 0])).toBe(undefined);
	});
});

describe('math: shuffle', () => {
	test('keeps every item', () => {
		const list = [1, 2, 3, 4, 5];
		expect(shuffle(list).sort()).toEqual([1, 2, 3, 4, 5]);
	});

	test('leaves the original list untouched', () => {
		const list = [1, 2, 3, 4, 5];
		shuffle(list);
		expect(list).toEqual([1, 2, 3, 4, 5]);
	});

	test('reorders the items', () => {
		fakeRandom(0);
		expect(shuffle([1, 2, 3])).toEqual([2, 3, 1]);
	});
});

describe('math: random_generator', () => {
	test('replays the same numbers for the same seed', () => {
		const first = random_generator(1234);
		const second = random_generator(1234);
		const run = (rng) => [rng.next(), rng.next(), rng.next(), rng.next(), rng.next()];
		expect(run(first)).toEqual(run(second));
	});

	test('produces different numbers for different seeds', () => {
		expect(random_generator(1).next()).not.toBe(random_generator(2).next());
	});

	test('accepts a string seed', () => {
		expect(random_generator('forest-level-3').next()).toBe(random_generator('forest-level-3').next());
		expect(random_generator('a').next()).not.toBe(random_generator('b').next());
	});

	test('reports the seed it was given', () => {
		expect(random_generator(99).seed).toBe(99);
		expect(random_generator('cave').seed).toBe('cave');
	});

	test('picks its own seed when none is given', () => {
		const rng = random_generator();
		expect(typeof rng.seed).toBe('number');
		expect(random_generator(rng.seed).next()).toBe(rng.next());
	});

	test('never calls Math.random', () => {
		const spy = vi.spyOn(Math, 'random');
		const rng = random_generator(7);
		rng.next();
		rng.int(1, 6);
		rng.float();
		rng.choice([1, 2, 3]);
		rng.weighted_choice(['a', 'b'], [1, 1]);
		rng.shuffle([1, 2, 3]);
		expect(spy).not.toHaveBeenCalled();
	});

	test('keeps next inside zero up to one', () => {
		const rng = random_generator('bounds');
		for (let i = 0; i < 1000; i++) {
			const value = rng.next();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});

	test('keeps int inside the inclusive range', () => {
		const rng = random_generator('ints');
		const seen = new Set();
		for (let i = 0; i < 1000; i++) seen.add(rng.int(1, 6));
		expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
	});

	test('keeps float inside the requested range', () => {
		const rng = random_generator('floats');
		for (let i = 0; i < 500; i++) {
			const value = rng.float(10, 20);
			expect(value).toBeGreaterThanOrEqual(10);
			expect(value).toBeLessThan(20);
		}
	});

	test('choice returns only list items', () => {
		const rng = random_generator('choice');
		const list = ['a', 'b', 'c'];
		for (let i = 0; i < 100; i++) expect(list).toContain(rng.choice(list));
	});

	test('choice returns undefined for an empty list', () => {
		expect(random_generator(1).choice([])).toBe(undefined);
	});

	test('weighted_choice honors a zero weight', () => {
		const rng = random_generator('weights');
		for (let i = 0; i < 100; i++) {
			expect(rng.weighted_choice(['never', 'always'], [0, 1])).toBe('always');
		}
	});

	test('weighted_choice returns undefined when every weight is zero', () => {
		expect(random_generator(1).weighted_choice(['a', 'b'], [0, 0])).toBe(undefined);
	});

	test('shuffle keeps every item and leaves the original alone', () => {
		const rng = random_generator('shuffle');
		const list = [1, 2, 3, 4, 5];
		expect(rng.shuffle(list).sort()).toEqual([1, 2, 3, 4, 5]);
		expect(list).toEqual([1, 2, 3, 4, 5]);
	});

	test('shuffle replays the same order for the same seed', () => {
		const deck = [1, 2, 3, 4, 5, 6, 7, 8];
		expect(random_generator('deck').shuffle(deck)).toEqual(random_generator('deck').shuffle(deck));
	});

	test('two generators run independent streams', () => {
		const world = random_generator(5);
		const enemies = random_generator(5);
		world.next();
		world.next();
		expect(world.next()).not.toBe(enemies.next());
	});
});
