// @ts-self-types="./index.d.ts"
// Pre-game screens built from the DOM helpers and field builders.

import { isIOS, capability } from '../platform.js';
import { MODE_ARIA, MODE_TTS, MODE_BOTH, MODE_NATIVE } from '../speech/index.js';
import { el, mount } from './dom.js';
import { radioGroup, selectField, rangeField } from './fields.js';

export * from './dom.js';
export * from './fields.js';
export * from './menu.js';
export * from './buffers.js';
export { createRouter } from './router.js';
export { MenuItem } from './menuItem.js';

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
	volumeLabel: 'Speech volume',
	testLabel: 'Test voice',
	testMessage: 'This is a test of the selected voice.',
	backLabel: 'Back',
};

const MODE_LABELS = {
	[MODE_NATIVE]: 'Native',
	[MODE_ARIA]: 'Screen reader',
	[MODE_TTS]: 'Text to speech',
	[MODE_BOTH]: 'Both',
};

const LEVEL = { min: '0', max: '1', step: '0.05' };

function defaultModes() {
	if (isIOS()) return [];
	return capability('speech') ? [MODE_NATIVE, MODE_ARIA, MODE_TTS] : [MODE_ARIA, MODE_TTS];
}

// Builds the speech controls as one section you can drop into a larger settings page.
// Reads and writes through the instance, so the settings persist in whatever storage it was given, no callbacks needed.
// The mode picker is hidden on iOS by default, because VoiceOver typically has to be off during interactive gameplay and text to speech is the only output left.
// Pass `modes` to override, and an empty array to hide the picker anywhere.
// Returns the section element and a dispose function. Call dispose when the page goes away.
export function speechSettingsFields(options = {}) {
	const speech = options.speech;
	if (!speech) throw new Error('speechSettingsFields requires a speech instance');
	const text = { ...SPEECH_SETTINGS_TEXT, ...options };
	const modeLabels = { ...MODE_LABELS, ...options.modeLabels };
	const modes = options.modes ?? defaultModes();
	const node = el('div', { class: 'speech-settings' });
	// selectField reads this array again on every change, so the voice list is
	// rewritten in place rather than replaced.
	const voiceChoices = [];
	let voiceSelect = null;
	let focusId = null;
	let initialFocus = options.autoFocus === true;

	function currentVoice() {
		return speech.getVoice()?.id ?? '';
	}

	function refreshVoiceChoices() {
		voiceChoices.length = 0;
		if (!currentVoice()) voiceChoices.push({ value: '', label: text.defaultVoiceLabel });
		for (const voice of speech.getVoices()) voiceChoices.push({ value: voice.id, label: voice.name });
	}

	// Rebuilding the option elements keeps the select itself, so focus stays put.
	function repopulateVoices() {
		if (!voiceSelect) return;
		refreshVoiceChoices();
		const current = currentVoice();
		voiceSelect.innerHTML = '';
		for (const choice of voiceChoices) {
			voiceSelect.appendChild(el('option', {
				value: choice.value,
				text: choice.label,
				selected: choice.value === current ? 'selected' : undefined,
			}));
		}
	}

	// The mode picker changes which controls are visible, so we need to redraw the section.
	function redraw(id) {
		focusId = id;
		render();
	}

	function render() {
		const mode = speech.getMode();
		const features = speech.features();
		const nodes = [];
		if (modes.length > 0) {
			nodes.push(radioGroup(text.modeLegend, {
				id: 'speech-mode',
				choices: modes.map(m => ({ value: m, label: modeLabels[m] ?? m })),
				get: () => mode,
				set: (value) => { speech.setMode(value); redraw(`speech-mode-${value}`); },
			}));
		}
		if (features.voice) {
			refreshVoiceChoices();
			nodes.push(selectField(text.voiceLabel, {
				id: 'speech-voice',
				choices: voiceChoices,
				get: currentVoice,
				set: (value) => { if (value) speech.setVoice(value); },
			}));
		}
		// No format, because a range input already announces its own value.
		if (features.rate) nodes.push(rangeField(text.rateLabel, { id: 'speech-rate', ...LEVEL, get: () => speech.getRate(), set: (value) => speech.setRate(value) }));
		if (features.pitch) nodes.push(rangeField(text.pitchLabel, { id: 'speech-pitch', ...LEVEL, get: () => speech.getPitch(), set: (value) => speech.setPitch(value) }));
		if (features.volume) nodes.push(rangeField(text.volumeLabel, { id: 'speech-volume', ...LEVEL, get: () => speech.getVolume(), set: (value) => speech.setVolume(value) }));
		nodes.push(el('button', { type: 'button', text: text.testLabel, onClick: () => speech.speak(text.testMessage, true) }));
		mount(node, nodes);
		voiceSelect = features.voice ? node.querySelector('#speech-voice') : null;
		const ids = [
			...modes.map(m => `speech-mode-${m}`),
			...(features.voice ? ['speech-voice'] : []),
			...(features.rate ? ['speech-rate'] : []),
			...(features.pitch ? ['speech-pitch'] : []),
			...(features.volume ? ['speech-volume'] : []),
		];
		const wanted = ids.includes(focusId) ? focusId : (initialFocus ? ids[0] : null);
		initialFocus = false;
		const target = wanted ? node.querySelector(`#${wanted}`) : null;
		if (!target) return;
		// On the first render the section is still detached, so focus() does
		// nothing and the marker is what the caller's mount acts on.
		target.dataset.autofocus = 'true';
		target.focus();
	}

	render();
	const stopVoices = speech.onVoicesChanged(repopulateVoices);
	return {
		node,
		dispose: stopVoices,
	};
}

// Renders the speech controls as a whole screen, with a heading and an optional back button.
// Use speechSettingsFields instead to put the same controls inside a bigger page.
// Returns a cleanup function, so pass it to renderScreen and call dispose.
export function renderSpeechSettings(root, options = {}) {
	const text = { ...SPEECH_SETTINGS_TEXT, ...options };
	const fields = speechSettingsFields({ ...options, autoFocus: true });
	// Back is marked for focus too. mount takes the first marker in document
	// order, so back only wins when the section has no controls of its own.
	mount(root, [
		el('h1', { text: text.title }),
		fields.node,
		options.onBack
			? el('button', { type: 'button', id: 'speech-back', text: text.backLabel, autoFocus: true, onClick: options.onBack })
			: null,
	]);
	return fields.dispose;
}
