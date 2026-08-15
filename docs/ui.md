# UI

The `audiogame-utils/ui` module provides small DOM helpers for accessible screens around gameplay, such as menus, forms, lobbies, installation prompts, and speech settings. It uses plain semantic HTML. There is no virtual DOM, reactive state, or template syntax.

```js
import {
	el,
	mount,
	renderScreen,
	renderInstallPwaIos,
	renderSpeechSettings,
} from 'audiogame-utils/ui'
```

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

`renderSpeechSettings(root, options)` renders controls for speech output mode, voice, rate, pitch, and voice testing.

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

The browser may load or change its voice list asynchronously. The renderer listens for `voiceschanged` and refreshes the voice selector. Its cleanup function removes that listener, so call the `dispose()` method returned by `renderScreen()` when leaving the settings screen.

### Speech settings options

| Option | Default | Description |
| --- | --- | --- |
| `speech` | none | Required speech instance. The renderer throws if this is missing. |
| `onBack` | none | Adds a Back button and handles its activation. |
| `modes` | `[]` on iOS, `[MODE_ARIA, MODE_TTS]` elsewhere | Modes shown in the output picker. An empty array hides the picker. |
| `modeLabels` | built in labels | Labels keyed by mode. Custom labels are merged with the defaults. |
| `title` | `Speech settings` | Screen heading. |
| `modeLegend` | `Speech output` | Output mode fieldset legend. |
| `voiceLabel` | `Voice` | Voice selector label. |
| `defaultVoiceLabel` | `(default voice)` | Option shown when no voice is selected. |
| `rateLabel` | `Speech rate` | Rate slider label. |
| `pitchLabel` | `Speech pitch` | Pitch slider label. |
| `testLabel` | `Test voice` | Voice test button label. |
| `testMessage` | `This is a test of the selected voice.` | Text spoken by the voice test button. |
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

`run()` waits. It resolves with the item when a text item is activated, and with
`null` when the player escapes. Sliders and checkboxes change in place and never
resolve, so they are state you read afterwards. The menu stays mounted when it
resolves on an item, which makes a settings screen a plain loop:

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

An item reads differently depending on why it is announced. Arriving on it
speaks `speak()`, the label with the value. Changing its value speaks
`speakValue()`, the value alone, so a slider does not repeat its label on every
press.

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
