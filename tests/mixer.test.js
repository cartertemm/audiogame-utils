import { describe, test, expect } from 'vitest';
import { createMixer, get_shared_mixer } from '../src/audio/mixer.js';
import { db_to_volume } from '../src/audio/units.js';

function makeFakeParam(value = 1) {
	return {
		value,
		calls: [],
		cancelScheduledValues(t) { this.calls.push(['cancel', t]); },
		setValueAtTime(v, t) { this.calls.push(['set', v, t]); this.value = v; },
		linearRampToValueAtTime(v, t) { this.calls.push(['ramp', v, t]); this.value = v; },
	};
}

function makeFakeGain() {
	return {
		gain: makeFakeParam(1),
		connectedTo: [],
		connect(target) { this.connectedTo.push(target); },
		disconnect() { this.connectedTo.length = 0; },
	};
}

function makeFakeContext() {
	return {
		currentTime: 5,
		created: [],
		createGain() {
			const node = makeFakeGain();
			this.created.push(node);
			return node;
		},
	};
}

describe('audio mixer', () => {
	test('reports decibels as linear volume and back', () => {
		const channel = createMixer().channel('music');
		expect(channel.db).toBe(0);
		expect(channel.volume).toBe(1);

		channel.db = -6;
		expect(channel.volume).toBeCloseTo(db_to_volume(-6), 10);

		channel.volume = 0.5;
		expect(channel.db).toBeCloseTo(-6.0206, 3);

		channel.volume = 0;
		expect(channel.db).toBe(-100);
	});

	test('returns the same channel object for one name', () => {
		const mixer = createMixer();
		expect(mixer.channel('music')).toBe(mixer.channel('music'));
	});

	test('offers a master channel at full volume', () => {
		const mixer = createMixer();
		expect(mixer.channel('master').db).toBe(0);
		expect(mixer.names()).toContain('master');
	});

	test('keeps volumes set before an audio context exists', () => {
		const mixer = createMixer();
		mixer.channel('music').db = -12;
		expect(mixer.channel('music').node).toBe(null);
		expect(mixer.node('music')).toBe(null);

		const context = makeFakeContext();
		const output = makeFakeGain();
		mixer.attach(context, output);
		expect(mixer.channel('music').node.gain.value).toBeCloseTo(db_to_volume(-12), 10);
	});

	test('wires each channel through master to the output', () => {
		const mixer = createMixer();
		mixer.channel('music');
		const context = makeFakeContext();
		const output = makeFakeGain();
		mixer.attach(context, output);

		const master = mixer.channel('master').node;
		expect(mixer.channel('music').node.connectedTo).toEqual([master]);
		expect(master.connectedTo).toEqual([output]);
	});

	test('builds a node right away for a channel named after attach', () => {
		const mixer = createMixer();
		mixer.attach(makeFakeContext(), makeFakeGain());
		const voices = mixer.channel('voices');
		expect(voices.node).not.toBe(null);
		expect(voices.node.connectedTo).toEqual([mixer.channel('master').node]);
	});

	test('retunes a live node when the volume changes', () => {
		const mixer = createMixer();
		mixer.attach(makeFakeContext(), makeFakeGain());
		const music = mixer.channel('music');
		music.db = -20;
		expect(music.node.gain.value).toBeCloseTo(db_to_volume(-20), 10);
		music.volume = 0.25;
		expect(music.node.gain.value).toBeCloseTo(0.25, 10);
	});

	test('shares one mixer across the page', () => {
		expect(get_shared_mixer()).toBe(get_shared_mixer());
	});

	test('defaults every channel to no reverb send', () => {
		const mixer = createMixer();
		expect(mixer.channel('sfx').reverbSend).toBe(0);
	});

	test('stores a send set before the reverb bus exists and applies it on attach', () => {
		const mixer = createMixer();
		mixer.channel('sfx').setReverbSend(0.3, { ramp: 0 });
		expect(mixer.channel('sfx').reverbSend).toBe(0.3);

		const context = makeFakeContext();
		mixer.attach(context, makeFakeGain());
		const input = makeFakeGain();
		mixer.attachReverb(input);

		const sfx = mixer.channel('sfx').node;
		const send = sfx.connectedTo[1];
		expect(send.gain.value).toBe(0.3);
		expect(send.connectedTo).toEqual([input]);
	});

	test('ramps a live send gain', () => {
		const mixer = createMixer();
		const context = makeFakeContext();
		mixer.attach(context, makeFakeGain());
		mixer.attachReverb(makeFakeGain());
		const sfx = mixer.channel('sfx');
		const send = sfx.node.connectedTo[1];
		sfx.setReverbSend(0.5, { ramp: 2 });
		expect(send.gain.calls).toEqual([['cancel', 5], ['set', 0, 5], ['ramp', 0.5, 7]]);
		expect(sfx.reverbSend).toBe(0.5);
	});

	test('gives a channel named after attachReverb its own send', () => {
		const mixer = createMixer();
		mixer.attach(makeFakeContext(), makeFakeGain());
		const input = makeFakeGain();
		mixer.attachReverb(input);
		const voices = mixer.channel('voices');
		expect(voices.node.connectedTo[1].connectedTo).toEqual([input]);
	});

	test('gives master no send', () => {
		const mixer = createMixer();
		mixer.attach(makeFakeContext(), makeFakeGain());
		mixer.attachReverb(makeFakeGain());
		const master = mixer.channel('master');
		master.setReverbSend(1);
		expect(master.reverbSend).toBe(0);
		expect(master.node.connectedTo).toHaveLength(1);
	});
});
