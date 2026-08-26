import type { SpeechInstance, SpeechMode } from '../speech/index.js';
import type { AudioInstance } from '../audio/index.js';
import type { StorageInstance } from '../storage.js';

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

export interface ScreenHandle {
	dispose(): void;
}

export type ScreenFn<P = any> = (root: HTMLElement, props: P) => (() => void) | void;

export function renderScreen<P = any>(root: HTMLElement, screen: ScreenFn<P>, props?: P): ScreenHandle;

export type MenuItemType = 'text' | 'slider' | 'checkbox';

export interface MenuItemOptions {
	id?: string | null;
	position?: number;
	disabled?: boolean;
	hint?: string;
	format?: ((value: any) => string) | null;
	onChange?: ((value: any) => void) | null;
	speak?: (item: MenuItem) => string;
	speakValue?: (item: MenuItem) => string;
	min?: number;
	max?: number;
	step?: number;
	defaultValue?: number;
	defaultState?: boolean;
	[key: string]: any;
}

export class MenuItem {
	constructor(menu: MenuInstance, type: MenuItemType, label: string, options?: MenuItemOptions);

	menu: MenuInstance;
	type: MenuItemType;
	id: string | null;
	hint: string | undefined;
	format: ((value: any) => string) | null;
	onChange: ((value: any) => void) | null;
	node: HTMLElement;
	min: number;
	max: number;
	step: number;

	label: string;
	disabled: boolean;
	value: any;
	readonly index: number;

	speak(): string;
	speakValue(): string;
	focus(): void;
	toggle(): boolean;
	adjust(direction: number): boolean;
	rebuild(): HTMLElement;
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
	readonly items: MenuItem[];
	focusedItem: MenuItem | string | number | null;
	focusedIndex: number;
	readonly values: Record<string, any>;
	item(id: string): MenuItem | null;
	value(id: string): any;
	addItem(type: MenuItemType, label: string, options?: MenuItemOptions): MenuItem;
	addTextItem(text: string, options?: MenuItemOptions): MenuItem;
	addSlider(text: string, min: number, max: number, defaultValue: number, options?: MenuItemOptions): MenuItem;
	addCheckbox(text: string, defaultState?: boolean, options?: MenuItemOptions): MenuItem;
	deleteItem(index: number, resetCursor?: boolean): boolean;
	deleteAllItems(): void;
	run(): Promise<MenuItem | null>;
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

export type FieldValue = string | number | boolean;

export interface FieldChoice<T extends FieldValue = FieldValue> {
	value: T;
	label: string;
}

export interface FieldOptionsBase {
	id?: string;
	hint?: string;
	autoFocus?: boolean;
	disabled?: boolean;
}

export interface TextFieldOptions extends FieldOptionsBase {
	get(): string;
	set(value: string): void;
	maxLength?: number;
	suggestions?: string[];
}

export interface PasswordFieldOptions extends FieldOptionsBase {
	get(): string;
	set(value: string): void;
	maxLength?: number;
}

export interface TextAreaFieldOptions extends FieldOptionsBase {
	get(): string;
	set(value: string, display: string): void;
	rows?: number;
}

export interface NumberFieldOptions extends FieldOptionsBase {
	get(): number;
	set(value: number): void;
	min?: number;
	max?: number;
	step?: number;
}

export interface RangeFieldOptions extends FieldOptionsBase {
	get(): number;
	set(value: number, display?: string): void;
	min?: number;
	max?: number;
	step?: number;
	format?: (value: number) => string;
}

export type PercentRangeFieldOptions = RangeFieldOptions;

export interface SelectFieldOptions<T extends FieldValue = FieldValue> extends FieldOptionsBase {
	get(): T;
	set(value: T, display: string): void;
	choices: FieldChoice<T>[];
}

export interface CheckboxFieldOptions extends FieldOptionsBase {
	get(): boolean;
	set(value: boolean, display: string): void;
}

export interface RadioGroupOptions<T extends FieldValue = FieldValue> extends FieldOptionsBase {
	get(): T;
	set(value: T, display: string): void;
	choices: FieldChoice<T>[];
}

export interface CheckboxGroupOptions<T extends FieldValue = FieldValue> extends FieldOptionsBase {
	get(): T[];
	set(values: T[], display: string): void;
	choices: FieldChoice<T>[];
}

export interface KeyFieldOptions extends FieldOptionsBase {
	get(): string;
	set(key: string, display: string): void;
}

export interface ConfirmButtonOptions extends FieldOptionsBase {
	confirmLabel: string;
	onConfirm(): void;
	class?: string;
}

export function textField(label: string, options: TextFieldOptions): HTMLElement;
export function passwordField(label: string, options: PasswordFieldOptions): HTMLElement;
export function textAreaField(label: string, options: TextAreaFieldOptions): HTMLElement;
export function numberField(label: string, options: NumberFieldOptions): HTMLElement;
export function rangeField(label: string, options: RangeFieldOptions): HTMLElement;
export function percentRangeField(label: string, options: PercentRangeFieldOptions): HTMLElement;
export function selectField<T extends FieldValue = FieldValue>(label: string, options: SelectFieldOptions<T>): HTMLElement;
export function checkboxField(label: string, options: CheckboxFieldOptions): HTMLElement;
export function radioGroup<T extends FieldValue = FieldValue>(legend: string, options: RadioGroupOptions<T>): HTMLElement;
export function checkboxGroup<T extends FieldValue = FieldValue>(legend: string, options: CheckboxGroupOptions<T>): HTMLElement;
export function keyField(label: string, options: KeyFieldOptions): HTMLElement;
export function keyName(key: string): string;
export function confirmButton(label: string, options: ConfirmButtonOptions): HTMLElement;

export type FieldType =
	| 'text' | 'password' | 'textArea' | 'number' | 'range' | 'percentRange'
	| 'select' | 'checkbox' | 'radioGroup' | 'checkboxGroup' | 'key';

export interface FieldChange {
	key: string;
	value: any;
	label: string;
	display: string;
	type: FieldType;
	message: string;
}

export interface CreateFieldsOptions {
	storage: StorageInstance;
	defaults?: Record<string, any>;
	onChange?: ((change: FieldChange) => void) | null;
}

export type BoundFieldOptions<O> = Omit<O, 'get' | 'set' | 'id'> & { id?: string };

export interface BoundFields {
	text(key: string, label: string, options?: BoundFieldOptions<TextFieldOptions>): HTMLElement;
	password(key: string, label: string, options?: BoundFieldOptions<PasswordFieldOptions>): HTMLElement;
	textArea(key: string, label: string, options?: BoundFieldOptions<TextAreaFieldOptions>): HTMLElement;
	number(key: string, label: string, options?: BoundFieldOptions<NumberFieldOptions>): HTMLElement;
	range(key: string, label: string, options?: BoundFieldOptions<RangeFieldOptions>): HTMLElement;
	percentRange(key: string, label: string, options?: BoundFieldOptions<PercentRangeFieldOptions>): HTMLElement;
	select<T extends FieldValue = FieldValue>(key: string, label: string, options: BoundFieldOptions<SelectFieldOptions<T>>): HTMLElement;
	checkbox(key: string, label: string, options?: BoundFieldOptions<CheckboxFieldOptions>): HTMLElement;
	radioGroup<T extends FieldValue = FieldValue>(key: string, legend: string, options: BoundFieldOptions<RadioGroupOptions<T>>): HTMLElement;
	checkboxGroup<T extends FieldValue = FieldValue>(key: string, legend: string, options: BoundFieldOptions<CheckboxGroupOptions<T>>): HTMLElement;
	key(key: string, label: string, options?: BoundFieldOptions<KeyFieldOptions>): HTMLElement;
}

export function createFields(options: CreateFieldsOptions): BoundFields;
