import { describe, test, expect, vi } from 'vitest';
import { createSurfaceManager } from '../src/audio/surface.js';

describe('createSurfaceManager', () => {
	test('throws if neither audio nor pool is provided', () => {
		expect(() => createSurfaceManager()).toThrow(/requires an audio instance or sound_pool/);
	});

	test('registers surface and retrieves sound list', () => {
		const fakeAudio = { sfx: vi.fn() };
		const manager = createSurfaceManager({ audio: fakeAudio });

		manager.registerSurface('wood', ['/sounds/wood1.ogg', '/sounds/wood2.ogg']);
		expect(manager.hasSurface('wood')).toBe(true);
		expect(manager.hasSurface('concrete')).toBe(false);
		expect(manager.getSounds('wood')).toEqual(['/sounds/wood1.ogg', '/sounds/wood2.ogg']);
	});

	test('allows dynamic addition of step sound sources', () => {
		const fakeAudio = { sfx: vi.fn() };
		const manager = createSurfaceManager({ audio: fakeAudio });

		manager.registerSurface('concrete', ['/sounds/concrete1.ogg']);
		manager.addSound('concrete', '/sounds/concrete2.ogg');
		manager.addSound('concrete', '/sounds/concrete3.ogg');

		expect(manager.getSounds('concrete')).toEqual([
			'/sounds/concrete1.ogg',
			'/sounds/concrete2.ogg',
			'/sounds/concrete3.ogg',
		]);
	});

	test('playStep picks from surface bank and sets spatial position', () => {
		const mockHandle = {
			setPosition: vi.fn(),
			play: vi.fn(() => ({ isPlaying: true })),
		};
		const fakeAudio = {
			sfx: vi.fn(() => mockHandle),
		};
		const manager = createSurfaceManager({ audio: fakeAudio });
		manager.registerSurface('grass', ['/sounds/grass1.ogg']);

		const result = manager.playStep('grass', 5, 10, 2);

		expect(fakeAudio.sfx).toHaveBeenCalledWith('/sounds/grass1.ogg');
		expect(mockHandle.setPosition).toHaveBeenCalledWith([5, 10, 2]);
		expect(mockHandle.play).toHaveBeenCalled();
		expect(result).toEqual({ isPlaying: true });
	});

	test('playStep delegates to sound_pool when pool is provided', () => {
		const fakePool = {
			last_listener_x: 0,
			last_listener_y: 0,
			last_listener_z: 0,
			last_listener_rotation: 0,
			play_3d: vi.fn(() => 42),
		};
		const manager = createSurfaceManager({ pool: fakePool });
		manager.registerSurface('stone', ['/sounds/stone1.ogg']);

		const slot = manager.playStep('stone', 3, 4, 1);

		expect(fakePool.play_3d).toHaveBeenCalledWith('/sounds/stone1.ogg', 0, 0, 0, 3, 4, 1, 0, false);
		expect(slot).toBe(42);
	});

	test('playStep returns null for unknown surface', () => {
		const fakeAudio = { sfx: vi.fn() };
		const manager = createSurfaceManager({ audio: fakeAudio });

		expect(manager.playStep('unknown', 0, 0, 0)).toBe(null);
	});
});
