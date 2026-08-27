/**
 * A fake socket pair for testing message handlers without a network.
 *
 * @module
 */

/** One end of a {@link createSocketPair} connection. */
export interface FakeSocket {
	/** The socket on the other end. */
	peer: FakeSocket | null;
	/** WebSocket ready state. 1 while open, 3 once closed. */
	readyState: number;
	/** Every raw frame this end has sent. */
	sent: any[];
	/** Registers an event listener. */
	addEventListener(type: string, fn: (event: any) => void): void;
	/** Removes an event listener. */
	removeEventListener(type: string, fn: (event: any) => void): void;
	/** Fires an event on this end by hand. */
	emit(type: string, event: any): void;
	/** Sends a raw frame to the peer. Discarded once closed. */
	send(data: any): void;
	/** Closes both ends with the given code and reason. */
	close(code?: number, reason?: string): void;
}

/** Creates two sockets wired to each other, delivering synchronously. */
export function createSocketPair(): [FakeSocket, FakeSocket];
