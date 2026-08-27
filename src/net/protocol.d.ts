/**
 * Wire framing and shared constants for the net protocol.
 *
 * @module
 */

/** Wire protocol version sent in the handshake. */
export const PROTOCOL_VERSION: 1;
/** Channel carrying the handshake and the heartbeat. */
export const CHANNEL_PROTOCOL: 0;
/** Channel carrying game payloads. */
export const CHANNEL_GAME: 1;
/** Client greeting, sent on every connection. */
export const HELLO: 'hello';
/** Server reply carrying the client id and session token. */
export const WELCOME: 'welcome';
/** Server heartbeat request. */
export const PING: 'ping';
/** Client heartbeat reply. */
export const PONG: 'pong';
/** Close code for a protocol version mismatch. */
export const CLOSE_VERSION: 4001;
/** Close code for a session replaced by a newer connection. */
export const CLOSE_REPLACED: 4002;
/** Close code for a game message sent before the handshake. */
export const CLOSE_UNGREETED: 4003;
/** Close code for a frame that could not be read. */
export const CLOSE_MALFORMED: 4004;

/** A decoded frame. */
export interface Frame<T = any> {
	/** Channel number. */
	channel: number;
	/** Frame payload. */
	payload: T;
}

/** Pairs a channel with a payload for sending. */
export function frame<T = any>(channel: number, payload: T): [number, T];
/** Splits a received frame, or returns null when it is malformed. */
export function readFrame<T = any>(value: any): Frame<T> | null;
