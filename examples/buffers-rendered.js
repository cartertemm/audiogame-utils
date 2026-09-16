import {
	createBufferManager,
	createSpeech,
	createStorage,
	renderBufferManager,
} from '../src/index.js';

const speech = createSpeech({ storage: createStorage('buffers-rendered-example') });
const buffers = createBufferManager({ speech });
const all = buffers.createBuffer('All');
const chats = buffers.createBuffer('Chats');
const combat = buffers.createBuffer('Combat');

function recordEvent(category, text, { silent = false } = {}) {
	buffers.addItem(all, text, { silent: true });
	buffers.addItem(category, text, { silent });
}

recordEvent(chats, 'Mira: Meet at the north gate.', { silent: true });
recordEvent(combat, 'A raider hits you for 8 damage.', { silent: true });
recordEvent(chats, 'Tomas: I found a health pack.', { silent: true });
recordEvent(combat, 'You defeat the raider.', { silent: true });

document.getElementById('events').appendChild(renderBufferManager(buffers));

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
