import { describe, test, expect } from 'vitest';
import { createMixer, get_shared_mixer } from '../src/audio/mixer.js';
import { db_to_volume } from '../src/audio/units.js';

function makeFakeGain() {
	return {
		gain: { value: 1 },
		connectedTo: [],
		connect(target) { this.connectedTo.push(target); },
		disconnect() { this.connectedTo.length = 0; },
	};
}

function makeFakeContext() {
	return {
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
});
