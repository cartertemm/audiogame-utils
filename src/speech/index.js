// @ts-self-types="./index.d.ts"
import { isIOS, capability } from '../platform.js';
import { range_convert } from '../math.js';

// Provides ARIA live region, text to speech, and native screen reader output
// through one interface. `aria` mode uses the player's screen reader and its
// configured voice, rate, and verbosity. `tts` mode uses `speechSynthesis`.
// `native` mode uses the prism plugin registered by the Tauri runtime.
//
// VoiceOver intercepts gestures that use multiple fingers on iOS. Games that
// require these gestures also require VoiceOver to be off, so the default mode
// on iOS is `tts`.

export const MODE_ARIA = 'aria';
export const MODE_TTS = 'tts';
export const MODE_BOTH = 'both';
export const MODE_NATIVE = 'native';

const VALID_MODES = new Set([MODE_ARIA, MODE_TTS, MODE_BOTH, MODE_NATIVE]);

// Clear the live region after each announcement so repeating the same message
// triggers another content change. We wait two animation frames to give browsers time to propogate the event.
// Frames stop in a hidden tab, hence the fallback time.
const CLEAR_FRAMES = 2;
const CLEAR_FALLBACK_MS = 250;

const DEFAULT_LEVEL = 0.5;
const DEFAULT_VOLUME = 1;
const TTS_RATE = { min: 0.5, max: 2 };
const TTS_PITCH = { min: 0, max: 2 };
const NO_FEATURES = Object.freeze({ voice: false, rate: false, pitch: false, volume: false });
const ALL_FEATURES = Object.freeze({ voice: true, rate: true, pitch: true, volume: true });

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

function ttsRate(value) {
	if (value <= DEFAULT_LEVEL) return range_convert(value, 0, DEFAULT_LEVEL, TTS_RATE.min, 1);
	return range_convert(value, DEFAULT_LEVEL, 1, 1, TTS_RATE.max);
}

function ttsPitch(value) {
	return range_convert(value, 0, 1, TTS_PITCH.min, TTS_PITCH.max);
}

function checkLevel(name, value) {
	if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 1) {
		throw new Error(`${name} must be a number between 0 and 1`);
	}
}

function native() {
	return capability('speech');
}

export function createSpeech({ storage, defaultMode = null, idPrefix = 'speech' } = {}) {
	if (!storage) throw new Error('createSpeech requires a storage');

	let politeRegion = null;
	let assertiveRegion = null;
	let nativeVoices = [];
	let voicesPending = false;
	let nativeSynced = false;
	const pendingClears = new Map();
	const voiceHandlers = new Set();
	const warned = new Set();

	function warnOnce(key, err) {
		if (warned.has(key)) return;
		warned.add(key);
		console.warn(`audiogame-utils: native speech ${key} failed: ${err?.message ?? err}`);
	}

	function cancelClear(region) {
		const pending = pendingClears.get(region);
		if (!pending) return;
		if (pending.frame !== null) cancelAnimationFrame(pending.frame);
		clearTimeout(pending.timer);
		pendingClears.delete(region);
	}

	function scheduleClear(region) {
		const pending = { frame: null, timer: null };
		pendingClears.set(region, pending);

		function clear() {
			cancelClear(region);
			region.textContent = '';
		}

		pending.timer = setTimeout(clear, CLEAR_FALLBACK_MS);
		if (typeof requestAnimationFrame !== 'function') return;

		let framesLeft = CLEAR_FRAMES;
		function step() {
			framesLeft -= 1;
			pending.frame = framesLeft > 0 ? requestAnimationFrame(step) : null;
			if (framesLeft === 0) clear();
		}
		pending.frame = requestAnimationFrame(step);
	}

	function fallbackMode() {
		if (defaultMode && (defaultMode !== MODE_NATIVE || native())) return defaultMode;
		if (native()) return MODE_NATIVE;
		return isIOS() ? MODE_TTS : MODE_ARIA;
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
		const mode = storage.get('speechMode', fallbackMode());
		if (mode === MODE_NATIVE && !native()) return fallbackMode();
		return mode;
	}

	function synth() {
		return typeof speechSynthesis === 'undefined' ? null : speechSynthesis;
	}

	function toVoice(v) {
		return { id: v.voiceURI, name: v.name, language: v.lang ?? null };
	}

	function emitVoicesChanged() {
		for (const handler of voiceHandlers) handler();
	}

	function refreshNativeVoices(impl) {
		if (voicesPending) return;
		voicesPending = true;
		let request;
		try {
			request = impl.voices();
		} catch (err) {
			voicesPending = false;
			warnOnce('voices', err);
			return;
		}
		request.then(list => {
			voicesPending = false;
			if (JSON.stringify(list) === JSON.stringify(nativeVoices)) return;
			nativeVoices = list;
			emitVoicesChanged();
		}, err => {
			voicesPending = false;
			warnOnce('voices', err);
		});
	}

	function getVoices() {
		if (getMode() === MODE_NATIVE) {
			refreshNativeVoices(native());
			return nativeVoices;
		}
		return (synth()?.getVoices() ?? []).map(toVoice);
	}

	function voiceKey() {
		return getMode() === MODE_NATIVE ? 'nativeVoice' : 'speechVoice';
	}

	function getVoice() {
		const id = storage.get(voiceKey(), null);
		if (!id) return null;
		return getVoices().find(v => v.id === id) || null;
	}

	function synthVoice() {
		const id = storage.get('speechVoice', null);
		return id ? synth()?.getVoices().find(v => v.voiceURI === id) || null : null;
	}

	function getPitch() {
		return storage.get('speechPitch', DEFAULT_LEVEL);
	}

	function getRate() {
		return storage.get('speechRate', DEFAULT_LEVEL);
	}

	function getVolume() {
		return storage.get('speechVolume', DEFAULT_VOLUME);
	}

	function push(feature, call) {
		const impl = native();
		if (!impl || !impl.features[feature]) return;
		call(impl).catch(err => warnOnce(feature, err));
	}

	function pushAll() {
		const voice = storage.get('nativeVoice', null);
		if (voice) push('voice', impl => impl.setVoice(voice));
		push('rate', impl => impl.setRate(getRate()));
		push('pitch', impl => impl.setPitch(getPitch()));
		push('volume', impl => impl.setVolume(getVolume()));
	}

	function speakAria(text, interrupt) {
		init();
		const region = interrupt ? assertiveRegion : politeRegion;
		cancelClear(region);
		region.textContent = text;
		scheduleClear(region);
	}

	function speakTts(text, interrupt) {
		const engine = synth();
		if (!engine) return;
		if (interrupt) engine.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		const voice = synthVoice();
		if (voice) utterance.voice = voice;
		utterance.pitch = ttsPitch(getPitch());
		utterance.rate = ttsRate(getRate());
		utterance.volume = getVolume();
		engine.speak(utterance);
	}

	function clearRegions() {
		for (const region of [politeRegion, assertiveRegion]) {
			if (!region) continue;
			cancelClear(region);
			region.textContent = '';
		}
	}

	// Repeated calls are safe. Recreate the regions if a test replaces the
	// document.
	function init() {
		if (!nativeSynced && native()) {
			nativeSynced = true;
			pushAll();
		}
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
			if (mode === MODE_NATIVE) {
				native().speak(text, interrupt).catch(err => {
					warnOnce('speak', err);
					speakAria(text, interrupt);
				});
				return;
			}
			if (mode === MODE_ARIA || mode === MODE_BOTH) speakAria(text, interrupt);
			if (mode === MODE_TTS || mode === MODE_BOTH) speakTts(text, interrupt);
		},

		stop() {
			const mode = getMode();
			if (mode === MODE_NATIVE) {
				clearRegions();
				native().stop().catch(err => warnOnce('stop', err));
				return;
			}
			if (mode === MODE_ARIA || mode === MODE_BOTH) clearRegions();
			if (mode === MODE_TTS || mode === MODE_BOTH) synth()?.cancel();
		},

		getMode,

		setMode(mode) {
			if (!VALID_MODES.has(mode)) {
				throw new Error(`Invalid speech mode: ${mode}`);
			}
			if (mode === MODE_NATIVE && !native()) {
				throw new Error('Native speech is not available');
			}
			storage.set('speechMode', mode);
		},

		features() {
			const mode = getMode();
			if (mode === MODE_NATIVE) return { ...native().features };
			if (mode === MODE_ARIA) return { ...NO_FEATURES };
			return { ...ALL_FEATURES };
		},

		getBackendName() {
			return native()?.backendName ?? null;
		},

		getVoices,
		getVoice,

		setVoice(voice) {
			const id = typeof voice === 'string' ? voice : voice?.id;
			if (!id) {
				throw new Error('setVoice requires a voice object or id string');
			}
			storage.set(voiceKey(), id);
			if (getMode() === MODE_NATIVE) push('voice', impl => impl.setVoice(id));
		},

		onVoicesChanged(handler) {
			if (voiceHandlers.size === 0) synth()?.addEventListener('voiceschanged', emitVoicesChanged);
			voiceHandlers.add(handler);
			return () => {
				voiceHandlers.delete(handler);
				if (voiceHandlers.size === 0) synth()?.removeEventListener('voiceschanged', emitVoicesChanged);
			};
		},

		getPitch,

		setPitch(value) {
			checkLevel('Pitch', value);
			storage.set('speechPitch', value);
			push('pitch', impl => impl.setPitch(value));
		},

		getRate,

		setRate(value) {
			checkLevel('Rate', value);
			storage.set('speechRate', value);
			push('rate', impl => impl.setRate(value));
		},

		getVolume,

		setVolume(value) {
			checkLevel('Volume', value);
			storage.set('speechVolume', value);
			push('volume', impl => impl.setVolume(value));
		},

		dispose() {
			for (const region of [...pendingClears.keys()]) cancelClear(region);
			voiceHandlers.clear();
			synth()?.removeEventListener('voiceschanged', emitVoicesChanged);
			politeRegion?.remove();
			assertiveRegion?.remove();
			politeRegion = null;
			assertiveRegion = null;
		},
	};
}
