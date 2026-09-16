import {
	createBufferManager,
	createFocusTrap,
	createKeyboard,
	createSpeech,
	createStorage,
} from '../src/index.js';

const speech = createSpeech({ storage: createStorage('buffers-focus-trap-example') });
const buffers = createBufferManager({ speech });
const all = buffers.createBuffer('All');
const chats = buffers.createBuffer('Chats');
const combat = buffers.createBuffer('Combat');
const game = document.getElementById('game');

function recordEvent(category, text, { silent = false } = {}) {
	buffers.addItem(all, text, { silent: true });
	buffers.addItem(category, text, { silent });
}

recordEvent(chats, 'Mira: Meet at the north gate.', { silent: true });
recordEvent(combat, 'A raider hits you for 8 damage.', { silent: true });
recordEvent(chats, 'Tomas: I found a health pack.', { silent: true });
recordEvent(combat, 'You defeat the raider.', { silent: true });

createFocusTrap(game, { label: 'Buffer focus trap example' });

const keyboard = createKeyboard();
keyboard.on('keypress', event => {
	const actions = event.shiftKey
		? {
			BracketLeft: () => buffers.firstBuffer(),
			BracketRight: () => buffers.lastBuffer(),
			Comma: () => buffers.firstBufferItem(),
			Period: () => buffers.lastBufferItem(),
		}
		: {
			BracketLeft: () => buffers.previousBuffer(),
			BracketRight: () => buffers.nextBuffer(),
			Comma: () => buffers.previousBufferItem(),
			Period: () => buffers.nextBufferItem(),
		};

	const action = actions[event.code];
	if (!action) return;
	event.preventDefault();
	action();
});

let chatNumber = 1;
let combatNumber = 1;

document.getElementById('add-chat').addEventListener('click', () => {
	speech.primeTts();
	recordEvent(chats, `Mira: Sample chat message ${chatNumber++}.`);
});

document.getElementById('add-combat').addEventListener('click', () => {
	speech.primeTts();
	recordEvent(combat, `The training target takes ${combatNumber++ * 3} damage.`);
});
