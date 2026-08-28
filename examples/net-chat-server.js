import { WebSocketServer } from 'ws';
import { createServer } from '../src/net/server.js';

const PORT = 8080;
const LOBBY = 'lobby';
const MAX_NAME_LENGTH = 40;
const MAX_MESSAGE_LENGTH = 512;

const game = createServer();
const sockets = new WebSocketServer({ port: PORT });

function validText(value, maximumLength) {
	if (typeof value !== 'string') return null;
	const text = value.trim();
	return text && text.length <= maximumLength ? text : null;
}

game.on('connection', client => {
	client.data.name = null;
});

game.on('message', (client, message) => {
	if (message?.type === 'join') {
		const name = validText(message.name, MAX_NAME_LENGTH);
		if (!name) return;
		const firstJoin = client.data.name === null;
		client.data.name = name;
		client.join(LOBBY);
		if (firstJoin) {
			game.group(LOBBY).send({ type: 'joined', name }, { except: client });
		}
		return;
	}
	if (message?.type === 'chat' && client.data.name) {
		const text = validText(message.text, MAX_MESSAGE_LENGTH);
		if (!text) return;
		game.group(LOBBY).send({
			type: 'chat',
			name: client.data.name,
			text,
		});
	}
});

game.on('disconnect', client => {
	if (!client.data.name) return;
	game.group(LOBBY).send(
		{ type: 'disconnected', name: client.data.name },
		{ except: client },
	);
});

game.on('resume', client => {
	if (!client.data.name) return;
	game.group(LOBBY).send({ type: 'resumed', name: client.data.name });
});

game.on('end', client => {
	if (!client.data.name) return;
	game.broadcast({ type: 'left', name: client.data.name });
});

game.on('error', (error, client) => {
	console.error('Network error', client?.id, error);
});

sockets.on('connection', socket => {
	game.accept(socket);
});

function shutDown() {
	game.close();
	sockets.close();
}

process.once('SIGINT', shutDown);
process.once('SIGTERM', shutDown);

console.log(`Listening on ws://localhost:${PORT}`);
