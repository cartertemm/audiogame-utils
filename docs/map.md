# Maps

The `audiogame-utils/map` module stores level data as a collection of axis aligned boxes. Each box, called an entry, has six inclusive integer bounds: `minx`, `maxx`, `miny`, `maxy`, `minz`, and `maxz`.

This model works for floor surfaces, named areas, sound sources, triggers, spawn points, and other spatial data. The system is designed for fast queries and compact storage on maps with hundreds of thousands of entries.

The module exports `createMap`.

## Quick start

```js
import { createMap } from 'audiogame-utils/map'

const map = createMap()
await map.loadMap({ url: '/maps/venue.json' })

const tile = map.getOneAt('tile', 10, 12, 0)
console.log(tile?.file)
```

## Map file format

A map file is a JSON object with a header and an optional list of entries:

```json
{
	"name": "Riverside venue",
	"maxx": 20,
	"maxy": 40,
	"maxz": 0,
	"entries": [
		{
			"type": "tile",
			"file": "concrete",
			"minx": 0,
			"maxx": 20,
			"miny": 0,
			"maxy": 20,
			"minz": 0,
			"maxz": 0
		},
		{
			"type": "src",
			"file": "./sounds/truck.ogg",
			"loop": true,
			"minx": 10,
			"maxx": 10,
			"miny": 9,
			"maxy": 11,
			"minz": 0,
			"maxz": 0
		},
		{
			"type": "zone",
			"name": "parking lot",
			"minx": 0,
			"maxx": 20,
			"miny": 0,
			"maxy": 20,
			"minz": 0,
			"maxz": 0
		}
	]
}
```

The header has four required fields:

| Field | Meaning |
| --- | --- |
| `name` | A string that identifies the map. |
| `maxx` | The highest valid X coordinate. |
| `maxy` | The highest valid Y coordinate. |
| `maxz` | The highest valid Z coordinate. |

Each maximum must be a nonnegative integer. Coordinates begin at 0, so a map with `maxx` set to 20 has valid X coordinates from 0 through 20.

The `entries` array may be omitted for an empty map. Every entry needs a registered `type` and all six bounds. Bounds are inclusive on both ends. For example, `[0, 10]` and `[10, 20]` overlap at 10.

### Entry bounds

The six bounds describe the smallest box that contains an entry:

| Field | Meaning |
| --- | --- |
| `minx` | The lowest X coordinate covered by the entry. |
| `maxx` | The highest X coordinate covered by the entry. |
| `miny` | The lowest Y coordinate covered by the entry. |
| `maxy` | The highest Y coordinate covered by the entry. |
| `minz` | The lowest Z coordinate covered by the entry. |
| `maxz` | The highest Z coordinate covered by the entry. |

The map module treats X, Y, and Z as numeric axes without assigning them a direction. The convention used by the rest of this package is positive X for east, positive Y for north, and positive Z for up. Under that convention, the minimum values are the west, south, and bottom sides of the box. The maximum values are the east, north, and top sides.

Set a minimum and maximum to the same value when an entry occupies one coordinate on that axis. This tile covers X coordinates 4 through 8, Y coordinates 10 through 15, and only Z coordinate 0:

```json
{
	"type": "tile",
	"file": "wood",
	"minx": 4,
	"maxx": 8,
	"miny": 10,
	"maxy": 15,
	"minz": 0,
	"maxz": 0
}
```

Because both ends are included, that tile is 5 coordinates wide and 6 coordinates long. A point at `(8, 15, 0)` is inside it, while `(9, 15, 0)` is outside it.

## Built in types

Every map starts with three registered types:

| Type | Required fields | Overlap policy | Typical use |
| --- | --- | --- | --- |
| `tile` | `file` | `error` | A floor surface or footstep sound key. |
| `src` | `file`, `loop` | `allow` | A positioned sound source. |
| `zone` | `name` | `allow` | A named room, area, or region. |

The map stores and returns the fields registered for a type. It does not interpret their values. Your game decides how a tile filename, source loop flag, or zone name affects play.

The `tile` overlap policy prevents two tiles from sharing a cell. Sources and zones may overlap other entries of the same type.

## Loading maps

`loadMap(source)` accepts exactly one data source:

```js
await map.loadMap({ url: '/maps/venue.json' })
await map.loadMap({ data: mapObject })
await map.loadMap({ data: jsonString })
await map.loadMap({ from: async () => mapObject })
```

`url` fetches and parses a JSON file. A failed request includes the URL and response status in its error when available.

`data` accepts an already parsed object or a JSON string. `from` accepts a function that returns either form, directly or through a promise. Passing no source or more than one source throws.

### Custom parsers

Pass `parser` to `createMap` to replace the JSON parser:

```js
const map = createMap({
	parser(raw) {
		return parseCustomMap(raw)
	},
})
```

The parser must return an object with `name`, `maxx`, `maxy`, `maxz`, and `entries`. The map still validates the returned entries, so a custom parser cannot bypass type, bounds, or overlap rules.

### Loading in pieces

Calling `loadMap` again adds entries instead of replacing the current map. The header keeps the name from the first successful load. Each maximum expands to the largest value loaded so far.

A load is transactional. The map validates the complete batch before committing it. If parsing, validation, fetching, or overlap checking fails, the existing entries and header remain unchanged.

## Reading entries

### `getDataAt(type, minx, maxx, miny, maxy, minz, maxz)`

Returns every entry of `type` whose box overlaps the query box. Results are in insertion order.

```js
const nearbySources = map.getDataAt(
	'src',
	player.x - 10, player.x + 10,
	player.y - 10, player.y + 10,
	player.z, player.z,
)
```

An empty region returns an empty array. An unknown type throws.

### `getOneAt(type, x, y, z)`

Returns the last matching entry at one point, or `undefined` when nothing matches.

```js
const zone = map.getOneAt('zone', player.x, player.y, player.z)
speech.speak(zone?.name ?? 'open ground')
```

Returning the last match lets a later, smaller zone take precedence over a broad zone loaded earlier. An unknown type throws.

## Editing entries

### `setDataAt(entry)`

Adds one entry using the same shape as an entry in a map file:

```js
map.setDataAt({
	type: 'zone',
	name: 'loading dock',
	minx: 30,
	maxx: 40,
	miny: 5,
	maxy: 12,
	minz: 0,
	maxz: 0,
})
```

The entry must provide integer bounds and every field required by its type. Once a map has been loaded, its bounds must also fit inside the current header. Before the first load there is no header, so `setDataAt` cannot perform that map size check.

For a type with the `error` overlap policy, `setDataAt` rejects an entry that shares any cell with an existing entry of the same type.

### `removeDataAt(type, minx, maxx, miny, maxy, minz, maxz)`

Removes every entry of `type` that overlaps the given box:

```js
map.removeDataAt('zone', 30, 40, 5, 12, 0, 0)
```

Entries of other types are not affected. An unknown type throws.

## Custom types

`registerType(name, options)` adds a type to one map instance. Register custom types before loading entries that use them.

```js
map.registerType('spawn', {
	fields: ['item', 'count'],
	overlap: 'allow',
})

map.setDataAt({
	type: 'spawn',
	item: 'ammo',
	count: 5,
	minx: 8,
	maxx: 8,
	miny: 4,
	maxy: 4,
	minz: 0,
	maxz: 0,
})
```

`fields` lists properties that every entry of the type must provide. It defaults to an empty array. Only registered fields are stored and returned with an entry.

`overlap` accepts `allow` or `error` and defaults to `allow`. The `error` policy rejects boxes of that type that share any cell, including an endpoint.

Registering the same type name twice throws. Reading, loading, adding, or removing an unknown type also throws.

## Map state and saving

### `header()`

Returns a copy of the current `{ name, maxx, maxy, maxz }` header. It returns `null` before the first successful load and after `clear()`.

### `serialize()`

Returns a plain object with the current header and every live entry. Removed entries are omitted. The result can be loaded into a fresh map:

```js
const saved = map.serialize()

const restored = createMap()
await restored.loadMap({ data: saved })
```

Register any custom types on the new map before loading serialized entries that use them. `serialize()` throws when the map has no header, including when entries were added only through `setDataAt` before any load.

### `clear()`

Removes all entries and resets the header to `null`. Built in and custom type registrations remain available, so they do not need to be registered again after a level change.

### `memoryBytes()`

Returns an approximation of the fixed bounds storage used by entries added since the last `clear()`. It includes removed entries and does not count payload values, indexes, or unused capacity. Treat it as a lower bound that is useful for tracking growth, not as total memory use.

## Validation and errors

The default JSON parser and map validator reject:

1. Invalid JSON or a top level value that is not an object.
2. A missing or invalid `name`, `maxx`, `maxy`, or `maxz` header field.
3. An `entries` value that is not an array, or an entry that is not an object.
4. An unknown entry type or a missing field required by that type.
5. A bound that is not an integer, a minimum above its maximum, or an entry outside the map header.
6. Overlapping entries for a type whose overlap policy is `error`.

Errors created by the map system begin with `map:`. A failed `loadMap` leaves the map exactly as it was before the call.

## Complete example

The [Riverside venue map](../examples/maps/venue.json) defines floor surfaces, zones, and positioned looping sounds. Its [game code](../examples/venue.js) loads those entries, changes footstep sounds by tile, announces zones, and places audio sources in the world.
