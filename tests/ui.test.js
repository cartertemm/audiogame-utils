import { describe, test, expect, vi } from 'vitest';
import { el, mount, renderScreen, renderInstallPwaIos, renderSpeechSettings, speechSettingsFields } from '../src/ui/index.js';
import { MODE_ARIA, MODE_TTS, MODE_BOTH } from '../src/speech/index.js';

function root() {
	const node = document.createElement('div');
	document.body.appendChild(node);
	return node;
}

describe('ui: el', () => {
	test('sets text, attributes, and children', () => {
		const node = el('p', { id: 'greeting', 'aria-live': 'polite' }, 'hello ', el('b', { text: 'world' }));
		expect(node.tagName).toBe('P');
		expect(node.getAttribute('id')).toBe('greeting');
		expect(node.getAttribute('aria-live')).toBe('polite');
		expect(node.textContent).toBe('hello world');
	});

	test('skips null and undefined attributes and children', () => {
		const node = el('div', { title: null, lang: undefined }, null, undefined);
		expect(node.hasAttribute('title')).toBe(false);
		expect(node.hasAttribute('lang')).toBe(false);
		expect(node.childNodes.length).toBe(0);
	});

	test('binds on* handlers as listeners', () => {
		const onClick = vi.fn();
		const button = el('button', { onClick });
		button.click();
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	test('marks autoFocus with a data attribute rather than an attribute', () => {
		expect(el('button', { autoFocus: true }).dataset.autofocus).toBe('true');
		expect(el('button', { autoFocus: false }).dataset.autofocus).toBeUndefined();
	});
});

describe('ui: mount', () => {
	test('replaces existing content and focuses the autoFocus node', () => {
		const node = root();
		node.appendChild(el('p', { text: 'stale' }));
		const button = el('button', { text: 'Go', autoFocus: true });
		mount(node, [el('h1', { text: 'Title' }), button]);
		expect(node.textContent).toBe('TitleGo');
		expect(document.activeElement).toBe(button);
	});

	test('ignores null entries', () => {
		const node = root();
		mount(node, [el('h1', { text: 'Title' }), null]);
		expect(node.children.length).toBe(1);
	});
});

describe('ui: renderScreen', () => {
	test('runs the screen and empties the root on dispose', () => {
		const node = root();
		const screen = (r, props) => mount(r, [el('h1', { text: props.title })]);
		const rendered = renderScreen(node, screen, { title: 'Menu' });
		expect(node.textContent).toBe('Menu');
		rendered.dispose();
		expect(node.innerHTML).toBe('');
	});

	test('calls a returned cleanup function once, before emptying the root', () => {
		const node = root();
		const cleanup = vi.fn(() => {
			expect(node.children.length).toBe(1);
		});
		const rendered = renderScreen(node, (r) => {
			mount(r, [el('h1', { text: 'Settings' })]);
			return cleanup;
		});
		rendered.dispose();
		rendered.dispose();
		expect(cleanup).toHaveBeenCalledTimes(1);
	});

	test('rejects a screen that is not a function', () => {
		expect(() => renderScreen(root(), 'mainMenu')).toThrow(TypeError);
	});
});

describe('ui: renderInstallPwaIos', () => {
	test('explains the install steps and focuses the continue button', () => {
		const node = root();
		renderInstallPwaIos(node, { onContinue: () => {} });
		expect(node.querySelectorAll('p').length).toBe(2);
		expect(node.textContent).toMatch(/Add to Home Screen/);
		expect(document.activeElement).toBe(node.querySelector('button'));
	});

	test('continues on click and accepts text overrides', () => {
		const node = root();
		const onContinue = vi.fn();
		renderInstallPwaIos(node, { onContinue, title: 'Install', continueLabel: 'Skip' });
		expect(node.querySelector('h1').textContent).toBe('Install');
		node.querySelector('button').click();
		expect(onContinue).toHaveBeenCalledTimes(1);
	});

	test('needs no cleanup and works as a screen passed to renderScreen', () => {
		const node = root();
		expect(renderInstallPwaIos(node)).toBeUndefined();
		const rendered = renderScreen(node, renderInstallPwaIos, { onContinue: () => {} });
		expect(node.querySelector('button')).not.toBe(null);
		rendered.dispose();
		expect(node.innerHTML).toBe('');
	});
});

function fakeSpeech(overrides = {}) {
	const state = { mode: MODE_TTS, voice: null, rate: 1, pitch: 1, ...overrides };
	const voices = state.voices ?? [
		{ voiceURI: 'uri-a', name: 'Alex' },
		{ voiceURI: 'uri-b', name: 'Bruce' },
	];
	return {
		state,
		speak: vi.fn(),
		getMode: () => state.mode,
		setMode: vi.fn((mode) => { state.mode = mode; }),
		getVoices: () => voices,
		getVoice: () => voices.find(v => v.voiceURI === state.voice) ?? null,
		setVoice: vi.fn((uri) => { state.voice = uri; }),
		getRate: () => state.rate,
		setRate: vi.fn((value) => { state.rate = value; }),
		getPitch: () => state.pitch,
		setPitch: vi.fn((value) => { state.pitch = value; }),
	};
}

describe('ui: renderSpeechSettings', () => {
	test('requires a speech instance', () => {
		expect(() => renderSpeechSettings(root(), {})).toThrow(/speech/);
	});

	test('renders the voice controls and the current values', () => {
		const node = root();
		const speech = fakeSpeech({ voice: 'uri-b', rate: 1.5, pitch: 0.8 });
		renderSpeechSettings(node, { speech });
		expect(node.querySelector('#speech-rate').value).toBe('1.5');
		expect(node.querySelector('#speech-pitch').value).toBe('0.8');
		const options = [...node.querySelectorAll('#speech-voice option')];
		expect(options.map(o => o.textContent)).toEqual(['Alex', 'Bruce']);
		expect(options[1].selected).toBe(true);
	});

	test('offers a default voice entry when none is chosen', () => {
		const node = root();
		renderSpeechSettings(node, { speech: fakeSpeech() });
		expect(node.querySelector('#speech-voice option').textContent).toBe('(default voice)');
	});

	test('writes changes back to the speech instance', () => {
		const node = root();
		const speech = fakeSpeech();
		renderSpeechSettings(node, { speech });

		const select = node.querySelector('#speech-voice');
		select.value = 'uri-a';
		select.dispatchEvent(new Event('change'));
		expect(speech.setVoice).toHaveBeenCalledWith('uri-a');

		const rate = node.querySelector('#speech-rate');
		rate.value = '1.7';
		rate.dispatchEvent(new Event('change'));
		expect(speech.setRate).toHaveBeenCalledWith(1.7);

		node.querySelector('button').click();
		expect(speech.speak).toHaveBeenCalledWith('This is a test of the selected voice.', true);
	});

	test('hides the voice controls in aria mode and shows them again in tts', () => {
		const node = root();
		const speech = fakeSpeech({ mode: MODE_ARIA });
		renderSpeechSettings(node, { speech });
		expect(node.querySelector('#speech-voice')).toBe(null);

		const tts = node.querySelector('#speech-mode-tts');
		tts.checked = true;
		tts.dispatchEvent(new Event('change'));
		expect(speech.setMode).toHaveBeenCalledWith(MODE_TTS);
		expect(node.querySelector('#speech-voice')).not.toBe(null);
		expect(document.activeElement.id).toBe('speech-mode-tts');
	});

	test('takes a custom mode list', () => {
		const node = root();
		renderSpeechSettings(node, { speech: fakeSpeech(), modes: [MODE_ARIA, MODE_TTS, MODE_BOTH] });
		expect(node.querySelectorAll('input[name=speech-mode]').length).toBe(3);
	});

	test('hides the mode picker when modes is empty and focuses the voice select', () => {
		const node = root();
		renderSpeechSettings(node, { speech: fakeSpeech(), modes: [] });
		expect(node.querySelector('fieldset')).toBe(null);
		expect(document.activeElement.id).toBe('speech-voice');
	});

	test('shows a back button only when onBack is given', () => {
		const node = root();
		const onBack = vi.fn();
		renderSpeechSettings(node, { speech: fakeSpeech() });
		expect(node.querySelector('#speech-back')).toBe(null);
		renderSpeechSettings(node, { speech: fakeSpeech(), onBack });
		node.querySelector('#speech-back').click();
		expect(onBack).toHaveBeenCalledTimes(1);
	});

	test('repopulates the voice list on voiceschanged without moving focus', () => {
		const node = root();
		const voices = [{ voiceURI: 'uri-a', name: 'Alex' }];
		const speech = fakeSpeech({ voices });
		const rendered = renderScreen(node, renderSpeechSettings, { speech });
		const select = node.querySelector('#speech-voice');
		select.focus();
		voices.push({ voiceURI: 'uri-c', name: 'Cara' });
		speechSynthesis.dispatchEvent(new Event('voiceschanged'));
		expect(node.querySelectorAll('#speech-voice option').length).toBe(3);
		expect(document.activeElement).toBe(select);

		rendered.dispose();
		speechSynthesis.dispatchEvent(new Event('voiceschanged'));
		expect(node.innerHTML).toBe('');
	});
});

describe('ui: speechSettingsFields', () => {
	test('requires a speech instance', () => {
		expect(() => speechSettingsFields({})).toThrow(/speech/);
	});

	test('leaves focus alone when autoFocus is not set', () => {
		const node = root();
		const fields = speechSettingsFields({ speech: fakeSpeech() });
		const name = el('input', { id: 'player-name', type: 'text', autoFocus: true });
		mount(node, [name, fields.node]);
		expect(document.activeElement).toBe(name);
	});

	test('focuses its first control when autoFocus is set', () => {
		const node = root();
		const fields = speechSettingsFields({ speech: fakeSpeech(), autoFocus: true });
		mount(node, [fields.node]);
		expect(document.activeElement.id).toBe('speech-mode-aria');
	});

	test('redraws only its own section on a mode change', () => {
		const node = root();
		const speech = fakeSpeech({ mode: MODE_ARIA });
		const fields = speechSettingsFields({ speech });
		const after = el('p', { id: 'after', text: 'still here' });
		mount(node, [fields.node, after]);
		expect(node.querySelector('#speech-voice')).toBe(null);

		const tts = node.querySelector('#speech-mode-tts');
		tts.checked = true;
		tts.dispatchEvent(new Event('change'));
		expect(node.querySelector('#speech-voice')).not.toBe(null);
		expect(node.querySelector('#after')).toBe(after);
		expect(document.activeElement.id).toBe('speech-mode-tts');
	});

	test('stops listening for voice changes after dispose', () => {
		const voices = [{ voiceURI: 'uri-a', name: 'Alex' }];
		const fields = speechSettingsFields({ speech: fakeSpeech({ voices }) });
		mount(root(), [fields.node]);
		expect(fields.node.querySelectorAll('#speech-voice option').length).toBe(2);

		voices.push({ voiceURI: 'uri-c', name: 'Cara' });
		fields.dispose();
		speechSynthesis.dispatchEvent(new Event('voiceschanged'));
		expect(fields.node.querySelectorAll('#speech-voice option').length).toBe(2);
	});
});
