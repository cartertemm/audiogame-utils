import { createMenu, createSpeech, createStorage, createAudio } from '../src/index.js';

const speech = createSpeech({ storage: createStorage('menu-example') });
const audio = createAudio();
const log = document.getElementById('log');
const root = document.getElementById('app');
const DIFFICULTY = { 1: 'easy', 2: 'normal', 3: 'hard' };
const SOUNDS = {
	audio,
	soundsPrefix: './sounds/menu/',
	soundsSuffix: '.ogg',
	clickSound: 'move',
	selectSound: 'select',
	openSound: 'open',
	closeSound: 'close',
	wrapSound: 'move',
	wrap: true,
	focusFirstItem: true,
};
const music = audio.sfx('./sounds/menu/music.ogg');

function write(line) {
	log.textContent = `${line}\n${log.textContent}`;
}

// The music keeps playing across every menu in this demo, so the sliders have
// something to act on. `update` mutates the playing instance, which is what
// makes volume and pan audible the moment the cursor moves them.
const settings = { loop: true, volume: 70, pan: 0 };

function startMusic() {
	music.play({ loop: settings.loop, volume: settings.volume / 100, pan: settings.pan / 100 });
}

function applyMusic() {
	music.update({ volume: settings.volume / 100, pan: settings.pan / 100 });
}

function panText(value) {
	if (value === 0) return 'center';
	return `${Math.abs(value)} ${value < 0 ? 'left' : 'right'}`;
}

const audioMenu = createMenu({
	...SOUNDS,
	root,
	speech,
	label: 'Audio',
	introText: 'Audio menu. The music keeps playing while you change it.',
});

audioMenu.addCheckbox('Loop', settings.loop, {
	hint: 'Restarts the track, because the loop flag is set when playback begins',
	onChange: (on) => {
		settings.loop = on;
		// Cacophony takes the loop flag when a sound starts, so there is nothing
		// to mutate on the playing instance. Restarting is the honest way to make
		// the change audible now rather than after the track ends.
		music.stop();
		startMusic();
	},
});

audioMenu.addSlider('Volume', 0, 100, settings.volume, {
	step: 5,
	format: (value) => `${value} percent`,
	onChange: (value) => {
		settings.volume = value;
		applyMusic();
	},
});

audioMenu.addSlider('Pan', -100, 100, settings.pan, {
	step: 10,
	format: panText,
	onChange: (value) => {
		settings.pan = value;
		applyMusic();
	},
});

const restart = audioMenu.addTextItem('Restart');
const gameOptions = audioMenu.addTextItem('Game options');
const quit = audioMenu.addTextItem('Quit');

// A second menu rather than a nested one. Menus do not nest: a game builds
// another and runs it, which is why this one gets its own Back item.
const gameMenu = createMenu({
	...SOUNDS,
	root,
	speech,
	label: 'Game options',
	introText: 'Game options',
});

gameMenu.addSlider('Difficulty', 1, 3, 2, {
	id: 'difficulty',
	speak: (item) => `Difficulty, ${DIFFICULTY[item.value]}`,
	speakValue: (item) => DIFFICULTY[item.value],
	format: (value) => DIFFICULTY[value],
});
gameMenu.addCheckbox('Invert vertical axis', false, { id: 'invertY' });
gameMenu.addSlider('Speech rate', 50, 300, 100, {
	id: 'speechRate',
	step: 10,
	format: (value) => `${value} percent`,
});
const back = gameMenu.addTextItem('Back');

async function runGameOptions() {
	let chosen;
	while ((chosen = await gameMenu.run()) !== null) {
		if (chosen === back) break;
	}
	gameMenu.close();
	write(`Game options: ${JSON.stringify(gameMenu.values)}`);
}

async function runAudio() {
	let chosen;
	while ((chosen = await audioMenu.run()) !== null) {
		if (chosen === restart) {
			music.stop();
			startMusic();
			write('Restarted the music.');
			continue;
		}
		if (chosen === gameOptions) {
			// Close this menu first, or both would handle the same key events.
			audioMenu.close();
			await runGameOptions();
			continue;
		}
		if (chosen === quit) break;
	}
	audioMenu.close();
}

// iOS Safari only allows the first `speechSynthesis.speak()` inside a gesture,
// and browsers only start audio from one too, so both happen on the click.
document.getElementById('start').addEventListener('click', async () => {
	speech.primeTts();
	startMusic();
	await runAudio();
	music.stop();
	write(`Left the menu. Audio: ${JSON.stringify(settings)}`);
});
