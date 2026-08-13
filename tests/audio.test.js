import { describe, test, expect, vi } from 'vitest';
import { createAudio } from '../src/audio/index.js';
import { createCacophonyEngine } from '../src/audio/cacophony.js';

function makeFakePlayback() {
	return {
		playCalls: 0,
		stopCalls: 0,
		loopCalls: [],
		volume: 0,
		stereoPan: 0,
		sourceLoop: false,
		play() {
			this.playCalls++;
			return [this];
		},
		stop() {
			this.stopCalls++;
		},
		loop(value) {
			this.loopCalls.push(value);
		},
	};
}

function makeFakeHandle(playback = makeFakePlayback()) {
	return {
		playback,
		preplayCalls: 0,
		playCalls: 0,
		stopCalls: 0,
		position: null,
		preplay() {
			this.preplayCalls++;
			return [playback];
		},
		play() {
			this.playCalls++;
			return [playback];
		},
		stop() {
			this.stopCalls++;
		},
	};
}

// Pause `load()` to test the playback race with deterministic timing.
function makeFakeEngine({ deferLoad = false } = {}) {
	const handle = makeFakeHandle();
	let releaseLoad;
	const gate = new Promise(resolve => { releaseLoad = resolve; });
	return {
		handle,
		loadedUrls: [],
		stopCalls: 0,
		positions: [],
		release: () => releaseLoad(),
		async load(url) {
			this.loadedUrls.push(url);
			if (deferLoad) await gate;
			return handle;
		},
		play(h, options) {
			return createCacophonyEngine().play(h, options);
		},
		stop() {
			this.stopCalls++;
		},
		setPosition(h, position) {
			this.positions.push(position);
		},
	};
}

describe('cacophony engine', () => {
	test('play uses preplay once and starts exactly one playback', () => {
		const engine = createCacophonyEngine();
		const handle = makeFakeHandle();
		const inst = engine.play(handle, { volume: 0.7, pan: -0.25 });
		expect(inst).toBe(handle.playback);
		expect(handle.preplayCalls).toBe(1);
		expect(handle.playCalls).toBe(0);
		expect(handle.playback.playCalls).toBe(1);
		expect(handle.playback.volume).toBe(0.7);
		expect(handle.playback.stereoPan).toBe(-0.25);
	});

	test('play sets sourceLoop when the playback supports it', () => {
		const engine = createCacophonyEngine();
		const handle = makeFakeHandle();
		engine.play(handle, { loop: true });
		expect(handle.playback.sourceLoop).toBe(true);
		expect(handle.playback.loopCalls).toEqual([]);
	});

	test('play falls back to loop() when sourceLoop is absent', () => {
		const engine = createCacophonyEngine();
		const playback = makeFakePlayback();
		delete playback.sourceLoop;
		engine.play(makeFakeHandle(playback), { loop: true });
		expect(playback.loopCalls).toEqual(['infinite']);
	});

	test('play applies a 3D position when given one', () => {
		const engine = createCacophonyEngine();
		const handle = makeFakeHandle();
		engine.play(handle, { position: [1, 2, 3] });
		expect(handle.playback.position).toEqual([1, 2, 3]);
	});

	test('stop stops the playback instance exactly once', () => {
		const engine = createCacophonyEngine();
		const handle = makeFakeHandle();
		const inst = engine.play(handle);
		engine.stop(inst);
		expect(inst.stopCalls).toBe(1);
	});

	test('play tolerates a null handle', () => {
		expect(createCacophonyEngine().play(null)).toBe(null);
	});
});

describe('createAudio: sfx sources', () => {
	test('accepts a plain URL string', async () => {
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		await audio.sfx('/sounds/hit.ogg').play();
		expect(engine.loadedUrls).toEqual(['/sounds/hit.ogg']);
	});

	test('accepts a thunk returning a URL', async () => {
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		await audio.sfx(() => '/sounds/hit.ogg').play();
		expect(engine.loadedUrls).toEqual(['/sounds/hit.ogg']);
	});

	test('accepts a thunk returning a bundler module object', async () => {
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		await audio.sfx(async () => ({ default: '/assets/hit-abc123.ogg' })).play();
		expect(engine.loadedUrls).toEqual(['/assets/hit-abc123.ogg']);
	});

	test('a source that resolves to nothing usable is reported, not thrown', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		await audio.sfx(() => ({ nope: true })).play();
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});

describe('createAudio: lazy loading', () => {
	test('declaring a sound loads nothing', () => {
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		audio.sfx('/sounds/a.ogg');
		expect(engine.loadedUrls).toEqual([]);
	});

	test('the asset is fetched once across repeated plays', async () => {
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		const sound = audio.sfx('/sounds/a.ogg');
		await sound.play();
		await sound.play();
		await sound.play();
		expect(engine.loadedUrls).toEqual(['/sounds/a.ogg']);
	});

	test('preload loads every declared sound', async () => {
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		audio.sfx('/sounds/a.ogg');
		audio.sfx('/sounds/b.ogg');
		await audio.preload();
		expect(engine.loadedUrls.sort()).toEqual(['/sounds/a.ogg', '/sounds/b.ogg']);
	});

	test('sfx handles are inert when there is no AudioContext', async () => {
		const audio = createAudio();
		const sound = audio.sfx('/sounds/a.ogg');
		await sound.play({ loop: true });
		expect(sound.isLooping()).toBe(false);
		await expect(sound.stop()).resolves.toBeUndefined();
	});
});

describe('createAudio: looping', () => {
	test('play({loop}) twice does not start a second voice', async () => {
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		const sound = audio.sfx('/sounds/loop.ogg');
		await sound.play({ loop: true });
		await sound.play({ loop: true });
		expect(engine.handle.playback.playCalls).toBe(1);
		expect(sound.isLooping()).toBe(true);
	});

	test('stop ends the loop and a later play restarts it', async () => {
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		const sound = audio.sfx('/sounds/loop.ogg');
		await sound.play({ loop: true });
		await sound.stop();
		expect(sound.isLooping()).toBe(false);
		await sound.play({ loop: true });
		expect(engine.handle.playback.playCalls).toBe(2);
		expect(sound.isLooping()).toBe(true);
	});

	test('isLooping goes false once the playback reports it stopped', async () => {
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		const sound = audio.sfx('/sounds/loop.ogg');
		await sound.play({ loop: true });
		engine.handle.playback.isPlaying = false;
		expect(sound.isLooping()).toBe(false);
	});
});

describe('createAudio: play/stop race', () => {
	test('a stop issued before the load resolves suppresses the playback', async () => {
		const engine = makeFakeEngine({ deferLoad: true });
		const audio = createAudio({ engine });
		const sound = audio.sfx('/sounds/slow.ogg');
		const playing = sound.play();
		// `stop()` updates the epoch before waiting for the pending load. Store
		// its promise, release the load, and then wait for both operations.
		const stopping = sound.stop();
		engine.release();
		await Promise.all([playing, stopping]);
		expect(engine.handle.playback.playCalls).toBe(0);
		expect(sound.isLooping()).toBe(false);
	});

	test('the last of several overlapping plays is the one that sounds', async () => {
		const engine = makeFakeEngine({ deferLoad: true });
		const audio = createAudio({ engine });
		const sound = audio.sfx('/sounds/slow.ogg');
		const first = sound.play({ volume: 0.1 });
		const second = sound.play({ volume: 0.9 });
		engine.release();
		await Promise.all([first, second]);
		expect(engine.handle.playback.playCalls).toBe(1);
		expect(engine.handle.playback.volume).toBe(0.9);
	});
});

describe('createAudio: update and setPosition', () => {
	test('update adjusts pan and volume on the live playback', async () => {
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		const sound = audio.sfx('/sounds/a.ogg');
		await sound.play({ loop: true, volume: 0.5, pan: 0 });
		sound.update({ pan: -0.8, volume: 0.2 });
		expect(engine.handle.playback.stereoPan).toBe(-0.8);
		expect(engine.handle.playback.volume).toBe(0.2);
	});

	test('update before anything is playing is a no-op', () => {
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		expect(() => audio.sfx('/sounds/a.ogg').update({ pan: 1 })).not.toThrow();
	});

	test('setPosition loads the sound and forwards the position', async () => {
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		await audio.sfx('/sounds/a.ogg').setPosition([1, 0, -2]);
		expect(engine.positions).toEqual([[1, 0, -2]]);
	});
});

describe('createAudio: dispose', () => {
	test('dispose stops every sound it handed out', async () => {
		const engine = makeFakeEngine();
		const audio = createAudio({ engine });
		const a = audio.sfx('/sounds/a.ogg');
		await a.play({ loop: true });
		await audio.dispose();
		expect(a.isLooping()).toBe(false);
	});
});
