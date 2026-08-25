# Stats

The `audiogame-utils/stats` module provides stat tracking, formatted stat text, custom callback formatting, list sorting, set merging, and serialization.

```js
import { createStatSet, STAT_SORT_MODE } from 'audiogame-utils/stats'

const stats = createStatSet()

stats.add('score', 0, 'Score: %0')
stats.add('health', 100, '%0', stat => `HP: ${stat.val}/100`)

stats.mod('score', 50)
stats.update('health', 85)

console.log(stats.get('score').format())  // "Score: 50"
console.log(stats.get('health').format()) // "HP: 85/100"
```

## `Stat` Class

Represents an individual stat.

| Property / Method | Description |
| --- | --- |
| `name` | Name string identifying the stat. |
| `val` | Current numeric, string, or boolean value. |
| `text` | Display template string (default `"%0"`). |
| `callback` | Custom formatting function `(stat) => string`. |
| `user` | Optional metadata object attached to the stat. |
| `sortCounter` | Monotonically increasing number tracking creation order. |
| `format()` | Formats the stat using `callback` or template `text`. |
| `valueOf()` | Returns `val`. |

## `StatSet` Class & `createStatSet()`

Manages a set of stats keyed by name.

### Methods

#### `add(name, val, text = "%0", callback = null, user = null)`

Adds a new stat to the set. Returns the created `Stat` instance, or `null` if a stat with that name already exists.

#### `update(name, val)`

Updates the value of an existing stat.

#### `mod(name, delta)`

Adds `delta` to an existing stat's value.

#### `delete(name)` / `remove(name)`

Removes a stat from the set. Returns `true` if found and deleted.

#### `reset()` / `clear()`

Removes all stats from the set.

#### `get(name)`

Returns the `Stat` instance for `name`, or `null` if not found.

#### `exists(name)` / `has(name)`

Returns `true` if a stat exists with `name`.

#### `list(sortMode, sortInFront, sortBehind)`

Returns an array of stat names.

- `sortMode`: `STAT_SORT_MODE.NONE` (`'none'`), `STAT_SORT_MODE.ADD_ORDER` (`'add_order'`), or `STAT_SORT_MODE.VALUE` (`'value'`).
- `sortInFront`: Optional array of stat names to move to the front of the list.
- `sortBehind`: Optional array of stat names to move to the back of the list.

```js
const names = stats.list(STAT_SORT_MODE.VALUE, ['score'], ['health'])
```

#### `getStats()`

Returns an array of all `Stat` objects.

#### `addSet(other)`

Merges another `StatSet` into this set. Values for existing stat names are added together (`this.val += other.val`), while new stat names are created.

```js
stats1.addSet(stats2)
```

#### `serializeLinear()` & `deserializeLinear(data)`

Serializes stats to line format (`name=value\n`) and deserializes plain text data.

#### `serialize()` & `deserialize(data)`

Serializes stats to a JSON string representation and deserializes JSON formatted data.
