import { createMenu, createSpeech, createStorage, createAudio } from '../src/index.js';

const speech = createSpeech({ storage: createStorage('menu-example') });
const audio = createAudio();
const log = document.getElementById('log');

// Declared before the menu, because `rangeField` calls `format` while building
// the readout, which happens inside `addSlider`.
const DIFFICULTY = { 1: 'easy', 2: 'normal', 3: 'hard' };

function write(line) {
	log.textContent = `${line}\n${log.textContent}`;
}

const menu = createMenu({
	root: document.getElementById('app'),
	speech,
	audio,
	label: 'Main menu',
	introText: 'Main menu',
	clickSound: 'beep',
	selectSound: 'beep',
	edgeSound: 'beep',
	// A bare relative path resolves against the document directory, so this
	// must not repeat 'examples/'.
	soundsPrefix: './sounds/',
	soundsSuffix: '.wav',
	focusFirstItem: true,
	wrap: true,
	wrapSound: 'beep',
});

const play = menu.addTextItem('Play');
const volume = menu.addSlider('Volume', 0, 100, 70, {
	id: 'volume',
	step: 5,
	format: (value) => `${value} percent`,
});
const music = menu.addCheckbox('Music', true, { id: 'music' });
const difficulty = menu.addSlider('Difficulty', 1, 3, 2, {
	id: 'difficulty',
	speak: (item) => `Difficulty, ${DIFFICULTY[item.value]}`,
	speakValue: (item) => DIFFICULTY[item.value],
	format: (value) => DIFFICULTY[value],
});
const quit = menu.addTextItem('Quit');

// iOS Safari only allows the first `speechSynthesis.speak()` inside a gesture,
// so the menu opens from a real button rather than on load.
document.getElementById('start').addEventListener('click', async () => {
	speech.primeTts();
	let chosen;
	while ((chosen = await menu.run()) !== null) {
		if (chosen === play) {
			write(`Play at ${volume.value} percent, music ${music.value}, ${DIFFICULTY[difficulty.value]}`);
			continue;
		}
		if (chosen === quit) break;
	}
	menu.close();
	write(`Left the menu. Values: ${JSON.stringify(menu.values)}`);
});
