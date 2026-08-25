import { describe, test, expect, vi } from 'vitest';
import { createSurfaceManager } from '../src/audio/surface.js';
import { createAudio } from '../src/audio/index.js';
import { createCacophonyEngine } from '../src/audio/cacophony.js';

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

	test('playStep plays a source from the surface bank', async () => {
		const engine = makeRecordingEngine();
		const manager = createSurfaceManager({ audio: createAudio({ engine }) });
		manager.registerSurface('grass', ['/sounds/grass1.ogg']);

		await manager.playStep('grass', 5, 10, 2);

		expect(engine.loadedUrls).toEqual(['/sounds/grass1.ogg']);
		expect(engine.playbacks).toHaveLength(1);
	});

	test('addSound requires a valid surface name', () => {
		const manager = createSurfaceManager({ audio: { sfx: vi.fn() } });

		expect(() => manager.addSound('', '/sounds/a.ogg')).toThrow(/valid surface name/);
		expect(() => manager.addSound(undefined, '/sounds/a.ogg')).toThrow(/valid surface name/);
		expect(manager.hasSurface(undefined)).toBe(false);
	});

	test('registerSurface rejects a non-string source on a pool backed manager', () => {
		const manager = createSurfaceManager({ pool: { play_3d: vi.fn() } });

		expect(() => manager.registerSurface('wood', [() => '/sounds/wood1.ogg']))
			.toThrow(/string sources/);
	});

	test('addSound rejects a non-string source on a pool backed manager', () => {
		const manager = createSurfaceManager({ pool: { play_3d: vi.fn() } });
		manager.registerSurface('wood', ['/sounds/wood1.ogg']);

		expect(() => manager.addSound('wood', () => '/sounds/wood2.ogg'))
			.toThrow(/string sources/);
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

// Exercises the real createSfx and cacophony wiring instead of a hand written
// handle, because both of these bugs live in that wiring rather than in
// surface.js alone.
function makeRecordingEngine() {
	const engine = {
		loadedUrls: [],
		loadOptions: [],
		playbacks: [],
		async load(url, options) {
			engine.loadedUrls.push(url);
			engine.loadOptions.push(options);
			return {
				preplay() {
					const inst = { position: null, stopped: false, play() {}, stop() { inst.stopped = true; } };
					engine.playbacks.push(inst);
					return [inst];
				},
			};
		},
		play(handle, options) {
			return createCacophonyEngine().play(handle, options);
		},
		stop() {},
		setPosition() {},
	};
	return engine;
}

describe('createSurfaceManager spatial playback', () => {
	test('loads step sounds as HRTF so positioning applies', async () => {
		const engine = makeRecordingEngine();
		const manager = createSurfaceManager({ audio: createAudio({ engine }) });
		manager.registerSurface('wood', ['/sounds/wood1.ogg']);

		await manager.playStep('wood', 5, 0, 10);

		expect(engine.loadOptions).toEqual([{ panType: 'HRTF' }]);
	});

	test('gives each step its own position', async () => {
		const engine = makeRecordingEngine();
		const manager = createSurfaceManager({ audio: createAudio({ engine }) });
		manager.registerSurface('wood', ['/sounds/wood1.ogg']);

		await manager.playStep('wood', 3, 4, 0);
		await manager.playStep('wood', -3, -4, 0);

		expect(engine.playbacks.map(p => p.position)).toEqual([[3, 0, -4], [-3, 0, 4]]);
	});

	test('plays a source that resolves lazily', async () => {
		const engine = makeRecordingEngine();
		const manager = createSurfaceManager({ audio: createAudio({ engine }) });
		manager.registerSurface('wood', [() => '/sounds/wood1.ogg']);

		await manager.playStep('wood', 1, 2, 0);

		expect(engine.loadedUrls).toEqual(['/sounds/wood1.ogg']);
	});

	test('reuses one handle per source across steps', async () => {
		const engine = makeRecordingEngine();
		const source = () => '/sounds/wood1.ogg';
		const manager = createSurfaceManager({ audio: createAudio({ engine }) });
		manager.registerSurface('wood', [source]);

		await manager.playStep('wood', 1, 2, 0);
		await manager.playStep('wood', 3, 4, 0);

		expect(engine.loadedUrls).toEqual(['/sounds/wood1.ogg']);
		expect(engine.playbacks).toHaveLength(2);
	});

	test('clear stops steps that are still sounding', async () => {
		const engine = makeRecordingEngine();
		const manager = createSurfaceManager({ audio: createAudio({ engine }) });
		manager.registerSurface('wood', ['/sounds/wood1.ogg']);
		await manager.playStep('wood', 1, 2, 0);

		manager.clear();

		expect(engine.playbacks[0].stopped).toBe(true);
	});

	test('places the step relative to the listener', async () => {
		const engine = makeRecordingEngine();
		const manager = createSurfaceManager({ audio: createAudio({ engine }) });
		manager.registerSurface('wood', ['/sounds/wood1.ogg']);

		// Step is 2 east and 5 north of a listener facing north, so it should
		// land straight ahead at a depth of 5.
		await manager.playStep('wood', 12, 15, 0, { listenerX: 10, listenerY: 10 });

		expect(engine.playbacks[0].position).toEqual([2, 0, -5]);
	});
});
