# UI

The `audiogame-utils/ui` module builds the screens that surround gameplay: menus, forms, lobbies, and the handoff into the game itself. It is a few dozen lines of DOM helpers, not a framework. There is no virtual DOM, no reactivity, and no template syntax.

```js
import { el, mount, renderScreen, renderInstallPwaIos, renderSpeechSettings } from 'audiogame-utils/ui'
```

Screens are plain semantic HTML, which is what screen readers navigate best. Keep gameplay itself out of this module.

## `el(tag, attrs, ...children)`

Creates an element. Attribute keys are handled as follows:

1. `text` sets `textContent`.
2. `autoFocus` marks the element for `mount` to focus. It is not the HTML `autofocus` attribute.
3. Keys starting with `on` whose value is a function are added as event listeners, lowercased: `onClick` becomes a `click` listener.
4. Everything else is set with `setAttribute`, unless the value is `null` or `undefined`, in which case it is skipped.

Children are appended in order. Strings become text nodes, and `null` and `undefined` are skipped, so conditional children need no filtering.

```js
const button = el('button', {
	type: 'button',
	text: 'Join game',
	onClick: () => joinGame(),
	autoFocus: true,
})

const heading = el('h1', {}, 'Welcome, ', el('b', { text: playerName }))
```

Skipping `null` values makes conditional attributes readable:

```js
el('input', {
	type: 'radio',
	name: 'mode',
	checked: mode === 'single' ? 'checked' : undefined,
})
```

## `mount(root, nodes)`

Empties `root`, appends each node, then focuses the first element marked with `autoFocus`. Entries that are `null` or `undefined` are skipped.

Moving focus on every screen change is what makes a screen reader announce the new screen, so every screen should mark exactly one element with `autoFocus`.

```js
function mainMenu(root, props) {
	mount(root, [
		el('h1', { text: `Welcome, ${props.name}` }),
		el('nav', {},
			el('button', { text: 'Create game', onClick: props.onCreate, autoFocus: true }),
			el('button', { text: 'Join game', onClick: props.onJoin }),
			props.connected ? el('button', { text: 'Disconnect', onClick: props.onDisconnect }) : null,
		),
	])
}
```

## `renderScreen(root, screen, props)`

Renders a screen and returns `{ dispose }`.

A screen is a function taking `(root, props)`. If it returns a function, `dispose` calls that function before emptying `root`. Use the returned function to undo anything that outlives the DOM, such as listeners on `window` or subscriptions. Listeners attached to the screen's own elements need no cleanup, since the elements are discarded.

`dispose` is safe to call more than once. Passing a `screen` that is not a function throws a `TypeError`.

```js
let current = null

function show(screen, props) {
	current?.dispose()
	current = renderScreen(document.getElementById('app'), screen, props)
}

show(mainMenu, { name, connected, onCreate, onJoin, onDisconnect })
```

A screen that needs cleanup returns it:

```js
function settings(root, props) {
	const select = el('select', { id: 'voice', onChange: (e) => props.onVoiceChange(e.target.value) })
	populate(select, props.voices)
	mount(root, [el('label', { for: 'voice', text: 'Voice' }), select])
	const onVoicesChanged = () => populate(select, speechSynthesis.getVoices())
	speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
	return () => speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
}
```

The module deliberately ships no screen registry. Keep your screens in whatever object or module suits the game and pass the function you want.

## `renderInstallPwaIos(root, options)`

Renders a screen that asks an iOS player to add the site to their home screen: what they gain, the steps to do it, and a button to carry on without installing.

The screen earns its place because a browser tab is a poor host for an audiogame. The address bar takes space, VoiceOver gesture handling differs, and the system can suspend audio when the tab goes to the background. A standalone home screen launch fixes all three.

Only Safari on iOS offers Add to Home Screen, and a player who already launched from the home screen has nothing to do here, so guard the call:

```js
import { isIOS, isIOSStandalone } from 'audiogame-utils/platform'

if (isIOS() && !isIOSStandalone()) renderScreen(root, renderInstallPwaIos, { onContinue: showMenu })
else showMenu()
```

It binds no listeners outside `root` and returns nothing, so it needs no cleanup. Its signature matches a screen, so it works either standalone or through `renderScreen`.

### Options

| Option | Default | Meaning |
| --- | --- | --- |
| `onContinue` | none | Called when the player activates the button. |
| `title` | `'Install for the best experience'` | Heading. |
| `message` | See source. | First paragraph, on why installing is better. |
| `instructions` | See source. | Second paragraph, the Safari steps. |
| `continueLabel` | `'Continue anyway'` | Button label. |

## `renderSpeechSettings(root, options)`

Renders the speech half of a settings screen: output mode, voice, rate, pitch, and a test button.

It reads and writes through a speech instance, so there are no value or callback props. Whatever the player picks is saved in the storage that instance was given.

```js
import { createSpeech } from 'audiogame-utils/speech'

const speech = createSpeech({ storage })

renderScreen(root, renderSpeechSettings, { speech, onBack: showMenu })
```

The voice, rate, and pitch controls only appear when the current mode uses text to speech, since a screen reader supplies its own. Changing the mode redraws the screen and puts focus back on the radio the player just used.

The mode picker is hidden on iOS by default. VoiceOver has to be off during gameplay, so text to speech is the only output left and there is nothing to choose. Pass `modes` to override this, and `modes: []` to hide the picker anywhere.

`renderSpeechSettings` returns a cleanup function that removes its `voiceschanged` listener, so render it through `renderScreen` and call `dispose` when you leave the screen.

Everything else in a settings screen, such as the display name, belongs to your game. Render it around this one.

### Options

| Option | Default | Meaning |
| --- | --- | --- |
| `speech` | none, required | A `createSpeech` instance. Throws if missing. |
| `onBack` | none | Adds a Back button. Without it there is no button. |
| `modes` | `[]` on iOS, `['aria', 'tts']` elsewhere | Modes offered by the picker. An empty array hides it. |
| `modeLabels` | `{ aria: 'Screen reader', tts: 'Text to speech', both: 'Both' }` | Label per mode. Merged with the defaults. |
| `title` | `'Speech settings'` | Heading. |
| `modeLegend` | `'Speech output'` | Fieldset legend. |
| `voiceLabel` | `'Voice'` | Label for the voice list. |
| `defaultVoiceLabel` | `'(default voice)'` | Entry shown when no voice is chosen. |
| `rateLabel` | `'Speech rate'` | Label for the rate slider. |
| `pitchLabel` | `'Speech pitch'` | Label for the pitch slider. |
| `testLabel` | `'Test voice'` | Label for the preview button. |
| `testMessage` | `'This is a test of the selected voice.'` | Text spoken by the preview button. |
| `backLabel` | `'Back'` | Label for the Back button. |
