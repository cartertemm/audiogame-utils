/**
 * Accessible speech output through live regions and text to speech.
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

/** Available speech output modes. */
export type SpeechMode = typeof MODE_ARIA | typeof MODE_TTS | typeof MODE_BOTH;

/** Configuration for {@link createSpeech}. */
export interface SpeechOptions {
	/** Storage used for mode, voice, pitch, and rate preferences. */
	storage: StorageInstance;
	/** Initial mode when no saved preference exists. Uses a platform default when omitted. */
	defaultMode?: SpeechMode | null;
	/** Prefix for generated live region element identifiers. Defaults to `speech`. */
	idPrefix?: string;
}

/** Accessible live region and text to speech controls. */
export interface SpeechInstance {
	/** Creates output nodes and loads saved preferences. */
	init(): void;
	/** Primes speech synthesis from a user gesture when a platform requires it. */
	primeTts(): void;
	/** Speaks text through the selected mode, optionally interrupting queued output. */
	speak(text: string, interrupt?: boolean): void;
	/** Returns the active output mode. */
	getMode(): SpeechMode;
	/** Selects and persists an output mode. */
	setMode(mode: SpeechMode): void;
	/** Returns currently available synthesis voices. */
	getVoices(): SpeechSynthesisVoice[];
	/** Returns the selected synthesis voice, or `null`. */
	getVoice(): SpeechSynthesisVoice | null;
	/** Selects and persists a voice object or voice name. */
	setVoice(voice: SpeechSynthesisVoice | string): void;
	/** Returns the configured synthesis pitch. */
	getPitch(): number;
	/** Sets and persists synthesis pitch. */
	setPitch(value: number): void;
	/** Returns the configured synthesis rate. */
	getRate(): number;
	/** Sets and persists synthesis rate. */
	setRate(value: number): void;
	/** Cancels synthesis and removes nodes and listeners created by the instance. */
	dispose(): void;
}

/** Creates accessible speech output backed by persistent preferences. */
export function createSpeech(options: SpeechOptions): SpeechInstance;
