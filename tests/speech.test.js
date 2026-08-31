import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStorage } from '../src/storage.js';
import { createSpeech, MODE_ARIA, MODE_TTS, MODE_BOTH } from '../src/speech/index.js';

let speech;

function makeSpeech(options = {}) {
	speech?.dispose();
	speech = createSpeech({ storage: createStorage('game'), idPrefix: 'sr', ...options });
	return speech;
}

function polite() {
	return document.getElementById('sr-polite');
}

function assertive() {
	return document.getElementById('sr-assertive');
}

afterEach(() => {
	speech?.dispose();
	speech = null;
});

describe('createSpeech: init', () => {
	test('creates a polite live region', () => {
		makeSpeech().init();
		expect(polite()).not.toBeNull();
		expect(polite().getAttribute('aria-live')).toBe('polite');
		expect(polite().getAttribute('role')).toBe('status');
		expect(polite().getAttribute('aria-atomic')).toBe('true');
	});

	test('creates an assertive live region', () => {
		makeSpeech().init();
		expect(assertive()).not.toBeNull();
		expect(assertive().getAttribute('aria-live')).toBe('assertive');
		expect(assertive().getAttribute('role')).toBe('alert');
		expect(assertive().getAttribute('aria-atomic')).toBe('true');
	});

	test('regions are visually hidden without needing a stylesheet', () => {
		makeSpeech().init();
		const style = polite().getAttribute('style');
		expect(style).toContain('position:absolute');
		expect(style).toContain('clip-path:inset(50%)');
	});

	test('calling init twice does not duplicate regions', () => {
		const s = makeSpeech();
		s.init();
		s.init();
		expect(document.querySelectorAll('#sr-polite').length).toBe(1);
		expect(document.querySelectorAll('#sr-assertive').length).toBe(1);
	});

	test('two instances with different prefixes do not collide', () => {
		const a = createSpeech({ storage: createStorage('a'), idPrefix: 'a' });
		const b = createSpeech({ storage: createStorage('b'), idPrefix: 'b' });
		a.init();
		b.init();
		expect(document.getElementById('a-polite')).not.toBeNull();
		expect(document.getElementById('b-polite')).not.toBeNull();
		a.dispose();
		b.dispose();
		expect(document.getElementById('a-polite')).toBeNull();
	});

	test('dispose removes the regions', () => {
		const s = makeSpeech();
		s.init();
		s.dispose();
		expect(polite()).toBeNull();
		expect(assertive()).toBeNull();
	});
});

describe('createSpeech: mode', () => {
	beforeEach(() => makeSpeech().init());

	test('default mode is aria on non-iOS platforms', () => {
		expect(speech.getMode()).toBe(MODE_ARIA);
	});

	test('default mode is tts on iOS', () => {
		Object.defineProperty(window.navigator, 'userAgent', {
			value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
			configurable: true,
		});
		expect(speech.getMode()).toBe(MODE_TTS);
		Object.defineProperty(window.navigator, 'userAgent', { value: '', configurable: true });
	});

	test('an explicit defaultMode overrides platform detection', () => {
		const s = makeSpeech({ defaultMode: MODE_BOTH });
		expect(s.getMode()).toBe(MODE_BOTH);
	});

	test('setMode persists the mode under the storage namespace', () => {
		speech.setMode(MODE_BOTH);
		expect(speech.getMode()).toBe(MODE_BOTH);
		expect(localStorage.getItem('game:speechMode')).toBe('"both"');
	});

	test('setMode rejects invalid modes', () => {
		expect(() => speech.setMode('shouting')).toThrow();
	});
});

describe('createSpeech: speak (aria)', () => {
	beforeEach(() => {
		makeSpeech().init();
		speech.setMode(MODE_ARIA);
	});

	test('writes text to the polite region by default', () => {
		speech.speak('hello');
		expect(polite().textContent).toBe('hello');
	});

	test('writes text to the assertive region when interrupt is true', () => {
		speech.speak('alert', true);
		expect(assertive().textContent).toBe('alert');
		expect(polite().textContent).toBe('');
	});

	test('clears region text after 100ms so the same string can re-announce', async () => {
		speech.speak('again');
		expect(polite().textContent).toBe('again');
		await new Promise(r => setTimeout(r, 200));
		expect(polite().textContent).toBe('');
	});

	test('does not call speechSynthesis in aria-only mode', () => {
		speech.speak('quiet');
		expect(globalThis.speechSynthesis.spoken).toEqual([]);
	});

	test('speak works without an explicit init call', () => {
		const s = makeSpeech();
		s.setMode(MODE_ARIA);
		s.speak('implicit');
		expect(polite().textContent).toBe('implicit');
	});

	test('a rapid second announcement is not wiped by the first clear timer', () => {
		vi.useFakeTimers();
		try {
			speech.speak('first');
			vi.advanceTimersByTime(5);
			speech.speak('second');
			vi.advanceTimersByTime(6);
			expect(polite().textContent).toBe('second');
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('createSpeech: speak (tts)', () => {
	beforeEach(() => {
		makeSpeech().init();
		speech.setMode(MODE_TTS);
	});

	test('passes text to speechSynthesis.speak', () => {
		speech.speak('hello via tts');
		expect(globalThis.speechSynthesis.spoken).toEqual(['hello via tts']);
	});

	test('does not write to ARIA regions in tts-only mode', () => {
		speech.speak('silent dom');
		expect(polite().textContent).toBe('');
		expect(assertive().textContent).toBe('');
	});

	test('interrupt cancels current TTS before speaking', () => {
		speech.speak('one');
		speech.speak('two', true);
		expect(globalThis.speechSynthesis.cancelCalls).toBe(1);
		expect(globalThis.speechSynthesis.spoken).toEqual(['one', 'two']);
	});

	test('non-interrupt does not cancel', () => {
		speech.speak('one');
		speech.speak('two');
		expect(globalThis.speechSynthesis.cancelCalls).toBe(0);
	});

	test('does not throw when the browser has no Web Speech support', () => {
		const synthesis = globalThis.speechSynthesis;
		const utterance = globalThis.SpeechSynthesisUtterance;
		delete globalThis.speechSynthesis;
		delete globalThis.SpeechSynthesisUtterance;
		try {
			expect(() => speech.speak('no engine')).not.toThrow();
		} finally {
			globalThis.speechSynthesis = synthesis;
			globalThis.SpeechSynthesisUtterance = utterance;
		}
	});
});

describe('createSpeech: speak (both)', () => {
	beforeEach(() => {
		makeSpeech().init();
		speech.setMode(MODE_BOTH);
	});

	test('writes to ARIA and speechSynthesis', () => {
		speech.speak('double');
		expect(polite().textContent).toBe('double');
		expect(globalThis.speechSynthesis.spoken).toEqual(['double']);
	});
});

describe('createSpeech: primeTts', () => {
	test('speaks a silent utterance to satisfy the iOS gesture requirement', () => {
		makeSpeech().primeTts();
		expect(globalThis.speechSynthesis.spoken).toEqual([' ']);
	});
});

describe('createSpeech: voice, rate, and pitch', () => {
	beforeEach(() => makeSpeech());

	test('rate and pitch default to 1 and round-trip', () => {
		expect(speech.getRate()).toBe(1);
		expect(speech.getPitch()).toBe(1);
		speech.setRate(1.5);
		speech.setPitch(0.8);
		expect(speech.getRate()).toBe(1.5);
		expect(speech.getPitch()).toBe(0.8);
	});

	test('rate and pitch reject out-of-range values', () => {
		expect(() => speech.setRate(0)).toThrow();
		expect(() => speech.setRate(11)).toThrow();
		expect(() => speech.setPitch(-1)).toThrow();
		expect(() => speech.setPitch(3)).toThrow();
		expect(() => speech.setPitch('loud')).toThrow();
	});

	test('setVoice accepts a voice object or a URI string', () => {
		speech.setVoice({ voiceURI: 'urn:voice:a', name: 'A' });
		expect(localStorage.getItem('game:speechVoice')).toBe('"urn:voice:a"');
		speech.setVoice('urn:voice:b');
		expect(localStorage.getItem('game:speechVoice')).toBe('"urn:voice:b"');
	});

	test('setVoice rejects input with no voiceURI', () => {
		expect(() => speech.setVoice({})).toThrow();
		expect(() => speech.setVoice(null)).toThrow();
	});

	test('getVoice resolves the stored URI against the available voices', () => {
		const voice = { voiceURI: 'urn:voice:a', name: 'A' };
		globalThis.speechSynthesis.voices = [voice];
		expect(speech.getVoice()).toBe(null);
		speech.setVoice(voice);
		expect(speech.getVoice()).toBe(voice);
	});

	test('getVoice returns null when the stored voice is no longer installed', () => {
		speech.setVoice('urn:voice:gone');
		globalThis.speechSynthesis.voices = [];
		expect(speech.getVoice()).toBe(null);
	});

	test('tts speaks with the configured rate and pitch', () => {
		speech.setMode(MODE_TTS);
		speech.setRate(1.4);
		speech.setPitch(0.6);
		const spoken = [];
		const original = globalThis.speechSynthesis.speak;
		globalThis.speechSynthesis.speak = function (utterance) {
			spoken.push({ rate: utterance.rate, pitch: utterance.pitch });
			original.call(this, utterance);
		};
		speech.speak('configured');
		globalThis.speechSynthesis.speak = original;
		expect(spoken).toEqual([{ rate: 1.4, pitch: 0.6 }]);
	});
});
