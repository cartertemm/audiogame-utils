// @ts-self-types="./protocol.d.ts"
// Every frame on the wire is a two element array, [channel, payload]. Channel 0
// carries the handshake and the heartbeat, channel 1 carries the game. Keeping
// them apart this way means no message name is reserved, so a game payload can
// be any shape at all.

export const PROTOCOL_VERSION = 1;

export const CHANNEL_PROTOCOL = 0;
export const CHANNEL_GAME = 1;

export const HELLO = 'hello';
export const WELCOME = 'welcome';
export const PING = 'ping';
export const PONG = 'pong';

export const CLOSE_VERSION = 4001;
export const CLOSE_REPLACED = 4002;
export const CLOSE_UNGREETED = 4003;
export const CLOSE_MALFORMED = 4004;

export function frame(channel, payload) {
	return [channel, payload];
}

// Returns null for a frame the peer should not have sent, so the caller can
// close the socket instead of guessing at a payload.
export function readFrame(value) {
	if (!Array.isArray(value) || value.length !== 2) return null;
	const [channel, payload] = value;
	if (typeof channel !== 'number') return null;
	return { channel, payload };
}
