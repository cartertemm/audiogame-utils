import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStorage } from '../src/storage.js';
import { createSpeech, MODE_ARIA, MODE_TTS, MODE_BOTH, MODE_NATIVE } from '../src/speech/index.js';
import { register, resetCapabilities } from '../src/platform.js';

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

	test('clears region text after a frame so the same string can re-announce', async () => {
		speech.speak('again');
		expect(polite().textContent).toBe('again');
		await new Promise(r => setTimeout(r, 200));
		expect(polite().textContent).toBe('');
	});

	test('keeps the text past a frame when speak runs outside an input handler', () => {
		vi.useFakeTimers();
		try {
			speech.speak('from a socket');
			vi.advanceTimersByTime(20);
			expect(polite().textContent).toBe('from a socket');
		} finally {
			vi.useRealTimers();
		}
	});

	test('clears with a timer when animation frames never fire', () => {
		vi.useFakeTimers();
		const raf = globalThis.requestAnimationFrame;
		globalThis.requestAnimationFrame = () => 1;
		try {
			speech.speak('hidden tab');
			vi.advanceTimersByTime(300);
			expect(polite().textContent).toBe('');
		} finally {
			globalThis.requestAnimationFrame = raf;
			vi.useRealTimers();
		}
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
			vi.advanceTimersByTime(20);
			speech.speak('second');
			vi.advanceTimersByTime(20);
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

describe('createSpeech: rate, pitch, and volume', () => {
	beforeEach(() => makeSpeech());

	test('rate and pitch default to 0.5, volume to 1, and all round-trip', () => {
		expect(speech.getRate()).toBe(0.5);
		expect(speech.getPitch()).toBe(0.5);
		expect(speech.getVolume()).toBe(1);
		speech.setRate(0.75);
		speech.setPitch(0.25);
		speech.setVolume(0.4);
		expect(speech.getRate()).toBe(0.75);
		expect(speech.getPitch()).toBe(0.25);
		expect(speech.getVolume()).toBe(0.4);
	});

	test('setters reject values outside 0 to 1', () => {
		expect(() => speech.setRate(-0.1)).toThrow();
		expect(() => speech.setRate(1.1)).toThrow();
		expect(() => speech.setPitch(-1)).toThrow();
		expect(() => speech.setPitch(2)).toThrow();
		expect(() => speech.setPitch('loud')).toThrow();
		expect(() => speech.setVolume(1.5)).toThrow();
	});

	test('tts converts the uniform values to Web Speech scales', () => {
		speech.setMode(MODE_TTS);
		const spoken = [];
		const original = globalThis.speechSynthesis.speak;
		globalThis.speechSynthesis.speak = function (utterance) {
			spoken.push({ rate: utterance.rate, pitch: utterance.pitch, volume: utterance.volume });
			original.call(this, utterance);
		};
		speech.speak('normal');
		speech.setRate(0);
		speech.setPitch(0);
		speech.setVolume(0.5);
		speech.speak('low');
		speech.setRate(1);
		speech.setPitch(1);
		speech.speak('high');
		speech.setRate(0.25);
		speech.speak('slowish');
		globalThis.speechSynthesis.speak = original;
		expect(spoken).toEqual([
			{ rate: 1, pitch: 1, volume: 1 },
			{ rate: 0.5, pitch: 0, volume: 0.5 },
			{ rate: 2, pitch: 2, volume: 0.5 },
			{ rate: 0.75, pitch: 2, volume: 0.5 },
		]);
	});
});

describe('createSpeech: voice', () => {
	beforeEach(() => makeSpeech());

	test('getVoices returns the uniform shape', () => {
		globalThis.speechSynthesis.voices = [{ voiceURI: 'urn:a', name: 'A', lang: 'en-US' }, { voiceURI: 'urn:b', name: 'B' }];
		expect(speech.getVoices()).toEqual([
			{ id: 'urn:a', name: 'A', language: 'en-US' },
			{ id: 'urn:b', name: 'B', language: null },
		]);
	});

	test('setVoice accepts a voice object or an id string', () => {
		speech.setVoice({ id: 'urn:voice:a', name: 'A', language: null });
		expect(localStorage.getItem('game:speechVoice')).toBe('"urn:voice:a"');
		speech.setVoice('urn:voice:b');
		expect(localStorage.getItem('game:speechVoice')).toBe('"urn:voice:b"');
	});

	test('setVoice rejects input with no id', () => {
		expect(() => speech.setVoice({})).toThrow();
		expect(() => speech.setVoice(null)).toThrow();
	});

	test('getVoice resolves the stored id against the available voices', () => {
		globalThis.speechSynthesis.voices = [{ voiceURI: 'urn:voice:a', name: 'A' }];
		expect(speech.getVoice()).toBe(null);
		speech.setVoice('urn:voice:a');
		expect(speech.getVoice()).toEqual({ id: 'urn:voice:a', name: 'A', language: null });
	});

	test('getVoice returns null when the stored voice is no longer installed', () => {
		speech.setVoice('urn:voice:gone');
		globalThis.speechSynthesis.voices = [];
		expect(speech.getVoice()).toBe(null);
	});

	test('tts speaks with the selected voice', () => {
		const voice = { voiceURI: 'urn:voice:a', name: 'A' };
		globalThis.speechSynthesis.voices = [voice];
		speech.setMode(MODE_TTS);
		speech.setVoice('urn:voice:a');
		let used = null;
		const original = globalThis.speechSynthesis.speak;
		globalThis.speechSynthesis.speak = function (utterance) {
			used = utterance.voice;
			original.call(this, utterance);
		};
		speech.speak('hi');
		globalThis.speechSynthesis.speak = original;
		expect(used).toBe(voice);
	});

	test('onVoicesChanged follows the voiceschanged event until unsubscribed', () => {
		const handler = vi.fn();
		const off = speech.onVoicesChanged(handler);
		globalThis.speechSynthesis.dispatchEvent(new Event('voiceschanged'));
		expect(handler).toHaveBeenCalledTimes(1);
		off();
		globalThis.speechSynthesis.dispatchEvent(new Event('voiceschanged'));
		expect(handler).toHaveBeenCalledTimes(1);
	});

	test('dispose drops voice handlers', () => {
		const handler = vi.fn();
		speech.onVoicesChanged(handler);
		speech.dispose();
		globalThis.speechSynthesis.dispatchEvent(new Event('voiceschanged'));
		expect(handler).not.toHaveBeenCalled();
	});
});

function fakeNative(overrides = {}) {
	return {
		speak: vi.fn(() => Promise.resolve()),
		stop: vi.fn(() => Promise.resolve()),
		voices: vi.fn(() => Promise.resolve([{ id: '0', name: 'Zira', language: 'en-US' }])),
		setVoice: vi.fn(() => Promise.resolve()),
		setRate: vi.fn(() => Promise.resolve()),
		setPitch: vi.fn(() => Promise.resolve()),
		setVolume: vi.fn(() => Promise.resolve()),
		backendName: 'NVDA',
		features: { voice: true, rate: true, pitch: true, volume: true },
		...overrides,
	};
}

async function flush() {
	for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

describe('createSpeech: native', () => {
	let native;

	beforeEach(() => {
		native = fakeNative();
		register('speech', native);
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		resetCapabilities();
		vi.restoreAllMocks();
	});

	test('native is the default mode when the capability exists', () => {
		expect(makeSpeech().getMode()).toBe(MODE_NATIVE);
	});

	test('a saved native mode falls back when the capability is gone', () => {
		makeSpeech().setMode(MODE_NATIVE);
		resetCapabilities();
		expect(speech.getMode()).toBe(MODE_ARIA);
	});

	test('a native defaultMode falls back when the capability is missing', () => {
		resetCapabilities();
		makeSpeech({ defaultMode: MODE_NATIVE });
		expect(speech.getMode()).toBe(MODE_ARIA);
		speech.speak('safe');
		expect(polite().textContent).toBe('safe');
	});

	test('setMode native throws without the capability', () => {
		resetCapabilities();
		expect(() => makeSpeech().setMode(MODE_NATIVE)).toThrow(/native/i);
	});

	test('speak routes to the capability', () => {
		makeSpeech().speak('hello', true);
		expect(native.speak).toHaveBeenCalledWith('hello', true);
		expect(polite()).toBe(null);
	});

	test('a rejected speak warns once and repeats through the live region', async () => {
		native.speak.mockImplementation(() => Promise.reject(new Error('gone')));
		makeSpeech();
		speech.speak('one');
		speech.speak('two', true);
		await flush();
		expect(polite().textContent).toBe('one');
		expect(assertive().textContent).toBe('two');
		expect(console.warn).toHaveBeenCalledTimes(1);
	});

	test('native stop clears text left by a fallback', async () => {
		native.speak.mockImplementation(() => Promise.reject(new Error('gone')));
		makeSpeech();
		speech.speak('left over');
		await flush();
		expect(polite().textContent).toBe('left over');
		speech.stop();
		expect(polite().textContent).toBe('');
	});

	test('stop routes by mode', () => {
		makeSpeech().stop();
		expect(native.stop).toHaveBeenCalledTimes(1);
		speech.setMode(MODE_TTS);
		speech.stop();
		expect(globalThis.speechSynthesis.cancelCalls).toBe(1);
		speech.setMode(MODE_ARIA);
		speech.speak('text');
		speech.stop();
		expect(polite().textContent).toBe('');
	});

	test('features follow the mode', () => {
		native.features = { voice: false, rate: true, pitch: false, volume: false };
		makeSpeech();
		expect(speech.features()).toEqual({ voice: false, rate: true, pitch: false, volume: false });
		speech.setMode(MODE_TTS);
		expect(speech.features()).toEqual({ voice: true, rate: true, pitch: true, volume: true });
		speech.setMode(MODE_ARIA);
		expect(speech.features()).toEqual({ voice: false, rate: false, pitch: false, volume: false });
	});

	test('getBackendName reports the native backend or null', () => {
		expect(makeSpeech().getBackendName()).toBe('NVDA');
		resetCapabilities();
		expect(speech.getBackendName()).toBe(null);
	});

	test('setters push to the capability only when the feature is supported', () => {
		native.features = { voice: true, rate: true, pitch: false, volume: true };
		makeSpeech();
		speech.setRate(0.7);
		speech.setPitch(0.3);
		speech.setVolume(0.9);
		expect(native.setRate).toHaveBeenCalledWith(0.7);
		expect(native.setPitch).not.toHaveBeenCalled();
		expect(native.setVolume).toHaveBeenCalledWith(0.9);
		expect(speech.getPitch()).toBe(0.3);
	});

	test('setters push even in a web mode so a later switch to native is current', () => {
		makeSpeech().setMode(MODE_TTS);
		speech.setRate(0.2);
		expect(native.setRate).toHaveBeenCalledWith(0.2);
	});

	test('a rejected setter on a supported feature warns once', async () => {
		native.setRate.mockImplementation(() => Promise.reject(new Error('no')));
		makeSpeech();
		speech.setRate(0.1);
		speech.setRate(0.2);
		await flush();
		expect(console.warn).toHaveBeenCalledTimes(1);
	});

	test('native voices use their own storage key', async () => {
		makeSpeech();
		speech.setVoice('0');
		expect(localStorage.getItem('game:nativeVoice')).toBe('"0"');
		expect(localStorage.getItem('game:speechVoice')).toBe(null);
		expect(native.setVoice).toHaveBeenCalledWith('0');
	});

	test('getVoices fills in the background and fires onVoicesChanged', async () => {
		makeSpeech();
		const handler = vi.fn();
		speech.onVoicesChanged(handler);
		expect(speech.getVoices()).toEqual([]);
		await flush();
		expect(handler).toHaveBeenCalledTimes(1);
		expect(speech.getVoices()).toEqual([{ id: '0', name: 'Zira', language: 'en-US' }]);
		speech.setVoice('0');
		expect(speech.getVoice()).toEqual({ id: '0', name: 'Zira', language: 'en-US' });
		await flush();
		expect(handler).toHaveBeenCalledTimes(1);
	});

	test('init pushes the stored settings to the backend once', () => {
		makeSpeech();
		speech.setVoice('0');
		speech.setRate(0.6);
		native.setVoice.mockClear();
		native.setRate.mockClear();
		speech.init();
		speech.init();
		expect(native.setVoice).toHaveBeenCalledWith('0');
		expect(native.setRate).toHaveBeenCalledWith(0.6);
		expect(native.setPitch).toHaveBeenCalledWith(0.5);
		expect(native.setVolume).toHaveBeenCalledWith(1);
		expect(native.setRate).toHaveBeenCalledTimes(1);
	});

	test('both mode still means aria plus tts', () => {
		makeSpeech().setMode(MODE_BOTH);
		speech.speak('x');
		expect(native.speak).not.toHaveBeenCalled();
		expect(polite().textContent).toBe('x');
		expect(globalThis.speechSynthesis.spoken).toEqual(['x']);
	});
});
