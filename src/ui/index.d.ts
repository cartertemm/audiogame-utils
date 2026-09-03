/**
 * Accessible DOM, form, screen, and menu helpers.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/ui.md | UI guide}.
 *
 * @module
 */
import type { SpeechInstance, SpeechMode } from '../speech/index.js';
import type { AudioInstance } from '../audio/index.js';
import type { StorageInstance } from '../storage.js';

/** Attributes, properties, and listeners accepted by {@link el}. */
export interface ElementAttributes {
	/** Element identifier. */
	id?: string;
	/** CSS class name. */
	class?: string;
	/** Form control type. */
	type?: string;
	/** Text content. */
	text?: string;
	/** Form control value. */
	value?: string;
	/** Associated control identifier for labels. */
	for?: string;
	/** Form field name. */
	name?: string;
	/** Marks a checkbox or radio control as checked. */
	checked?: 'checked';
	/** Marks an option as selected. */
	selected?: 'selected';
	/** Focuses the element after creation. */
	autoFocus?: boolean;
	/** Minimum numeric value. */
	min?: string | number;
	/** Maximum numeric value. */
	max?: string | number;
	/** Numeric step interval. */
	step?: string | number;
	/** ARIA role. */
	role?: string;
	/** ARIA hidden state. */
	'aria-hidden'?: string;
	/** Accessible label. */
	'aria-label'?: string;
	/** Click event handler. */
	onClick?: (event: MouseEvent) => void;
	/** Change event handler. */
	onChange?: (event: Event) => void;
	/** Additional DOM property or attribute. */
	[key: string]: any;
}

/** Creates an HTML element, assigns attributes, and appends child nodes. */
export function el(tag: string, attrs?: ElementAttributes, ...children: (Node | string | null | undefined)[]): HTMLElement;
/** Replaces a container's children with the supplied nodes and text. */
export function mount(container: HTMLElement, children: (Node | string | null | undefined)[]): void;

/** Lifecycle handle returned by {@link renderScreen}. */
export interface ScreenHandle {
	/** Runs screen cleanup and clears its root. */
	dispose(): void;
}

/** Function that renders a screen and optionally returns cleanup work. */
export type ScreenFn<P = any> = (root: HTMLElement, props: P) => (() => void) | void;

export * from './router.js';

/** Renders one screen into a root and returns its lifecycle handle. */
export function renderScreen<P = any>(root: HTMLElement, screen: ScreenFn<P>, props?: P): ScreenHandle;

/** Supported menu item behaviors. */
export type MenuItemType = 'text' | 'slider' | 'checkbox';

/** Configuration shared by menu item types. */
export interface MenuItemOptions {
	/** Identifier used by menu value lookup. */
	id?: string | null;
	/** Insertion index. Defaults to the end of the menu. */
	position?: number;
	/** Prevents focus and interaction. */
	disabled?: boolean;
	/** Extra text spoken after the label. */
	hint?: string;
	/** Formats a slider or checkbox value for speech. */
	format?: ((value: any) => string) | null;
	/** Called after the item value changes. */
	onChange?: ((value: any) => void) | null;
	/** Replaces the default full item speech. */
	speak?: (item: MenuItem) => string;
	/** Replaces the default value speech. */
	speakValue?: (item: MenuItem) => string;
	/** Slider minimum. */
	min?: number;
	/** Slider maximum. */
	max?: number;
	/** Slider adjustment step. */
	step?: number;
	/** Initial slider value. */
	defaultValue?: number;
	/** Initial checkbox state. */
	defaultState?: boolean;
	/** Additional item option consumed by custom behavior. */
	[key: string]: any;
}

/** One focusable or informational item owned by a menu. */
export class MenuItem {
	/** Creates a menu item and its DOM node. */
	constructor(menu: MenuInstance, type: MenuItemType, label: string, options?: MenuItemOptions);

	/** Owning menu instance. */
	menu: MenuInstance;
	/** Item behavior type. */
	type: MenuItemType;
	/** Optional lookup identifier. */
	id: string | null;
	/** Optional spoken hint. */
	hint: string | undefined;
	/** Optional value formatter. */
	format: ((value: any) => string) | null;
	/** Optional value change callback. */
	onChange: ((value: any) => void) | null;
	/** Current DOM node. */
	node: HTMLElement;
	/** Slider minimum. */
	min: number;
	/** Slider maximum. */
	max: number;
	/** Slider adjustment step. */
	step: number;

	/** Spoken and visible label. */
	label: string;
	/** Whether the item cannot receive menu focus or interaction. */
	disabled: boolean;
	/** Current slider value, checkbox state, or text value. */
	value: any;
	/** Current zero based position in the owning menu. */
	readonly index: number;

	/** Returns the complete text announced when this item gains focus. */
	speak(): string;
	/** Returns the text announced for the current value. */
	speakValue(): string;
	/** Moves menu focus to this item and announces it. */
	focus(): void;
	/** Toggles a checkbox and reports whether its value changed. */
	toggle(): boolean;
	/** Adjusts a slider by a signed direction and reports whether it changed. */
	adjust(direction: number): boolean;
	/** Recreates the DOM node after public properties change. */
	rebuild(): HTMLElement;
}

/** Configuration for {@link createMenu}. */
export interface MenuOptions {
	/** Container that receives menu item nodes. */
	root: HTMLElement;
	/** Speech instance used for announcements. */
	speech: SpeechInstance;
	/** Optional audio instance for menu sounds. */
	audio?: AudioInstance | null;
	/** Text announced when the menu starts. */
	introText?: string;
	/** Source for focus movement audio. */
	clickSound?: string;
	/** Source for item activation audio. */
	selectSound?: string;
	/** Source played when navigation reaches an edge. */
	edgeSound?: string;
	/** Source played when navigation wraps. */
	wrapSound?: string;
	/** Source played when the menu opens. */
	openSound?: string;
	/** Source played when the menu closes. */
	closeSound?: string;
	/** Prefix added to configured menu sound sources. */
	soundsPrefix?: string;
	/** Suffix added to configured menu sound sources. */
	soundsSuffix?: string;
	/** Allows navigation to wrap between the first and last items. */
	wrap?: boolean;
	/** Delay in milliseconds before repeated navigation wraps. */
	wrapDelay?: number;
	/** Focuses the first enabled item when the menu starts. */
	focusFirstItem?: boolean;
	/** Enables navigation by the first character of labels. */
	firstLetterNavigation?: boolean;
	/** Accessible label applied to the menu root. */
	label?: string;
	/** Time window in milliseconds used for multi tap activation. */
	multiTapWindow?: number;
}

/** Mutable accessible menu and its navigation lifecycle. */
export interface MenuInstance {
	/** Menu items in display order. */
	readonly items: MenuItem[];
	/** Focused item, item identifier, item index, or `null` to clear focus. */
	focusedItem: MenuItem | string | number | null;
	/** Zero based focused item index, or `-1` when none is focused. */
	focusedIndex: number;
	/** Current values of items that have identifiers. */
	readonly values: Record<string, any>;
	/** Returns an item by identifier, or `null`. */
	item(id: string): MenuItem | null;
	/** Returns the current value of an identified item. */
	value(id: string): any;
	/** Creates and inserts an item. */
	addItem(type: MenuItemType, label: string, options?: MenuItemOptions): MenuItem;
	/** Adds a noninteractive text item. */
	addTextItem(text: string, options?: MenuItemOptions): MenuItem;
	/** Adds an adjustable numeric item. */
	addSlider(text: string, min: number, max: number, defaultValue: number, options?: MenuItemOptions): MenuItem;
	/** Adds a toggleable checkbox item. */
	addCheckbox(text: string, defaultState?: boolean, options?: MenuItemOptions): MenuItem;
	/** Removes one item and reports whether the index existed. */
	deleteItem(index: number, resetCursor?: boolean): boolean;
	/** Removes every item and clears focus. */
	deleteAllItems(): void;
	/** Starts interaction and resolves with the activated item or `null` on close. */
	run(): Promise<MenuItem | null>;
	/** Ends interaction and resolves a pending run with `null`. */
	close(): void;
}

/** Creates an accessible keyboard and touch driven menu. */
export function createMenu(options: MenuOptions): MenuInstance;

/** Text and callback overrides for {@link renderInstallPwaIos}. */
export interface RenderInstallPwaIosOptions {
	/** Screen heading. */
	title?: string;
	/** Introductory message. */
	message?: string;
	/** Installation instructions. */
	instructions?: string;
	/** Continue button label. */
	continueLabel?: string;
	/** Called when the continue button is activated. */
	onContinue?: () => void;
}

/** Renders iOS installation instructions into a root element. */
export function renderInstallPwaIos(root: HTMLElement, options?: RenderInstallPwaIosOptions): void;

/** Labels and supported modes for the speech controls. */
export interface SpeechSettingsFieldsOptions {
	/** Speech instance read and updated by the controls. */
	speech: SpeechInstance;
	/** Legend for output mode choices. */
	modeLegend?: string;
	/** Voice select label. */
	voiceLabel?: string;
	/** Label for the browser's default voice. */
	defaultVoiceLabel?: string;
	/** Speech rate field label. */
	rateLabel?: string;
	/** Speech pitch field label. */
	pitchLabel?: string;
	/** Test speech button label. */
	testLabel?: string;
	/** Text spoken by the test button. */
	testMessage?: string;
	/** Display label overrides for speech modes. */
	modeLabels?: Partial<Record<SpeechMode, string>>;
	/** Modes shown in the settings form. */
	modes?: SpeechMode[];
	/** Focuses the first control once the section is mounted. Defaults to false. */
	autoFocus?: boolean;
}

/** Lifecycle handle returned by {@link speechSettingsFields}. */
export interface SpeechSettingsFieldsHandle {
	/** Section element holding the speech controls. Mount it wherever you want. */
	node: HTMLElement;
	/** Stops listening for voice list changes. */
	dispose(): void;
}

/** Builds the speech controls as one section for a larger settings page. */
export function speechSettingsFields(options: SpeechSettingsFieldsOptions): SpeechSettingsFieldsHandle;

/** Options for the whole screen form of the speech controls. */
export interface RenderSpeechSettingsOptions extends Omit<SpeechSettingsFieldsOptions, 'autoFocus'> {
	/** Screen heading. */
	title?: string;
	/** Back button label. */
	backLabel?: string;
	/** Called when the back button is activated. */
	onBack?: () => void;
}

/** Renders speech preferences and returns a cleanup function. */
export function renderSpeechSettings(root: HTMLElement, options: RenderSpeechSettingsOptions): () => void;

/** Primitive values supported by choice based fields. */
export type FieldValue = string | number | boolean;

/** One stored value and visible label in a choice field. */
export interface FieldChoice<T extends FieldValue = FieldValue> {
	/** Value written when this choice is selected. */
	value: T;
	/** Text shown for this choice. */
	label: string;
}

/** Options shared by all field builders. */
export interface FieldOptionsBase {
	/** DOM identifier. */
	id?: string;
	/** Explanatory text associated with the control. */
	hint?: string;
	/** Focuses the control after creation. */
	autoFocus?: boolean;
	/** Prevents interaction with the control. */
	disabled?: boolean;
}

/** Value binding and constraints for {@link textField}. */
export interface TextFieldOptions extends FieldOptionsBase {
	/** Reads the current field value. */
	get(): string;
	/** Stores a changed field value. */
	set(value: string): void;
	/** Maximum accepted character count. */
	maxLength?: number;
	/** Browser autocomplete suggestions. */
	suggestions?: string[];
}

/** Value binding and constraints for {@link passwordField}. */
export interface PasswordFieldOptions extends FieldOptionsBase {
	/** Reads the current password value. */
	get(): string;
	/** Stores a changed password value. */
	set(value: string): void;
	/** Maximum accepted character count. */
	maxLength?: number;
}

/** Value binding and dimensions for {@link textAreaField}. */
export interface TextAreaFieldOptions extends FieldOptionsBase {
	/** Reads the current text value. */
	get(): string;
	/** Stores a changed value and its displayed text. */
	set(value: string, display: string): void;
	/** Visible text rows. */
	rows?: number;
}

/** Value binding and constraints for {@link numberField}. */
export interface NumberFieldOptions extends FieldOptionsBase {
	/** Reads the current numeric value. */
	get(): number;
	/** Stores a changed numeric value. */
	set(value: number): void;
	/** Minimum accepted value. */
	min?: number;
	/** Maximum accepted value. */
	max?: number;
	/** Accepted increment. */
	step?: number;
}

/** Value binding, constraints, and formatting for {@link rangeField}. */
export interface RangeFieldOptions extends FieldOptionsBase {
	/** Reads the current range value. */
	get(): number;
	/** Stores a changed value and optional displayed text. */
	set(value: number, display?: string): void;
	/** Minimum accepted value. */
	min?: number;
	/** Maximum accepted value. */
	max?: number;
	/** Accepted increment. */
	step?: number;
	/** Formats a value for visible output. */
	format?: (value: number) => string;
}

/** Range options interpreted and displayed as a percentage. */
export type PercentRangeFieldOptions = RangeFieldOptions;

/** Value binding and choices for {@link selectField}. */
export interface SelectFieldOptions<T extends FieldValue = FieldValue> extends FieldOptionsBase {
	/** Reads the currently selected value. */
	get(): T;
	/** Stores a selected value and its visible label. */
	set(value: T, display: string): void;
	/** Available select options. */
	choices: FieldChoice<T>[];
}

/** Boolean binding for {@link checkboxField}. */
export interface CheckboxFieldOptions extends FieldOptionsBase {
	/** Reads the current checked state. */
	get(): boolean;
	/** Stores a checked state and its visible label. */
	set(value: boolean, display: string): void;
}

/** Value binding and choices for {@link radioGroup}. */
export interface RadioGroupOptions<T extends FieldValue = FieldValue> extends FieldOptionsBase {
	/** Reads the selected radio value. */
	get(): T;
	/** Stores a selected value and its visible label. */
	set(value: T, display: string): void;
	/** Available radio choices. */
	choices: FieldChoice<T>[];
}

/** Array binding and choices for {@link checkboxGroup}. */
export interface CheckboxGroupOptions<T extends FieldValue = FieldValue> extends FieldOptionsBase {
	/** Reads the selected values. */
	get(): T[];
	/** Stores selected values and their readable summary. */
	set(values: T[], display: string): void;
	/** Available checkbox choices. */
	choices: FieldChoice<T>[];
}

/** Keyboard key binding for {@link keyField}. */
export interface KeyFieldOptions extends FieldOptionsBase {
	/** Reads the current key value. */
	get(): string;
	/** Stores a key and its readable label. */
	set(key: string, display: string): void;
}

/** Confirmation text and callback for {@link confirmButton}. */
export interface ConfirmButtonOptions extends FieldOptionsBase {
	/** Label for the secondary confirmation button. */
	confirmLabel: string;
	/** Called after the user confirms the action. */
	onConfirm(): void;
	/** CSS class assigned to the primary button. */
	class?: string;
}

/** Creates a bound single line text input. */
export function textField(label: string, options: TextFieldOptions): HTMLElement;
/** Creates a bound password input. */
export function passwordField(label: string, options: PasswordFieldOptions): HTMLElement;
/** Creates a bound multiline text area. */
export function textAreaField(label: string, options: TextAreaFieldOptions): HTMLElement;
/** Creates a bound numeric input. */
export function numberField(label: string, options: NumberFieldOptions): HTMLElement;
/** Creates a bound range input with visible output. */
export function rangeField(label: string, options: RangeFieldOptions): HTMLElement;
/** Creates a bound range input displayed as a percentage. */
export function percentRangeField(label: string, options: PercentRangeFieldOptions): HTMLElement;
/** Creates a bound select control. */
export function selectField<T extends FieldValue = FieldValue>(label: string, options: SelectFieldOptions<T>): HTMLElement;
/** Creates a bound checkbox control. */
export function checkboxField(label: string, options: CheckboxFieldOptions): HTMLElement;
/** Creates a bound single choice radio group. */
export function radioGroup<T extends FieldValue = FieldValue>(legend: string, options: RadioGroupOptions<T>): HTMLElement;
/** Creates a bound multiple choice checkbox group. */
export function checkboxGroup<T extends FieldValue = FieldValue>(legend: string, options: CheckboxGroupOptions<T>): HTMLElement;
/** Creates a control that captures one keyboard key. */
export function keyField(label: string, options: KeyFieldOptions): HTMLElement;
/** Returns a readable label for a browser keyboard key value. */
export function keyName(key: string): string;
/** Creates a button that requires a second confirmation action. */
export function confirmButton(label: string, options: ConfirmButtonOptions): HTMLElement;

/** Field builder names supported by {@link createFields}. */
export type FieldType =
	| 'text' | 'password' | 'textArea' | 'number' | 'range' | 'percentRange'
	| 'select' | 'checkbox' | 'radioGroup' | 'checkboxGroup' | 'key';

/** Description emitted after a storage bound field changes. */
export interface FieldChange {
	/** Storage key. */
	key: string;
	/** New stored value. */
	value: any;
	/** Field label or legend. */
	label: string;
	/** Human readable representation of the new value. */
	display: string;
	/** Builder that created the field. */
	type: FieldType;
	/** Readable change announcement. */
	message: string;
}

/** Storage and defaults for {@link createFields}. */
export interface CreateFieldsOptions {
	/** Storage used to read and write field values. */
	storage: StorageInstance;
	/** Values used when a storage key is absent. */
	defaults?: Record<string, any>;
	/** Called after a bound field writes a changed value. */
	onChange?: ((change: FieldChange) => void) | null;
}

/** Field options supplied by callers after storage accessors are bound. */
export type BoundFieldOptions<O> = Omit<O, 'get' | 'set' | 'id'> & { id?: string };

/** Storage bound versions of the field builders. */
export interface BoundFields {
	/** Creates a storage bound single line text input. */
	text(key: string, label: string, options?: BoundFieldOptions<TextFieldOptions>): HTMLElement;
	/** Creates a storage bound password input. */
	password(key: string, label: string, options?: BoundFieldOptions<PasswordFieldOptions>): HTMLElement;
	/** Creates a storage bound multiline text area. */
	textArea(key: string, label: string, options?: BoundFieldOptions<TextAreaFieldOptions>): HTMLElement;
	/** Creates a storage bound numeric input. */
	number(key: string, label: string, options?: BoundFieldOptions<NumberFieldOptions>): HTMLElement;
	/** Creates a storage bound range input. */
	range(key: string, label: string, options?: BoundFieldOptions<RangeFieldOptions>): HTMLElement;
	/** Creates a storage bound percentage range input. */
	percentRange(key: string, label: string, options?: BoundFieldOptions<PercentRangeFieldOptions>): HTMLElement;
	/** Creates a storage bound select control. */
	select<T extends FieldValue = FieldValue>(key: string, label: string, options: BoundFieldOptions<SelectFieldOptions<T>>): HTMLElement;
	/** Creates a storage bound checkbox. */
	checkbox(key: string, label: string, options?: BoundFieldOptions<CheckboxFieldOptions>): HTMLElement;
	/** Creates a storage bound radio group. */
	radioGroup<T extends FieldValue = FieldValue>(key: string, legend: string, options: BoundFieldOptions<RadioGroupOptions<T>>): HTMLElement;
	/** Creates a storage bound checkbox group. */
	checkboxGroup<T extends FieldValue = FieldValue>(key: string, legend: string, options: BoundFieldOptions<CheckboxGroupOptions<T>>): HTMLElement;
	/** Creates a storage bound keyboard key control. */
	key(key: string, label: string, options?: BoundFieldOptions<KeyFieldOptions>): HTMLElement;
}

/** Creates field builders whose values persist through a storage instance. */
export function createFields(options: CreateFieldsOptions): BoundFields;
