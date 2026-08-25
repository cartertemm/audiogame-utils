/// <reference lib="dom" />

export interface GamepadOptions {
	target?: HTMLElement | Window | null;
	deadzone?: number;
	index?: number | null;
}

export interface GamepadVibrateOptions {
	duration?: number;
	strongMagnitude?: number;
	weakMagnitude?: number;
}

export interface GamepadInstance {
	readonly attached: boolean;
	index: number | null;
	poll(): void;
	isDown(button: number | string): boolean;
	pressed(button: number | string): boolean;
	released(button: number | string): boolean;
	getAxis(axisIndex: number): number;
	vibrate(options?: GamepadVibrateOptions): Promise<boolean>;
	on(event: 'gamepadconnected' | 'gamepaddisconnected' | 'buttonpress' | 'buttonrelease', handler: Function): void;
	off(event: string, handler: Function): void;
	attach(): void;
	dispose(): void;
}

export function createGamepad(options?: GamepadOptions): GamepadInstance;
