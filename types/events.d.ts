export type EventHandler<T = any> = (data?: T) => void;

export class EventEmitter {
	constructor();
	on<T = any>(event: string, handler: EventHandler<T>): void;
	off<T = any>(event: string, handler: EventHandler<T>): void;
	emit<T = any>(event: string, data?: T): void;
}
