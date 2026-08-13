// Manages one audio asset through the play, stop, and update methods.
//
// Load the asset and initialize audio when `play()` or `load()` first runs. This
// lets a game declare its sound table during startup without loading audio.
//
// The epoch counter invalidates pending playback. Each `play()` call records the
// current epoch, and `stop()` increments it. A load that completes after
// `stop()` does not start playback.
//
// `play({ loop: true })` returns when the loop is active to prevent overlapping
// playback.

// Accept a URL string, a function that returns a URL, or a function that returns
// a module object with a `default` URL. Bundlers use the module form for imports
// such as `import('./x.ogg?url')`.
async function resolveSource(source) {
	const value = typeof source === 'function' ? await source() : source;
	if (typeof value === 'string') return value;
	if (value && typeof value.default === 'string') return value.default;
	throw new Error('sfx source must resolve to a URL string');
}

export function createSfx(getEngine, source) {
	let loadPromise = null;
	let looping = false;
	let epoch = 0;
	let currentInst = null;
	let rampHandle = 0;

	function cancelRamp() {
		if (rampHandle) {
			cancelAnimationFrame(rampHandle);
			rampHandle = 0;
		}
	}

	function ensureLoaded() {
		if (!loadPromise) {
			loadPromise = (async () => {
				const engine = await getEngine();
				if (!engine) return null;
				const url = await resolveSource(source);
				return { engine, handle: await engine.load(url) };
			})();
		}
		return loadPromise;
	}

	return {
		async play(options = {}) {
			const myEpoch = ++epoch;
			try {
				const loaded = await ensureLoaded();
				if (myEpoch !== epoch || !loaded) return;
				if (options.loop) {
					if (looping && currentInst?.isPlaying !== false) return;
					looping = true;
				}
				currentInst = loaded.engine.play(loaded.handle, options);
			} catch (err) {
				console.warn('sfx play failed', err);
				loadPromise = null;
				if (myEpoch === epoch && options.loop) looping = false;
			}
		},

		isLooping() {
			return looping && currentInst?.isPlaying !== false;
		},

		async stop() {
			cancelRamp();
			epoch++;
			looping = false;
			const inst = currentInst;
			currentInst = null;
			if (inst) inst.stop?.();
			if (!loadPromise) return;
			try {
				const loaded = await loadPromise;
				loaded?.engine.stop(loaded.handle);
			} catch {
				/* `play()` already reported the error. */
			}
		},

		// Change `playbackRate` from `from` to `to` over `durationMs`. This changes
		// pitch and speed together. Wait for the shared load promise so this method
		// can run immediately after an unawaited `play()` call.
		rampPitch({ from, to, durationMs }) {
			cancelRamp();
			const myEpoch = epoch;
			(async () => {
				try {
					await ensureLoaded();
				} catch {
					return;
				}
				if (myEpoch !== epoch || !currentInst) return;
				const startTime = performance.now();
				currentInst.playbackRate = from;
				const tick = () => {
					if (myEpoch !== epoch || !currentInst) {
						rampHandle = 0;
						return;
					}
					const elapsed = performance.now() - startTime;
					const t = durationMs > 0 ? Math.min(elapsed / durationMs, 1) : 1;
					currentInst.playbackRate = from + (to - from) * t;
					rampHandle = t < 1 ? requestAnimationFrame(tick) : 0;
				};
				rampHandle = requestAnimationFrame(tick);
			})();
		},

		// Update a playing sound, such as one that tracks a moving object.
		update(options = {}) {
			if (!currentInst) return;
			if (typeof options.pan === 'number') currentInst.stereoPan = options.pan;
			if (typeof options.volume === 'number') currentInst.volume = options.volume;
		},

		async setPosition(position) {
			try {
				const loaded = await ensureLoaded();
				if (loaded) loaded.engine.setPosition(loaded.handle, position);
			} catch (err) {
				console.warn('sfx setPosition failed', err);
			}
		},

		load: ensureLoaded,
	};
}
