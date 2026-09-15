/**
 * Reviewable buffers of speech events with a manager that moves between them and speaks.
 *
 * @module
 */
import { EventEmitter } from './events.js';
import type { SpeechInstance } from './speech/index.js';

/** One entry in a buffer. */
export interface BufferItem {
	/** Text spoken when the item is read. */
	text: string;
	/** Creation time in milliseconds since the epoch. */
	time: number;
	/** Anything the game wants to attach. */
	data: any;
}

/** Options for {@link Buffer} and {@link BufferManager.createBuffer}. */
export interface BufferOptions {
	/** Oldest items drop once the count passes this. Defaults to Infinity. */
	maxItems?: number;
}

/** Options for {@link BufferManager}. */
export interface BufferManagerOptions {
	/** Speech instance used for announcements. Speech is skipped when omitted. */
	speech?: SpeechInstance | null;
}

/** Payload of every manager event. */
export interface BufferEvent {
	manager: BufferManager;
	/** Null on a `focus` event when no buffers remain. */
	buffer: Buffer | null;
	/** Present on `add` events only. */
	item?: BufferItem;
}

/** A named list of items with a cursor. */
export class Buffer {
	constructor(name: string, options?: BufferOptions);
	name: string;
	items: BufferItem[];
	/** Index of the current item, or -1 when empty. */
	position: number;
	maxItems: number;
	readonly length: number;
	readonly current: BufferItem | null;
	/** Appends an item. A string becomes an item with the current time and null data. */
	add(textOrItem: string | Partial<BufferItem> & { text: string }): BufferItem;
	clear(): void;
}

/** Owns buffers, tracks which one is focused, and speaks moves through them. */
export class BufferManager extends EventEmitter {
	constructor(options?: BufferManagerOptions);
	buffers: Buffer[];
	/** Index of the focused buffer, or -1 when there are none. */
	position: number;
	speech: SpeechInstance | null;
	readonly current: Buffer | null;
	/** Creates a buffer. Throws when the name exists. */
	createBuffer(name: string, options?: BufferOptions): Buffer;
	deleteBuffer(target: string | Buffer): boolean;
	getBuffer(name: string): Buffer | null;
	clearBuffer(target: string | Buffer): boolean;
	focusBuffer(target: string | Buffer, options?: { silent?: boolean }): boolean;
	nextBuffer(options?: { wrap?: boolean; silent?: boolean }): void;
	previousBuffer(options?: { wrap?: boolean; silent?: boolean }): void;
	firstBuffer(options?: { silent?: boolean }): void;
	lastBuffer(options?: { silent?: boolean }): void;
	nextBufferItem(options?: { wrap?: boolean }): void;
	previousBufferItem(options?: { wrap?: boolean }): void;
	firstBufferItem(): void;
	lastBufferItem(): void;
	speakCurrentItem(): void;
	/** Adds an item and speaks it without interrupting unless silent. Throws for an unknown buffer. */
	addItem(target: string | Buffer, textOrItem: string | Partial<BufferItem> & { text: string }, options?: { silent?: boolean }): BufferItem;
	/** Speaks `${name}: ${count} items`. */
	speakBufferDetails(buffer: Buffer): void;
	on(event: 'create' | 'delete' | 'add' | 'clear' | 'focus' | 'move', handler: (event: BufferEvent) => void): () => void;
	on(event: string, handler: (...args: any[]) => void): () => void;
}

/** Creates a {@link BufferManager}. */
export function createBufferManager(options?: BufferManagerOptions): BufferManager;
