// The browser half of the net demo. Pair it with examples/net-server.js.
//
// The identity is stored, so a reload sends the same session token back and the
// server resumes the session instead of starting a new one.

import { createReconnectingClient, createIdentity } from '../src/net/index.js';
import { createStorage } from '../src/storage.js';

const URL = 'ws://localhost:8080';

const statusNode = document.getElementById('status');
const rosterNode = document.getElementById('roster');
const logNode = document.getElementById('log');
const formNode = document.getElementById('say');
const textNode = document.getElementById('text');

const identity = createIdentity(createStorage('audiogame-utils-net-demo'));

function say(text) {
	statusNode.textContent = text;
}

function renderRoster(players) {
	rosterNode.replaceChildren(...players.map(player => {
		const item = document.createElement('li');
		item.textContent = `${player.name}, ${player.said} messages`;
		return item;
	}));
}

function appendChat(from, text) {
	const item = document.createElement('li');
	item.textContent = `${from}: ${text}`;
	logNode.append(item);
}

const client = createReconnectingClient({
	url: URL,
	protocol: true,
	identity,
	onOpen: () => say('Connected.'),
	onClose: () => say('Disconnected. Reconnecting.'),
	onError: err => say(`Error: ${err?.message ?? 'unknown'}`),
	onMessage: msg => {
		if (msg.type === 'you') {
			say(`You are ${msg.name}, with ${msg.said} messages so far.`);
			return;
		}
		if (msg.type === 'roster') {
			renderRoster(msg.players);
			return;
		}
		if (msg.type === 'chat') {
			appendChat(msg.from, msg.text);
		}
	},
});

formNode.addEventListener('submit', event => {
	event.preventDefault();
	const text = textNode.value.trim();
	if (!text) return;
	client.send({ type: 'chat', text });
	textNode.value = '';
});
