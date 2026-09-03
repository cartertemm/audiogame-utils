# UI

The `audiogame-utils/ui` module provides small DOM helpers for accessible screens around gameplay, such as menus, forms, lobbies, installation prompts, and speech settings. It uses plain semantic HTML. There is no virtual DOM, reactive state, or template syntax.

```js
import {
	el,
	mount,
	renderScreen,
	createFields,
	confirmButton,
	renderInstallPwaIos,
	speechSettingsFields,
	renderSpeechSettings,
	createRouter,
} from 'audiogame-utils/ui'
```

## Form fields

The field helpers build labeled, accessible form controls that can be passed directly to `mount()`. Use `createFields()` for settings that should save to a storage instance as soon as they change. Use the individual builders when another object owns the values.

```js
import { createStorage } from 'audiogame-utils/storage'
import { createFields, mount } from 'audiogame-utils/ui'

const storage = createStorage('my-game')
const fields = createFields({
	storage,
	defaults: {
		name: 'Pilot',
		volume: 0.8,
		difficulty: 'normal',
	},
	onChange: ({ message }) => announce(message),  // announces a settings change through TTS or the screen reader (if one is running). This exists for demo purposes and may not be what you want in an actual game.
})

mount(document.getElementById('app'), [
	fields.text('name', 'Player name', { autoFocus: true }),
	fields.percentRange('volume', 'Master volume'),
	fields.select('difficulty', 'Difficulty', {
		choices: [
			{ value: 'story', label: 'Story' },
			{ value: 'normal', label: 'Normal' },
			{ value: 'veteran', label: 'Veteran' },
		],
	}),
])
```

### Using individual builders

Every field builder takes a label followed by an options object. The `get` function supplies the initial value. The `set` function receives a new value when the control commits a change.

```js
import { textField } from 'audiogame-utils/ui'

const nameField = textField('Player name', {
	get: () => player.name,
	set: (value) => {
		player.name = value
	},
	hint: 'Other players can hear this name.',
	maxLength: 24,
})
```

These options apply to every field builder:

| Option | Default | Description |
| --- | --- | --- |
| `get` | none | Required function that returns the current value. |
| `set` | none | Required function that commits a changed value. Some controls pass a second, human readable value. |
| `id` | generated | Base ID used to connect the control, label, and hint. Group choice IDs are derived from it. |
| `hint` | none | Help text connected with `aria-describedby`. |
| `autoFocus` | `false` | Marks the control for `mount()` to focus. For groups, this marks the first choice. |
| `disabled` | `false` | Disables the control, or every control in a group. |

The builders return a wrapper element containing the control and its accessible label. Groups return a `fieldset` with a `legend`. `keyField()` returns a wrapper containing a button.

### Field builder reference

| Builder | Value | Additional options and behavior |
| --- | --- | --- |
| `textField(label, options)` | string | Creates a text input. `maxLength` sets its length limit. `suggestions` adds a `datalist` from an array of strings. |
| `passwordField(label, options)` | string | Creates a password input. Accepts `maxLength`. |
| `textAreaField(label, options)` | string | Creates a text area. `rows` sets its visible height. Its `set` call receives `saved` as the human readable value. |
| `numberField(label, options)` | number | Creates a number input. Accepts `min`, `max`, and `step`. |
| `rangeField(label, options)` | number | Creates a range input. Accepts `min`, `max`, `step`, and `format`. |
| `percentRangeField(label, options)` | number | Creates a formatted range from `0` to `1` in steps of `0.05`. Options can override those defaults. |
| `selectField(label, options)` | choice value | Creates a select from `choices`. Each choice has `value` and `label` properties. The original value is preserved, including numeric values. |
| `checkboxField(label, options)` | boolean | Creates one checkbox. Its human readable value is `on` or `off`. |
| `radioGroup(legend, options)` | choice value | Creates one radio button per entry in `choices`. Its human readable value is the selected choice label. |
| `checkboxGroup(legend, options)` | array | Creates one checkbox per entry in `choices`. Its human readable value identifies the choice that changed followed by `on` or `off`. |
| `keyField(label, options)` | string | Creates a button that captures the next key. Escape cancels capture. The captured event does not reach the game. |

The `choices` option used by selects and groups is an array of objects:

```js
const choices = [
	{ value: 15, label: '15 degrees' },
	{ value: 30, label: '30 degrees' },
]
```

A range `format(value)` function controls its visible readout, its `aria-valuetext`, and the human readable value passed to `set`. The visible and accessible readouts update during `input` events. The numeric value is committed during the `change` event.

```js
rangeField('Turn speed', {
	get: () => settings.turnSpeed,
	set: (value, display) => saveTurnSpeed(value, display),
	min: 0,
	max: 1,
	step: 0.1,
	format: value => `${Math.round(value * 100)} percent`,
})
```

`keyName(key)` returns a key name suitable for display. It changes the space character to `Space` and returns other key values unchanged. `keyField()` uses it for the current binding and captured key.

### Storage bound fields

`createFields({ storage, defaults, onChange })` returns storage bound versions of every field builder. A storage instance is required. `defaults` supplies values for keys that are not in storage.

| Option | Default | Description |
| --- | --- | --- |
| `storage` | none | Required storage instance, usually returned by `createStorage()`. |
| `defaults` | `{}` | Values keyed by field name. A default is read when storage has no value for that key. |
| `onChange` | none | Called after a changed value has been stored. |

Each bound builder takes a storage key before the label:

```js
fields.text(key, label, options)
fields.password(key, label, options)
fields.textArea(key, label, options)
fields.number(key, label, options)
fields.range(key, label, options)
fields.percentRange(key, label, options)
fields.select(key, label, options)
fields.checkbox(key, label, options)
fields.radioGroup(key, legend, options)
fields.checkboxGroup(key, legend, options)
fields.key(key, label, options)
```

These methods read with `storage.get(key, defaults[key])` and write with `storage.set(key, value)`. They use `field-${key}` as a stable ID unless `options.id` is provided. All type specific options pass through to the underlying builder.

After a value is stored, `onChange` receives one object:

```js
{
	key,
	value,
	label,
	display,
	type,
	message,
}
```

`display` is suitable for speech or status text. For example, it contains a select choice label instead of its stored value. `message` combines the field label and display text. Key fields use messages such as `Fire bound to Space`. Checkbox groups report only the choice that changed. Use `type` when an application needs different phrasing for different controls.

### Confirmation buttons

`confirmButton(label, options)` creates a button that requires two presses. The first press changes its text to `confirmLabel`. The second press calls `onConfirm`, restores the original label, and disarms the button so another action again requires two presses.

| Option | Default | Description |
| --- | --- | --- |
| `confirmLabel` | none | Required label shown after the first press. |
| `onConfirm` | none | Required function called after the second press. |
| `id` | generated | Button ID. |
| `class` | none | CSS class placed on the button. |
| `autoFocus` | `false` | Marks the button for `mount()` to focus. |
| `disabled` | `false` | Disables the button. |

## Creating elements

`el(tag, attrs, ...children)` creates an HTML element.

Attribute keys have these rules:

1. `text` sets `textContent`.
2. `autoFocus` marks the element for `mount()` to focus. It does not set the HTML `autofocus` attribute.
3. A key beginning with `on`, when paired with a function, adds an event listener. For example, `onClick` adds a `click` listener.
4. Other values are passed to `setAttribute()`. Values of `null` and `undefined` are skipped.

String children become text nodes. Element children are appended directly. Children that are `null` or `undefined` are skipped, which makes conditional content straightforward.

```js
const joinButton = el('button', {
	type: 'button',
	text: 'Join game',
	onClick: () => joinGame(),
	autoFocus: true,
})

const heading = el(
	'h1',
	{},
	'Welcome, ',
	el('strong', { text: playerName }),
)
```

Conditional attributes can use `undefined` when they should be omitted:

```js
el('input', {
	type: 'radio',
	name: 'mode',
	checked: mode === 'single' ? 'checked' : undefined,
})
```

## Mounting a screen

`mount(root, nodes)` removes the current contents of `root`, appends each node, then focuses the first descendant marked with `autoFocus`. Entries that are `null` or `undefined` are skipped.

Mark one interactive element on each screen with `autoFocus` so keyboard and screen reader users begin in a predictable place.

```js
function mainMenu(root, props) {
	mount(root, [
		el('h1', { text: `Welcome, ${props.name}` }),
		el(
			'nav',
			{},
			el('button', {
				type: 'button',
				text: 'Create game',
				onClick: props.onCreate,
				autoFocus: true,
			}),
			el('button', {
				type: 'button',
				text: 'Join game',
				onClick: props.onJoin,
			}),
			props.connected
				? el('button', {
					type: 'button',
					text: 'Disconnect',
					onClick: props.onDisconnect,
				})
				: null,
		),
	])
}
```

## Managing screen cleanup

`renderScreen(root, screen, props)` calls a screen function with `root` and `props`, then returns an object with a `dispose()` method.

If the screen returns a cleanup function, `dispose()` calls it before emptying `root`. Use cleanup for work that survives outside the rendered DOM, such as global event listeners or subscriptions. Event listeners attached to elements inside `root` disappear with those elements.

Calling `dispose()` more than once is safe. Passing anything other than a function as `screen` throws a `TypeError`.

```js
let currentScreen = null

function show(screen, props) {
	currentScreen?.dispose()
	currentScreen = renderScreen(document.getElementById('app'), screen, props)
}

show(mainMenu, {
	name: playerName,
	connected,
	onCreate: createGame,
	onJoin: joinGame,
	onDisconnect: disconnect,
})
```

A screen can return its cleanup directly:

```js
function connectionStatus(root, props) {
	const updateStatus = () => {
		root.querySelector('#status').textContent = props.connection.status
	}

	mount(root, [el('p', { id: 'status', text: props.connection.status })])
	props.connection.addEventListener('statuschange', updateStatus)

	return () => {
		props.connection.removeEventListener('statuschange', updateStatus)
	}
}
```

## Routing screens

`createRouter({ root, escape })` manages a stack of screen functions rendered
into one root element. It uses `renderScreen()` for every transition, so leaving
a screen runs that screen's cleanup function before the next one is rendered.

```js
const router = createRouter({ root: document.getElementById('app') })

function mainMenu(root) {
	mount(root, [
		el('h1', { text: 'Main menu' }),
		el('button', {
			type: 'button',
			text: 'Settings',
			autoFocus: true,
			onClick: () => router.go(settings),
		}),
	])
}

function settings(root) {
	mount(root, [
		el('h1', { text: 'Settings' }),
		el('button', {
			type: 'button',
			text: 'Back',
			autoFocus: true,
			onClick: () => router.back(),
		}),
	])
}

router.go(mainMenu)
```

`go(screen, props, options)` saves the current focus, pushes the new screen,
and renders it. `back()` removes the current screen and re-renders the previous
one with its original props. It restores focus by element ID when possible, then
by the element's position among the root's tabbable controls. It returns `true`
when it navigates and `false` when the current screen is the root of the stack.

`replace(screen, props, options)` replaces the current entry without increasing
the stack depth. This is useful for transitions that should not become a Back
destination, such as replacing a loading screen after a connection completes.

Escape calls `back()` by default. It prevents the key's default behavior only
when navigation succeeds. Set `escape: false` on the router to disable this
everywhere, or pass `{ escape: false }` to `go()` or `replace()` for one screen.

```js
router.go(keyBindingScreen, {}, { escape: false })
router.replace(gameLobby, { gameId })
```

The router exposes these properties and methods:

| Member | Description |
| --- | --- |
| `depth` | Number of screens on the stack. |
| `current` | Screen function on top of the stack, or `null` when empty. |
| `go(screen, props, options)` | Pushes and renders a screen. `props` and `options` default to empty objects. |
| `replace(screen, props, options)` | Replaces and renders the current screen. |
| `back()` | Returns to the previous screen, restores focus, and reports whether it navigated. |
| `dispose()` | Runs current screen cleanup, empties the root and stack, and removes Escape handling. |

Call `dispose()` when the application no longer needs the router. A root element
is required. Calling `createRouter()` without one throws an error.

## iOS installation prompt

`renderInstallPwaIos(root, options)` renders instructions for adding the game to the iOS home screen, plus a button that lets the player continue without installing it.

Use the platform helpers to show the prompt only on iOS when the game is running in a browser:

```js
import { isIOS, isIOSStandalone } from 'audiogame-utils/platform'

if (isIOS() && !isIOSStandalone()) {
	renderScreen(root, renderInstallPwaIos, { onContinue: showMenu })
} else {
	showMenu()
}
```

The renderer binds no listeners outside `root` and returns no cleanup function. It can be called directly or passed to `renderScreen()`.

### Installation prompt options

| Option | Default | Description |
| --- | --- | --- |
| `onContinue` | none | Called when the player activates the continue button. |
| `title` | `Install for the best experience` | Screen heading. |
| `message` | built in guidance | Explains the benefits of installing the game. |
| `instructions` | built in guidance | Explains how to add the game to the iOS home screen. |
| `continueLabel` | `Continue anyway` | Continue button label. |

## Speech settings

`speechSettingsFields(options)` builds controls for speech output mode, voice,
rate, pitch, and voice testing as a section that can be included in a larger
settings screen. It returns an object containing the section as `node` and a
`dispose()` method.

```js
import { el, mount, speechSettingsFields, textField } from 'audiogame-utils/ui'

function settingsScreen(root, props) {
	const speechFields = speechSettingsFields({ speech: props.speech })
	mount(root, [
		el('h1', { text: 'Settings' }),
		textField('Player name', {
			get: () => props.player.name,
			set: value => { props.player.name = value },
			autoFocus: true,
		}),
		speechFields.node,
	])
	return speechFields.dispose
}
```

The section redraws only its own controls when the output mode changes, leaving
the rest of the containing screen intact. It does not take focus when first
mounted unless `autoFocus: true` is passed. When enabled, autofocus selects the
first available speech control.

`renderSpeechSettings(root, options)` renders the same controls as a complete
screen, with a heading and an optional Back button. It enables autofocus for the
speech controls.

The `speech` option is required and should be an instance returned by `createSpeech()`. The renderer reads current values from the instance and writes changes back to it, so preferences use the storage configured for that speech instance.

```js
import { createSpeech } from 'audiogame-utils/speech'

const speech = createSpeech({ storage })

const settingsScreen = renderScreen(root, renderSpeechSettings, {
	speech,
	onBack: showMenu,
})

// Call this when leaving the settings screen.
settingsScreen.dispose()
```

Voice, rate, and pitch controls appear only when the selected mode uses text to speech. Changing the mode redraws the controls and restores focus to the selected mode.

The mode picker is hidden on iOS by default. Pass `modes` to replace the default list. Pass an empty array to hide the picker on any platform.

The browser may load or change its voice list asynchronously. Both forms listen
for `voiceschanged` and refresh the voice selector. Cleanup removes that
listener. Call the handle's `dispose()` method when using
`speechSettingsFields()`, or the `dispose()` method returned by `renderScreen()`
when using `renderSpeechSettings()`.

### Speech settings options

Both functions accept the speech control options below. `autoFocus` applies only
to `speechSettingsFields()` because `renderSpeechSettings()` enables it itself.

| Option | Default | Description |
| --- | --- | --- |
| `speech` | none | Required speech instance. The function throws if this is missing. |
| `modes` | `[]` on iOS, `[MODE_ARIA, MODE_TTS]` elsewhere | Modes shown in the output picker. An empty array hides the picker. |
| `modeLabels` | built in labels | Labels keyed by mode. Custom labels are merged with the defaults. |
| `modeLegend` | `Speech output` | Output mode fieldset legend. |
| `voiceLabel` | `Voice` | Voice selector label. |
| `defaultVoiceLabel` | `(default voice)` | Option shown when no voice is selected. |
| `rateLabel` | `Speech rate` | Rate slider label. |
| `pitchLabel` | `Speech pitch` | Pitch slider label. |
| `testLabel` | `Test voice` | Voice test button label. |
| `testMessage` | `This is a test of the selected voice.` | Text spoken by the voice test button. |
| `autoFocus` | `false` | Marks the first available control for focus when the section is mounted. Only accepted by `speechSettingsFields()`. |

`renderSpeechSettings()` also accepts these whole screen options:

| Option | Default | Description |
| --- | --- | --- |
| `title` | `Speech settings` | Screen heading. |
| `onBack` | none | Adds a Back button and handles its activation. |
| `backLabel` | `Back` | Back button label. |

To offer all output modes, import and pass the mode constants:

```js
import { MODE_ARIA, MODE_TTS, MODE_BOTH } from 'audiogame-utils/speech'

renderScreen(root, renderSpeechSettings, {
	speech,
	modes: [MODE_ARIA, MODE_TTS, MODE_BOTH],
})
```

## Menus

`createMenu` builds a self-voicing menu driven by a virtual cursor. The cursor
is not DOM focus. A focus trap puts `role="application"` on the menu container
so the browser hands every keystroke to the game, and the rendered fields sit
inside an `aria-hidden` list so the screen reader never announces them twice.
The menu speaks each row itself.

```js
import { createMenu, createSpeech, createAudio, createStorage } from 'audiogame-utils'

const menu = createMenu({
	root: document.getElementById('app'),
	speech: createSpeech({ storage: createStorage('game') }),
	audio: createAudio(),
	label: 'Main menu',
	introText: 'Main menu',
	clickSound: 'click',
	selectSound: 'select',
	soundsPrefix: 'sounds/',
	soundsSuffix: '.ogg',
})

const start = menu.addTextItem('Start game')
const volume = menu.addSlider('Volume', 0, 100, 50, { format: v => `${v} percent` })
const sound = menu.addCheckbox('Sound', true)
const quit = menu.addTextItem('Quit')

const chosen = await menu.run()
if (chosen === start) startGame({ volume: volume.value, sound: sound.value })
```

If an ancestor of `root` already carries `role="application"`, the menu assumes
that ancestor is managed by the game's own focus trap. It attaches to that
ancestor instead of building its own trap, and releases nothing on close. Make
sure your trap keeps focus inside that ancestor, or the menu can lose focus and
stop receiving keys.

`run()` waits. It resolves with the item when a text item is activated, and with
`null` when the player escapes. Sliders and checkboxes change in place and never
resolve, so they are state you read afterwards. The menu stays mounted when it
resolves on an item, which makes a settings screen a plain loop:

Calling `run()` while a run is already pending throws. Await or close the
current run before starting another.

```js
let chosen
while ((chosen = await menu.run()) !== null) {
	if (chosen === back) break
}
menu.close()
```

### Menu options

| Option | Default | Description |
| --- | --- | --- |
| `root` | required | Element the menu mounts into. |
| `speech` | required | Instance from `createSpeech`. |
| `audio` | `null` | Instance from `createAudio`. Omit for a silent menu. |
| `introText` | `''` | Spoken when `run()` first mounts the menu. |
| `clickSound` | `''` | Cursor moved to another item. |
| `selectSound` | `''` | An item was activated. |
| `edgeSound` | `''` | Cursor hit an edge, or a value could not move further. |
| `wrapSound` | `''` | Cursor wrapped. |
| `openSound` | `''` | Played with the intro. |
| `closeSound` | `''` | Played on close. |
| `soundsPrefix` | `''` | Prepended to every sound given as a string. |
| `soundsSuffix` | `''` | Appended to every sound given as a string. |
| `wrap` | `false` | Jump to the other edge instead of playing `edgeSound`. |
| `wrapDelay` | `10` | Milliseconds of ignored movement after a wrap. |
| `focusFirstItem` | `false` | Put the cursor on the first item at intro. |
| `firstLetterNavigation` | `true` | Letter keys jump to the next matching label. |
| `multiTapWindow` | `250` | Milliseconds allowed between taps of a double tap. |
| `label` | `''` | `aria-label` on the container. |

Each sound takes a name, a full URL, a loader function such as
`() => import('./click.ogg?url')`, or an sfx handle you already built. Strings
get the prefix and suffix; anything else passes through untouched.

### Items

```js
menu.addItem(type, label, options)          // type is 'text', 'slider', or 'checkbox'
menu.addTextItem(text, options)
menu.addSlider(text, min, max, defaultValue, options)
menu.addCheckbox(text, defaultState, options)
menu.deleteItem(index, resetCursor = true)
menu.deleteAllItems()
```

`options` accepts `id`, `position`, `disabled`, `hint`, `onChange`, `format`,
`speak`, and `speakValue`, all optional. `position` defaults to `-1`, meaning
append. Every builder returns the item.

An item exposes `type`, `label`, `value`, `id`, `index`, `disabled`, `node`,
`speak()`, `speakValue()`, `focus()`, and `toggle()` on checkboxes. Sliders add
`min`, `max`, and `step`.

`value` applies to sliders and checkboxes. Writing it on a text item does
nothing, because a text item has no value to set.

An item reads differently depending on why it is announced. Arriving on it
speaks `speak()`, the label with the value. Changing its value speaks
`speakValue()`, the value alone, so a slider does not repeat its label on every
press.

### Reading the menu

```js
menu.items         // array of every item, in order
menu.values        // { id: value } for every item with an id and a value
menu.item(id)       // the item with that id, or null
menu.value(id)      // that item's value, or undefined
menu.focusedItem    // the item under the cursor, or null
menu.focusedIndex   // its index, or -1
```

`menu.focusedItem` also accepts assignment, and takes an item, an index, or an
id. `menu.focusedIndex` accepts assignment too, but only a number.

### Keys and gestures

| Key | Action |
| --- | --- |
| Up, Down | Previous, next item. |
| Left, Right | Change the focused value. |
| Home, End | First, last item. |
| Enter | Activate a text item, toggle a checkbox. |
| Space | Toggle a checkbox, otherwise the same as Enter. |
| Escape | Close. |
| A letter | Jump to the next label starting with it. |

| Gesture | Action |
| --- | --- |
| Swipe left, right | Previous, next item. |
| Swipe up, down | Change the focused value. |
| Double tap | Activate. |
| Two finger tap | Close. |

### Styling

No stylesheet ships with the library. Style `.menu`, `.menu-items`, `.field`,
and `.focused` yourself. The focused item carries `.focused`.
