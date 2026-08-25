# Stats

The `audiogame-utils/stats` module keeps named values together in a stat set. A stat can represent a score, health, coins, a player title, a setting, or any other value that a game needs to track.

Each stat has two main parts:

* A stored value used by the game, such as `85` health.
* Display text used when presenting that value, such as `Health: 85`.

A stat set stores each stat under a unique name. The name is how the game finds and changes that stat later.

```js
import { createStatSet } from 'audiogame-utils/stats'

const stats = createStatSet()

stats.add('score', 0, 'Score: %0')
stats.add('health', 100, 'Health: %0')

stats.mod('score', 50)
stats.update('health', 85)

console.log(stats.get('score').format())  // "Score: 50"
console.log(stats.get('health').format()) // "Health: 85"
```

`createStatSet()` is the usual way to create an empty set. The module also exports the `StatSet` and `Stat` classes for applications that need to construct them directly.

## Adding and changing stats

Use `add` once to create a stat. Its first argument is the name, its second is the initial value, and its optional third argument controls how it is displayed.

```js
stats.add('coins', 10, 'Coins: %0')
stats.add('title', 'Explorer', 'Title: %0')
stats.add('musicEnabled', true)
```

Names are case sensitive, so `score` and `Score` are different stats. A set cannot contain the same name twice. Calling `add` with an existing name leaves the original stat unchanged and returns `null`.

Use `update` to replace a value. Use `mod` to add an amount to the current value.

```js
stats.update('title', 'Champion')
stats.mod('coins', 5)

console.log(stats.get('coins').val) // 15
```

`mod` uses JavaScript addition. It is intended primarily for numbers. If either value is text, JavaScript may join the values as strings instead.

Calling `update` or `mod` for a name that is not present does nothing. These methods do not create missing stats.

## Reading and removing stats

Use `get` when the application needs the full `Stat` object. It returns `null` when the name is missing, so check the result before reading its properties.

```js
const health = stats.get('health')

if (health) {
	console.log(health.val)
}
```

Use `exists` or its alias `has` when only a yes or no answer is needed. Use `size` to read the number of stats in the set.

```js
if (stats.has('health')) {
	console.log(`Tracking ${stats.size} stats`)
}
```

`delete` and `remove` are two names for the same operation. They return `true` when a stat was removed and `false` when the name was not found. `reset` and `clear` both remove every stat from the set.

## Formatting values for display

The display template passed to `add` can contain `%0`. When `format()` is called, the first `%0` is replaced with the current value.

```js
stats.add('score', 250, 'Current score: %0 points')

stats.get('score').format() // "Current score: 250 points"
```

If the template contains no `%0`, it is returned as fixed text. If the template is omitted or empty, it defaults to `%0`, which displays only the value.

For display rules that a template cannot express, pass a callback as the fourth argument to `add`. The callback receives the entire stat and returns the text to display.

```js
stats.add(
	'health',
	85,
	'%0',
	stat => `HP: ${stat.val}/100`,
)

stats.get('health').format() // "HP: 85/100"
```

Calling `String(stat)` also uses `format()`. Using a stat in a numeric expression asks for its stored value through `valueOf()`.

The optional fifth argument to `add` stores application specific information in `stat.user`. The stats module keeps this object but does not interpret it.

```js
stats.add('health', 85, 'Health: %0', null, {
	category: 'player',
	announceChanges: true,
})
```

## Listing and ordering stats

`getStats()` returns the `Stat` objects. `list()` returns only their names, which is convenient for building a scoreboard or status screen.

```js
import { STAT_SORT_MODE } from 'audiogame-utils/stats'

const stats = createStatSet()
stats.add('score', 300)
stats.add('coins', 20)
stats.add('health', 75)

stats.list()                     // ['score', 'coins', 'health']
stats.list(STAT_SORT_MODE.VALUE) // ['coins', 'health', 'score']
```

The available sort modes are:

* `STAT_SORT_MODE.NONE` keeps the set's current insertion order. This is the default.
* `STAT_SORT_MODE.ADD_ORDER` sorts by the creation order stored on each stat.
* `STAT_SORT_MODE.VALUE` sorts from lowest to highest value. Two numeric values are compared as numbers. Other values are converted to text and compared alphabetically according to the current locale.

Creation order and insertion order are usually the same. They can differ after sets are combined because a copied stat keeps its original creation number.

The optional `sortInFront` and `sortBehind` arrays force selected names to the beginning or end after the main sort. Their order in the arrays is preserved. Names that are not in the set are ignored.

```js
const names = stats.list(
	STAT_SORT_MODE.VALUE,
	['health'],
	['score'],
)

// ['health', 'coins', 'score']
```

If the same name appears in both override arrays, the later `sortBehind` step places it at the end.

## Combining stat sets

`addSet(other)` adds the contents of another set into the current set. A new name is copied. When both sets contain the same name, their values are added together and the current stat keeps its existing display template, callback, and user data.

```js
const total = createStatSet()
total.add('coins', 10, 'Coins: %0')

const levelReward = createStatSet()
levelReward.add('coins', 5)
levelReward.add('keys', 1)

total.addSet(levelReward)

total.get('coins').val // 15
total.get('keys').val  // 1
```

`addSet` accepts another `StatSet`, an array of stat shaped objects, or an object whose values are stat shaped objects. Each object needs a nonempty `name`. The method returns the current set, so calls can be chained.

Passing another collection to `createStatSet(other)` or `new StatSet(other)` fills the new set using the same rules.

## Saving and loading

The module provides JSON and line based formats. Both loading methods add new names and update matching names. They do not clear the set first.

### JSON format

`serialize()` returns a JSON string containing each stat's `name`, `val`, and `text`.

```js
const saved = stats.serialize()

const loadedStats = createStatSet()
const loaded = loadedStats.deserialize(saved)

if (loaded) {
	console.log(loadedStats.get('health').val)
}
```

`deserialize(data)` accepts either that JSON string or an already parsed array. It returns `true` when `data` is a valid array, including an empty array. It returns `false` for an empty string, invalid JSON, or another type of JSON value.

For an existing stat, loading changes only its value. Its current display template and other settings remain in place. A newly loaded stat receives the saved display template.

Callbacks, `user` data, and creation order are not saved. Restore custom callbacks and user data in application code after loading when they are needed.

### Line format

`serializeLinear()` returns plain text with one `name=value` pair per line.

```text
score=300
health=75
title=Champion
```

`deserializeLinear(data)` reads the first equals sign on each valid line. Surrounding spaces are removed from the name and value. Whole numbers and ordinary decimal numbers become JavaScript numbers. Other values remain strings, so values such as `true` load as the string `"true"` rather than the boolean `true`.

The line format saves only names and values. It does not save display templates, callbacks, `user` data, or creation order. Names and values containing line breaks cannot be represented safely in this format. Use JSON when those limitations matter.

`deserializeLinear` returns `true` when it finds at least one valid pair. It returns `false` for nonstring input or text with no valid pairs.

## API reference

### `createStatSet(other = null)`

Creates and returns a `StatSet`. With no argument, the set is empty. An optional `StatSet`, array, or object initializes it using the `addSet` rules.

### `STAT_SORT_MODE`

Contains the supported names for `StatSet.list` sorting:

* `NONE`, with the value `'none'`
* `ADD_ORDER`, with the value `'add_order'`
* `VALUE`, with the value `'value'`

For compatibility, `list` also accepts `0`, `1`, and `2` for these modes in the same order.

### `defaultStatCallback(stat)`

Provides the standard template formatting used when no custom callback is supplied. It replaces the first `%0` in `stat.text` with `stat.val`. It returns nonempty template text unchanged when no placeholder is present, uses the value when the template is empty, and returns an empty string when `stat` is missing.

### `new Stat(name, val, text = '%0', callback = null, user = null)`

Creates one stat directly.

#### Properties

* `name`: The unique name used to find the stat in a set.
* `val`: The current stored value.
* `text`: The display template.
* `callback`: The function used by `format()`.
* `user`: Application specific data. It defaults to an empty object.
* `sortCounter`: A creation number used by `STAT_SORT_MODE.ADD_ORDER`.

#### `stat.format()`

Returns the stat's display text using its callback.

#### `stat.toString()`

Returns the same text as `format()`.

#### `stat.valueOf()`

Returns the stored `val`.

### `new StatSet(other = null)`

Creates a stat set. The optional `other` argument follows the same initialization rules as `createStatSet(other)`.

#### `stats.size`

The number of stats currently in the set. `get_size()` returns the same number.

#### `stats.stats`

The JavaScript `Map` that holds the set's stats by name. Most applications can use `add`, `get`, `delete`, and the other methods instead of accessing this map directly.

#### `stats.add(name, val, text = '%0', callback = null, user = null)`

Adds a new stat and returns it. Returns `null` without changing the set when the name already exists.

#### `stats.update(name, val)`

Replaces the value of an existing stat. Does nothing when the name is missing.

#### `stats.mod(name, delta)`

Adds `delta` to an existing value using JavaScript addition. Does nothing when the name is missing.

#### `stats.delete(name)`

Removes a stat. Returns `true` when it was found and `false` otherwise. `remove(name)` is an alias.

#### `stats.reset()`

Removes every stat. `clear()` is an alias.

#### `stats.get(name)`

Returns the matching `Stat`, or `null` when it is missing.

#### `stats.exists(name)`

Returns whether the name exists. `has(name)` is an alias.

#### `stats.getStats()`

Returns an array of every `Stat` object. `get_stats()` is an alias.

#### `stats.list(sortMode = STAT_SORT_MODE.NONE, sortInFront = [], sortBehind = [])`

Returns an array of stat names. It applies the selected main sort, then moves names from `sortInFront` to the beginning and names from `sortBehind` to the end.

#### `stats.addSet(other)`

Combines another set, array, or object with this set. Matching values are added together. New stats are copied. Returns this `StatSet`.

#### `stats.serialize()`

Returns a JSON string containing names, values, and display templates.

#### `stats.deserialize(data)`

Loads a JSON string or parsed array into the set. Returns whether the input was a valid array.

#### `stats.serializeLinear()`

Returns the set as `name=value` lines. `serialize_linear()` is an alias.

#### `stats.deserializeLinear(data)`

Loads valid `name=value` lines into the set. Returns whether at least one valid pair was found. `deserialize_linear(data)` is an alias.
