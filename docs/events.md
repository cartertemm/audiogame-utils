# Events

The `audiogame-utils/events` module exports a small `EventEmitter` class with no additional runtime dependency.

```js
import { EventEmitter } from 'audiogame-utils/events'

const events = new EventEmitter()
const announceScore = score => console.log(`Score: ${score}`)

// Subscribe to events (returns an unsubscribe function)
const unbind = events.on('score', announceScore)

events.emit('score', 3)
unbind()
```

## Methods

### `on(event, handler)`

Registers `handler` for the named event. More than one handler can listen for the same event. Returns an unsubscribe function `() => void` that removes the handler when called.

```js
const unbind = events.on('hit', data => console.log(data))
unbind() // Removes this specific listener
```

### `once(event, handler)`

Registers a one-time `handler` for the named event. The handler automatically unbinds after it fires once. Returns an unsubscribe function `() => void` if called before emission.

```js
events.once('ready', () => console.log('Initialized'))
```

### `off(event, handler)`

Removes `handler` from the named event. If `handler` is omitted, removes all handlers registered for `event`. Calling it for an unknown event or handler has no effect.

```js
events.off('score', announceScore) // Removes specific handler
events.off('score')               // Removes all handlers for 'score'
```

### `emit(event, data)`

Calls each handler registered for the named event and passes `data` to it. Execution continues across remaining handlers even if a handler throws an error.

### `listenerCount(event)`

Returns the number of registered listeners for `event`.

```js
events.listenerCount('score') // Returns active count
```
