// @ts-self-types="./mixer.d.ts"

import { db_to_volume, volume_to_db } from './units.js';
import { ramp_param } from './ramp.js';

export const MASTER_CHANNEL = 'master';
const DEFAULT_RAMP = 0.5;

function makeChannel(name) {
	let db = 0;
	let node = null;
	let send = null;
	let reverbSend = 0;
	let context = null;
	const isMaster = name === MASTER_CHANNEL;
	const channel = {
		name,
		get db() {
			return db;
		},
		set db(value) {
			db = value;
			if (node) node.gain.value = db_to_volume(db);
		},
		get volume() {
			return db_to_volume(db);
		},
		set volume(value) {
			channel.db = volume_to_db(value);
		},
		get node() {
			return node;
		},
		get reverbSend() {
			return reverbSend;
		},
		setReverbSend(value, { ramp = DEFAULT_RAMP } = {}) {
			if (isMaster) return;
			reverbSend = value;
			if (send) ramp_param(send.gain, value, ramp, context);
		},
	};
	function build(audioContext, destination) {
		if (node) return node;
		context = audioContext;
		node = context.createGain();
		node.gain.value = db_to_volume(db);
		node.connect(destination);
		return node;
	}
	function buildSend(input) {
		if (isMaster || send || !node) return;
		send = context.createGain();
		send.gain.value = reverbSend;
		node.connect(send);
		send.connect(input);
	}
	return { channel, build, buildSend };
}

export function createMixer() {
	const entries = new Map();
	let context = null;
	let output = null;
	let reverbInput = null;

	function entry(name) {
		let found = entries.get(name);
		if (found) return found;
		found = makeChannel(name);
		entries.set(name, found);
		build(found);
		return found;
	}

	function masterNode() {
		return entry(MASTER_CHANNEL).build(context, output);
	}

	function build(found) {
		if (!context) return;
		if (found.channel.name === MASTER_CHANNEL) found.build(context, output);
		else found.build(context, masterNode());
		if (reverbInput) found.buildSend(reverbInput);
	}

	entry(MASTER_CHANNEL);

	return {
		channel(name) {
			return entry(name).channel;
		},

		node(name) {
			return entry(name).channel.node;
		},

		names() {
			return [...entries.keys()];
		},

		attach(audioContext, destination) {
			context = audioContext;
			output = destination;
			masterNode();
			for (const found of entries.values()) build(found);
		},

		attachReverb(input) {
			reverbInput = input;
			for (const found of entries.values()) build(found);
		},
	};
}

let shared = null;

export function get_shared_mixer() {
	if (!shared) shared = createMixer();
	return shared;
}
