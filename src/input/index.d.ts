/**
 * Keyboard, mouse, touch, gamepad, and named action input.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/input.md | input guide}.
 *
 * @module
 */

import type { GamepadButtonRef, GamepadInstance } from './gamepad.js';

export * from './gamepad.js';

/** Configuration for {@link createKeyboard}. */
export interface KeyboardOptions {
	/** Event target. Defaults to `window`. */
	target?: HTMLElement | Window | null;
}

/** Keyboard event names supported by {@link KeyboardInstance.on}. */
export type KeyboardEventName = 'keydown' | 'keyup' | 'keypress';

/** Keyboard state and event subscription controls. */
export interface KeyboardInstance {
	/** Whether keyboard listeners are attached. */
	readonly attached: boolean;
	/** Returns whether a key is held, comparing key names without case. */
	isDown(key: string): boolean;
	/** Registers a keyboard handler. `keypress` ignores operating system repeats. */
	on(event: KeyboardEventName, handler: (event: KeyboardEvent) => void): void;
	/** Removes a previously registered keyboard handler. */
	off(event: KeyboardEventName, handler: (event: KeyboardEvent) => void): void;
	/** Attaches listeners when detached. */
	attach(): void;
	/** Detaches listeners and clears held key state. */
	dispose(): void;
}

/** Configuration for {@link createMouse}. */
export interface MouseOptions {
	/** Event target. Defaults to `window`. */
	target?: HTMLElement | Window | null;
}

/** Latest mouse pointer coordinates in client pixels. */
export interface MousePosition {
	/** Horizontal client coordinate. */
	x: number;
	/** Vertical client coordinate. */
	y: number;
}

/** Mouse event names supported by {@link MouseInstance.on}. */
export type MouseEventName = 'mousedown' | 'mouseup' | 'mousemove';

/** Primary mouse button state and pointer event controls. */
export interface MouseInstance {
	/** Whether mouse listeners are attached. */
	readonly attached: boolean;
	/** Returns whether the primary button is held. */
	isButtonDown(): boolean;
	/** Returns a copy of the latest pointer coordinates. */
	getPosition(): MousePosition;
	/** Registers a handler that receives current pointer coordinates. */
	on(event: MouseEventName, handler: (position: MousePosition) => void): void;
	/** Removes a previously registered mouse handler. */
	off(event: MouseEventName, handler: (position: MousePosition) => void): void;
	/** Attaches listeners when detached. */
	attach(): void;
	/** Detaches listeners and clears primary button state. */
	dispose(): void;
}

/** Gesture thresholds and target for {@link createTouch}. */
export interface TouchOptions {
	/** Touch event target. Defaults to `document.body`. */
	target?: HTMLElement | null;
	/** Maximum movement in pixels for a tap. */
	tapMaxDistance?: number;
	/** Maximum tap duration in milliseconds. */
	tapMaxDuration?: number;
	/** Minimum movement in pixels for a swipe. */
	swipeMinDistance?: number;
	/** Maximum swipe duration in milliseconds. */
	swipeMaxDuration?: number;
	/** Milliseconds a tap waits for another tap before emission. */
	multiTapWindow?: number;
	/** Maximum distance in pixels between taps in one sequence. */
	multiTapMaxDistance?: number;
	/** Tap count that emits immediately without waiting for another tap. */
	maxTapCount?: number;
}

/** Cardinal direction detected for a swipe. */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/** Normalized swipe gesture data. */
export interface SwipeEvent {
	/** Dominant cardinal direction. */
	direction: SwipeDirection;
	/** Number of fingers participating in the gesture. */
	fingerCount: number;
	/** Gesture travel distance in pixels. */
	distance: number;
	/** Gesture duration in milliseconds. */
	duration: number;
}

/** Normalized tap gesture data. */
export interface TapEvent {
	/** Number of fingers participating in the gesture. */
	fingerCount: number;
	/** Number of taps in the recognized sequence. */
	tapCount: number;
	/** Horizontal client coordinate of the tap. */
	x: number;
	/** Vertical client coordinate of the tap. */
	y: number;
}

/** Current position of an active touch point. */
export interface Finger {
	/** Browser touch identifier. */
	id: number;
	/** Horizontal client coordinate. */
	x: number;
	/** Vertical client coordinate. */
	y: number;
}

/** Active fingers, gesture recognition, and raw touch event controls. */
export interface TouchInstance {
	/** Whether touch listeners are attached. */
	readonly attached: boolean;
	/** Returns the number of active fingers. */
	fingerCount(): number;
	/** Returns a copy of one active finger by zero based index, or `null`. */
	getFinger(index: number): Finger | null;
	/** Returns copies of all active fingers. */
	getAllFingers(): Finger[];
	/** Registers a normalized tap handler. */
	on(event: 'tap', handler: (event: TapEvent) => void): void;
	/** Registers a normalized swipe handler. */
	on(event: 'swipe', handler: (event: SwipeEvent) => void): void;
	/** Registers a raw touch event handler. */
	on(event: 'touchstart' | 'touchmove' | 'touchend', handler: (event: TouchEvent) => void): void;
	/** Removes a normalized tap handler. */
	off(event: 'tap', handler: (event: TapEvent) => void): void;
	/** Removes a normalized swipe handler. */
	off(event: 'swipe', handler: (event: SwipeEvent) => void): void;
	/** Removes a raw touch event handler. */
	off(event: 'touchstart' | 'touchmove' | 'touchend', handler: (event: TouchEvent) => void): void;
	/** Attaches listeners when detached. */
	attach(): void;
	/** Detaches listeners, clears fingers, and cancels pending taps. */
	dispose(): void;
}

/** Properties that a tap must match. Omitted properties match any value. */
export interface TapBindingSpec {
	/** Required number of participating fingers. */
	fingerCount?: number;
	/** Required tap count. */
	tapCount?: number;
}

/** Properties that a swipe must match. Omitted properties match any value. */
export interface SwipeBindingSpec {
	/** Required swipe direction. */
	direction?: SwipeDirection;
	/** Required number of participating fingers. */
	fingerCount?: number;
}

/** Physical controls that trigger one named action. */
export interface ActionBinding {
	/** Keys that count while held and are read through `wasTriggered`. */
	hold?: string[];
	/** Keys that trigger once per nonrepeating press. */
	press?: string[];
	/** Gamepad buttons that trigger once per press. */
	gamepad?: GamepadButtonRef[];
	/** Tap gesture patterns that trigger the action. */
	tap?: TapBindingSpec[];
	/** Swipe gesture patterns that trigger the action. */
	swipe?: SwipeBindingSpec[];
}

/** One normalized physical control in a described action. */
export type DescribedBinding =
	| { kind: 'hold' | 'press'; key: string }
	| { kind: 'gamepad'; button: number }
	| ({ kind: 'tap' } & TapBindingSpec)
	| ({ kind: 'swipe' } & SwipeBindingSpec);

/** A named action and its normalized physical controls. */
export interface DescribedAction {
	/** Action name. */
	name: string;
	/** Flattened controls bound to the action. */
	bindings: DescribedBinding[];
}

/** Data emitted when a named action is triggered. */
export interface ActionEvent {
	/** Triggered action name. */
	name: string;
}

/** Input sources and attachment behavior for {@link createInputHandler}. */
export interface InputHandlerOptions {
	/** Keyboard source, or `null` to disable keyboard input. */
	keyboard?: KeyboardInstance | null;
	/** Touch source, or `null` to disable touch input. */
	touch?: TouchInstance | null;
	/** Gamepad source, or `null` to disable gamepad input. */
	gamepad?: GamepadInstance | null;
	/** Listens to source events immediately. Defaults to `true`. */
	attach?: boolean;
}

/** Named actions composed from keyboard, touch, and gamepad controls. */
export interface InputHandlerInstance {
	/** Whether source event handlers are attached. */
	readonly attached: boolean;
	/** Replaces the physical controls assigned to an action. */
	bind(name: string, binding: ActionBinding): void;
	/** Removes a named action and any pending trigger. */
	unbind(name: string): void;
	/** Consumes one discrete trigger or reports whether a bound hold key is down. */
	wasTriggered(name: string): boolean;
	/** Registers a handler for one named action. */
	on(name: string, handler: (event: ActionEvent) => void): void;
	/** Removes a previously registered action handler. */
	off(name: string, handler: (event: ActionEvent) => void): void;
	/** Describes one named action, or returns `null` when it is not bound. */
	describe(name: string): DescribedAction | null;
	/** Describes every bound action in insertion order. */
	describe(): DescribedAction[];
	/** Attaches handlers to configured input sources. */
	attach(): void;
	/** Detaches source handlers without disposing the sources. */
	detach(): void;
	/** Detaches handlers and clears actions and pending triggers. */
	dispose(): void;
}

/** Creates a keyboard state tracker and event source. */
export function createKeyboard(options?: KeyboardOptions): KeyboardInstance;
/** Creates a primary mouse button and pointer position tracker. */
export function createMouse(options?: MouseOptions): MouseInstance;
/** Creates a touch tracker with tap and swipe recognition. */
export function createTouch(options?: TouchOptions): TouchInstance;
/** Creates a named action layer over optional input sources. */
export function createInputHandler(options?: InputHandlerOptions): InputHandlerInstance;
/** Formats one normalized binding as a readable control label. */
export function formatBinding(binding: DescribedBinding): string;
