/**
 * A named set of clients that messages can be sent to.
 *
 * @module
 */
import type { NetClient } from './server.js';

/** Configuration for {@link createGroup}. */
export interface GroupOptions {
	/** Keeps the group alive after its last member leaves. Defaults to false. */
	persist?: boolean;
	/** Called when the group empties, or when it is closed. */
	onEmpty?: (group: Group) => void;
}

/** Options for a group broadcast. */
export interface GroupSendOptions {
	/** One client, or a list of clients, to skip. */
	except?: NetClient | NetClient[] | null;
}

/** A named set of clients. */
export interface Group<T = any> {
	/** Group name, unique within a server. */
	readonly name: string;
	/** True when the group survives emptying. */
	readonly persist: boolean;
	/** Free form state owned by the game. */
	data: Record<string, any>;
	/** Current members. */
	readonly clients: NetClient[];
	/** True when the client is a member. */
	has(client: NetClient): boolean;
	/** Adds a client. Adding a member again does nothing. */
	add(client: NetClient): Group<T>;
	/** Removes a client. Removing a non member does nothing. */
	remove(client: NetClient): Group<T>;
	/** Sends a payload to every member, minus any excluded. */
	send(msg: T, options?: GroupSendOptions): void;
	/** Removes every member and retires the group. */
	close(): void;
}

/** Creates a group. Servers create these through `server.group(name)`. */
export function createGroup<T = any>(name: string, options?: GroupOptions): Group<T>;
