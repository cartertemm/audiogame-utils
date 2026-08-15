// Minimal helpers for building accessible pre-game screens.

import { isIOS } from './platform.js';
import { MODE_ARIA, MODE_TTS, MODE_BOTH } from './speech/index.js';

export function el(tag, attrs = {}, ...children) {
	const node = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) {
		if (k === 'text') node.textContent = v;
		// Assuming we would never want to set focus on a standard text element, which is weird practice
		else if (k === 'autoFocus') { if (v) node.dataset.autofocus = 'true'; }
		else if (k.startsWith('on') && typeof v === 'function') {
			node.addEventListener(k.slice(2).toLowerCase(), v);
		} else if (v !== undefined && v !== null) {
			node.setAttribute(k, v);
		}
	}
	for (const c of children) {
		if (c == null) continue;
		node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
	}
	return node;
}

export function mount(root, nodes) {
	root.innerHTML = '';
	for (const n of nodes) {
		if (n == null) continue;
		root.appendChild(n);
	}
	const autofocus = root.querySelector('[data-autofocus="true"]');
	autofocus?.focus();
}

// Renders `screen`, a function taking (root, props). If it returns a function,
// that function runs on dispose, before the root is emptied.
export function renderScreen(root, screen, props = {}) {
	if (typeof screen !== 'function') throw new TypeError('screen must be a function');
	const cleanup = screen(root, props);
	let disposed = false;
	return {
		dispose() {
			if (disposed) return;
			disposed = true;
			if (typeof cleanup === 'function') cleanup();
			root.innerHTML = '';
		},
	};
}

const INSTALL_PWA_IOS_TEXT = {
	title: 'Install for the best experience',
	message: 'You appear to be visiting this site in a browser. Adding it to your home screen gives you a better experience. Installing as an app prevents address bar clutter, gesture handling that conflicts with VoiceOver, and audio that the system can suspend while the tab is in the background.',
	instructions: 'To install: tap the More button, then the Share button in the Safari toolbar. Choose View More, then Add to Home Screen. Launch the site from your home screen to run it full screen, like a native app.',
	continueLabel: 'Continue anyway',
};

// Asks an iOS player to install the site as a home screen app if running under Safari.
// You can use this function on its own, or as a screen:
// renderScreen(root, renderInstallPwaIos, options).
export function renderInstallPwaIos(root, options = {}) {
	const text = { ...INSTALL_PWA_IOS_TEXT, ...options };
	mount(root, [
		el('h1', { text: text.title }),
		el('p', { text: text.message }),
		el('p', { text: text.instructions }),
		el('button', { type: 'button', text: text.continueLabel, onClick: () => options.onContinue?.(), autoFocus: true }),
	]);
}

const SPEECH_SETTINGS_TEXT = {
	title: 'Speech settings',
	modeLegend: 'Speech output',
	voiceLabel: 'Voice',
	defaultVoiceLabel: '(default voice)',
	rateLabel: 'Speech rate',
	pitchLabel: 'Speech pitch',
	testLabel: 'Test voice',
	testMessage: 'This is a test of the selected voice.',
	backLabel: 'Back',
};

const MODE_LABELS = {
	[MODE_ARIA]: 'Screen reader',
	[MODE_TTS]: 'Text to speech',
	[MODE_BOTH]: 'Both',
};

const RATE = { min: '0.5', max: '2', step: '0.1' };
const PITCH = { min: '0.1', max: '2', step: '0.1' };

function usesTts(mode) {
	return mode === MODE_TTS || mode === MODE_BOTH;
}

// Creates voice, rate, pitch controls, and an output mode setting.
// Reads and writes through the instance, so the settings persist in whatever storage it was given, no callbacks needed.
// The mode picker is hidden on iOS by default, because VoiceOver typically has to be off during interactive gameplay and text to speech is the only output left.
// Pass `modes` to override, and an empty array to hide the picker anywhere.
// Returns a cleanup function, so pass it to renderScreen and call dispose.
export function renderSpeechSettings(root, options = {}) {
	const speech = options.speech;
	if (!speech) throw new Error('renderSpeechSettings requires a speech instance');
	const text = { ...SPEECH_SETTINGS_TEXT, ...options };
	const modeLabels = { ...MODE_LABELS, ...options.modeLabels };
	const modes = options.modes ?? (isIOS() ? [] : [MODE_ARIA, MODE_TTS]);
	let focusId = null;
	let voiceSelect = null;

	function populateVoices() {
		const current = speech.getVoice()?.voiceURI ?? null;
		voiceSelect.innerHTML = '';
		if (!current) {
			voiceSelect.appendChild(el('option', { value: '', text: text.defaultVoiceLabel, selected: 'selected' }));
		}
		for (const voice of speech.getVoices()) {
			voiceSelect.appendChild(el('option', {
				value: voice.voiceURI,
				text: voice.name,
				selected: voice.voiceURI === current ? 'selected' : undefined,
			}));
		}
	}

	// The mode picker changes which controls are visible, so we need to redraw the screen.
	function redraw(id) {
		focusId = id;
		render();
	}

	function render() {
		const mode = speech.getMode();
		const showVoice = usesTts(mode);
		const ids = [
			...modes.map(m => `speech-mode-${m}`),
			...(showVoice ? ['speech-voice', 'speech-rate', 'speech-pitch'] : []),
			options.onBack ? 'speech-back' : null,
		].filter(Boolean);
		const focus = ids.includes(focusId) ? focusId : ids[0];
		const auto = (id) => (id === focus ? true : undefined);
		let modeBlock = null;
		if (modes.length > 0) {
			modeBlock = el('fieldset', {},
				el('legend', { text: text.modeLegend }),
				...modes.map(m => el('label', { for: `speech-mode-${m}` },
					el('input', {
						type: 'radio', name: 'speech-mode', value: m, id: `speech-mode-${m}`,
						checked: mode === m ? 'checked' : undefined,
						autoFocus: auto(`speech-mode-${m}`),
						onChange: (event) => {
							if (!event.target.checked) return;
							speech.setMode(m);
							redraw(`speech-mode-${m}`);
						},
					}),
					` ${modeLabels[m] ?? m}`,
				)),
			);
		}
		let voiceBlock = null;
		if (showVoice) {
			voiceSelect = el('select', {
				id: 'speech-voice',
				autoFocus: auto('speech-voice'),
				onChange: (event) => {
					if (event.target.value) speech.setVoice(event.target.value);
				},
			});
			populateVoices();
			voiceBlock = el('div', {},
				el('label', { for: 'speech-voice', text: text.voiceLabel }),
				voiceSelect,
				el('label', { for: 'speech-rate', text: text.rateLabel }),
				slider('speech-rate', speech.getRate(), RATE, auto('speech-rate'), v => speech.setRate(v)),
				el('label', { for: 'speech-pitch', text: text.pitchLabel }),
				slider('speech-pitch', speech.getPitch(), PITCH, auto('speech-pitch'), v => speech.setPitch(v)),
				el('button', { type: 'button', text: text.testLabel, onClick: () => speech.speak(text.testMessage, true) }),
			);
		}
		mount(root, [
			el('h1', { text: text.title }),
			modeBlock,
			voiceBlock,
			options.onBack
				? el('button', { type: 'button', id: 'speech-back', text: text.backLabel, autoFocus: auto('speech-back'), onClick: options.onBack })
				: null,
		]);
	}
	render();
	// Voices load asynchronously in most browsers, and the list can change again later.
	const synth = typeof speechSynthesis === 'undefined' ? null : speechSynthesis;
	const onVoicesChanged = () => { if (voiceSelect) populateVoices(); };
	synth?.addEventListener('voiceschanged', onVoicesChanged);
	return () => synth?.removeEventListener('voiceschanged', onVoicesChanged);
}

function slider(id, value, range, autoFocus, onCommit) {
	return el('input', {
		id, type: 'range',
		min: range.min, max: range.max, step: range.step,
		value: String(value),
		autoFocus,
		onChange: (event) => onCommit(parseFloat(event.target.value)),
	});
}
