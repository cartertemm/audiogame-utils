// @ts-self-types="./mixer.d.ts"

import { db_to_volume, volume_to_db } from './units.js';

export const MASTER_CHANNEL = 'master';

function makeChannel(name) {
	let db = 0;
	let node = null;
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
	};
	function build(context, destination) {
		if (node) return node;
		node = context.createGain();
		node.gain.value = db_to_volume(db);
		node.connect(destination);
		return node;
	}
	return { channel, build };
}

export function createMixer() {
	const entries = new Map();
	let context = null;
	let output = null;

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

		// Called by the engine once the audio context exists. Every channel keeps
		// the volume it was already given.
		attach(audioContext, destination) {
			context = audioContext;
			output = destination;
			masterNode();
			for (const found of entries.values()) build(found);
		},
	};
}

let shared = null;

export function get_shared_mixer() {
	if (!shared) shared = createMixer();
	return shared;
}
