import { isIOS } from '../platform.js';

// Provides ARIA live region and text to speech output through one interface.
// `aria` mode uses the player's screen reader and its configured voice, rate,
// and verbosity. `tts` mode uses `speechSynthesis`.
//
// VoiceOver intercepts gestures that use multiple fingers on iOS. Games that
// require these gestures also require VoiceOver to be off, so the default mode
// on iOS is `tts`.

export const MODE_ARIA = 'aria';
export const MODE_TTS = 'tts';
export const MODE_BOTH = 'both';

const VALID_MODES = new Set([MODE_ARIA, MODE_TTS, MODE_BOTH]);

// Clear the live region after each announcement so repeating the same message
// triggers another content change.
const CLEAR_DELAY_MS = 100;

const DEFAULT_PITCH = 1;
const DEFAULT_RATE = 1;
const MIN_PITCH = 0;
const MAX_PITCH = 2;
const MIN_RATE = 0.1;
const MAX_RATE = 10;

// Inline the visually hidden styles so consumers do not need a stylesheet. The
// element remains available to assistive technology.
const HIDDEN_STYLE = [
	'position:absolute',
	'width:1px',
	'height:1px',
	'padding:0',
	'margin:-1px',
	'overflow:hidden',
	'clip:rect(0 0 0 0)',
	'clip-path:inset(50%)',
	'white-space:nowrap',
	'border:0',
].join(';');

export function createSpeech({ storage, defaultMode = null, idPrefix = 'speech' } = {}) {
	if (!storage) throw new Error('createSpeech requires a storage');

	let politeRegion = null;
	let assertiveRegion = null;
	const clearTimers = new Set();

	function fallbackMode() {
		return defaultMode ?? (isIOS() ? MODE_TTS : MODE_ARIA);
	}

	function createRegion(id, ariaLive, role) {
		const el = document.createElement('div');
		el.id = id;
		el.setAttribute('role', role);
		el.setAttribute('aria-live', ariaLive);
		el.setAttribute('aria-atomic', 'true');
		el.setAttribute('style', HIDDEN_STYLE);
		document.body.appendChild(el);
		return el;
	}

	function getMode() {
		return storage.get('speechMode', fallbackMode());
	}

	function getVoices() {
		return typeof speechSynthesis === 'undefined' ? [] : speechSynthesis.getVoices();
	}

	function getVoice() {
		const voiceURI = storage.get('speechVoice', null);
		if (!voiceURI) return null;
		return getVoices().find(v => v.voiceURI === voiceURI) || null;
	}

	function getPitch() {
		return storage.get('speechPitch', DEFAULT_PITCH);
	}

	function getRate() {
		return storage.get('speechRate', DEFAULT_RATE);
	}

	// Repeated calls are safe. Recreate the regions if a test replaces the
	// document.
	function init() {
		if (politeRegion && document.body.contains(politeRegion)) return;
		politeRegion = createRegion(`${idPrefix}-polite`, 'polite', 'status');
		assertiveRegion = createRegion(`${idPrefix}-assertive`, 'assertive', 'alert');
	}

	return {
		init,

		// iOS Safari requires the first `speechSynthesis.speak()` call to run
		// within a user gesture. Call this method synchronously from a click or
		// tap handler, before any `await`. The utterance has no audible output.
		primeTts() {
			if (typeof speechSynthesis === 'undefined') return;
			const utterance = new SpeechSynthesisUtterance(' ');
			utterance.volume = 0;
			speechSynthesis.speak(utterance);
		},

		// Set `interrupt` to cancel queued TTS and use the assertive live region
		// for immediate messages such as goals and countdowns.
		speak(text, interrupt = false) {
			const mode = getMode();
			const useAria = mode === MODE_ARIA || mode === MODE_BOTH;
			const useTTS = mode === MODE_TTS || mode === MODE_BOTH;

			if (useAria) {
				init();
				const region = interrupt ? assertiveRegion : politeRegion;
				region.textContent = text;
				const timer = setTimeout(() => {
					region.textContent = '';
					clearTimers.delete(timer);
				}, CLEAR_DELAY_MS);
				clearTimers.add(timer);
			}

			if (useTTS) {
				if (interrupt) speechSynthesis.cancel();
				const utterance = new SpeechSynthesisUtterance(text);
				const voice = getVoice();
				if (voice) utterance.voice = voice;
				utterance.pitch = getPitch();
				utterance.rate = getRate();
				speechSynthesis.speak(utterance);
			}
		},

		getMode,

		setMode(mode) {
			if (!VALID_MODES.has(mode)) {
				throw new Error(`Invalid speech mode: ${mode}`);
			}
			storage.set('speechMode', mode);
		},

		getVoices,
		getVoice,

		setVoice(voice) {
			const voiceURI = typeof voice === 'string' ? voice : voice?.voiceURI;
			if (!voiceURI) {
				throw new Error('setVoice requires a SpeechSynthesisVoice or voiceURI string');
			}
			storage.set('speechVoice', voiceURI);
		},

		getPitch,

		setPitch(value) {
			if (typeof value !== 'number' || Number.isNaN(value) || value < MIN_PITCH || value > MAX_PITCH) {
				throw new Error(`Pitch must be a number between ${MIN_PITCH} and ${MAX_PITCH}`);
			}
			storage.set('speechPitch', value);
		},

		getRate,

		setRate(value) {
			if (typeof value !== 'number' || Number.isNaN(value) || value < MIN_RATE || value > MAX_RATE) {
				throw new Error(`Rate must be a number between ${MIN_RATE} and ${MAX_RATE}`);
			}
			storage.set('speechRate', value);
		},

		dispose() {
			for (const timer of clearTimers) clearTimeout(timer);
			clearTimers.clear();
			politeRegion?.remove();
			assertiveRegion?.remove();
			politeRegion = null;
			assertiveRegion = null;
		},
	};
}
