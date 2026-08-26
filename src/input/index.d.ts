/// <reference lib="dom" />

import type { GamepadButtonRef, GamepadInstance } from './gamepad.js';

export * from './gamepad.js';

export interface KeyboardOptions {
	// Defaults to `window`.
	target?: HTMLElement | Window | null;
}

export type KeyboardEventName = 'keydown' | 'keyup' | 'keypress';

export interface KeyboardInstance {
	readonly attached: boolean;
	// Key names are compared lowercase, so 'a' matches a shifted 'A'.
	isDown(key: string): boolean;
	// `keypress` skips operating system repeats, so it is one discrete action.
	on(event: KeyboardEventName, handler: (event: KeyboardEvent) => void): void;
	off(event: KeyboardEventName, handler: (event: KeyboardEvent) => void): void;
	attach(): void;
	dispose(): void;
}

export interface MouseOptions {
	// Defaults to `window`.
	target?: HTMLElement | Window | null;
}

export interface MousePosition {
	x: number;
	y: number;
}

export type MouseEventName = 'mousedown' | 'mouseup' | 'mousemove';

export interface MouseInstance {
	readonly attached: boolean;
	// Only the primary button is tracked.
	isButtonDown(): boolean;
	getPosition(): MousePosition;
	on(event: MouseEventName, handler: (position: MousePosition) => void): void;
	off(event: MouseEventName, handler: (position: MousePosition) => void): void;
	attach(): void;
	dispose(): void;
}

export interface TouchOptions {
	// Defaults to `document.body`.
	target?: HTMLElement | null;
	tapMaxDistance?: number;
	tapMaxDuration?: number;
	swipeMinDistance?: number;
	swipeMaxDuration?: number;
	// How long a tap waits for a follow up tap before it is emitted.
	multiTapWindow?: number;
	multiTapMaxDistance?: number;
	// A tap emits at once when it reaches this count.
	maxTapCount?: number;
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeEvent {
	direction: SwipeDirection;
	fingerCount: number;
	distance: number;
	duration: number;
}

export interface TapEvent {
	fingerCount: number;
	tapCount: number;
	x: number;
	y: number;
}

export interface Finger {
	id: number;
	x: number;
	y: number;
}

export interface TouchInstance {
	readonly attached: boolean;
	fingerCount(): number;
	getFinger(index: number): Finger | null;
	getAllFingers(): Finger[];
	on(event: 'tap', handler: (event: TapEvent) => void): void;
	on(event: 'swipe', handler: (event: SwipeEvent) => void): void;
	on(event: 'touchstart' | 'touchmove' | 'touchend', handler: (event: TouchEvent) => void): void;
	off(event: 'tap', handler: (event: TapEvent) => void): void;
	off(event: 'swipe', handler: (event: SwipeEvent) => void): void;
	off(event: 'touchstart' | 'touchmove' | 'touchend', handler: (event: TouchEvent) => void): void;
	attach(): void;
	dispose(): void;
}

// A tap or swipe is matched by comparing every listed property against the
// event, so `{ fingerCount: 2 }` matches any two finger tap.
export interface TapBindingSpec {
	fingerCount?: number;
	tapCount?: number;
}

export interface SwipeBindingSpec {
	direction?: SwipeDirection;
	fingerCount?: number;
}

export interface ActionBinding {
	// Keys that count while held. Available through `wasTriggered` only, because
	// holding produces no discrete trigger.
	hold?: string[];
	// Keys that count once per press.
	press?: string[];
	gamepad?: GamepadButtonRef[];
	tap?: TapBindingSpec[];
	swipe?: SwipeBindingSpec[];
}

export type DescribedBinding =
	| { kind: 'hold' | 'press'; key: string }
	| { kind: 'gamepad'; button: number }
	| ({ kind: 'tap' } & TapBindingSpec)
	| ({ kind: 'swipe' } & SwipeBindingSpec);

export interface DescribedAction {
	name: string;
	bindings: DescribedBinding[];
}

export interface ActionEvent {
	name: string;
}

export interface InputHandlerOptions {
	keyboard?: KeyboardInstance | null;
	touch?: TouchInstance | null;
	gamepad?: GamepadInstance | null;
	// Listen to the sources right away. Defaults to true.
	attach?: boolean;
}

export interface InputHandlerInstance {
	readonly attached: boolean;
	bind(name: string, binding: ActionBinding): void;
	unbind(name: string): void;
	// True once per discrete trigger, or while a `hold` key is down. Consumes
	// the pending trigger.
	wasTriggered(name: string): boolean;
	on(name: string, handler: (event: ActionEvent) => void): void;
	off(name: string, handler: (event: ActionEvent) => void): void;
	// Null when the named action has no binding.
	describe(name: string): DescribedAction | null;
	describe(): DescribedAction[];
	attach(): void;
	detach(): void;
	dispose(): void;
}

export function createKeyboard(options?: KeyboardOptions): KeyboardInstance;
export function createMouse(options?: MouseOptions): MouseInstance;
export function createTouch(options?: TouchOptions): TouchInstance;
export function createInputHandler(options?: InputHandlerOptions): InputHandlerInstance;
// Renders one entry from `describe()` as display text, such as "Gamepad A".
export function formatBinding(binding: DescribedBinding): string;
