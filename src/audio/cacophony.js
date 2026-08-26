// @ts-self-types="./cacophony.d.ts"
// Cacophony caches decoded audio in the Cache API, which only exists in a secure
// context. A page served over plain http from a LAN address is not one, so the
// default cache throws `caches is not defined` before a single sound decodes.
// This stands in for it: same two methods, memory only, so the sounds reload on
// the next visit instead of failing on this one.
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

export function createCacophonyEngine() {
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
				return cacophony;
			})();
		}
		return initPromise;
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
		if (options.destination && typeof inst.connect === 'function') {
			inst.disconnect();
			inst.connect(options.destination);
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

	function spawn(handle, options = {}) {
		const inst = handle?.preplay?.()[0];
		if (!inst) return null;
		return configure(inst, options);
	}

	// Playback.play() discards the source node that preplay() built and starts a
	// fresh one, which drops the loop flag. Re-apply it once the real source is
	// running, otherwise every looping sound plays through exactly once.
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
		load,
		spawn,
		start,
		play,

		stop(inst) {
			inst?.inst?.stop?.();
			inst?.handle?.stop?.();
			inst?.stop?.();
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
