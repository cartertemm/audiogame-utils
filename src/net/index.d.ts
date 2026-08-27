/**
 * WebSocket messaging, reconnection, and persistent player identity.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/net.md | networking guide}.
 *
 * @module
 */
import type { StorageInstance } from '../storage.js';

/** Converts messages to and from WebSocket text frames. */
export interface Codec<T = any> {
	/** Encodes a message as a string frame. */
	encode(msg: T): string;
	/** Decodes a string frame as a message. */
	decode(raw: string): T;
}

/** Codec and callbacks for {@link wrapSocket}. */
export interface WrapSocketOptions<T = any> {
	/** Message codec. Defaults to JSON serialization. */
	codec?: Codec<T>;
	/** Receives decoded messages. */
	onMessage?: (msg: T) => void;
	/** Receives the socket close event. */
	onClose?: (event: any) => void;
	/** Receives the socket error event. */
	onError?: (event: any) => void;
}

/** A WebSocket facade that sends and receives typed messages. */
export interface WrappedSocket<T = any> {
	/** Encodes and sends a message. */
	send(msg: T): void;
	/** Closes the underlying socket. */
	close(code?: number, reason?: string): void;
	/** Underlying WebSocket ready state. */
	readonly readyState: number;
}

/** Configuration for {@link createReconnectingClient}. */
export interface ReconnectingClientOptions<T = any> {
	/** WebSocket URL opened by each connection attempt. */
	url: string;
	/** Message codec. Defaults to JSON serialization. */
	codec?: Codec<T>;
	/** Reconnection delays in milliseconds. */
	backoffs?: number[];
	/** Speaks the framing and handshake that `createServer` expects. Defaults to false. */
	protocol?: boolean;
	/** Persists the session across a page reload. Only used when `protocol` is true. */
	identity?: Identity | null;
	/** Called after a connection opens. */
	onOpen?: (socket: WrappedSocket<T>) => void;
	/** Receives decoded messages. */
	onMessage?: (msg: T) => void;
	/** Receives close events before a possible reconnect. */
	onClose?: (event: any) => void;
	/** Receives socket errors. */
	onError?: (event: any) => void;
}

/** A WebSocket client that reconnects after unexpected closure. */
export interface ReconnectingClient<T = any> {
	/** Sends a typed message through the active socket. */
	send(msg: T): void;
	/** Permanently closes the client and cancels reconnection. */
	close(): void;
	/** Active socket ready state, or `WebSocket.CLOSED` while disconnected. */
	readonly readyState: number;
}

/** Persisted multiplayer identity fields. */
export interface IdentityRecord {
	/** Stable server assigned client identifier. */
	clientId: string | null;
	/** Server assigned session credential. */
	sessionToken: string | null;
	/** Player display name. */
	name: string | null;
}

/** Configuration for {@link createIdentity}. */
export interface IdentityOptions {
	/** Storage key. Defaults to `identity`. */
	key?: string;
}

/** Persistent multiplayer identity operations. */
export interface Identity {
	/** Returns a copy of the current identity record. */
	get(): IdentityRecord;
	/** Merges and persists identity fields. */
	set(fields: Partial<IdentityRecord>): void;
	/** Removes the stored identity and restores null fields. */
	clear(): void;
}

/** Wraps a WebSocket with typed codec and callback handling. */
export function wrapSocket<T = any>(socket: any, options?: WrapSocketOptions<T>): WrappedSocket<T>;
/** Creates and immediately connects a reconnecting WebSocket client. */
export function createReconnectingClient<T = any>(options: ReconnectingClientOptions<T>): ReconnectingClient<T>;
/** Creates persistent identity storage with nullable default fields. */
export function createIdentity(storage: StorageInstance, options?: IdentityOptions): Identity;
