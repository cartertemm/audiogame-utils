import { spawn } from 'node:child_process';
import { afterAll, beforeAll, expect, test } from 'vitest';
import WebSocket from 'ws';
import {
	CHANNEL_GAME,
	CHANNEL_PROTOCOL,
	HELLO,
	PROTOCOL_VERSION,
	WELCOME,
	frame,
	readFrame,
} from '../src/net/protocol.js';

const REPOSITORY_ROOT = process.cwd();
const SERVER_URL = 'ws://localhost:8080';
const EVENT_TIMEOUT_MS = 3000;

let serverProcess;

function waitForServer(process) {
	return new Promise((resolve, reject) => {
		let output = '';
		const timeout = setTimeout(() => reject(new Error('Chat server did not start')), EVENT_TIMEOUT_MS);

		process.stdout.on('data', chunk => {
			output += chunk.toString();
			if (!output.includes('Listening on')) return;
			clearTimeout(timeout);
			resolve();
		});
		process.once('exit', code => {
			clearTimeout(timeout);
			reject(new Error(`Chat server exited with code ${code}`));
		});
	});
}

function waitForFrame(socket, channel, predicate = () => true) {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			socket.removeEventListener('message', onMessage);
			reject(new Error('Expected WebSocket message was not received'));
		}, EVENT_TIMEOUT_MS);

		function onMessage(event) {
			const parsed = readFrame(JSON.parse(event.data.toString()));
			if (!parsed || parsed.channel !== channel || !predicate(parsed.payload)) return;
			clearTimeout(timeout);
			socket.removeEventListener('message', onMessage);
			resolve(parsed.payload);
		}

		socket.addEventListener('message', onMessage);
	});
}

function openSocket() {
	return new Promise((resolve, reject) => {
		const socket = new WebSocket(SERVER_URL);
		socket.addEventListener('open', () => resolve(socket), { once: true });
		socket.addEventListener('error', reject, { once: true });
	});
}

async function connectPlayer(session = {}) {
	const socket = await openSocket();
	const welcome = waitForFrame(socket, CHANNEL_PROTOCOL, message => message?.type === WELCOME);
	socket.send(JSON.stringify(frame(CHANNEL_PROTOCOL, {
		type: HELLO,
		version: PROTOCOL_VERSION,
		clientId: session.clientId ?? null,
		sessionToken: session.sessionToken ?? null,
	})));
	return { socket, session: await welcome };
}

function sendGameMessage(socket, message) {
	socket.send(JSON.stringify(frame(CHANNEL_GAME, message)));
}

beforeAll(async () => {
	serverProcess = spawn(process.execPath, ['examples/net-chat-server.js'], {
		cwd: REPOSITORY_ROOT,
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	await waitForServer(serverProcess);
});

afterAll(() => {
	serverProcess?.kill();
});

test('broadcasts chat and player connection events', async () => {
	const { socket: alice } = await connectPlayer();
	sendGameMessage(alice, { type: 'join', name: 'Alice' });

	const { socket: bob, session: bobSession } = await connectPlayer();
	const joined = waitForFrame(alice, CHANNEL_GAME, message => message?.type === 'joined');
	sendGameMessage(bob, { type: 'join', name: 'Bob' });
	await expect(joined).resolves.toEqual({ type: 'joined', name: 'Bob' });

	const aliceChat = waitForFrame(alice, CHANNEL_GAME, message => message?.type === 'chat');
	const bobChat = waitForFrame(bob, CHANNEL_GAME, message => message?.type === 'chat');
	sendGameMessage(bob, { type: 'chat', text: 'Hello' });
	await expect(aliceChat).resolves.toEqual({ type: 'chat', name: 'Bob', text: 'Hello' });
	await expect(bobChat).resolves.toEqual({ type: 'chat', name: 'Bob', text: 'Hello' });

	const disconnected = waitForFrame(alice, CHANNEL_GAME, message => message?.type === 'disconnected');
	bob.close();
	await expect(disconnected).resolves.toEqual({ type: 'disconnected', name: 'Bob' });

	const resumed = waitForFrame(alice, CHANNEL_GAME, message => message?.type === 'resumed');
	const { socket: resumedBob } = await connectPlayer(bobSession);
	await expect(resumed).resolves.toEqual({ type: 'resumed', name: 'Bob' });

	resumedBob.close();
	alice.close();
});
