
/** Common names accepted for standard gamepad buttons. */
export type GamepadButtonAlias =
	| 'a' | 'south' | 'b' | 'east' | 'x' | 'west' | 'y' | 'north'
	| 'lb' | 'l1' | 'rb' | 'r1' | 'lt' | 'l2' | 'rt' | 'r2'
	| 'select' | 'back' | 'start' | 'menu'
	| 'l3' | 'leftstick' | 'r3' | 'rightstick'
	| 'dpad_up' | 'up' | 'dpad_down' | 'down'
	| 'dpad_left' | 'left' | 'dpad_right' | 'right'
	| 'guide' | 'home';

/** A standard button index or recognized button name. */
export type GamepadButtonRef = number | GamepadButtonAlias | (string & {});

/** Configuration for {@link createGamepad}. */
export interface GamepadOptions {
	/** Connect and disconnect event target. Defaults to `window`. */
	target?: HTMLElement | Window | null;
	/** Axis magnitudes below this value read as zero. Defaults to `0.25`. */
	deadzone?: number;
	/** Fixed gamepad index. `null` follows the first connected gamepad. */
	index?: number | null;
}

/** Dual rumble effect options. */
export interface GamepadVibrateOptions {
	/** Effect duration in milliseconds. */
	duration?: number;
	/** Low frequency motor magnitude from `0` through `1`. */
	strongMagnitude?: number;
	/** High frequency motor magnitude from `0` through `1`. */
	weakMagnitude?: number;
}

/** Data emitted when a gamepad button changes state. */
export interface GamepadButtonEvent {
	/** Standard button index. */
	button: number;
	/** Browser gamepad snapshot containing the button. */
	gamepad: Gamepad;
}

/** Polled gamepad state, button events, axes, and vibration controls. */
export interface GamepadInstance {
	/** Whether connection listeners are attached. */
	readonly attached: boolean;
	/** Selected gamepad index, or `null` while following available pads. */
	index: number | null;
	/** Reads current state and raises button events. Call once per frame. */
	poll(): void;
	/** Returns whether a button is currently held. */
	isDown(button: GamepadButtonRef): boolean;
	/** Returns whether a button changed to pressed during the latest poll. */
	pressed(button: GamepadButtonRef): boolean;
	/** Returns whether a button changed to released during the latest poll. */
	released(button: GamepadButtonRef): boolean;
	/** Returns a deadzone adjusted axis value, or zero when unavailable. */
	getAxis(axisIndex: number): number;
	/** Starts a dual rumble effect and reports whether it was accepted. */
	vibrate(options?: GamepadVibrateOptions): Promise<boolean>;
	/** Registers a gamepad connection handler. */
	on(event: 'gamepadconnected' | 'gamepaddisconnected', handler: (event: GamepadEvent) => void): void;
	/** Registers a normalized button transition handler. */
	on(event: 'buttonpress' | 'buttonrelease', handler: (event: GamepadButtonEvent) => void): void;
	/** Removes a gamepad connection handler. */
	off(event: 'gamepadconnected' | 'gamepaddisconnected', handler: (event: GamepadEvent) => void): void;
	/** Removes a normalized button transition handler. */
	off(event: 'buttonpress' | 'buttonrelease', handler: (event: GamepadButtonEvent) => void): void;
	/** Attaches connection listeners when detached. */
	attach(): void;
	/** Detaches listeners and clears tracked gamepad state. */
	dispose(): void;
}

/** Creates a polled gamepad input source. */
export function createGamepad(options?: GamepadOptions): GamepadInstance;
