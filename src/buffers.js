// @ts-self-types="./buffers.d.ts"
// Reviewable buffers of speech events, such as chat and combat logs, with a manager that moves between them and speaks what it finds.

import { EventEmitter } from './events.js';
import { pluralize } from './text.js';

function toItem(textOrItem) {
	const item = typeof textOrItem === 'string' ? { text: textOrItem } : textOrItem;
	if (!item || typeof item.text !== 'string') throw new TypeError('buffer items need a text string');
	item.time ??= Date.now();
	item.data ??= null;
	return item;
}

export class Buffer {
	constructor(name, { maxItems = Infinity } = {}) {
		this.name = name;
		this.items = [];
		this.position = -1;
		this.maxItems = maxItems;
	}

	get length() {
		return this.items.length;
	}

	get current() {
		return this.items[this.position] ?? null;
	}

	add(textOrItem) {
		const item = toItem(textOrItem);
		this.items.push(item);
		if (this.position === -1) this.position = 0;
		while (this.items.length > this.maxItems) {
			this.items.shift();
			if (this.position > 0) this.position -= 1;
		}
		if (this.items.length === 0) this.position = -1;
		return item;
	}

	clear() {
		this.items = [];
		this.position = -1;
	}
}

export class BufferManager extends EventEmitter {
	constructor({ speech = null } = {}) {
		super();
		this.buffers = [];
		this.position = -1;
		this.speech = speech;
	}

	get current() {
		return this.buffers[this.position] ?? null;
	}

	_speak(text, interrupt = true) {
		this.speech?.speak(text, interrupt);
	}

	_resolve(target) {
		if (target instanceof Buffer) return this.buffers.includes(target) ? target : null;
		return this.getBuffer(target);
	}

	getBuffer(name) {
		return this.buffers.find(buffer => buffer.name === name) ?? null;
	}

	createBuffer(name, options = {}) {
		if (this.getBuffer(name)) throw new Error(`buffer ${name} already exists`);
		const buffer = new Buffer(name, options);
		this.buffers.push(buffer);
		const wasEmpty = this.position === -1;
		if (wasEmpty) this.position = 0;
		this.emit('create', { manager: this, buffer });
		if (wasEmpty) this.emit('focus', { manager: this, buffer: this.current });
		return buffer;
	}

	deleteBuffer(target) {
		const buffer = this._resolve(target);
		if (!buffer) return false;
		const previousCurrent = this.current;
		const index = this.buffers.indexOf(buffer);
		this.buffers.splice(index, 1);
		if (index <= this.position) this.position -= 1;
		if (this.position === -1 && this.buffers.length > 0) this.position = 0;
		this.emit('delete', { manager: this, buffer });
		if (this.current !== previousCurrent) this.emit('focus', { manager: this, buffer: this.current });
		return true;
	}

	clearBuffer(target) {
		const buffer = this._resolve(target);
		if (!buffer) return false;
		buffer.clear();
		this.emit('clear', { manager: this, buffer });
		return true;
	}

	speakBufferDetails(buffer) {
		this._speak(`${buffer.name}: ${pluralize(buffer.length, 'item')}`);
	}

	_setBufferPosition(index, silent) {
		const changed = index !== this.position;
		this.position = index;
		if (changed) this.emit('focus', { manager: this, buffer: this.current });
		if (!silent) this.speakBufferDetails(this.current);
	}

	focusBuffer(target, { silent = false } = {}) {
		const buffer = this._resolve(target);
		if (!buffer) return false;
		this._setBufferPosition(this.buffers.indexOf(buffer), silent);
		return true;
	}

	_moveBuffer(step, wrap, silent) {
		const count = this.buffers.length;
		if (count === 0) return;
		let index = this.position + step;
		index = wrap ? (index + count) % count : Math.min(Math.max(index, 0), count - 1);
		this._setBufferPosition(index, silent);
	}

	nextBuffer({ wrap = false, silent = false } = {}) {
		this._moveBuffer(1, wrap, silent);
	}

	previousBuffer({ wrap = false, silent = false } = {}) {
		this._moveBuffer(-1, wrap, silent);
	}

	firstBuffer({ silent = false } = {}) {
		if (this.buffers.length > 0) this._setBufferPosition(0, silent);
	}

	lastBuffer({ silent = false } = {}) {
		if (this.buffers.length > 0) this._setBufferPosition(this.buffers.length - 1, silent);
	}

	speakCurrentItem() {
		const buffer = this.current;
		if (!buffer) return;
		if (buffer.length === 0) {
			this._speak(`${buffer.name}: no items`);
			return;
		}
		this._speak(buffer.current.text);
	}

	_setItemPosition(index) {
		const buffer = this.current;
		if (index !== buffer.position) {
			buffer.position = index;
			this.emit('move', { manager: this, buffer });
		}
		this.speakCurrentItem();
	}

	_moveItem(step, wrap) {
		const buffer = this.current;
		if (!buffer || buffer.length === 0) {
			this.speakCurrentItem();
			return;
		}
		const count = buffer.length;
		let index = buffer.position + step;
		index = wrap ? (index + count) % count : Math.min(Math.max(index, 0), count - 1);
		this._setItemPosition(index);
	}

	nextBufferItem({ wrap = false } = {}) {
		this._moveItem(1, wrap);
	}

	previousBufferItem({ wrap = false } = {}) {
		this._moveItem(-1, wrap);
	}

	firstBufferItem() {
		const buffer = this.current;
		if (!buffer || buffer.length === 0) {
			this.speakCurrentItem();
			return;
		}
		this._setItemPosition(0);
	}

	lastBufferItem() {
		const buffer = this.current;
		if (!buffer || buffer.length === 0) {
			this.speakCurrentItem();
			return;
		}
		this._setItemPosition(buffer.length - 1);
	}

	addItem(target, textOrItem, { silent = false } = {}) {
		const buffer = this._resolve(target);
		if (!buffer) throw new Error(`unknown buffer ${target}`);
		const item = buffer.add(textOrItem);
		this.emit('add', { manager: this, buffer, item });
		if (!silent) this._speak(item.text, false);
		return item;
	}
}

export function createBufferManager(options = {}) {
	return new BufferManager(options);
}
