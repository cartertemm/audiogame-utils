import { describe, test, expect } from 'vitest';
import { createGroup } from '../src/net/group.js';

// The group only needs these two fields from a client. Task 5 builds the real
// one.
function makeClient(id) {
	return {
		id,
		groups: new Set(),
		received: [],
		send(msg) { this.received.push(msg); return true; },
	};
}

describe('createGroup', () => {
	test('starts empty with a name and its own data bag', () => {
		const group = createGroup('lobby');
		expect(group.name).toBe('lobby');
		expect(group.clients).toEqual([]);
		expect(group.data).toEqual({});
	});

	test('add puts the client in the group and the group on the client', () => {
		const group = createGroup('lobby');
		const client = makeClient('a');
		group.add(client);
		expect(group.clients).toEqual([client]);
		expect(group.has(client)).toBe(true);
		expect(client.groups.has(group)).toBe(true);
	});

	test('adding twice does not duplicate the member', () => {
		const group = createGroup('lobby');
		const client = makeClient('a');
		group.add(client);
		group.add(client);
		expect(group.clients).toHaveLength(1);
	});

	test('remove takes the client out of both sides', () => {
		const group = createGroup('lobby', { persist: true });
		const client = makeClient('a');
		group.add(client);
		group.remove(client);
		expect(group.clients).toEqual([]);
		expect(group.has(client)).toBe(false);
		expect(client.groups.has(group)).toBe(false);
	});

	test('removing a client that is not a member does nothing', () => {
		const empties = [];
		const group = createGroup('lobby', { onEmpty: g => empties.push(g.name) });
		group.remove(makeClient('a'));
		expect(empties).toEqual([]);
	});

	test('send reaches every member', () => {
		const group = createGroup('lobby');
		const a = makeClient('a');
		const b = makeClient('b');
		group.add(a);
		group.add(b);
		group.send({ type: 'chat', text: 'hi' });
		expect(a.received).toEqual([{ type: 'chat', text: 'hi' }]);
		expect(b.received).toEqual([{ type: 'chat', text: 'hi' }]);
	});

	test('send skips one excluded client', () => {
		const group = createGroup('lobby');
		const a = makeClient('a');
		const b = makeClient('b');
		group.add(a);
		group.add(b);
		group.send({ type: 'chat' }, { except: a });
		expect(a.received).toEqual([]);
		expect(b.received).toEqual([{ type: 'chat' }]);
	});

	test('send skips a list of excluded clients', () => {
		const group = createGroup('lobby');
		const a = makeClient('a');
		const b = makeClient('b');
		const c = makeClient('c');
		group.add(a);
		group.add(b);
		group.add(c);
		group.send({ type: 'chat' }, { except: [a, b] });
		expect(a.received).toEqual([]);
		expect(b.received).toEqual([]);
		expect(c.received).toEqual([{ type: 'chat' }]);
	});

	test('onEmpty fires when the last member leaves', () => {
		const empties = [];
		const group = createGroup('lobby', { onEmpty: g => empties.push(g.name) });
		const a = makeClient('a');
		const b = makeClient('b');
		group.add(a);
		group.add(b);
		group.remove(a);
		expect(empties).toEqual([]);
		group.remove(b);
		expect(empties).toEqual(['lobby']);
	});

	test('a persistent group does not fire onEmpty when it empties', () => {
		const empties = [];
		const group = createGroup('lobby', { persist: true, onEmpty: g => empties.push(g.name) });
		const a = makeClient('a');
		group.add(a);
		group.remove(a);
		expect(empties).toEqual([]);
	});

	test('close removes every member and fires onEmpty, even when persistent', () => {
		const empties = [];
		const group = createGroup('lobby', { persist: true, onEmpty: g => empties.push(g.name) });
		const a = makeClient('a');
		const b = makeClient('b');
		group.add(a);
		group.add(b);
		group.close();
		expect(group.clients).toEqual([]);
		expect(a.groups.has(group)).toBe(false);
		expect(b.groups.has(group)).toBe(false);
		expect(empties).toEqual(['lobby']);
	});
});
