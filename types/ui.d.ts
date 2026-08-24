import type { SpeechInstance, SpeechMode } from './speech.d.ts';
import type { AudioInstance } from './audio.d.ts';
import type { FocusTrap } from './focus.d.ts';
import type { TouchInstance } from './input.d.ts';

export interface ElementAttributes {
	id?: string;
	class?: string;
	type?: string;
	text?: string;
	value?: string;
	for?: string;
	name?: string;
	checked?: 'checked';
	selected?: 'selected';
	autoFocus?: boolean;
	min?: string | number;
	max?: string | number;
	step?: string | number;
	role?: string;
	'aria-hidden'?: string;
	'aria-label'?: string;
	onClick?: (event: MouseEvent) => void;
	onChange?: (event: Event) => void;
	[key: string]: any;
}

export function el(tag: string, attrs?: ElementAttributes, ...children: (Node | string | null | undefined)[]): HTMLElement;
export function mount(container: HTMLElement, children: (Node | string | null | undefined)[]): void;
export function renderScreen(root: HTMLElement, renderFn: (root: HTMLElement, options?: any) => Function | void, options?: any): () => void;

export interface MenuItemOptions {
	id?: string | null;
	position?: number;
	disabled?: boolean;
	min?: number;
	max?: number;
	step?: number;
	defaultValue?: any;
	defaultState?: boolean;
	[key: string]: any;
}

export interface MenuItemInstance {
	id: string | null;
	type: 'text' | 'slider' | 'checkbox';
	label: string;
	disabled: boolean;
	node: HTMLElement;
	value: any;
	speak(): string;
	speakValue(): string;
	adjust(direction: number): boolean;
	toggle(): void;
	rebuild(): void;
}

export interface MenuOptions {
	root: HTMLElement;
	speech: SpeechInstance;
	audio?: AudioInstance | null;
	introText?: string;
	clickSound?: string;
	selectSound?: string;
	edgeSound?: string;
	wrapSound?: string;
	openSound?: string;
	closeSound?: string;
	soundsPrefix?: string;
	soundsSuffix?: string;
	wrap?: boolean;
	wrapDelay?: number;
	focusFirstItem?: boolean;
	firstLetterNavigation?: boolean;
	label?: string;
	multiTapWindow?: number;
}

export interface MenuInstance {
	readonly items: MenuItemInstance[];
	focusedItem: MenuItemInstance | string | number | null;
	focusedIndex: number;
	readonly values: Record<string, any>;
	item(id: string): MenuItemInstance | null;
	value(id: string): any;
	addItem(type: string, label: string, options?: MenuItemOptions): MenuItemInstance;
	addTextItem(text: string, options?: MenuItemOptions): MenuItemInstance;
	addSlider(text: string, min: number, max: number, defaultValue: number, options?: MenuItemOptions): MenuItemInstance;
	addCheckbox(text: string, defaultState?: boolean, options?: MenuItemOptions): MenuItemInstance;
	deleteItem(index: number, resetCursor?: boolean): boolean;
	deleteAllItems(): void;
	run(): Promise<MenuItemInstance | null>;
	close(): void;
}

export function createMenu(options: MenuOptions): MenuInstance;

export interface RenderInstallPwaIosOptions {
	title?: string;
	message?: string;
	instructions?: string;
	continueLabel?: string;
	onContinue?: () => void;
}

export function renderInstallPwaIos(root: HTMLElement, options?: RenderInstallPwaIosOptions): void;

export interface RenderSpeechSettingsOptions {
	speech: SpeechInstance;
	title?: string;
	modeLegend?: string;
	voiceLabel?: string;
	defaultVoiceLabel?: string;
	rateLabel?: string;
	pitchLabel?: string;
	testLabel?: string;
	testMessage?: string;
	backLabel?: string;
	modeLabels?: Partial<Record<SpeechMode, string>>;
	modes?: SpeechMode[];
	onBack?: () => void;
}

export function renderSpeechSettings(root: HTMLElement, options: RenderSpeechSettingsOptions): () => void;

export function textField(options?: any): HTMLElement;
export function passwordField(options?: any): HTMLElement;
export function textAreaField(options?: any): HTMLElement;
export function numberField(options?: any): HTMLElement;
export function rangeField(options?: any): HTMLElement;
export function percentRangeField(options?: any): HTMLElement;
export function selectField(options?: any): HTMLElement;
export function checkboxField(options?: any): HTMLElement;
export function radioGroup(options?: any): HTMLElement;
export function checkboxGroup(options?: any): HTMLElement;
export function keyField(options?: any): HTMLElement;
export function keyName(key: string): string;
export function confirmButton(options?: any): HTMLElement;
export function createFields(container: HTMLElement, fields: HTMLElement[]): any;
