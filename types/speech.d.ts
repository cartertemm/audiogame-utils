import type { StorageInstance } from './storage.d.ts';

export const MODE_ARIA: 'aria';
export const MODE_TTS: 'tts';
export const MODE_BOTH: 'both';

export type SpeechMode = typeof MODE_ARIA | typeof MODE_TTS | typeof MODE_BOTH;

export interface SpeechOptions {
	storage: StorageInstance;
	defaultMode?: SpeechMode | null;
	idPrefix?: string;
}

export interface SpeechInstance {
	init(): void;
	primeTts(): void;
	speak(text: string, interrupt?: boolean): void;
	getMode(): SpeechMode;
	setMode(mode: SpeechMode): void;
	getVoices(): SpeechSynthesisVoice[];
	getVoice(): SpeechSynthesisVoice | null;
	setVoice(voice: SpeechSynthesisVoice | string): void;
	getPitch(): number;
	setPitch(value: number): void;
	getRate(): number;
	setRate(value: number): void;
	dispose(): void;
}

export function createSpeech(options: SpeechOptions): SpeechInstance;
