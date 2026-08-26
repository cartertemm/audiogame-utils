/// <reference lib="dom" />

// Buttons accept either a raw index or one of the layout aliases in
// `BUTTON_ALIASES`, such as 'a', 'start', or 'dpad_up'.
export type GamepadButtonAlias =
	| 'a' | 'south' | 'b' | 'east' | 'x' | 'west' | 'y' | 'north'
	| 'lb' | 'l1' | 'rb' | 'r1' | 'lt' | 'l2' | 'rt' | 'r2'
	| 'select' | 'back' | 'start' | 'menu'
	| 'l3' | 'leftstick' | 'r3' | 'rightstick'
	| 'dpad_up' | 'up' | 'dpad_down' | 'down'
	| 'dpad_left' | 'left' | 'dpad_right' | 'right'
	| 'guide' | 'home';

export type GamepadButtonRef = number | GamepadButtonAlias | (string & {});

export interface GamepadOptions {
	// Where the connect and disconnect listeners go. Defaults to `window`.
	target?: HTMLElement | Window | null;
	// Axis values below this magnitude read as 0.
	deadzone?: number;
	// Pins the instance to one pad. Null follows the first pad that connects.
	index?: number | null;
}

export interface GamepadVibrateOptions {
	duration?: number;
	strongMagnitude?: number;
	weakMagnitude?: number;
}

export interface GamepadButtonEvent {
	button: number;
	gamepad: Gamepad;
}

export interface GamepadInstance {
	readonly attached: boolean;
	index: number | null;
	// Reads the pad and raises button events. Call once per frame.
	poll(): void;
	isDown(button: GamepadButtonRef): boolean;
	pressed(button: GamepadButtonRef): boolean;
	released(button: GamepadButtonRef): boolean;
	getAxis(axisIndex: number): number;
	// False when the pad has no vibration actuator or the effect was refused.
	vibrate(options?: GamepadVibrateOptions): Promise<boolean>;
	on(event: 'gamepadconnected' | 'gamepaddisconnected', handler: (event: GamepadEvent) => void): void;
	on(event: 'buttonpress' | 'buttonrelease', handler: (event: GamepadButtonEvent) => void): void;
	off(event: 'gamepadconnected' | 'gamepaddisconnected', handler: (event: GamepadEvent) => void): void;
	off(event: 'buttonpress' | 'buttonrelease', handler: (event: GamepadButtonEvent) => void): void;
	attach(): void;
	dispose(): void;
}

export function createGamepad(options?: GamepadOptions): GamepadInstance;
