export interface KeyboardOptions {
	target?: HTMLElement | Window;
}

export interface KeyboardInstance {
	isDown(key: string): boolean;
	pressed(key: string): boolean;
	released(key: string): boolean;
	reset(): void;
	dispose(): void;
}

export interface MouseOptions {
	target?: HTMLElement;
}

export interface MousePosition {
	x: number;
	y: number;
}

export interface MouseInstance {
	position(): MousePosition;
	delta(): MousePosition;
	isDown(button?: number): boolean;
	pressed(button?: number): boolean;
	released(button?: number): boolean;
	reset(): void;
	dispose(): void;
}

export interface TouchOptions {
	target?: HTMLElement;
	multiTapWindow?: number;
}

export interface SwipeEvent {
	direction: 'left' | 'right' | 'up' | 'down';
	fingerCount: number;
}

export interface TapEvent {
	fingerCount: number;
	tapCount: number;
}

export interface TouchInstance {
	on(event: 'swipe', handler: (e: SwipeEvent) => void): void;
	on(event: 'tap', handler: (e: TapEvent) => void): void;
	off(event: string, handler: Function): void;
	dispose(): void;
}

export interface InputHandlerOptions {
	keyboard?: KeyboardInstance;
	mouse?: MouseInstance;
	touch?: TouchInstance;
	bindings?: Record<string, string[]>;
}

export interface InputHandlerInstance {
	active(action: string): boolean;
	pressed(action: string): boolean;
	released(action: string): boolean;
	bind(action: string, binding: string): void;
	unbind(action: string, binding: string): void;
	reset(): void;
	dispose(): void;
}

export function createKeyboard(options?: KeyboardOptions): KeyboardInstance;
export function createMouse(options?: MouseOptions): MouseInstance;
export function createTouch(options?: TouchOptions): TouchInstance;
export function createInputHandler(options?: InputHandlerOptions): InputHandlerInstance;
export function formatBinding(binding: string): string;
