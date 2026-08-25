export type EventHandler<T = any> = (data?: T) => void;
export type UnsubscribeFunction = () => void;

export class EventEmitter {
	constructor();
	on<T = any>(event: string, handler: EventHandler<T>): UnsubscribeFunction;
	once<T = any>(event: string, handler: EventHandler<T>): UnsubscribeFunction;
	off<T = any>(event: string, handler?: EventHandler<T>): void;
	emit<T = any>(event: string, data?: T): void;
	listenerCount(event: string): number;
}
