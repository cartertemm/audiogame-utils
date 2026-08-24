export interface FocusTrapOptions {
	restoreFocus?: boolean;
	label?: string;
}

export interface FocusTrap {
	release(): void;
}

export function createFocusTrap(node: HTMLElement, options?: FocusTrapOptions): FocusTrap;
