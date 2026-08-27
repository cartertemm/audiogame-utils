// @ts-self-types="./testing.d.ts"
// A pair of sockets wired to each other, delivering synchronously. Tests get
// the full connection lifecycle without a port, a timer, or a real network.

const OPEN = 1;
const CLOSED = 3;

function createEndpoint() {
	const listeners = Object.create(null);
	return {
		peer: null,
		readyState: OPEN,
		sent: [],

		addEventListener(type, fn) {
			(listeners[type] ??= []).push(fn);
		},

		removeEventListener(type, fn) {
			listeners[type] = (listeners[type] ?? []).filter(f => f !== fn);
		},

		emit(type, event) {
			for (const fn of [...(listeners[type] ?? [])]) fn(event);
		},

		send(data) {
			if (this.readyState !== OPEN) return;
			this.sent.push(data);
			this.peer.emit('message', { data });
		},

		// Closing one end closes the other. The guard above stops the mutual
		// call from recurring, because the peer is already closed on the way
		// back.
		close(code = 1000, reason = '') {
			if (this.readyState === CLOSED) return;
			this.readyState = CLOSED;
			this.emit('close', { code, reason });
			this.peer.close(code, reason);
		},
	};
}

export function createSocketPair() {
	const a = createEndpoint();
	const b = createEndpoint();
	a.peer = b;
	b.peer = a;
	return [a, b];
}
