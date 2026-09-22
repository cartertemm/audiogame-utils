// @ts-self-types="./cacophony.d.ts"
// Initializes the Cacophony engine and sets up the interfaces that we use.

import { get_shared_mixer } from './mixer.js';
import { createReverb } from './reverb.js';

function createMemoryCache() {
	const buffers = new Map();
	return {
		getAudioBuffer(context, url, signal) {
			if (!buffers.has(url)) {
				const pending = (async () => {
					const response = await fetch(url, { signal });
					if (!response.ok) throw new Error(`could not fetch ${url}, server said ${response.status}`);
					return context.decodeAudioData(await response.arrayBuffer());
				})();
				buffers.set(url, pending.catch(err => {
					buffers.delete(url);
					throw err;
				}));
			}
			return buffers.get(url);
		},

		clearMemoryCache() {
			buffers.clear();
		},
	};
}

export function createCacophonyEngine({ mixer = get_shared_mixer() } = {}) {
	let cacophony = null;
	let initPromise = null;
	const sounds = new Map();

	function init() {
		if (!initPromise) {
			initPromise = (async () => {
				const { Cacophony } = await import('cacophony');
				cacophony = typeof caches === 'undefined'
					? new Cacophony(undefined, createMemoryCache())
					: new Cacophony();
				// The audio context does not exist before now, so this is the first
				// moment the mixer can turn its stored volumes into real nodes.
				mixer.attach(cacophony.context, cacophony.globalGainNode);
				return cacophony;
			})();
		}
		return initPromise;
	}

	const reverb = createReverb(init);
	reverb.onInput(input => mixer.attachReverb(input));

	// A channel name must resolve here as the context only exists after init.
	function resolveDestination(destination) {
		return typeof destination === 'string' ? mixer.node(destination) : destination;
	}

	// `position` and `threeDOptions` only exist on HRTF playbacks, `stereoPan`
	// only on stereo ones. Cacophony throws when you cross the two.
	function configure(inst, options) {
		if (typeof options.volume === 'number') inst.volume = options.volume;
		if (typeof options.rate === 'number') inst.playbackRate = options.rate;
		if (inst.panType !== 'stereo') {
			if (options.threeDOptions) inst.threeDOptions = options.threeDOptions;
			if (options.position) inst.position = options.position;
		}
		if (inst.panType !== 'HRTF' && typeof options.pan === 'number') inst.stereoPan = options.pan;
		if (options.offset > 0) inst.seek?.(options.offset);
		const destination = resolveDestination(options.destination);
		if (destination && typeof inst.connect === 'function') {
			inst.disconnect();
			inst.connect(destination);
		}
		return inst;
	}

	async function load(url, { panType = 'stereo', soundType = undefined } = {}) {
		const engine = await init();
		const key = `${panType}|${url}`;
		if (!sounds.has(key)) {
			sounds.set(key, engine.createSound(url, soundType, panType).catch(err => {
				sounds.delete(key);
				throw err;
			}));
		}
		return sounds.get(key);
	}

	function release(handle, inst) {
		const playbacks = handle?.playbacks;
		if (Array.isArray(playbacks)) {
			const index = playbacks.indexOf(inst);
			if (index !== -1) playbacks.splice(index, 1);
		}
		inst.cleanup?.();
	}

	function stopQuietly(target) {
		try {
			target?.stop?.();
		} catch {
			/* A playback that already finished no longer owns a source node. */
		}
	}

	function spawn(handle, options = {}) {
		const inst = handle?.preplay?.()[0];
		if (!inst) return null;
		inst.on?.('stop', () => release(handle, inst));
		return configure(inst, options);
	}

	function start(inst, options = {}) {
		if (!inst) return null;
		inst.play?.();
		if (options.loop) {
			if ('sourceLoop' in inst) inst.sourceLoop = true;
			else inst.loop?.('infinite');
		}
		return inst;
	}

	function play(handle, options = {}) {
		return start(spawn(handle, options), options);
	}

	return {
		mixer,
		reverb,
		load,
		spawn,
		start,
		play,

		stop(inst) {
			stopQuietly(inst?.inst);
			stopQuietly(inst?.handle);
			stopQuietly(inst);
		},

		setPosition(handle, position) {
			if (!handle || handle.panType === 'stereo') return;
			handle.position = position;
		},

		// No effect until the first sound loads, because the audio context does
		// not exist before then.
		setListener({ position, orientation } = {}) {
			if (!cacophony) return false;
			if (position) cacophony.listenerPosition = position;
			if (orientation) cacophony.listenerOrientation = orientation;
			return true;
		},

		ready: init,
	};
}
