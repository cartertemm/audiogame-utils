// Adapts Cacophony to the internal audio engine interface. Keeping
// `AudioContext` access here lets tests inject an engine that does not use it.

export function createCacophonyEngine() {
	let cacophony = null;

	async function init() {
		if (cacophony) return cacophony;
		const { Cacophony } = await import('cacophony');
		cacophony = new Cacophony();
		return cacophony;
	}

	return {
		async load(url) {
			const engine = await init();
			// `createSound()` returns a promise in Cacophony 0.18.3.
			return await engine.createSound(url, undefined, 'stereo');
		},

		play(handle, options = {}) {
			if (!handle) return null;
			const inst = handle.preplay?.()[0];
			if (!inst) return null;
			if (options.loop) {
				if ('sourceLoop' in inst) inst.sourceLoop = true;
				else inst.loop?.('infinite');
			}
			if (typeof options.volume === 'number') inst.volume = options.volume;
			if (typeof options.pan === 'number') inst.stereoPan = options.pan;
			if (options.position) inst.position = options.position;
			inst.play?.();
			return inst;
		},

		stop(inst) {
			inst?.inst?.stop?.();
			inst?.handle?.stop?.();
			inst?.stop?.();
		},

		setPosition(handle, position) {
			if (!handle) return;
			handle.position = position;
		},
	};
}
