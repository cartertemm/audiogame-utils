/**
 * Window and application control, with a web implementation and a native one.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/tauri.md | Tauri guide}.
 *
 * @module
 */
/** Window and application control operations. */
export interface WindowControl {
	/** Sets the window or document title. */
	setTitle(text: string): boolean | Promise<boolean>;
	/** Enters or leaves fullscreen. Resolves `false` when the request is refused. */
	setFullscreen(on: boolean): Promise<boolean>;
	/** Resolves whether the window is fullscreen. */
	isFullscreen(): Promise<boolean>;
	/** Toggles fullscreen. Resolves `false` when the request is refused. */
	toggleFullscreen(): Promise<boolean>;
	/** Quits the application. Resolves `false` on the web, which cannot quit itself. */
	quit(): Promise<boolean>;
	/** Runs `handler` before the window closes. Return `false` to ask for the close to be blocked. Returns a function that removes the handler. */
	onCloseRequest(handler: () => boolean | void): () => void;
	/** Holds off screen sleep. Resolves `false` when the platform refuses or lacks support. */
	keepAwake(on: boolean): Promise<boolean>;
	/** Opens a URL outside the game. Resolves `false` when unsupported. */
	openUrl(url: string): Promise<boolean>;
}

/** The web implementation, used when no native adapter is registered. */
export const webWindow: WindowControl;

/** Sets the window or document title. */
export function setTitle(text: string): boolean | Promise<boolean>;
/** Enters or leaves fullscreen. */
export function setFullscreen(on: boolean): Promise<boolean>;
/** Resolves whether the window is fullscreen. */
export function isFullscreen(): Promise<boolean>;
/** Toggles fullscreen. */
export function toggleFullscreen(): Promise<boolean>;
/** Quits the application. Resolves `false` on the web. */
export function quit(): Promise<boolean>;
/** Runs `handler` before the window closes. Returns a function that removes the handler. */
export function onCloseRequest(handler: () => boolean | void): () => void;
/** Holds off screen sleep. */
export function keepAwake(on: boolean): Promise<boolean>;
/** Opens a URL outside the game. */
export function openUrl(url: string): Promise<boolean>;
