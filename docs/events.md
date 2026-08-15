# Events

The `audiogame-utils/events` module exports a small `EventEmitter` class with no additional runtime dependency.

```js
import { EventEmitter } from 'audiogame-utils/events'

const events = new EventEmitter()
const announceScore = score => console.log(`Score: ${score}`)

events.on('score', announceScore)
events.emit('score', 3)
events.off('score', announceScore)
```

## Methods

### `on(event, handler)`

Registers `handler` for the named event. More than one handler can listen for the same event.

### `off(event, handler)`

Removes every registration of that handler from the named event. Calling it for an unknown event or handler has no effect.

### `emit(event, data)`

Calls each handler registered for the named event and passes `data` to it. Calling it for an event with no handlers has no effect.
