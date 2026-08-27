/**
 * A small synchronous event emitter.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/events.md | events guide}.
 *
 * @module
 */
/** Receives optional data emitted for an event. */
export type EventHandler<T = any> = (data?: T) => void;
/** Removes a previously registered event handler. */
export type UnsubscribeFunction = () => void;

/** Dispatches named synchronous events to registered handlers. */
export class EventEmitter {
	/** Creates an emitter with no registered handlers. */
	constructor();
	/** Registers a handler and returns a function that removes it. */
	on(event: string, handler: (...args: any[]) => void): () => void;
	/** Registers a handler that removes itself after the first call. */
	once(event: string, handler: (...args: any[]) => void): () => void;
	/** Removes one handler, or every handler for the event when omitted. */
	off(event: string, handler?: (...args: any[]) => void): void;
	/** Calls every handler for the event with the given arguments. */
	emit(event: string, ...args: any[]): void;
	/** Number of handlers registered for the event. */
	listenerCount(event: string): number;
}
