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
	on<T = any>(event: string, handler: EventHandler<T>): UnsubscribeFunction;
	/** Registers a handler that removes itself after its first call. */
	once<T = any>(event: string, handler: EventHandler<T>): UnsubscribeFunction;
	/** Removes one handler, or every handler when `handler` is omitted. */
	off<T = any>(event: string, handler?: EventHandler<T>): void;
	/** Calls the handlers registered for `event` in registration order. */
	emit<T = any>(event: string, data?: T): void;
	/** Returns the number of handlers registered for `event`. */
	listenerCount(event: string): number;
}
