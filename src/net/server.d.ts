/**
 * The server half of the net module. Tracks sessions, survives reconnections,
 * and fans messages out to groups.
 *
 * @module
 */
import type { EventEmitter } from '../events.js';
import type { Codec, WrappedSocket } from './index.js';
import type { Group, GroupOptions } from './group.js';

export type { Group, GroupOptions } from './group.js';

/** Configuration for {@link createServer}. */
export interface ServerOptions<T = any> {
	/** Frame codec. Defaults to JSON serialization. */
	codec?: Codec<any>;
	/** Milliseconds a dropped client is held before its session ends. Defaults to 30000. */
	sessionTtl?: number;
	/** Milliseconds between heartbeat pings. Defaults to 5000. */
	heartbeatInterval?: number;
	/** Milliseconds without a pong before the socket is closed. Defaults to 15000. */
	heartbeatTimeout?: number;
	/** Generates client ids and session tokens. Defaults to `crypto.randomUUID`. */
	idFactory?: () => string;
}

/** Options for a server wide broadcast. */
export interface BroadcastOptions {
	/** One client, or a list of clients, to skip. */
	except?: NetClient | NetClient[] | null;
}

/** A connected player. Outlives its socket for the length of the grace period. */
export interface NetClient<T = any> {
	/** Stable identifier, unchanged across a reconnection. */
	readonly id: string;
	/** Free form state owned by the game. Survives a reconnection. */
	data: Record<string, any>;
	/** Groups this client belongs to. */
	readonly groups: Set<Group>;
	/** False while the socket is gone and the grace period is running. */
	readonly connected: boolean;
	/** Round trip time in milliseconds, or null before the first pong. */
	readonly latency: number | null;
	/** Sends a game payload. Returns false when the client is dropped. */
	send(msg: T): boolean;
	/** Joins a group, creating it when needed. */
	join(name: string): NetClient<T>;
	/** Leaves a group. Leaving a group that does not exist does nothing. */
	leave(name: string): NetClient<T>;
	/** Ends the session now, with no grace period. */
	close(code?: number, reason?: string): void;
}

/** A server that tracks sessions and groups over sockets you hand it. */
export interface NetServer<T = any> extends EventEmitter {
	/** Takes over a socket and starts the handshake. */
	accept(socket: any): WrappedSocket<any>;
	/** Returns a group, creating it on first use. */
	group(name: string, options?: GroupOptions): Group<T>;
	/** Every group that currently exists. */
	readonly groups: Group<T>[];
	/** Every live session, connected or inside its grace period. */
	readonly clients: NetClient<T>[];
	/** Sends a payload to an explicit list of clients. */
	send(msg: T, clients: Iterable<NetClient<T>>): void;
	/** Sends a payload to every connected client, minus any excluded. */
	broadcast(msg: T, options?: BroadcastOptions): void;
	/** Ends every session, retires every group, and clears every timer. */
	close(): void;
}

/**
 * Creates a server. It opens no ports. Hand it sockets from `ws`,
 * `Deno.serve`, `Bun.serve`, or anything else providing `addEventListener`,
 * `send`, and `close`.
 *
 * Events: `connection(client)`, `resume(client)`, `disconnect(client)`,
 * `end(client)`, `message(client, payload)`, and `error(err, client)`.
 */
export function createServer<T = any>(options?: ServerOptions<T>): NetServer<T>;
