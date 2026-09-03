import type { ScreenFn } from './index.js';

/** Configuration for {@link createRouter}. */
export interface RouterOptions {
	/** Element every screen renders into. */
	root: HTMLElement;
	/** Binds escape to {@link Router.back}. Defaults to true. */
	escape?: boolean;
}

/** Per navigation overrides. */
export interface NavigateOptions {
	/** Set false to stop escape leaving this screen. */
	escape?: boolean;
}

/** A stack of screens with back navigation. */
export interface Router {
	/** Number of screens on the stack. */
	readonly depth: number;
	/** Screen function on top of the stack, or `null` when empty. */
	readonly current: ScreenFn | null;
	/** Renders a screen and pushes it onto the stack. */
	go<P = any>(screen: ScreenFn<P>, props?: P, options?: NavigateOptions): void;
	/** Renders a screen in place of the current one, without growing the stack. */
	replace<P = any>(screen: ScreenFn<P>, props?: P, options?: NavigateOptions): void;
	/** Returns to the previous screen and restores its focus. False at the root. */
	back(): boolean;
	/** Disposes the current screen, clears the stack, and unbinds escape. */
	dispose(): void;
}

/** Creates a screen router over one root element. */
export function createRouter(options: RouterOptions): Router;
