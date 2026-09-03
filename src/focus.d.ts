/**
 * Keyboard trapping for accessible gameplay regions.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/focus.md | focus guide}.
 *
 * @module
 */
/** Configuration for {@link createFocusTrap}. */
export interface FocusTrapOptions {
	/** Restores focus to the previously focused element on release. Defaults to `true`. */
	restoreFocus?: boolean;
	/** Accessible label applied when the target does not already have one. */
	label?: string;
}

/** Controls an active gameplay focus trap. */
export interface FocusTrap {
	/** Removes listeners and attributes added by the trap and optionally restores focus. */
	release(): void;
}

/** Keeps keyboard focus inside a gameplay region and applies application semantics. */
/** Lists the focusable descendants of a node, in tab order. */
export function tabbable(node: HTMLElement): HTMLElement[];

export function createFocusTrap(node: HTMLElement, options?: FocusTrapOptions): FocusTrap;
