// A presence server for the net demo. Run it with:
//
//   npm run examples:server
//
// It keeps a roster of who is in the lobby and echoes chat. Close a browser tab
// and reopen it within thirty seconds to watch the session resume with its name
// and message count intact.

import { WebSocketServer } from 'ws';
import { createServer } from '../src/net/server.js';

const PORT = 8080;
const LOBBY = 'lobby';

const server = createServer({ sessionTtl: 30000 });

function roster() {
	return server.group(LOBBY).clients.map(client => ({
		id: client.id,
		name: client.data.name ?? 'unnamed',
		said: client.data.said ?? 0,
	}));
}

function announceRoster() {
	server.group(LOBBY).send({ type: 'roster', players: roster() });
}

server.on('connection', client => {
	client.data.name = `Player ${server.clients.length}`;
	client.data.said = 0;
	client.join(LOBBY);
	client.send({ type: 'you', id: client.id, name: client.data.name, said: 0 });
	announceRoster();
	console.log(`${client.data.name} connected`);
});

server.on('resume', client => {
	client.send({
		type: 'you',
		id: client.id,
		name: client.data.name,
		said: client.data.said,
	});
	announceRoster();
	console.log(`${client.data.name} resumed with ${client.data.said} messages`);
});

server.on('message', (client, msg) => {
	if (msg?.type !== 'chat' || typeof msg.text !== 'string') return;
	client.data.said += 1;
	server.group(LOBBY).send({ type: 'chat', from: client.data.name, text: msg.text });
	announceRoster();
});

server.on('disconnect', client => {
	console.log(`${client.data.name} dropped, holding the session`);
});

server.on('end', client => {
	console.log(`${client.data.name} left`);
	announceRoster();
});

server.on('error', (err, client) => {
	console.error(`error from ${client?.id ?? 'an ungreeted socket'}:`, err);
});

new WebSocketServer({ port: PORT }).on('connection', socket => server.accept(socket));
console.log(`Listening on ws://localhost:${PORT}`);
