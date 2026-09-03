import { describe, test, expect } from 'vitest';
import { sound_pool } from '../src/audio/pool.js';
import { to_audio_position, orientation_from_rotation, listener_relative } from '../src/audio/coords.js';
import { db_to_volume, pan_to_stereo, pitch_to_rate, inverse_gain } from '../src/audio/units.js';

function flush() {
	return new Promise(resolve => setTimeout(resolve, 0));
}

function makeFakePlayback(panType) {
	return {
		panType,
		isPlaying: false,
		playCalls: 0,
		stopCalls: 0,
		pauseCalls: 0,
		volume: 1,
		playbackRate: 1,
		stereoPan: 0,
		position: null,
		threeDOptions: null,
		sourceLoop: false,
		// Cacophony's play() swaps in a fresh buffer source, which resets the loop
		// flag set before playback started. Model that here.
		play() {
			this.playCalls++;
			this.isPlaying = true;
			this.sourceLoop = false;
			return [this];
		},
		pause() {
			this.pauseCalls++;
			this.isPlaying = false;
		},
		stop() {
			this.stopCalls++;
			this.isPlaying = false;
		},
		seek() {},
	};
}

function makeFakeEngine() {
	return {
		loads: [],
		playbacks: [],
		listener: null,
		async load(url, { panType = 'stereo' } = {}) {
			this.loads.push({ url, panType });
			return { url, panType };
		},
		spawn(handle, options = {}) {
			const inst = makeFakePlayback(handle.panType);
			inst.url = handle.url;
			inst.destination = options.destination ?? null;
			if (options.loop) inst.sourceLoop = true;
			this.playbacks.push(inst);
			return inst;
		},
		start(inst, options = {}) {
			inst?.play?.();
			if (options.loop) inst.sourceLoop = true;
			return inst;
		},
		setListener(state) {
			this.listener = state;
		},
	};
}

function makePool(size = 4, settings = {}) {
	const engine = makeFakeEngine();
	const pool = new sound_pool(size, { engine });
	Object.assign(pool, settings);
	return { pool, engine };
}

describe('coords', () => {
	test('north maps to negative z', () => {
		expect(to_audio_position(0, 5, 0)).toEqual([0, 0, -5]);
	});

	test('elevation mode keeps y up', () => {
		expect(to_audio_position(0, 5, 3, true)).toEqual([0, 5, -3]);
	});

	test('a heading of zero faces the Web Audio default', () => {
		const { forward, up } = orientation_from_rotation(0);
		expect(forward[0]).toBeCloseTo(0);
		expect(forward[2]).toBeCloseTo(-1);
		expect(up).toEqual([0, 1, 0]);
	});

	test('facing east puts an eastern sound in front', () => {
		const rel = listener_relative(5, 0, 0, 0, 0, 0, 90);
		expect(rel.forward).toBeCloseTo(5);
		expect(rel.right).toBeCloseTo(0);
	});

	test('facing east puts a northern sound to the left', () => {
		const rel = listener_relative(0, 5, 0, 0, 0, 0, 90);
		expect(rel.right).toBeCloseTo(-5);
	});
});

describe('units', () => {
	test('zero decibels is full volume', () => {
		expect(db_to_volume(0)).toBe(1);
	});

	test('minus one hundred decibels is silence', () => {
		expect(db_to_volume(-100)).toBe(0);
	});

	test('pan and pitch scale to Web Audio ranges', () => {
		expect(pan_to_stereo(-100)).toBe(-1);
		expect(pitch_to_rate(50)).toBe(0.5);
	});

	test('gain falls off past the reference distance', () => {
		expect(inverse_gain(1)).toBe(1);
		expect(inverse_gain(3, 1, 1)).toBeCloseTo(1 / 3);
	});
});

describe('sound_pool: slots', () => {
	test('the first play takes slot zero and loads the file', async () => {
		const { pool, engine } = makePool();
		const slot = pool.play_1d('step.ogg', 0, 5, false);
		expect(slot).toBe(0);
		await flush();
		expect(engine.loads[0].url).toBe('step.ogg');
		expect(engine.playbacks[0].playCalls).toBe(1);
	});

	test('concurrent sounds take separate slots', async () => {
		const { pool } = makePool();
		const a = pool.play_1d('a.ogg', 0, 1, false);
		const b = pool.play_1d('b.ogg', 0, 2, false);
		await flush();
		expect([a, b]).toEqual([0, 1]);
	});

	test('a finished sound frees its slot', async () => {
		const { pool, engine } = makePool();
		const first = pool.play_1d('a.ogg', 0, 1, false);
		await flush();
		engine.playbacks[0].isPlaying = false;
		expect(pool.play_1d('b.ogg', 0, 1, false)).toBe(first);
	});

	test('a full pool returns -1', async () => {
		const { pool } = makePool(2);
		pool.play_1d('a.ogg', 0, 1, false);
		pool.play_1d('b.ogg', 0, 1, false);
		expect(pool.play_1d('c.ogg', 0, 1, false)).toBe(-1);
	});

	test('a persistent sound is never recycled', async () => {
		const { pool, engine } = makePool(1);
		pool.play_1d('a.ogg', 0, 1, false, true);
		await flush();
		engine.playbacks[0].isPlaying = false;
		expect(pool.play_1d('b.ogg', 0, 1, false)).toBe(-1);
	});

	test('destroy_sound frees the slot and stops the playback', async () => {
		const { pool, engine } = makePool();
		const slot = pool.play_1d('a.ogg', 0, 1, false);
		await flush();
		expect(pool.destroy_sound(slot)).toBe(true);
		expect(engine.playbacks[0].stopCalls).toBe(1);
		expect(pool.verify_slot(slot)).toBe(false);
	});

	test('a load that lands after the slot is reused is discarded', async () => {
		const { pool, engine } = makePool();
		const slot = pool.play_1d('a.ogg', 0, 1, false);
		pool.destroy_sound(slot);
		await flush();
		expect(engine.playbacks).toEqual([]);
	});
});

describe('sound_pool: looping', () => {
	// The loop flag has to be re-applied after play(), or a looping sound plays
	// through once and goes quiet.
	test('a looping sound is still looping after playback starts', async () => {
		const { pool, engine } = makePool();
		pool.play_extended_2d('truck.ogg', 0, 0, 10, 10, 0, 2, 2, 1, 1, true, 0, 0.0, -3, 100.0, true);
		await flush();
		expect(engine.playbacks[0].playCalls).toBe(1);
		expect(engine.playbacks[0].sourceLoop).toBe(true);
	});

	test('a one shot sound is not left looping', async () => {
		const { pool, engine } = makePool();
		pool.play_1d('step.ogg', 0, 1, false);
		await flush();
		expect(engine.playbacks[0].sourceLoop).toBe(false);
	});

	test('resuming a looping sound keeps it looping', async () => {
		const { pool, engine } = makePool();
		const slot = pool.play_1d('truck.ogg', 0, 1, true);
		await flush();
		pool.pause_sound(slot);
		pool.resume_sound(slot);
		expect(engine.playbacks[0].sourceLoop).toBe(true);
	});

	test('an out of earshot loop comes back looping', async () => {
		const { pool, engine } = makePool(4, { max_distance: 10 });
		pool.play_2d('truck.ogg', 0, 0, 0, 5, true);
		await flush();
		pool.update_listener_2d(0, 100);
		pool.update_listener_2d(0, 0);
		await flush();
		expect(engine.playbacks[1].sourceLoop).toBe(true);
	});
});

describe('sound_pool: repeated updates', () => {
	// Cacophony advances its internal playback offset on every rate assignment,
	// so a sound updated each frame would eventually start past its own end.
	test('an unchanged rate is not rewritten', async () => {
		const { pool, engine } = makePool();
		pool.play_3d('a.ogg', 0, 0, 0, 5, 5, 0, 0, true);
		await flush();
		let writes = 0;
		const playback = engine.playbacks[0];
		let rate = playback.playbackRate;
		Object.defineProperty(playback, 'playbackRate', {
			get: () => rate,
			set: value => { writes++; rate = value; },
		});
		for (let i = 0; i < 10; i++) pool.update_listener_2d(1, 1, 0);
		expect(writes).toBe(0);
	});

	test('a changed rate is written once', async () => {
		const { pool, engine } = makePool(4, { behind_pitch_decrease: 10 });
		// Spawns with the sound behind the listener, so the rate starts lowered.
		pool.play_3d('a.ogg', 0, 0, 0, 0, -5, 0, 0, true);
		await flush();
		let writes = 0;
		const playback = engine.playbacks[0];
		let rate = playback.playbackRate;
		expect(rate).toBeCloseTo(0.9);
		Object.defineProperty(playback, 'playbackRate', {
			get: () => rate,
			set: value => { writes++; rate = value; },
		});
		// Step back so the sound is now in front, then hold still.
		for (let i = 0; i < 10; i++) pool.update_listener_2d(0, -10, 0);
		expect(writes).toBe(1);
		expect(rate).toBeCloseTo(1);
	});
});

describe('sound_pool: earshot', () => {
	test('a non looping sound out of range returns -2 and loads nothing', async () => {
		const { pool, engine } = makePool(4, { max_distance: 10 });
		expect(pool.play_2d('a.ogg', 0, 0, 0, 50, false)).toBe(-2);
		await flush();
		expect(engine.loads).toEqual([]);
	});

	test('a looping sound out of range keeps its slot and waits', async () => {
		const { pool, engine } = makePool(4, { max_distance: 10 });
		const slot = pool.play_2d('a.ogg', 0, 0, 0, 50, true);
		expect(slot).toBe(0);
		await flush();
		expect(engine.loads).toEqual([]);
		pool.update_listener_2d(0, 45);
		await flush();
		expect(engine.loads.length).toBe(1);
		expect(engine.playbacks[0].playCalls).toBe(1);
	});

	test('walking away releases the playback and walking back restores it', async () => {
		const { pool, engine } = makePool(4, { max_distance: 10 });
		pool.play_2d('a.ogg', 0, 0, 0, 5, true);
		await flush();
		pool.update_listener_2d(0, 100);
		expect(engine.playbacks[0].stopCalls).toBe(1);
		pool.update_listener_2d(0, 0);
		await flush();
		expect(engine.playbacks.length).toBe(2);
	});
});

describe('sound_pool: positioning', () => {
	test('a spatialized sound gets an HRTF playback and a world position', async () => {
		const { pool, engine } = makePool();
		pool.play_3d('a.ogg', 0, 0, 0, 2, 4, 0, 0, false);
		await flush();
		expect(engine.loads[0].panType).toBe('HRTF');
		expect(engine.playbacks[0].position).toEqual([2, 0, -4]);
	});

	test('a stationary sound gets a stereo playback and keeps its start pan', async () => {
		const { pool, engine } = makePool();
		pool.play_stationary_extended('a.ogg', false, 0, -50, 0, 100);
		await flush();
		expect(engine.loads[0].panType).toBe('stereo');
		expect(engine.playbacks[0].stereoPan).toBe(-0.5);
	});

	test('turning the listener updates the Web Audio orientation', async () => {
		const { pool, engine } = makePool();
		pool.play_3d('a.ogg', 0, 0, 0, 1, 0, 0, 0, true);
		await flush();
		pool.update_listener_2d(0, 0, 90);
		expect(engine.listener.orientation.forward[0]).toBeCloseTo(1);
	});

	test('update_sound_3d moves a live sound', async () => {
		const { pool, engine } = makePool();
		const slot = pool.play_3d('a.ogg', 0, 0, 0, 1, 0, 0, 0, true);
		await flush();
		pool.update_sound_3d(slot, 0, 9, 0);
		expect(engine.playbacks[0].position).toEqual([0, 0, -9]);
	});

	test('a listener inside the range plays the sound centered', async () => {
		const { pool, engine } = makePool();
		const slot = pool.play_extended_3d('a.ogg', 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 0, 0, true, 0, 0.0, 0.0, 100.0);
		await flush();
		pool.update_listener_3d(3, 3, 0);
		expect(engine.playbacks[0].position).toEqual([3, 0, -3]);
		expect(engine.playbacks[0].playbackRate).toBe(1);
		expect(pool.items[slot].get_total_distance(3, 3, 0)).toBe(0);
	});

	test('a sound behind the listener drops in pitch', async () => {
		const { pool, engine } = makePool(4, { behind_pitch_decrease: 10 });
		pool.play_3d('a.ogg', 0, 0, 0, 0, -5, 0, 0, true);
		await flush();
		pool.update_listener_2d(0, 0, 0);
		expect(engine.playbacks[0].playbackRate).toBeCloseTo(0.9);
	});
});

describe('sound_pool: owners', () => {
	test('sounds can be found and moved by owner', async () => {
		const { pool, engine } = makePool();
		const slot = pool.play_3d('a.ogg', 0, 0, 0, 1, 1, 0, 0, true);
		pool.set_sound_owner(slot, 'player_7', 2);
		await flush();
		expect(pool.get_sound_by_owner('player_7', 2)).toBe(slot);
		pool.update_sounds_3d('player_7', 4, 4, 0);
		expect(engine.playbacks[0].position).toEqual([4, 0, -4]);
	});

	test('destroy_sounds clears every slot for that owner', async () => {
		const { pool } = makePool();
		const a = pool.play_1d('a.ogg', 0, 1, true);
		const b = pool.play_1d('b.ogg', 0, 2, true);
		pool.set_sound_owner(a, 'player_7');
		pool.set_sound_owner(b, 'player_7');
		await flush();
		pool.destroy_sounds('player_7');
		expect(pool.verify_slot(a)).toBe(false);
		expect(pool.verify_slot(b)).toBe(false);
	});

	test('set_sounds_amp changes volume for matching owners only', async () => {
		const { pool, engine } = makePool();
		const a = pool.play_1d('a.ogg', 0, 1, true);
		const b = pool.play_1d('b.ogg', 0, 2, true);
		pool.set_sound_owner(a, 'player_7', 1);
		pool.set_sound_owner(b, 'player_8', 1);
		await flush();
		pool.set_sounds_amp('player_7', 1, -6);
		expect(engine.playbacks[0].volume).toBeCloseTo(db_to_volume(-6));
		expect(engine.playbacks[1].volume).toBe(1);
	});
});

describe('sound_pool: transport', () => {
	test('pause and resume drive the playback', async () => {
		const { pool, engine } = makePool();
		const slot = pool.play_1d('a.ogg', 0, 1, true);
		await flush();
		expect(pool.pause_sound(slot)).toBe(true);
		expect(engine.playbacks[0].pauseCalls).toBe(1);
		expect(pool.resume_sound(slot)).toBe(true);
		expect(engine.playbacks[0].playCalls).toBe(2);
	});

	test('a paused slot is not recycled', async () => {
		const { pool } = makePool(1);
		const slot = pool.play_1d('a.ogg', 0, 1, false);
		await flush();
		pool.pause_sound(slot);
		expect(pool.play_1d('b.ogg', 0, 1, false)).toBe(-1);
	});

	test('start_playing false loads without playing', async () => {
		const { pool, engine } = makePool();
		pool.play_extended_3d('a.ogg', 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, false, 0, 0.0, 0.0, 100.0, false, null, false);
		await flush();
		expect(engine.playbacks[0].playCalls).toBe(0);
	});

	test('destroy_all empties the pool', async () => {
		const { pool } = makePool();
		pool.play_1d('a.ogg', 0, 1, true);
		pool.play_1d('b.ogg', 0, 2, true);
		await flush();
		pool.destroy_all();
		expect(pool.highest_slot).toBe(0);
		expect(pool.verify_slot(0)).toBe(false);
		expect(pool.verify_slot(1)).toBe(false);
	});
});

describe('sound_pool: mixer channels', () => {
	test('passes the pool mixer to every spawned sound', async () => {
		const { pool, engine } = makePool(4, { mixer: 'sounds' });
		pool.play_stationary('step.ogg', false);
		await flush();
		expect(engine.playbacks[0].destination).toBe('sounds');
	});

	test('lets one call override the pool mixer', async () => {
		const { pool, engine } = makePool(4, { mixer: 'sounds' });
		pool.play_stationary_extended('theme.ogg', true, 0, 0, 0, 100, false, 'music');
		await flush();
		expect(engine.playbacks[0].destination).toBe('music');
	});
});
