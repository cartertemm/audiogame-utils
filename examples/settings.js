// A settings screen that exercises every control the ui module can build.
// Each control writes to storage as soon as it changes, so there is no save
// button, and reopening the page restores what you picked.

import { createStorage } from '../src/storage.js';
import { createSpeech, MODE_ARIA, MODE_TTS, MODE_BOTH } from '../src/speech/index.js';
import { el, mount, renderScreen, renderSpeechSettings } from '../src/ui.js';

const storage = createStorage('audiogame-utils-examples-settings');
const speech = createSpeech({ storage });
const root = document.getElementById('app');

const DEFAULTS = {
	name: 'Pilot',
	callsign: 'Falcon',
	greeting: 'Systems online. Good hunting.',
	masterVolume: 1,
	musicVolume: 0.6,
	speechVolume: 0.9,
	difficulty: 'normal',
	permadeath: false,
	tutorialHints: true,
	movement: 'strafe',
	turnStep: 15,
	fireKey: ' ',
	menuKey: 'Escape',
	announcements: ['health', 'ammo'],
	footsteps: true,
	stereoWidening: false,
	latency: 0,
	region: 'auto',
	verboseLogging: false,
};

const CALLSIGNS = ['Falcon', 'Viper', 'Nomad', 'Sable', 'Kestrel'];

const DIFFICULTIES = [
	{ value: 'story', label: 'Story' },
	{ value: 'normal', label: 'Normal' },
	{ value: 'veteran', label: 'Veteran' },
	{ value: 'nightmare', label: 'Nightmare' },
];

const MOVEMENT_SCHEMES = [
	{ value: 'strafe', label: 'Strafe with arrows' },
	{ value: 'turn', label: 'Turn with arrows' },
	{ value: 'grid', label: 'Grid steps' },
];

const ANNOUNCEMENTS = [
	{ value: 'health', label: 'Health changes' },
	{ value: 'ammo', label: 'Ammunition' },
	{ value: 'radar', label: 'Radar contacts' },
	{ value: 'objective', label: 'Objective updates' },
];

const REGIONS = [
	{ value: 'auto', label: 'Automatic' },
	{ value: 'us', label: 'North America' },
	{ value: 'eu', label: 'Europe' },
	{ value: 'ap', label: 'Asia Pacific' },
];

const percent = (value) => `${Math.round(Number(value) * 100)} percent`;
const degrees = (value) => `${Number(value)} degrees`;

function get(key) {
	return storage.get(key, DEFAULTS[key]);
}

function save(key, value, announcement) {
	storage.set(key, value);
	if (announcement) speech.speak(announcement, true);
}

// Space and Escape read better than their raw key values.
function keyName(key) {
	if (key === ' ') return 'Space';
	return key;
}

function field(id, label, control, ...extra) {
	return el('div', { class: 'field' },
		el('label', { for: id, text: label }),
		control,
		...extra,
	);
}

function textField(key, label, options = {}) {
	const id = `field-${key}`;
	const listId = options.suggestions ? `${id}-list` : undefined;
	return field(id, label,
		el('input', {
			id, type: 'text', value: get(key),
			maxlength: options.maxLength,
			list: listId,
			autoFocus: options.autoFocus,
			onChange: (event) => save(key, event.target.value, `${label} ${event.target.value}`),
		}),
		listId
			? el('datalist', { id: listId }, ...options.suggestions.map(value => el('option', { value })))
			: null,
	);
}

function textAreaField(key, label) {
	const id = `field-${key}`;
	return field(id, label,
		el('textarea', {
			id, rows: '3',
			text: get(key),
			onChange: (event) => save(key, event.target.value, `${label} saved`),
		}),
	);
}

function numberField(key, label, { min, max, step = 1, format = String }) {
	const id = `field-${key}`;
	return field(id, label,
		el('input', {
			id, type: 'number', min, max, step,
			value: String(get(key)),
			onChange: (event) => save(key, Number(event.target.value), `${label} ${format(event.target.value)}`),
		}),
	);
}

// The readout mirrors the slider for sighted players. Screen readers get
// nothing extra here, since they already announce the value on their own.
function rangeField(key, label, { min, max, step, format }) {
	const id = `field-${key}`;
	const readout = el('span', { 'aria-hidden': 'true', text: format(get(key)) });
	return field(id, label,
		el('input', {
			id, type: 'range', min, max, step,
			value: String(get(key)),
			onInput: (event) => {
				readout.textContent = format(event.target.value);
			},
			onChange: (event) => save(key, Number(event.target.value)),
		}),
		readout,
	);
}

function selectField(key, label, choices) {
	const id = `field-${key}`;
	const current = get(key);
	return field(id, label,
		el('select', {
			id,
			onChange: (event) => {
				const choice = choices.find(c => c.value === event.target.value);
				save(key, event.target.value, `${label} ${choice.label}`);
			},
		}, ...choices.map(choice => el('option', {
			value: choice.value,
			text: choice.label,
			selected: choice.value === current ? 'selected' : undefined,
		}))),
	);
}

function checkboxField(key, label, description = null) {
	const id = `field-${key}`;
	const descriptionId = description ? `${id}-hint` : undefined;
	return el('div', { class: 'field check' },
		el('input', {
			id, type: 'checkbox',
			checked: get(key) ? 'checked' : undefined,
			'aria-describedby': descriptionId,
			onChange: (event) => save(key, event.target.checked, `${label} ${event.target.checked ? 'on' : 'off'}`),
		}),
		el('label', { for: id, text: label }),
		description ? el('p', { id: descriptionId, class: 'hint', text: description }) : null,
	);
}

function radioGroup(key, legend, choices) {
	const current = get(key);
	return el('fieldset', {},
		el('legend', { text: legend }),
		...choices.map(choice => {
			const id = `field-${key}-${choice.value}`;
			return el('div', { class: 'check' },
				el('input', {
					id, type: 'radio', name: `field-${key}`, value: choice.value,
					checked: choice.value === current ? 'checked' : undefined,
					onChange: (event) => {
						if (event.target.checked) save(key, choice.value, `${legend} ${choice.label}`);
					},
				}),
				el('label', { for: id, text: choice.label }),
			);
		}),
	);
}

function checkboxGroup(key, legend, choices) {
	const selected = new Set(get(key));
	return el('fieldset', {},
		el('legend', { text: legend }),
		...choices.map(choice => {
			const id = `field-${key}-${choice.value}`;
			return el('div', { class: 'check' },
				el('input', {
					id, type: 'checkbox', value: choice.value,
					checked: selected.has(choice.value) ? 'checked' : undefined,
					onChange: (event) => {
						if (event.target.checked) selected.add(choice.value);
						else selected.delete(choice.value);
						save(key, [...selected], `${choice.label} ${event.target.checked ? 'on' : 'off'}`);
					},
				}),
				el('label', { for: id, text: choice.label }),
			);
		}),
	);
}

// Rebinding needs keys the page would otherwise act on, so the listener lives on
// the document and the screen removes it when it goes away.
let capture = null;

function keyField(key, label) {
	const id = `field-${key}`;
	const button = el('button', {
		id, type: 'button',
		text: `${label}: ${keyName(get(key))}`,
		onClick: () => {
			capture = { key, label, button };
			button.textContent = `${label}: press a key, or escape to cancel`;
			speech.speak(`Press a key for ${label}, or escape to cancel.`, true);
		},
	});
	return el('div', { class: 'field' }, button);
}

function onKeyDown(event) {
	if (!capture) return;
	event.preventDefault();
	const { key, label, button } = capture;
	capture = null;
	if (event.key === 'Escape') {
		button.textContent = `${label}: ${keyName(get(key))}`;
		speech.speak('Rebinding cancelled.', true);
		return;
	}
	button.textContent = `${label}: ${keyName(event.key)}`;
	save(key, event.key, `${label} bound to ${keyName(event.key)}`);
}

function section(title, ...contents) {
	return el('section', {}, el('h2', { text: title }), ...contents);
}

function settingsScreen(root) {
	const resetButton = el('button', {
		type: 'button', class: 'danger',
		text: 'Reset everything to defaults',
		onClick: () => {
			// Two presses instead of a confirm dialog, which screen readers and
			// game controllers handle badly.
			if (resetButton.dataset.armed !== 'true') {
				resetButton.dataset.armed = 'true';
				resetButton.textContent = 'Press again to confirm reset';
				speech.speak('Press again to confirm reset.', true);
				return;
			}
			for (const key of Object.keys(DEFAULTS)) storage.remove(key);
			speech.speak('Settings reset to defaults.', true);
			show(settingsScreen);
		},
	});

	mount(root, [
		el('h1', { text: 'Game settings' }),
		el('p', { text: 'Every change saves immediately and is spoken back to you.' }),

		section('Player profile',
			textField('name', 'Player name', { maxLength: '24', autoFocus: true }),
			textField('callsign', 'Callsign', { suggestions: CALLSIGNS }),
			textAreaField('greeting', 'Greeting spoken at launch'),
			el('button', {
				type: 'button',
				text: 'Preview greeting',
				onClick: () => speech.speak(get('greeting'), true),
			}),
		),

		section('Audio',
			rangeField('masterVolume', 'Master volume', { min: '0', max: '1', step: '0.05', format: percent }),
			rangeField('musicVolume', 'Music volume', { min: '0', max: '1', step: '0.05', format: percent }),
			rangeField('speechVolume', 'Speech volume', { min: '0', max: '1', step: '0.05', format: percent }),
			checkboxField('footsteps', 'Footstep sounds'),
			checkboxField('stereoWidening', 'Stereo widening', 'Pushes distant sounds further left and right. Turn it off with mono headphones.'),
		),

		section('Gameplay',
			selectField('difficulty', 'Difficulty', DIFFICULTIES),
			checkboxField('permadeath', 'Permadeath', 'One life per run. Deleting your save is the only way out.'),
			checkboxField('tutorialHints', 'Tutorial hints'),
		),

		section('Controls',
			radioGroup('movement', 'Movement scheme', MOVEMENT_SCHEMES),
			numberField('turnStep', 'Turn step', { min: '5', max: '90', step: '5', format: degrees }),
			keyField('fireKey', 'Fire'),
			keyField('menuKey', 'Menu'),
		),

		section('Announcements',
			checkboxGroup('announcements', 'Speak these events', ANNOUNCEMENTS),
		),

		section('Speech',
			el('p', { text: 'Output mode, voice, rate, and pitch live on their own screen.' }),
			el('button', {
				type: 'button',
				text: 'Open speech settings',
				onClick: showSpeechSettings,
			}),
		),

		section('Advanced',
			el('details', {},
				el('summary', { text: 'Network and diagnostics' }),
				numberField('latency', 'Latency compensation in milliseconds', { min: '0', max: '250', step: '5' }),
				selectField('region', 'Server region', REGIONS),
				checkboxField('verboseLogging', 'Verbose logging'),
			),
		),

		section('Data', resetButton),
	]);

	document.addEventListener('keydown', onKeyDown);
	return () => {
		capture = null;
		document.removeEventListener('keydown', onKeyDown);
	};
}

let current = null;

function show(screen, props = {}) {
	current?.dispose();
	current = renderScreen(root, screen, props);
}

function showSpeechSettings() {
	show(renderSpeechSettings, {
		speech,
		modes: [MODE_ARIA, MODE_TTS, MODE_BOTH],
		onBack: () => show(settingsScreen),
	});
}

show(settingsScreen);
