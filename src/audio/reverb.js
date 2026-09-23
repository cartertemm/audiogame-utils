// @ts-self-types="./reverb.d.ts"

import { ramp_param } from './ramp.js';

const PARAMS = ['decayTime', 'damping', 'preDelay', 'diffusion'];
const DEFAULT_RAMP = 0.5;

function pickParams(options) {
	const picked = {};
	for (const name of PARAMS) {
		if (typeof options[name] === 'number') picked[name] = options[name];
	}
	return picked;
}

export function createReverb(getCacophony) {
	const presets = {};
	const listeners = [];
	const current = {};
	let cacophony = null;
	let bus = null;
	let node = null;
	let buildPromise = null;
	let muted = false;

	function resolve(target) {
		if (typeof target !== 'string') return target;
		const preset = presets[target];
		if (!preset) throw new Error(`unknown reverb preset ${target}`);
		return preset;
	}

	function build() {
		if (!buildPromise) {
			buildPromise = (async () => {
				cacophony = await getCacophony();
				const built = cacophony.createBus();
				try {
					node = await built.addFilter(cacophony.createFdnReverb({ ...current, mix: 1 }));
				} catch (err) {
					built.destroy();
					throw err;
				}
				const keepalive = cacophony.context.createConstantSource();
				keepalive.offset.value = 0;
				keepalive.connect(built.input);
				keepalive.start();
				bus = built;
				for (const listener of listeners) listener(bus.input);
			})().catch(err => {
				buildPromise = null;
				console.warn('reverb build failed', err);
				throw err;
			});
		}
		return buildPromise;
	}

	function fade(value, ramp) {
		ramp_param(bus.output.gain, value, ramp, cacophony.context);
	}

	return {
		presets,

		get input() {
			return bus ? bus.input : null;
		},

		onInput(listener) {
			listeners.push(listener);
			if (bus) listener(bus.input);
		},

		async set(target, { ramp = DEFAULT_RAMP } = {}) {
			if (target === null) {
				if (bus && !muted) fade(0, ramp);
				muted = true;
				return;
			}
			const changes = pickParams(resolve(target));
			Object.assign(current, changes);
			if (!bus) {
				await build();
			} else {
				for (const [name, value] of Object.entries(changes)) {
					bus.rampFilterParam(node, name, value, { duration: ramp * 1000 });
				}
			}
			if (muted) {
				fade(1, ramp);
				muted = false;
			}
		},
	};
}
