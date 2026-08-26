import { describe, expect, test } from 'vitest';
import * as physics from '../src/physics/index.js';
import * as rotation from '../src/rotation.js';

describe('physics vectors', () => {
	test('physics owns the three dimensional vector factory', () => {
		expect(physics.vector()).toEqual({ x: 0, y: 0, z: 0 });
		expect(physics.vector(4, 8, 2)).toEqual({ x: 4, y: 8, z: 2 });
		expect(rotation).not.toHaveProperty('vector');
	});
});
