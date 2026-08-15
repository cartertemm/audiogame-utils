# Networking

The `audiogame-utils/net` module provides encoded WebSocket messaging, browser reconnection, and persistent player identity. It exports `wrapSocket`, `createReconnectingClient`, and `createIdentity`.

## Socket wrapper

`wrapSocket(socket, options)` applies a message codec to a browser WebSocket or a server socket that implements `addEventListener`.

```js
import { wrapSocket } from 'audiogame-utils/net'

const connection = wrapSocket(socket, {
	onMessage: message => handleMessage(message),
	onError: error => reportError(error),
})

connection.send({ type: 'ready' })
```

The default codec uses `JSON.stringify` and `JSON.parse`. Supply a custom codec with `encode(message)` and `decode(frame)` methods:

```js
const connection = wrapSocket(socket, {
	codec: {
		encode: message => encodeMessage(message),
		decode: frame => decodeMessage(frame),
	},
})
```

Options can include `codec`, `onMessage`, `onClose`, and `onError`. A decoding failure calls `onError` and leaves the socket open.

The returned wrapper exposes `send(message)`, `close(code, reason)`, and a `readyState` getter.

## Reconnecting browser client

`createReconnectingClient(options)` creates a browser WebSocket immediately and reconnects after unexpected closure.

```js
import { createReconnectingClient } from 'audiogame-utils/net'

const client = createReconnectingClient({
	url: 'wss://example.com/ws',
	onOpen: socket => socket.send({ type: 'hello' }),
	onMessage: message => handleMessage(message),
	onClose: event => handleClose(event),
	onError: error => reportError(error),
})
```

Options include `url`, `codec`, `backoffs`, `onOpen`, `onMessage`, `onClose`, and `onError`. The default reconnect delays are 500, 1000, 2000, 4000, 8000, and 15000 milliseconds. Further attempts continue using 15000 milliseconds. A successful connection resets the sequence.

`onOpen` receives the wrapped socket for the initial connection and every reconnection. Use it for authentication or session resume messages.

The client exposes `send(message)`, `close()`, and `readyState`. Calling `close()` closes the active socket and cancels a scheduled reconnection. `createReconnectingClient` uses the browser `WebSocket` global and does not accept a server socket constructor.

## Persistent identity

`createIdentity(storage, options)` stores a player record containing `clientId`, `sessionToken`, and `name`.

```js
import { createIdentity } from 'audiogame-utils/net'
import { createStorage } from 'audiogame-utils/storage'

const storage = createStorage('mygame')
const identity = createIdentity(storage)

identity.set({ name: 'Swift Otter' })
identity.set({ clientId: '42', sessionToken: 'secret' })
identity.get()
identity.clear()
```

A storage instance is required. The optional `key` defaults to `identity`.

`get()` returns a new object with all three fields. Missing fields are `null`. `set(fields)` merges fields into the existing record, which allows a name to be stored before a server issues credentials. `clear()` removes the stored record.
