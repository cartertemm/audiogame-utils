import { describe, expect, test } from 'vitest';
import * as pkg from '../src/index.js';

describe('package exports', () => {
	test('createInputHandler is exported from the package root', () => {
		expect(typeof pkg.createInputHandler).toBe('function');
	});

	test('buffer exports are on the package root', () => {
		expect(typeof pkg.createBufferManager).toBe('function');
		expect(typeof pkg.Buffer).toBe('function');
		expect(typeof pkg.BufferManager).toBe('function');
	});
});
