// Encodes WebSocket messages and reconnects the client after a disconnection.

const JSON_CODEC = {
	encode: msg => JSON.stringify(msg),
	decode: raw => JSON.parse(raw),
};

const DEFAULT_BACKOFFS_MS = [500, 1000, 2000, 4000, 8000, 15000];

// Supports browser WebSockets and `ws` sockets on a server. Both implementations
// provide `addEventListener`.
//
// A decoding error calls `onError` and leaves the socket open.
export function wrapSocket(socket, { codec = JSON_CODEC, onMessage, onClose, onError } = {}) {
	socket.addEventListener('message', event => {
		const data = typeof event.data === 'string' ? event.data : event.data.toString();
		let msg;
		try {
			// Always decode the frame so malformed data reaches `onError`, even
			// when no `onMessage` callback is registered.
			msg = codec.decode(data);
		} catch (err) {
			onError?.(err);
			return;
		}
		onMessage?.(msg);
	});
	socket.addEventListener('close', event => onClose?.(event));
	socket.addEventListener('error', event => onError?.(event));
	return {
		send(msg) { socket.send(codec.encode(msg)); },
		close(code, reason) { socket.close(code, reason); },
		get readyState() { return socket.readyState; },
	};
}

// Increase the reconnect delay after each failure and reset it after a
// successful connection.
//
// `onOpen` receives the wrapped socket for the initial connection and every
// reconnection. Use it to send the resume handshake.
export function createReconnectingClient({
	url,
	codec = JSON_CODEC,
	backoffs = DEFAULT_BACKOFFS_MS,
	onOpen,
	onMessage,
	onClose,
	onError,
} = {}) {
	let socket = null;
	let wrapped = null;
	let attempt = 0;
	let closedByUser = false;
	let reconnectTimer = null;

	function connect() {
		reconnectTimer = null;
		socket = new WebSocket(url);
		wrapped = wrapSocket(socket, {
			codec,
			onMessage,
			onClose: event => {
				onClose?.(event);
				if (!closedByUser) scheduleReconnect();
			},
			onError,
		});
		socket.addEventListener('open', () => {
			attempt = 0;
			onOpen?.(wrapped);
		});
	}

	function scheduleReconnect() {
		const delay = backoffs[Math.min(attempt, backoffs.length - 1)];
		attempt += 1;
		reconnectTimer = setTimeout(connect, delay);
	}

	connect();

	return {
		send(msg) { wrapped?.send(msg); },

		// Cancel the pending reconnection before closing the active socket so
		// `close()` keeps the client closed during a reconnect delay.
		close() {
			closedByUser = true;
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			socket?.close();
		},

		get readyState() {
			return socket?.readyState ?? WebSocket.CLOSED;
		},
	};
}
