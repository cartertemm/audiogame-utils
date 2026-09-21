/**
 * Accessible speech output through live regions, text to speech, and native screen readers.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/speech.md | speech guide}.
 *
 * @module
 */
import type { StorageInstance } from '../storage.js';

/** Speech through an ARIA live region. */
export const MODE_ARIA: 'aria';
/** Speech through the Web Speech synthesis API. */
export const MODE_TTS: 'tts';
/** Speech through both ARIA and Web Speech synthesis. */
export const MODE_BOTH: 'both';
/** Speech through the native prism plugin under Tauri. */
export const MODE_NATIVE: 'native';

/** Available speech output modes. */
export type SpeechMode = typeof MODE_ARIA | typeof MODE_TTS | typeof MODE_BOTH | typeof MODE_NATIVE;

/** A voice in the shape shared by every mode. */
export interface SpeechVoice {
	/** Stable identifier, a `voiceURI` for Web Speech or a prism index as a string. */
	id: string;
	/** Human readable name. */
	name: string;
	/** Language tag, or `null` when the engine does not report one. */
	language: string | null;
}

/** Which controls the active mode supports. */
export interface SpeechFeatures {
	voice: boolean;
	rate: boolean;
	pitch: boolean;
	volume: boolean;
}

/** Configuration for {@link createSpeech}. */
export interface SpeechOptions {
	/** Storage used for mode, voice, pitch, rate, and volume preferences. */
	storage: StorageInstance;
	/** Initial mode when no saved preference exists. Uses a platform default when omitted. */
	defaultMode?: SpeechMode | null;
	/** Prefix for generated live region element identifiers. Defaults to `speech`. */
	idPrefix?: string;
}

/** Accessible live region, text to speech, and native speech controls. */
export interface SpeechInstance {
	/** Creates output nodes and pushes saved preferences to the native backend. */
	init(): void;
	/** Primes speech synthesis from a user gesture when a platform requires it. */
	primeTts(): void;
	/** Speaks text through the selected mode, optionally interrupting queued output. */
	speak(text: string, interrupt?: boolean): void;
	/** Stops queued and current output in the selected mode. */
	stop(): void;
	/** Returns the active output mode. */
	getMode(): SpeechMode;
	/** Selects and persists an output mode. Throws for `native` when it is unavailable. */
	setMode(mode: SpeechMode): void;
	/** Returns which controls the active mode supports. */
	features(): SpeechFeatures;
	/** Returns the native backend name, or `null` outside native speech. */
	getBackendName(): string | null;
	/** Returns currently available voices. In native mode the first call returns an empty list and fills in through {@link onVoicesChanged}. */
	getVoices(): SpeechVoice[];
	/** Returns the selected voice, or `null`. */
	getVoice(): SpeechVoice | null;
	/** Selects and persists a voice object or voice id. */
	setVoice(voice: SpeechVoice | string): void;
	/** Calls `handler` when the voice list changes. Returns a function that removes it. */
	onVoicesChanged(handler: () => void): () => void;
	/** Returns the pitch from 0 to 1, where 0.5 is normal. */
	getPitch(): number;
	/** Sets and persists the pitch from 0 to 1. */
	setPitch(value: number): void;
	/** Returns the rate from 0 to 1, where 0.5 is normal. */
	getRate(): number;
	/** Sets and persists the rate from 0 to 1. */
	setRate(value: number): void;
	/** Returns the volume from 0 to 1. */
	getVolume(): number;
	/** Sets and persists the volume from 0 to 1. */
	setVolume(value: number): void;
	/** Cancels pending live region timers, drops voice handlers, and removes nodes created by the instance. */
	dispose(): void;
}

/** Creates accessible speech output backed by persistent preferences. */
export function createSpeech(options: SpeechOptions): SpeechInstance;
