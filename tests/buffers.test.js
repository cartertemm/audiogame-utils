import { describe, test, expect, vi } from 'vitest';
import { Buffer, BufferManager, createBufferManager } from '../src/buffers.js';

describe('Buffer', () => {
	test('starts empty with position -1', () => {
		const buffer = new Buffer('Chat');
		expect(buffer.name).toBe('Chat');
		expect(buffer.items).toEqual([]);
		expect(buffer.position).toBe(-1);
		expect(buffer.length).toBe(0);
		expect(buffer.current).toBeNull();
		expect(buffer.maxItems).toBe(Infinity);
	});

	test('wraps a string into an item with time and data', () => {
		const buffer = new Buffer('Chat');
		const before = Date.now();
		const item = buffer.add('hello');
		expect(item.text).toBe('hello');
		expect(item.time).toBeGreaterThanOrEqual(before);
		expect(item.data).toBeNull();
		expect(buffer.items).toEqual([item]);
	});

	test('keeps an object item and fills missing fields', () => {
		const buffer = new Buffer('Chat');
		const source = { text: 'hi', data: { player: 1 } };
		const item = buffer.add(source);
		expect(item).toBe(source);
		expect(item.data).toEqual({ player: 1 });
		expect(typeof item.time).toBe('number');
	});

	test('rejects items without a text string', () => {
		const buffer = new Buffer('Chat');
		expect(() => buffer.add({ data: 1 })).toThrow(TypeError);
		expect(() => buffer.add(5)).toThrow(TypeError);
	});

	test('moves position to 0 on the first add and leaves it alone afterwards', () => {
		const buffer = new Buffer('Chat');
		buffer.add('one');
		expect(buffer.position).toBe(0);
		buffer.add('two');
		expect(buffer.position).toBe(0);
		expect(buffer.current.text).toBe('one');
	});

	test('drops the oldest item past maxItems and shifts the cursor', () => {
		const buffer = new Buffer('Chat', { maxItems: 2 });
		buffer.add('one');
		buffer.add('two');
		buffer.position = 1;
		buffer.add('three');
		expect(buffer.items.map(i => i.text)).toEqual(['two', 'three']);
		expect(buffer.position).toBe(0);
		expect(buffer.current.text).toBe('two');
	});

	test('keeps the cursor at 0 when the item under it drops', () => {
		const buffer = new Buffer('Chat', { maxItems: 2 });
		buffer.add('one');
		buffer.add('two');
		buffer.add('three');
		expect(buffer.position).toBe(0);
		expect(buffer.current.text).toBe('two');
	});

	test('clear empties the buffer and resets position', () => {
		const buffer = new Buffer('Chat');
		buffer.add('one');
		buffer.clear();
		expect(buffer.items).toEqual([]);
		expect(buffer.position).toBe(-1);
		expect(buffer.current).toBeNull();
	});

	test('a buffer with maxItems 0 stays empty and keeps position -1 after add', () => {
		const buffer = new Buffer('Chat', { maxItems: 0 });
		buffer.add('one');
		expect(buffer.items).toEqual([]);
		expect(buffer.position).toBe(-1);
		expect(buffer.current).toBeNull();
	});
});

function fakeSpeech() {
	return { speak: vi.fn() };
}

function spoken(speech) {
	return speech.speak.mock.calls.map(call => call[0]);
}

describe('BufferManager buffers', () => {
	test('createBufferManager returns a manager with no buffers', () => {
		const manager = createBufferManager();
		expect(manager).toBeInstanceOf(BufferManager);
		expect(manager.buffers).toEqual([]);
		expect(manager.position).toBe(-1);
		expect(manager.current).toBeNull();
		expect(manager.speech).toBeNull();
	});

	test('createBuffer adds a buffer, focuses the first one, and emits create', () => {
		const manager = createBufferManager();
		const seen = [];
		manager.on('create', event => seen.push(event));
		const chat = manager.createBuffer('Chat', { maxItems: 5 });
		expect(chat).toBeInstanceOf(Buffer);
		expect(chat.maxItems).toBe(5);
		expect(manager.buffers).toEqual([chat]);
		expect(manager.position).toBe(0);
		expect(manager.current).toBe(chat);
		expect(seen).toEqual([{ manager, buffer: chat }]);
		manager.createBuffer('Log');
		expect(manager.position).toBe(0);
	});

	test('creating the first buffer emits focus', () => {
		const manager = createBufferManager();
		const seen = [];
		manager.on('focus', event => seen.push(event.buffer));
		const chat = manager.createBuffer('Chat');
		manager.createBuffer('Log');
		expect(seen).toEqual([chat]);
	});

	test('createBuffer throws on a duplicate name', () => {
		const manager = createBufferManager();
		manager.createBuffer('Chat');
		expect(() => manager.createBuffer('Chat')).toThrow(/Chat/);
	});

	test('getBuffer finds by name', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		expect(manager.getBuffer('Chat')).toBe(chat);
		expect(manager.getBuffer('Nope')).toBeNull();
	});

	test('deleteBuffer accepts a name or a buffer and emits delete', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		const log = manager.createBuffer('Log');
		const seen = [];
		manager.on('delete', event => seen.push(event.buffer));
		expect(manager.deleteBuffer('Chat')).toBe(true);
		expect(manager.deleteBuffer(log)).toBe(true);
		expect(manager.deleteBuffer('Chat')).toBe(false);
		expect(manager.buffers).toEqual([]);
		expect(manager.position).toBe(-1);
		expect(seen).toEqual([chat, log]);
	});

	test('deleting the focused buffer moves focus to the previous one', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		manager.createBuffer('Log');
		manager.focusBuffer('Log', { silent: true });
		const seen = [];
		manager.on('focus', event => seen.push(event.buffer));
		manager.deleteBuffer('Log');
		expect(manager.current).toBe(chat);
		expect(seen).toEqual([chat]);
	});

	test('deleting the last buffer emits focus with a null buffer', () => {
		const manager = createBufferManager();
		manager.createBuffer('Chat');
		const seen = [];
		manager.on('focus', event => seen.push(event.buffer));
		manager.deleteBuffer('Chat');
		expect(manager.current).toBeNull();
		expect(seen).toEqual([null]);
	});

	test('deleting the first focused buffer moves focus to the new first buffer', () => {
		const manager = createBufferManager();
		manager.createBuffer('Chat');
		const log = manager.createBuffer('Log');
		manager.deleteBuffer('Chat');
		expect(manager.current).toBe(log);
		expect(manager.position).toBe(0);
	});

	test('deleting a buffer before the focused one keeps focus on the same buffer', () => {
		const manager = createBufferManager();
		manager.createBuffer('Chat');
		const log = manager.createBuffer('Log');
		manager.focusBuffer(log, { silent: true });
		const seen = [];
		manager.on('focus', event => seen.push(event.buffer));
		manager.deleteBuffer('Chat');
		expect(manager.current).toBe(log);
		expect(seen).toEqual([]);
	});

	test('clearBuffer empties the buffer and emits clear', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		chat.add('hi');
		const seen = [];
		manager.on('clear', event => seen.push(event.buffer));
		expect(manager.clearBuffer('Chat')).toBe(true);
		expect(chat.length).toBe(0);
		expect(seen).toEqual([chat]);
		expect(manager.clearBuffer('Nope')).toBe(false);
	});

	test('speakBufferDetails speaks the name and item count', () => {
		const speech = fakeSpeech();
		const manager = createBufferManager({ speech });
		const chat = manager.createBuffer('Chat');
		manager.speakBufferDetails(chat);
		chat.add('a');
		manager.speakBufferDetails(chat);
		chat.add('b');
		manager.speakBufferDetails(chat);
		expect(spoken(speech)).toEqual(['Chat: 0 items', 'Chat: 1 item', 'Chat: 2 items']);
		expect(speech.speak.mock.calls[0][1]).toBe(true);
	});

	test('focusBuffer speaks details and emits focus only when the buffer changes', () => {
		const speech = fakeSpeech();
		const manager = createBufferManager({ speech });
		manager.createBuffer('Chat');
		const log = manager.createBuffer('Log');
		const seen = [];
		manager.on('focus', event => seen.push(event.buffer));
		expect(manager.focusBuffer('Log')).toBe(true);
		expect(manager.focusBuffer('Log')).toBe(true);
		expect(manager.focusBuffer('Nope')).toBe(false);
		expect(seen).toEqual([log]);
		expect(spoken(speech)).toEqual(['Log: 0 items', 'Log: 0 items']);
	});

	test('nextBuffer and previousBuffer stop at the edges and repeat details', () => {
		const speech = fakeSpeech();
		const manager = createBufferManager({ speech });
		manager.createBuffer('Chat');
		manager.createBuffer('Log');
		manager.nextBuffer();
		manager.nextBuffer();
		expect(manager.position).toBe(1);
		manager.previousBuffer();
		manager.previousBuffer();
		expect(manager.position).toBe(0);
		expect(spoken(speech)).toEqual(['Log: 0 items', 'Log: 0 items', 'Chat: 0 items', 'Chat: 0 items']);
	});

	test('nextBuffer and previousBuffer wrap when asked', () => {
		const manager = createBufferManager();
		manager.createBuffer('Chat');
		manager.createBuffer('Log');
		manager.previousBuffer({ wrap: true });
		expect(manager.position).toBe(1);
		manager.nextBuffer({ wrap: true });
		expect(manager.position).toBe(0);
	});

	test('silent buffer moves say nothing', () => {
		const speech = fakeSpeech();
		const manager = createBufferManager({ speech });
		manager.createBuffer('Chat');
		manager.createBuffer('Log');
		manager.nextBuffer({ silent: true });
		manager.previousBuffer({ silent: true });
		manager.lastBuffer({ silent: true });
		manager.firstBuffer({ silent: true });
		expect(speech.speak).not.toHaveBeenCalled();
	});

	test('firstBuffer and lastBuffer jump and speak', () => {
		const speech = fakeSpeech();
		const manager = createBufferManager({ speech });
		manager.createBuffer('Chat');
		manager.createBuffer('Log');
		manager.createBuffer('System');
		manager.lastBuffer();
		expect(manager.position).toBe(2);
		manager.firstBuffer();
		expect(manager.position).toBe(0);
		expect(spoken(speech)).toEqual(['System: 0 items', 'Chat: 0 items']);
	});

	test('buffer moves with no buffers do nothing', () => {
		const speech = fakeSpeech();
		const manager = createBufferManager({ speech });
		manager.nextBuffer();
		manager.previousBuffer();
		manager.firstBuffer();
		manager.lastBuffer();
		expect(manager.position).toBe(-1);
		expect(speech.speak).not.toHaveBeenCalled();
	});

	test('works without a speech instance', () => {
		const manager = createBufferManager();
		manager.createBuffer('Chat');
		manager.createBuffer('Log');
		expect(() => manager.nextBuffer()).not.toThrow();
		expect(() => manager.speakBufferDetails(manager.current)).not.toThrow();
		expect(manager.position).toBe(1);
	});
});

describe('BufferManager items', () => {
	function setup() {
		const speech = fakeSpeech();
		const manager = createBufferManager({ speech });
		const chat = manager.createBuffer('Chat');
		chat.add('one');
		chat.add('two');
		chat.add('three');
		return { speech, manager, chat };
	}

	test('nextBufferItem and previousBufferItem move and speak the item', () => {
		const { speech, manager, chat } = setup();
		manager.nextBufferItem();
		expect(chat.position).toBe(1);
		manager.previousBufferItem();
		expect(chat.position).toBe(0);
		expect(spoken(speech)).toEqual(['two', 'one']);
		expect(speech.speak.mock.calls[0][1]).toBe(true);
	});

	test('item moves stop at the edges and repeat the current item', () => {
		const { speech, manager, chat } = setup();
		manager.previousBufferItem();
		expect(chat.position).toBe(0);
		manager.lastBufferItem();
		manager.nextBufferItem();
		expect(chat.position).toBe(2);
		expect(spoken(speech)).toEqual(['one', 'three', 'three']);
	});

	test('item moves wrap when asked', () => {
		const { manager, chat } = setup();
		manager.previousBufferItem({ wrap: true });
		expect(chat.position).toBe(2);
		manager.nextBufferItem({ wrap: true });
		expect(chat.position).toBe(0);
	});

	test('firstBufferItem and lastBufferItem jump and speak', () => {
		const { speech, manager, chat } = setup();
		manager.lastBufferItem();
		expect(chat.position).toBe(2);
		manager.firstBufferItem();
		expect(chat.position).toBe(0);
		expect(spoken(speech)).toEqual(['three', 'one']);
	});

	test('move is emitted only when the cursor changes', () => {
		const { manager, chat } = setup();
		const seen = [];
		manager.on('move', event => seen.push(event.buffer));
		manager.nextBufferItem();
		manager.firstBufferItem();
		manager.previousBufferItem();
		expect(seen).toEqual([chat, chat]);
	});

	test('speakCurrentItem speaks the current item', () => {
		const { speech, manager } = setup();
		manager.speakCurrentItem();
		expect(spoken(speech)).toEqual(['one']);
	});

	test('item moves on an empty buffer speak the empty message', () => {
		const speech = fakeSpeech();
		const manager = createBufferManager({ speech });
		manager.createBuffer('Chat');
		manager.nextBufferItem();
		manager.previousBufferItem();
		manager.firstBufferItem();
		manager.lastBufferItem();
		manager.speakCurrentItem();
		expect(spoken(speech)).toEqual(Array(5).fill('Chat: no items'));
	});

	test('item moves with no buffers do nothing', () => {
		const speech = fakeSpeech();
		const manager = createBufferManager({ speech });
		manager.nextBufferItem();
		manager.previousBufferItem();
		manager.firstBufferItem();
		manager.lastBufferItem();
		manager.speakCurrentItem();
		expect(speech.speak).not.toHaveBeenCalled();
	});

	test('addItem adds to the named buffer, speaks it, and emits add', () => {
		const speech = fakeSpeech();
		const manager = createBufferManager({ speech });
		manager.createBuffer('Chat');
		const log = manager.createBuffer('Log');
		const seen = [];
		manager.on('add', event => seen.push(event));
		const item = manager.addItem('Log', 'hit for 5');
		expect(log.items).toEqual([item]);
		expect(item.text).toBe('hit for 5');
		expect(seen).toEqual([{ manager, buffer: log, item }]);
		expect(speech.speak).toHaveBeenCalledWith('hit for 5', false);
	});

	test('addItem accepts a buffer, an item object, and silent', () => {
		const speech = fakeSpeech();
		const manager = createBufferManager({ speech });
		const chat = manager.createBuffer('Chat');
		const quiet = manager.addItem(chat, { text: 'psst', data: 1 }, { silent: true });
		expect(quiet.data).toBe(1);
		expect(speech.speak).not.toHaveBeenCalled();
	});

	test('addItem throws for an unknown buffer', () => {
		const manager = createBufferManager();
		expect(() => manager.addItem('Nope', 'x')).toThrow(/Nope/);
	});

	test('addItem does not move the cursor', () => {
		const { manager, chat } = setup();
		manager.addItem(chat, 'four', { silent: true });
		expect(chat.position).toBe(0);
	});
});
