# Networking

The net module provides routines that are useful for creating multi-user applications and games.
It builds off the popular websocket protocol.
In addition to everything that you get from websockets, this module provides helpers that make it easy to reconnect browser clients, preserve player sessions across short connection losses, and send packets to individual players or groups.

Most games use two modules:

1. Browser code imports from `audiogame-utils/net`.
2. Server code imports from `audiogame-utils/net/server`.

## What is a WebSocket?

A WebSocket is a connection between a browser and a server that stays open. The browser can send something to the server at any time, and the server can send something back without waiting for a new request.

This is different from loading a web page, where the browser makes a request and the server sends one response. A game can keep one WebSocket open for the whole play session.

In JavaScript, a socket is the object that represents one end of this connection. The browser has one socket and the server has another.

This guide calls each value sent through that connection a packet. A packet is usually a JavaScript object that describes one event or action:

```js
{ type: 'move', direction: 'north' }
```

Both sides need to agree on what each packet means. The networking module delivers packets, but your game decides how to handle them.

## Step 1: Install a WebSocket server

Web browsers already include a WebSocket client. You do not need to install `ws` in browser code.

Node.js does not include the WebSocket server used in this guide, so a Node.js server needs the `ws` package:

```console
npm install audiogame-utils ws
```

You do not need `ws` when your server runtime already provides WebSocket connections. Deno and Bun have their own server APIs. You can also receive WebSocket connections from a web framework or hosting platform. In each case, pass the accepted socket to `game.accept()` as shown below.

## Step 2: Start the server

Create a file named `server.js`:

```js
import { WebSocketServer } from 'ws'
import { createServer } from 'audiogame-utils/net/server'

const game = createServer()
const sockets = new WebSocketServer({ port: 8080 })

sockets.on('connection', socket => {
	game.accept(socket)
})

console.log('Listening on ws://localhost:8080')
```

Start it with Node.js:

```console
node server.js
```

`WebSocketServer` opens port 8080 and gives your code a socket whenever a browser connects. `game.accept(socket)` lets audiogame utils manage messages and player sessions on that socket.

`createServer()` does not open a port by itself. This separation lets you use the same game server with Node.js, Deno, Bun, or another WebSocket transport.

A transport is the part that opens a port, accepts WebSocket connections, and gives each accepted socket to your game.

## Step 3: Connect the browser

Create a reconnecting client in your browser code:

```js
import { createReconnectingClient } from 'audiogame-utils/net'

const client = createReconnectingClient({
	url: 'ws://localhost:8080',
	protocol: true,
})
```

The client starts connecting as soon as `createReconnectingClient()` runs. The URL uses `ws`, which is the WebSocket version of `http`. Production sites normally use `wss`, the encrypted version of WebSockets.

Run this browser module through your project's normal development server or bundler so it can resolve the `audiogame-utils` import. Do not open the HTML page directly with a `file://` URL.

## Step 4: Send a packet in each direction

First, have the browser send a packet after the connection opens:

```js
const client = createReconnectingClient({
	url: 'ws://localhost:8080',
	protocol: true,
	onOpen: socket => {
		socket.send({ type: 'hello', name: 'Swift Otter' })
	},
})
```

`onOpen` runs when the connection is ready. Its `socket` argument sends packets to the server.

On the server, listen for the `message` event. Stop the running server with Control+C, add this handler after `const game = createServer()`, then run `node server.js` again. The server gives the handler both the player who sent the packet and the packet itself:

```js
game.on('message', (player, packet) => {
	if (packet?.type === 'hello') {
		console.log(`${packet.name} connected`)
		player.send({
			type: 'welcome',
			text: `Welcome, ${packet.name}`,
		})
	}
})
```

`player.send()` sends a packet to that one browser. Receive it with `onMessage` in the browser:

```js
const client = createReconnectingClient({
	url: 'ws://localhost:8080',
	protocol: true,
	onOpen: socket => {
		socket.send({ type: 'hello', name: 'Swift Otter' })
	},
	onMessage: packet => {
		if (packet?.type === 'welcome') {
			console.log(packet.text)
		}
	},
})
```

Packets use JSON by default. This means you can send objects, arrays, strings, numbers, booleans, and `null`. Values such as functions and DOM elements cannot be sent as JSON.

## Step 5: Turn on the audiogame utils protocol

If you are writing a server with audiogame-utils, you will want to set this to true.

```js
const client = createReconnectingClient({
	url: 'ws://localhost:8080',
	protocol: true,
})
```

The protocol adds four things on top of normal packets:

1. A handshake introduces the browser to the server before game packets are handled.
2. Heartbeats check that the connection is still alive and measure its latency.
3. The browser reconnects after an unexpected connection loss.
4. A returning browser can resume its existing player session.

The client and server handle these protocol packets for you. Your `onMessage` and `message` handlers only receive your game's packets.

Leave `protocol` set to `false` when you connect to a server that does not use `createServer()`. In that case, you get encoded messages and automatic reconnection without the audiogame utils handshake or heartbeat.

## Step 6: Tell the player when the connection changes

`onOpen` runs for the first connection and every successful reconnection. `onClose` runs when the current connection closes.

Use the [speech module](speech.md) when connection messages need to be announced:

```js
import { createSpeech } from 'audiogame-utils/speech'
import { createStorage } from 'audiogame-utils/storage'

const speech = createSpeech({ storage: createStorage('my-game') })

const client = createReconnectingClient({
	url: 'ws://localhost:8080',
	protocol: true,
	onOpen: socket => {
		speech.speak('Connected')
		socket.send({ type: 'hello', name: 'Swift Otter' })
	},
	onClose: () => {
		speech.speak('Connection lost. Reconnecting.', true)
	},
	onError: error => {
		console.error('Network error', error)
	},
})
```

The reconnecting client waits a little longer after each failed attempt. A successful connection resets that delay.

Packets are not saved while the browser is disconnected. Put packets that must arrive after every connection inside `onOpen`. Other packets should wait until the connection is open.

Call `client.close()` when you intend to stop. This closes the current socket and cancels future reconnect attempts.

## Step 7: Resume the same player session

Without saved identity, the client can resume during a short connection loss in the same page. An identity also lets it resume after a page reload.

A session is the server's record for one player. It includes the player ID, current connection, group memberships, and any state your game puts in `player.data`.

Create storage and pass an identity to the client:

```js
import {
	createIdentity,
	createReconnectingClient,
} from 'audiogame-utils/net'
import { createStorage } from 'audiogame-utils/storage'

const storage = createStorage('my-game')
const identity = createIdentity(storage)

identity.set({ name: 'Swift Otter' })

const client = createReconnectingClient({
	url: 'ws://localhost:8080',
	protocol: true,
	identity,
	onOpen: socket => {
		socket.send({ type: 'hello', name: identity.get().name })
	},
})
```

After the handshake, the server gives the client a `clientId` and `sessionToken`. The identity stores them. If the connection returns before the server ends the session, the token reconnects the browser to the same player object.

The `name` field belongs to your game. The networking protocol does not send it automatically, which is why the example includes it in the `hello` packet.

Use `identity.clear()` when the player signs out. Never display or log a `sessionToken`. Anyone who has a valid token may be able to resume that session.

## Step 8: Store player state on the server

The player object on the server represents one session. It stays available during the reconnect grace period, even while its socket is gone.

Use `player.data` for state that should survive a reconnect:

```js
game.on('connection', player => {
	player.data.score = 0
	player.data.position = { x: 0, y: 0 }
})

game.on('message', (player, packet) => {
	if (packet?.type === 'score') {
		player.data.score += 1
		player.send({ type: 'score', value: player.data.score })
	}
})
```

`player.data` is kept in memory. It disappears when the session ends or the server process stops. Save lasting progress in your database or storage system.

The player also has a stable `id`, a `connected` status, and a `latency` measurement. These values describe the session and its current connection.

## Step 9: Put players in groups

A group is like a room. It gives you a name for a set of players that should receive the same packets. A group might represent a lobby, match, team, chat room, or area of the game world.

Add and remove a player with `join()` and `leave()`:

```js
player.join('lobby')

game.group('lobby').send({ type: 'round-started' })

player.leave('lobby')
```

`game.group('lobby')` returns the existing group or creates it the first time. An empty group is removed automatically.

Use `game.broadcast()` to reach every connected player. Use `game.send()` when you already have a specific collection of players:

```js
game.broadcast({ type: 'server-message', text: 'Welcome' })
game.send({ type: 'match-ended' }, finishedMatchPlayers)
```

A group send or broadcast can skip the sender:

```js
game.group('lobby').send(packet, { except: player })
game.broadcast(packet, { except: player })
```

Groups can also store shared state. Set `persist: true` when that state should remain after the last player leaves:

```js
const match = game.group('match-42', { persist: true })
match.data.round = 1
```

## Step 10: Handle disconnects and ended sessions

A lost socket does not immediately remove the player. The server keeps the session for a grace period, which is 30 seconds by default.

The server reports each stage through an event:

| Event | What happened | What to do |
| --- | --- | --- |
| `connection(player)` | A new session was created. | Set up `player.data` and place the player in initial groups. |
| `disconnect(player)` | The socket was lost. | Mark the player as temporarily unavailable. Keep their state. |
| `resume(player)` | The browser returned during the grace period. | Send any state the returning browser needs. |
| `end(player)` | The grace period expired or the session was closed. | Save lasting progress and perform final cleanup. |
| `message(player, packet)` | The player sent a game packet. | Validate it, update server state, and send the result. |
| `error(error, player)` | Networking or an event handler failed. | Log or report the error. `player` can be `null` before the handshake finishes. |

```js
game.on('disconnect', player => {
	console.log(`${player.id} disconnected`)
})

game.on('resume', player => {
	player.send({ type: 'state', data: player.data })
})

game.on('end', player => {
	console.log(`${player.id} left`)
})
```

Change the grace period when creating the server:

```js
const game = createServer({ sessionTtl: 60_000 })
```

Call `player.close()` when you need to end one session immediately. This skips the reconnect grace period.

When the whole server is stopping, close both layers:

```js
game.close()
sockets.close()
```

`game.close()` ends every session, removes every group, and clears networking timers. `sockets.close()` stops the `ws` listener from accepting new connections.

## Step 11: Try the complete chat example

The [network chat example](../examples/net-chat.html) puts these pieces together. It asks for a name, remembers the player within the browser tab, sends chat packets, reconnects after connection loss, and displays and announces chat and connection events.

The example has a [browser client](../examples/net-chat.js) and a [WebSocket server](../examples/net-chat-server.js). Follow the [examples guide](../examples/README.md) to run both parts.

## Step 12: Security, advanced use cases, and the API

The remaining sections cover security, custom data formats, testing, and every public networking function and object.

### Security and anti-cheat design

Use a `wss://` URL in production. `wss` runs the WebSocket connection through TLS, the same encryption used by `https`. It prevents people between the browser and server from reading or changing the traffic.

The networking module does not configure TLS certificates. Configure TLS in your web server, hosting platform, or reverse proxy, then send the accepted WebSocket to `game.accept()`.

Encryption does not make a browser trustworthy. A player can modify browser code or write another program that sends any packet it wants. Assume that anyone can send malformed packets, repeat valid packets, or invent actions your interface would never send.

Keep the server as the source of truth:

1. Let clients request actions, such as `{ type: 'move', direction: 'north' }`.
2. Check the packet type, fields, ranges, permissions, timing, and current game state on the server.
3. Update position, score, inventory, health, and other authoritative state on the server.
4. Send the accepted result back to clients.

Do not let a client set its own score or position directly. For example, a packet such as `{ type: 'set-score', value: 999999 }` should never be trusted just because it arrived over `wss`.

## Public API reference

### Browser API

Import these functions from `audiogame-utils/net`.

#### `createReconnectingClient(options)`

Creates a browser WebSocket immediately. It reconnects after unexpected closures.

| Option | Default | Description |
| --- | --- | --- |
| `url` | Required | WebSocket URL opened for every connection attempt. |
| `codec` | JSON | Object with `encode(packet)` and `decode(text)` methods. |
| `backoffs` | See below | Reconnect delays in milliseconds. |
| `protocol` | `false` | Enables the audiogame utils handshake, heartbeat, and session resume protocol. |
| `identity` | `null` | Identity used to persist a session. Only used when `protocol` is `true`. |
| `onOpen(socket)` | None | Runs after each connection opens. |
| `onMessage(packet)` | None | Receives decoded game packets. |
| `onClose(event)` | None | Receives the close event before a possible reconnect. |
| `onError(error)` | None | Receives socket and decoding errors. |

The default reconnect delays are 500, 1000, 2000, 4000, 8000, and 15000 milliseconds. Later attempts continue using 15000 milliseconds. A successful connection starts the sequence over.

The returned client has these members:

| Member | Description |
| --- | --- |
| `send(packet)` | Sends through the current socket. It does not queue packets while disconnected. |
| `close()` | Permanently closes the client and cancels a scheduled reconnect. |
| `readyState` | Current WebSocket ready state. It reports `WebSocket.CLOSED` while disconnected. |

The socket passed to `onOpen` has `send(packet)`, `close(code, reason)`, and `readyState`.

#### `createIdentity(storage, options)`

Creates storage for a player's session credentials and optional display name. `storage` must be an instance from `createStorage()`.

| Option | Default | Description |
| --- | --- | --- |
| `key` | `'identity'` | Key used inside the storage namespace. |

`identity.get()` returns a new object with `clientId`, `sessionToken`, and `name`. Missing values are `null`.

`identity.set(fields)` merges and stores any supplied fields. `identity.clear()` removes the record and restores the three `null` values.

#### `wrapSocket(socket, options)`

Wraps one WebSocket with packet encoding and callbacks. Use it when you want simple packet handling without reconnects, player sessions, heartbeats, or groups.

| Option | Default | Description |
| --- | --- | --- |
| `codec` | JSON | Object with `encode(packet)` and `decode(text)` methods. |
| `onMessage(packet)` | None | Receives decoded packets. |
| `onClose(event)` | None | Receives the socket close event. |
| `onError(error)` | None | Receives socket errors and decoding failures. |

A decoding failure calls `onError` and leaves the socket open.

The returned wrapper has `send(packet)`, `close(code, reason)`, and a `readyState` property that reflects the underlying socket.

### Server API

Import `createServer` from `audiogame-utils/net/server`.

#### `createServer(options)`

Creates the session and group manager. It does not open a port.

| Option | Default | Description |
| --- | --- | --- |
| `codec` | JSON | Codec used for every accepted socket. |
| `sessionTtl` | `30000` | Milliseconds to keep a disconnected session available. |
| `heartbeatInterval` | `5000` | Milliseconds between heartbeat pings. |
| `heartbeatTimeout` | `15000` | Milliseconds without a heartbeat reply before closing the socket. |
| `idFactory` | `crypto.randomUUID` | Function that creates public player IDs. Session tokens always use `crypto.randomUUID`. |

The server emits `connection`, `message`, `disconnect`, `resume`, `end`, and `error`. Their arguments and timing are described in [Step 10: Handle disconnects and ended sessions](#step-10-handle-disconnects-and-ended-sessions).

The returned server has these members:

| Member | Description |
| --- | --- |
| `accept(socket)` | Takes over an accepted socket and starts the protocol handshake. Returns its wrapped socket. |
| `on(event, handler)` | Listens for a server event and returns an unsubscribe function. |
| `once(event, handler)` | Listens for the next matching server event, then unsubscribes. |
| `off(event, handler)` | Removes one handler. When `handler` is omitted, removes every handler for the event. |
| `emit(event, ...arguments)` | Emits an event and passes the remaining arguments to its handlers. Application code normally does not need to call this. |
| `listenerCount(event)` | Returns the number of handlers listening for an event. |
| `group(name, options)` | Returns a group, creating it when needed. Set `options.persist` to keep an empty group. |
| `groups` | Array containing every current group. |
| `clients` | Array containing connected sessions and sessions still inside their grace period. |
| `send(packet, players)` | Sends to an iterable collection of players. |
| `broadcast(packet, options)` | Sends to every connected player. `options.except` can be one player or an array. |
| `close()` | Ends every session, closes every group, and clears every timer. |

#### Player objects

Server event handlers receive a player object with these members:

| Member | Description |
| --- | --- |
| `id` | Stable public ID that remains the same after a reconnect. |
| `data` | Object where the application can store session state. |
| `groups` | Set containing the groups this player has joined. |
| `connected` | `true` while a socket is attached. |
| `latency` | Latest round trip time in milliseconds, or `null` before the first heartbeat reply. |
| `send(packet)` | Sends to this player. Returns `false` when disconnected. |
| `join(name)` | Joins a group, creating it when needed. Returns the player. |
| `leave(name)` | Leaves a group. Returns the player. |
| `close(code, reason)` | Ends the session immediately with no grace period. |

#### Group objects

`server.group(name, { persist })` returns a group with these members:

| Member | Description |
| --- | --- |
| `name` | Name that identifies the group within this server. |
| `persist` | Whether the group remains after its last player leaves. |
| `data` | Object where the application can store shared group state. |
| `clients` | Array containing the current members. |
| `has(player)` | Reports whether a player belongs to the group. |
| `add(player)` | Adds a player. Adding one twice has no effect. Returns the group. |
| `remove(player)` | Removes a player. Removing a missing player has no effect. Returns the group. |
| `send(packet, options)` | Sends to every connected member. `options.except` can be one player or an array. |
| `close()` | Removes every member and retires the group. |

### Custom codecs

A codec changes how packets become WebSocket text and how received text becomes a packet. The default codec uses `JSON.stringify()` and `JSON.parse()`.

Provide an object with `encode()` and `decode()`:

```js
const codec = {
	encode(packet) {
		return JSON.stringify(packet)
	},
	decode(text) {
		return JSON.parse(text)
	},
}
```

Pass the same codec to the browser and server:

```js
const game = createServer({ codec })

const client = createReconnectingClient({
	url: 'wss://example.com/game',
	protocol: true,
	codec,
})
```

Both sides must agree on the format. A codec used with the audiogame utils protocol must encode and decode the protocol's arrays and objects as well as your game packets.

A custom codec changes the data format. It does not encrypt the connection. Use `wss` for encryption in transit.

### Testing API

Import `createSocketPair` from `audiogame-utils/net/testing`.

#### `createSocketPair()`

Creates two fake sockets connected to each other. Delivery is synchronous, so tests do not need a port, network, or timer.

```js
import { wrapSocket } from 'audiogame-utils/net'
import { createSocketPair } from 'audiogame-utils/net/testing'

const [left, right] = createSocketPair()
const received = []

wrapSocket(right, {
	onMessage: packet => received.push(packet),
})

const connection = wrapSocket(left)
connection.send({ type: 'ready' })
```

Each fake socket has these members:

| Member | Description |
| --- | --- |
| `peer` | Socket at the other end of the pair. |
| `readyState` | `1` while open and `3` after closing. |
| `sent` | Array containing every raw frame sent from this end. |
| `addEventListener(type, handler)` | Registers an event listener. |
| `removeEventListener(type, handler)` | Removes an event listener. |
| `emit(type, event)` | Fires an event on this end. |
| `send(data)` | Records a raw frame and delivers it to the peer. Discards it after closing. |
| `close(code, reason)` | Closes both ends and fires their close events. |
