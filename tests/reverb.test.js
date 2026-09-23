import { describe, test, expect } from 'vitest';
import { createReverb } from '../src/audio/reverb.js';
import { createCacophonyEngine } from '../src/audio/cacophony.js';
import { createMixer } from '../src/audio/mixer.js';

function makeFakeParam(value = 1) {
	return {
		value,
		calls: [],
		cancelScheduledValues(t) { this.calls.push(['cancel', t]); },
		setValueAtTime(v, t) { this.calls.push(['set', v, t]); this.value = v; },
		linearRampToValueAtTime(v, t) { this.calls.push(['ramp', v, t]); this.value = v; },
	};
}

function makeFakeCacophony({ failBuild = false } = {}) {
	const log = [];
	const cacophony = {
		context: {
			currentTime: 5,
			createConstantSource() {
				const source = {
					offset: { value: 1 },
					connectedTo: [],
					started: false,
					connect(target) { this.connectedTo.push(target); },
					start() { this.started = true; },
				};
				log.push(['createConstantSource', source]);
				return source;
			},
		},
		log,
		createFdnReverb(options) {
			log.push(['createFdnReverb', options]);
			return { options };
		},
		createBus() {
			const bus = {
				input: { name: 'input' },
				output: { gain: makeFakeParam(1) },
				ramps: [],
				destroyed: false,
				async addFilter(effect) {
					if (failBuild) throw new Error('no worklet');
					return { effect };
				},
				rampFilterParam(node, name, value, options) {
					this.ramps.push([name, value, options.duration]);
				},
				destroy() { this.destroyed = true; },
			};
			log.push(['createBus', bus]);
			return bus;
		},
	};
	return cacophony;
}

function lastBus(cacophony) {
	return cacophony.log.filter(e => e[0] === 'createBus').at(-1)[1];
}

function effectOptions(cacophony) {
	return cacophony.log.find(e => e[0] === 'createFdnReverb')[1];
}

describe('reverb', () => {
	test('builds the bus once with the merged preset and mix pinned to 1', async () => {
		const cacophony = makeFakeCacophony();
		const reverb = createReverb(async () => cacophony);
		reverb.presets.cave = { decayTime: 3, damping: 0.2 };
		const inputs = [];
		reverb.onInput(input => inputs.push(input));

		await Promise.all([reverb.set('cave'), reverb.set('cave')]);

		const buses = cacophony.log.filter(e => e[0] === 'createBus');
		expect(buses).toHaveLength(1);
		expect(effectOptions(cacophony)).toEqual({ decayTime: 3, damping: 0.2, mix: 1 });
		expect(inputs).toEqual([lastBus(cacophony).input]);
		expect(reverb.input).toBe(lastBus(cacophony).input);
	});

	test('keeps a silent source on the bus input so the worklet rings out', async () => {
		const cacophony = makeFakeCacophony();
		const reverb = createReverb(async () => cacophony);
		await reverb.set({ decayTime: 1 });
		const source = cacophony.log.find(e => e[0] === 'createConstantSource')[1];
		expect(source.offset.value).toBe(0);
		expect(source.connectedTo).toEqual([lastBus(cacophony).input]);
		expect(source.started).toBe(true);
	});

	test('ramps only the given fields on later calls', async () => {
		const cacophony = makeFakeCacophony();
		const reverb = createReverb(async () => cacophony);
		await reverb.set({ decayTime: 3, damping: 0.2 });
		await reverb.set({ decayTime: 0.5 }, { ramp: 2 });
		expect(lastBus(cacophony).ramps).toEqual([['decayTime', 0.5, 2000]]);
	});

	test('ignores mix in raw options', async () => {
		const cacophony = makeFakeCacophony();
		const reverb = createReverb(async () => cacophony);
		await reverb.set({ decayTime: 1, mix: 0 });
		expect(effectOptions(cacophony).mix).toBe(1);
		await reverb.set({ mix: 0.5 });
		expect(lastBus(cacophony).ramps).toEqual([]);
	});

	test('throws for an unknown preset before touching audio', async () => {
		const cacophony = makeFakeCacophony();
		const reverb = createReverb(async () => cacophony);
		await expect(reverb.set('nope')).rejects.toThrow('nope');
		expect(cacophony.log).toEqual([]);
	});

	test('fades the bus out on null and back in on the next call', async () => {
		const cacophony = makeFakeCacophony();
		const reverb = createReverb(async () => cacophony);
		await reverb.set({ decayTime: 1 });
		const gain = lastBus(cacophony).output.gain;
		await reverb.set(null, { ramp: 1 });
		expect(gain.calls).toEqual([['cancel', 5], ['set', 1, 5], ['ramp', 0, 6]]);
		gain.calls.length = 0;
		await reverb.set({ decayTime: 2 }, { ramp: 0 });
		expect(gain.calls).toEqual([['cancel', 5], ['set', 1, 5]]);
	});

	test('does nothing for null before the bus exists', async () => {
		const cacophony = makeFakeCacophony();
		const reverb = createReverb(async () => cacophony);
		await reverb.set(null);
		expect(cacophony.log).toEqual([]);
		expect(reverb.input).toBe(null);
	});

	test('retries the build after a failure', async () => {
		let failBuild = true;
		const cacophony = makeFakeCacophony();
		cacophony.createBus = function () {
			const bus = makeFakeCacophony({ failBuild }).createBus();
			this.log.push(['createBus', bus]);
			return bus;
		};
		const reverb = createReverb(async () => cacophony);
		await expect(reverb.set({ decayTime: 1 })).rejects.toThrow('no worklet');
		expect(cacophony.log.filter(e => e[0] === 'createBus')[0][1].destroyed).toBe(true);
		expect(reverb.input).toBe(null);

		failBuild = false;
		await reverb.set({ decayTime: 1 });
		expect(cacophony.log.filter(e => e[0] === 'createBus')).toHaveLength(2);
		expect(reverb.input).not.toBe(null);
	});
});

describe('engine reverb wiring', () => {
	test('creates a reverb whose input reaches the mixer', () => {
		const mixer = createMixer();
		const calls = [];
		mixer.attachReverb = input => calls.push(input);
		const engine = createCacophonyEngine({ mixer });
		expect(engine.reverb.presets).toEqual({});
		expect(engine.reverb.input).toBe(null);
		expect(calls).toEqual([]);
	});
});
