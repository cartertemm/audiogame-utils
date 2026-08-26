import { describe, expect, test } from 'vitest';
import * as pkg from '../src/index.js';

describe('package exports', () => {
	test('createInputHandler is exported from the package root', () => {
		expect(typeof pkg.createInputHandler).toBe('function');
	});
});
