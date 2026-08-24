import type { StorageInstance } from './storage.d.ts';

export interface Codec<T = any> {
	encode(msg: T): string;
	decode(raw: string): T;
}

export interface WrapSocketOptions<T = any> {
	codec?: Codec<T>;
	onMessage?: (msg: T) => void;
	onClose?: (event: any) => void;
	onError?: (event: any) => void;
}

export interface WrappedSocket<T = any> {
	send(msg: T): void;
	close(code?: number, reason?: string): void;
	readonly readyState: number;
}

export interface ReconnectingClientOptions<T = any> {
	url: string;
	codec?: Codec<T>;
	backoffs?: number[];
	onOpen?: (socket: WrappedSocket<T>) => void;
	onMessage?: (msg: T) => void;
	onClose?: (event: any) => void;
	onError?: (event: any) => void;
}

export interface ReconnectingClient<T = any> {
	send(msg: T): void;
	close(): void;
	readonly readyState: number;
}

export interface IdentityRecord {
	clientId: string | null;
	sessionToken: string | null;
	name: string | null;
}

export interface IdentityOptions {
	key?: string;
}

export interface Identity {
	get(): IdentityRecord;
	set(fields: Partial<IdentityRecord>): void;
	clear(): void;
}

export function wrapSocket<T = any>(socket: any, options?: WrapSocketOptions<T>): WrappedSocket<T>;
export function createReconnectingClient<T = any>(options: ReconnectingClientOptions<T>): ReconnectingClient<T>;
export function createIdentity(storage: StorageInstance, options?: IdentityOptions): Identity;
