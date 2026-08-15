// A settings screen that exercises every control the fields module can build.
// Each control writes to storage as soon as it changes, so there is no save
// button, and reopening the page restores what you picked.

import { createStorage } from '../src/storage.js';
import { createSpeech, MODE_ARIA, MODE_TTS, MODE_BOTH } from '../src/speech/index.js';
import { el, mount, renderScreen, renderSpeechSettings } from '../src/ui/index.js';
import { createFields, confirmButton } from '../src/ui/fields.js';

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

// The library never speaks. Speaking every save is this screen's choice, so it
// hangs off the one hook the factory provides.
const f = createFields({
	storage,
	defaults: DEFAULTS,
	onChange: (key, value, label, display, message) => speech.speak(message, true),
});

function section(title, ...contents) {
	return el('section', {}, el('h2', { text: title }), ...contents);
}

function settingsScreen(root) {
	mount(root, [
		el('h1', { text: 'Game settings' }),
		el('p', { text: 'Every change saves immediately and is spoken back to you.' }),

		section('Player profile',
			f.text('name', 'Player name', { maxLength: 24, autoFocus: true }),
			f.text('callsign', 'Callsign', { suggestions: CALLSIGNS }),
			f.textArea('greeting', 'Greeting spoken at launch', { rows: 3 }),
			el('button', {
				type: 'button',
				text: 'Preview greeting',
				onClick: () => speech.speak(storage.get('greeting', DEFAULTS.greeting), true),
			}),
		),

		section('Audio',
			f.percentRange('masterVolume', 'Master volume'),
			f.percentRange('musicVolume', 'Music volume'),
			f.percentRange('speechVolume', 'Speech volume'),
			f.checkbox('footsteps', 'Footstep sounds'),
			f.checkbox('stereoWidening', 'Stereo widening', {
				hint: 'Pushes distant sounds further left and right. Turn it off with mono headphones.',
			}),
		),

		section('Gameplay',
			f.select('difficulty', 'Difficulty', { choices: DIFFICULTIES }),
			f.checkbox('permadeath', 'Permadeath', {
				hint: 'One life per run. Deleting your save is the only way out.',
			}),
			f.checkbox('tutorialHints', 'Tutorial hints'),
		),

		section('Controls',
			f.radioGroup('movement', 'Movement scheme', { choices: MOVEMENT_SCHEMES }),
			f.number('turnStep', 'Turn step', { min: 5, max: 90, step: 5 }),
			f.key('fireKey', 'Fire'),
			f.key('menuKey', 'Menu'),
		),

		section('Announcements',
			f.checkboxGroup('announcements', 'Speak these events', { choices: ANNOUNCEMENTS }),
		),

		section('Speech',
			el('p', { text: 'Output mode, voice, rate, and pitch live on their own screen.' }),
			el('button', { type: 'button', text: 'Open speech settings', onClick: showSpeechSettings }),
		),

		section('Advanced',
			el('details', {},
				el('summary', { text: 'Network and diagnostics' }),
				f.number('latency', 'Latency compensation in milliseconds', { min: 0, max: 250, step: 5 }),
				f.select('region', 'Server region', { choices: REGIONS }),
				f.checkbox('verboseLogging', 'Verbose logging'),
			),
		),

		section('Data',
			confirmButton('Reset everything to defaults', {
				class: 'danger',
				confirmLabel: 'Press again to confirm reset',
				onConfirm: () => {
					for (const key of Object.keys(DEFAULTS)) storage.remove(key);
					speech.speak('Settings reset to defaults.', true);
					show(settingsScreen);
				},
			}),
		),
	]);
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
