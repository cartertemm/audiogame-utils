/**
 * Named volume channels shared by sound pools and sound handles.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/audio.md | audio guide}.
 *
 * @module
 */

/** Name of the channel that every other channel feeds. */
export const MASTER_CHANNEL: 'master';

/** One group of sounds that all get the same volume. */
export interface MixerChannel {
	/** Channel name. */
	readonly name: string;
	/** Volume in decibels, where `0` is full and `-100` is silence. */
	db: number;
	/** Linear volume from `0` through `1`. */
	volume: number;
	/** The gain node, or `null` before the audio context exists. */
	readonly node: any;
}

/** A set of named channels that collectively feed one master channel. */
export interface Mixer {
	/** Returns a channel, creating it at full volume when the name is new. */
	channel(name: string): MixerChannel;
	/** Returns a channel's gain node, or `null` before the audio context exists. */
	node(name: string): any;
	/** Names of every channel created so far. */
	names(): string[];
	/** Builds the gain nodes and wires them. Called by the engine. */
	attach(context: any, destination: any): void;
}

/** Creates an independent mixer. */
export function createMixer(): Mixer;

/** Returns the mixer every engine attaches to by default. */
export function get_shared_mixer(): Mixer;
