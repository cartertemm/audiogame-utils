/**
 * Native speech adapter backed by the prism Tauri plugin.
 *
 * @module
 */
import type { SpeechFeatures, SpeechVoice } from '../speech/index.js';

/** The `speech` capability registered under Tauri. */
export interface TauriSpeech {
	speak(text: string, interrupt?: boolean): Promise<void>;
	stop(): Promise<void>;
	voices(): Promise<SpeechVoice[]>;
	setVoice(id: string): Promise<void>;
	setRate(value: number): Promise<void>;
	setPitch(value: number): Promise<void>;
	setVolume(value: number): Promise<void>;
	/** Name of the prism backend in use, such as `NVDA` or `SAPI`. Can be `null`. */
	backendName: string | null;
	features: SpeechFeatures;
}

/** Probes the prism plugin. Resolves `null` when it is missing or has no backend. */
export function createTauriSpeech(): Promise<TauriSpeech | null>;
