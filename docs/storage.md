# Storage

The `audiogame-utils/storage` module stores namespaced values as JSON. It exports `createStorage`.

## Creating storage

```js
import { createStorage } from 'audiogame-utils/storage'

const storage = createStorage('mygame')
```

`createStorage(namespace, options)` requires a nonempty namespace string. Keys are stored with the namespace followed by a colon, so the example above stores `difficulty` as `mygame:difficulty`.

The optional `backend` property can provide an object with the same `getItem`, `setItem`, and `removeItem` methods as `localStorage`:

```js
const storage = createStorage('mygame', { backend: sessionStorage })
```

If no backend is provided, the module resolves `localStorage` when each operation runs.

## Methods

### `get(key, defaultValue)`

Reads and parses a JSON value. It returns `defaultValue` when the key is missing or the stored value is not valid JSON. The default fallback is `undefined`.

### `set(key, value)`

Serializes `value` as JSON and stores it under the namespaced key.

### `remove(key)`

Removes the namespaced key.

```js
storage.set('difficulty', 'hard')
storage.get('difficulty', 'normal')
storage.remove('difficulty')
```
