import { createIdentity, createReconnectingClient } from '../src/net/index.js';
import { createSpeech } from '../src/speech/index.js';
import { createStorage } from '../src/storage.js';
import { el, mount, renderScreen, textField } from '../src/ui/index.js';

const CHAT_URL = 'ws://localhost:8080';

const speechStorage = createStorage('audiogame-utils-net-chat');
const identityStorage = createStorage('audiogame-utils-net-chat-session', {
	backend: sessionStorage,
});
const identity = createIdentity(identityStorage);
const speech = createSpeech({ storage: speechStorage });

const root = document.getElementById('app');
const status = el('strong', { text: 'Not connected' });
const events = el('ul', { class: 'events' });

let name = identity.get().name ?? '';
let draft = '';
let client = null;
let chat = null;

function addEvent(text) {
	events.appendChild(el('li', { text }));
	speech.speak(text);
}

function setConnectionStatus(text) {
	status.textContent = text;
	addEvent(text);
}

function setChatEnabled(enabled) {
	if (!chat) return;
	chat.input.disabled = !enabled;
	chat.send.disabled = !enabled;
}

function describeServerEvent(message) {
	if (message?.type === 'chat') return `${message.name}: ${message.text}`;
	if (message?.type === 'joined') return `${message.name} joined`;
	if (message?.type === 'disconnected') return `${message.name} disconnected`;
	if (message?.type === 'resumed') return `${message.name} reconnected`;
	if (message?.type === 'left') return `${message.name} left`;
	return null;
}

function connect(playerName) {
	let connectedOnce = false;
	client = createReconnectingClient({
		url: CHAT_URL,
		protocol: true,
		identity,
		onOpen: socket => {
			setChatEnabled(true);
			setConnectionStatus('Connected');
			socket.send({ type: 'join', name: playerName });
			if (!connectedOnce) {
				connectedOnce = true;
				chat.input.focus();
				speech.speak("Connected!");
			}
		},
		onMessage: message => {
			const description = describeServerEvent(message);
			if (description) addEvent(description);
		},
		onClose: () => {
			setChatEnabled(false);
			setConnectionStatus('Connection lost. Reconnecting.');
		},
		onError: error => {
			console.error('Network error', error);
		},
	});
}

function joinScreen(root) {
	const field = textField('Name', {
		id: 'name',
		get: () => name,
		set: value => { name = value; },
		maxLength: 40,
		autoFocus: true,
	});
	const input = field.querySelector('input');
	input.setAttribute('autocomplete', 'nickname');
	mount(root, [
		el('h1', { text: 'Network chat' }),
		el('p', { text: 'Open this page in two tabs to try a small reconnecting chat. Messages and connection events appear below and are announced with your saved speech settings. Note: Network communication will only work if you ran the server separately.' }),
		el('form', {
			class: 'row',
			onSubmit: event => {
				event.preventDefault();
				speech.primeTts();
				// Read the control instead of the committed value, because a
				// submit does not have to be preceded by a change event.
				name = input.value.trim();
				if (!name) return;
				identity.set({ name });
				show(chatScreen);
			},
		}, field, el('button', { type: 'submit', text: 'Join chat' })),
	]);
}

function chatScreen(root) {
	const field = textField('Message', {
		id: 'message',
		get: () => draft,
		set: value => { draft = value; },
		maxLength: 512,
		disabled: true,
	});
	const input = field.querySelector('input');
	input.setAttribute('autocomplete', 'off');
	const send = el('button', { type: 'submit', text: 'Send', disabled: 'disabled' });
	chat = { input, send };
	mount(root, [
		el('h1', { text: 'Network chat' }),
		el('p', {}, 'Connection: ', status),
		events,
		el('form', {
			class: 'row',
			onSubmit: event => {
				event.preventDefault();
				const text = input.value.trim();
				if (!text) return;
				client.send({ type: 'chat', text });
				draft = '';
				input.value = '';
				input.focus();
			},
		}, field, send),
	]);
	connect(name);
	return () => { chat = null; };
}

let current = null;

function show(screen) {
	current?.dispose();
	current = renderScreen(root, screen);
}

show(joinScreen);
