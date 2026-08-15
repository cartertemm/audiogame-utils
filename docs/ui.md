# UI

The `audiogame-utils/ui` module builds the screens that surround gameplay: menus, forms, lobbies, and the handoff into the game itself. It is a few dozen lines of DOM helpers, not a framework. There is no virtual DOM, no reactivity, and no template syntax.

```js
import { el, mount, renderScreen, renderHandoff } from 'audiogame-utils/ui'
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

## `renderHandoff(root, options)`

Renders the last screen before gameplay: a short message and a Continue button.

The screen exists because of VoiceOver. A running screen reader on iOS intercepts the multi-finger gestures a game needs, so the player has to turn it off. That instruction has to be delivered while the screen reader can still read it, hence a dedicated screen with a button rather than a message spoken as the game starts. Desktop screen readers do not intercept gameplay keys the same way, so the warning is dropped there and pressing Enter also confirms.

Returns a cleanup function when it binds an Enter listener, and `undefined` otherwise. The signature matches a screen, so it can be passed straight to `renderScreen`, which handles the cleanup for you:

```js
renderScreen(root, renderHandoff, { onConfirm: () => startGame() })
```

Confirmation is one-shot: `onConfirm` runs at most once per render, since Enter on the focused button would otherwise fire both a click and a keydown.

### Options

| Option | Default | Meaning |
| --- | --- | --- |
| `canConfirm` | `true` | When false, renders the waiting variant: a live region and no button. |
| `onConfirm` | none | Called once when the player confirms. |
| `touch` | `isIOS()` | Whether to use the touch wording and skip the Enter binding. |
| `confirmOnEnter` | `!touch` | Whether Enter anywhere on the page confirms. |
| `title` | `'Almost ready'` | Heading for the confirm variant. |
| `message` | varies by `touch` | Body text for the confirm variant. |
| `confirmLabel` | `'Continue'` | Button label. |
| `waitingTitle` | `'Waiting'` | Heading for the waiting variant. |
| `waitingMessage` | varies by `touch` | Body text for the waiting variant. |

In a multiplayer game, only the player who starts the match gets `canConfirm: true`. Everyone else sees the waiting variant, which still carries the screen reader warning on touch so they can act on it before the game begins.

```js
renderScreen(root, renderHandoff, {
	canConfirm: isHost,
	onConfirm: () => net.send({ type: 'start' }),
	waitingMessage: 'Waiting for the host to serve.',
})
```
