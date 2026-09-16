# Buffers

Buffers keep recent game messages in named, reviewable lists. A player can hear an event when it happens, then return to it later without interrupting play or losing newer messages. Reviewable buffers have been a convention in audio games for many years.
If you have played some of the most popular multiplayer exploration and first person shooters, you have interacted with buffers before.

The `audiogame-utils/buffers` module provides the data model and speech navigation. Audiogame Utils also goes a step further: `renderBufferList()` and `renderBufferManager()` can display the same buffers on screen for sighted players and for games that do not use an invisible interface or focus trap.

## Creating buffers

Pass a speech instance to `createBufferManager()` when buffer navigation should be spoken. Create one buffer for each category a player may want to review.

```js
import { createBufferManager } from 'audiogame-utils/buffers'

const buffers = createBufferManager({ speech })
const all = buffers.createBuffer('All')
const chats = buffers.createBuffer('Chats')
const combat = buffers.createBuffer('Combat')
```

Use `addItem()` instead of calling `Buffer.add()` when the item should emit an event and be announced. An item may be a string or an object with `text`, `time`, and `data` properties.

```js
buffers.addItem(chats, 'Mira: Meet at the north gate')
buffers.addItem(combat, {
	text: 'The raider hits you for 8 damage',
	data: { damage: 8, source: 'raider' },
})
```

One event may belong to a specific category and to an aggregate buffer. Add the aggregate copy silently so the event is announced only once.

```js
function recordEvent(category, text) {
	buffers.addItem(all, text, { silent: true })
	buffers.addItem(category, text)
}

recordEvent(chats, 'Mira: Meet at the north gate')
recordEvent(combat, 'The raider hits you for 8 damage')
```

Every stored item has these properties:

| Property | Description |
| --- | --- |
| `text` | Text spoken when the item is reviewed. |
| `time` | Creation time in milliseconds since the Unix epoch. |
| `data` | Optional game data attached to the item. Defaults to `null`. |

## Navigating a focus trap

A game can connect any controls to the manager's navigation methods. This example uses a focus trap with All, Chats, and Combat buffers. Left and right bracket move between buffers. Comma and period move between items. Holding Shift moves to the first or last buffer or item.

```js
import { createBufferManager } from 'audiogame-utils/buffers'
import { createFocusTrap } from 'audiogame-utils/focus'
import { createKeyboard } from 'audiogame-utils/input'

const buffers = createBufferManager({ speech })
buffers.createBuffer('All')
buffers.createBuffer('Chats')
buffers.createBuffer('Combat')

createFocusTrap(document.querySelector('#game'), { label: 'Game' })

const keyboard = createKeyboard()
keyboard.on('keypress', event => {
	const actions = event.shiftKey
		? {
			BracketLeft: () => buffers.firstBuffer(),
			BracketRight: () => buffers.lastBuffer(),
			Comma: () => buffers.firstBufferItem(),
			Period: () => buffers.lastBufferItem(),
		}
		: {
			BracketLeft: () => buffers.previousBuffer(),
			BracketRight: () => buffers.nextBuffer(),
			Comma: () => buffers.previousBufferItem(),
			Period: () => buffers.nextBufferItem(),
		}

	const action = actions[event.code]
	if (!action) return
	event.preventDefault()
	action()
})
```

See the [focus trap buffer example](../examples/buffers-focus-trap.html) for a runnable version.

## Rendering buffers

`renderBufferManager()` presents the same manager as an accessible tab interface. It stays synchronized as buffers and items change. Its tabs handle clicks and the left and right arrow keys, so the game does not need separate buffer navigation bindings.

```js
import { createBufferManager } from 'audiogame-utils/buffers'
import { renderBufferManager } from 'audiogame-utils/ui'

const buffers = createBufferManager({ speech })
buffers.createBuffer('All')
buffers.createBuffer('Chats')
buffers.createBuffer('Combat')

const view = renderBufferManager(buffers)
document.querySelector('#events').appendChild(view)

// Remove subscriptions when the screen closes.
view.dispose()
```

See the [rendered buffer example](../examples/buffers-rendered.html) for a runnable version.

## API reference

### `createBufferManager(options)`

Creates and returns a `BufferManager`.

| Option | Default | Description |
| --- | --- | --- |
| `speech` | `null` | Speech instance used for announcements. When omitted, buffer operations still work without speech. |

### `new Buffer(name, options)`

Creates a named buffer. Most games should use `manager.createBuffer()` so creation and later item changes can emit manager events.

| Option | Default | Description |
| --- | --- | --- |
| `maxItems` | `Infinity` | Maximum retained items. Oldest items are removed when the limit is exceeded. |

#### Buffer properties

| Property | Description |
| --- | --- |
| `name` | Buffer name. |
| `items` | Array of buffer item objects. |
| `position` | Index of the current item, or `-1` when empty. |
| `maxItems` | Maximum number of retained items. |
| `length` | Number of retained items. Read only. |
| `current` | Current item, or `null` when empty. Read only. |

#### `buffer.add(textOrItem)`

Appends an item and returns it. A string becomes an object with `text`, the current time, and `data: null`. An object must have a string `text` property. Missing `time` and `data` values receive the same defaults.

This method updates only the buffer. Use `manager.addItem()` when the addition should emit an event or be spoken.

#### `buffer.clear()`

Removes every item and resets `position` to `-1`. This method updates only the buffer. Use `manager.clearBuffer()` when the clear should emit an event.

### `BufferManager`

#### `new BufferManager(options)`

Creates a buffer manager. It accepts the same optional `speech` value as `createBufferManager()`. The factory is usually more concise, but both forms produce the same manager.

#### Manager properties

| Property | Description |
| --- | --- |
| `buffers` | Ordered array of managed buffers. |
| `position` | Index of the focused buffer, or `-1` when there are no buffers. |
| `current` | Focused buffer, or `null` when there are no buffers. Read only. |
| `speech` | Speech instance supplied when the manager was created, or `null`. |

#### `manager.createBuffer(name, options)`

Creates, stores, and returns a `Buffer`. The first buffer becomes current. Throws when a buffer already has the same name. `options.maxItems` sets its retention limit.

#### `manager.getBuffer(name)`

Returns the buffer with `name`, or `null` when it does not exist.

#### `manager.deleteBuffer(target)`

Deletes a buffer selected by name or `Buffer` instance. Returns `true` when it was deleted and `false` when it was not found. Focus moves to a remaining buffer when necessary.

#### `manager.clearBuffer(target)`

Clears a buffer selected by name or `Buffer` instance. Returns `true` when it was found and `false` otherwise.

#### `manager.addItem(target, textOrItem, options)`

Adds an item to a buffer selected by name or `Buffer` instance, emits `add`, and returns the item. The item is announced without interrupting current speech unless `options.silent` is `true`. Throws when the target is unknown.

#### `manager.focusBuffer(target, options)`

Focuses a buffer selected by name or `Buffer` instance. Returns `true` when it was found and `false` otherwise. It announces the buffer name and item count unless `options.silent` is `true`.

#### `manager.nextBuffer(options)` and `manager.previousBuffer(options)`

Moves to the adjacent buffer. Movement stops at the first or last buffer unless `options.wrap` is `true`. The current buffer details are spoken even when movement stops at an edge. Pass `options.silent: true` to suppress speech.

#### `manager.firstBuffer(options)` and `manager.lastBuffer(options)`

Moves to the first or last buffer. Pass `options.silent: true` to suppress speech.

#### `manager.nextBufferItem(options)` and `manager.previousBufferItem(options)`

Moves through items in the current buffer and speaks the resulting item. Movement stops at an edge unless `options.wrap` is `true`. An empty buffer announces that it has no items.

#### `manager.firstBufferItem()` and `manager.lastBufferItem()`

Moves to and speaks the first or last item in the current buffer. An empty buffer announces that it has no items.

#### `manager.speakCurrentItem()`

Speaks the current item. An empty buffer announces that it has no items. It does nothing when there are no buffers.

#### `manager.speakBufferDetails(buffer)`

Speaks the buffer name and item count, such as `Chats: 2 items`.

### Manager events

`BufferManager` extends `EventEmitter`. Subscribe with `manager.on(name, handler)`. The returned function unsubscribes the handler.

| Event | Emitted when |
| --- | --- |
| `create` | A buffer is created. |
| `delete` | A buffer is deleted. |
| `add` | An item is added through `manager.addItem()`. |
| `clear` | A buffer is cleared through `manager.clearBuffer()`. |
| `focus` | The focused buffer changes, including when deletion leaves no current buffer. |
| `move` | The current item's position changes. |

Every event receives `{ manager, buffer }`. An `add` event also includes `item`. The `buffer` value is `null` only when a `focus` event reports that no buffers remain.

### `renderBufferList(buffer, options)`

Returns a `ul` containing the buffer's current items. The list has the buffer name as its accessible label, and the current item receives the `current` class and `aria-current="true"`.

Pass `{ manager }` to keep the list synchronized with additions, clearing, and item movement. Without a manager, it is a static snapshot. Call `list.dispose()` to remove its subscriptions.

### `renderBufferManager(manager)`

Returns a live tab interface with one tab and panel per buffer. It tracks buffer creation, deletion, focus, item additions, clearing, and item movement.

Tabs select buffers silently. Left and right arrow keys move between tabs and wrap at the ends. Each panel is keyboard focusable and contains a live buffer list. Call `view.dispose()` to remove every manager subscription and stop tab interaction.
