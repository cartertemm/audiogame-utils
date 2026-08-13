export class EventEmitter {
	constructor() {
		this._handlers = {};
	}

	on(event, handler) {
		(this._handlers[event] ??= []).push(handler);
	}

	off(event, handler) {
		const list = this._handlers[event];
		if (!list) return;
		this._handlers[event] = list.filter(h => h !== handler);
	}

	emit(event, data) {
		const list = this._handlers[event];
		if (!list) return;
		for (const handler of list) handler(data);
	}
}
