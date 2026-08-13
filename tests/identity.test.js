import { describe, test, expect, beforeEach } from 'vitest';
import { createStorage } from '../src/storage.js';
import { createIdentity } from '../src/net/identity.js';

describe('createIdentity', () => {
	let identity;

	beforeEach(() => {
		identity = createIdentity(createStorage('game'));
	});

	test('get returns nulls when nothing is stored', () => {
		expect(identity.get()).toEqual({ clientId: null, sessionToken: null, name: null });
	});

	test('set persists all three fields atomically', () => {
		identity.set({ clientId: 'c1', sessionToken: 't1', name: 'Swift Otter' });
		expect(identity.get()).toEqual({
			clientId: 'c1', sessionToken: 't1', name: 'Swift Otter',
		});
	});

	test('set merges rather than replacing', () => {
		identity.set({ clientId: 'c1', sessionToken: 't1', name: 'A' });
		identity.set({ name: 'B' });
		expect(identity.get()).toEqual({ clientId: 'c1', sessionToken: 't1', name: 'B' });
	});

	test('set works before any handshake has happened', () => {
		identity.set({ name: 'A' });
		expect(identity.get()).toEqual({ clientId: null, sessionToken: null, name: 'A' });
	});

	test('clear removes the stored record', () => {
		identity.set({ clientId: 'c1', sessionToken: 't1', name: 'A' });
		identity.clear();
		expect(identity.get()).toEqual({ clientId: null, sessionToken: null, name: null });
	});

	test('a custom key keeps two identities apart', () => {
		const other = createIdentity(createStorage('game'), { key: 'spectator' });
		identity.set({ name: 'player' });
		other.set({ name: 'watcher' });
		expect(identity.get().name).toBe('player');
		expect(other.get().name).toBe('watcher');
	});

	test('requires a storage', () => {
		expect(() => createIdentity()).toThrow();
	});
});
