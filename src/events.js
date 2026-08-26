// @ts-self-types="./events.d.ts"
export class EventEmitter {
	constructor() {
		this._handlers = Object.create(null);
	}

	on(event, handler) {
		(this._handlers[event] ??= []).push(handler);
		let unbound = false;
		return () => {
			if (unbound) return;
			unbound = true;
			const list = this._handlers[event];
			if (!list) return;
			const index = list.indexOf(handler);
			if (index === -1) return;
			list.splice(index, 1);
			if (list.length === 0) delete this._handlers[event];
		};
	}

	once(event, handler) {
		const wrapper = (data) => {
			this.off(event, wrapper);
			handler(data);
		};
		wrapper.originalHandler = handler;
		return this.on(event, wrapper);
	}

	off(event, handler) {
		const list = this._handlers[event];
		if (!list) return;
		if (!handler) {
			delete this._handlers[event];
			return;
		}
		this._handlers[event] = list.filter(h => h !== handler && h.originalHandler !== handler);
		if (this._handlers[event].length === 0) {
			delete this._handlers[event];
		}
	}

	emit(event, data) {
		const list = this._handlers[event];
		if (!list || list.length === 0) return;
		const copy = [...list];
		let firstError = null;
		for (const handler of copy) {
			try {
				handler(data);
			} catch (err) {
				if (firstError) {
					console.error(err);
				} else {
					firstError = err;
				}
			}
		}
		if (firstError) throw firstError;
	}

	listenerCount(event) {
		return this._handlers[event]?.length ?? 0;
	}
}
