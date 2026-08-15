# Maps

The `audiogame-utils/map` module stores level data as a set of axis-aligned boxes. It is not a grid. Each box (an "entry") carries six inclusive integer bounds: `minx`, `maxx`, `miny`, `maxy`, `minz`, `maxz`. Bounds are inclusive on both ends, so `[0, 10]` and `[10, 20]` overlap at 10.

The module exports one function, `createMap`.

## Creating a map and loading data

```js
import { createMap } from 'audiogame-utils/map'

const map = createMap()
await map.loadMap({ url: '/maps/level1.json' })
```

`loadMap` accepts exactly one of three sources:

```js
await map.loadMap({ url: '/maps/level1.json' })   // fetch and parse a URL
await map.loadMap({ data: mapObjectOrString })     // parse an object or JSON string directly
await map.loadMap({ from: async () => text })      // parse the string an async function resolves to
```

Passing zero sources, or more than one, throws.

`createMap(options)` accepts an optional `parser` function to replace the default JSON parser. Most applications do not need this.

## The JSON file shape

A map file is one JSON object with a header and a list of entries:

```json
{
	"name": "level1",
	"maxx": 100,
	"maxy": 100,
	"maxz": 4,
	"entries": [
		{ "type": "tile", "minx": 0, "maxx": 0, "miny": 0, "maxy": 0, "minz": 0, "maxz": 0, "tile": "concrete" },
		{ "type": "src", "minx": 5, "maxx": 5, "miny": 5, "maxy": 5, "minz": 0, "maxz": 0, "file": "fountain.ogg", "loop": true },
		{ "type": "zone", "minx": 0, "maxx": 10, "miny": 0, "maxy": 10, "minz": 0, "maxz": 0, "name": "courtyard" }
	]
}
```

`name`, `maxx`, `maxy`, and `maxz` are required. `maxx`, `maxy`, and `maxz` give the map's highest valid coordinate on each axis; every entry's bounds must fall between 0 and these values, inclusive. `entries` may be omitted for an empty map.

Loading a second map into the same `map` object adds its entries to the first instead of replacing them. The header keeps the original name and grows `maxx`, `maxy`, and `maxz` to fit whichever map is largest.

## Built-in types

Three types are registered by default:

| Type | Fields | Overlap |
| --- | --- | --- |
| `tile` | `tile` | rejected |
| `src` | `file`, `loop` | allowed |
| `zone` | `name` | allowed |

A type with overlap rejected refuses an entry whose box shares a cell with an existing entry of the same type. `tile` uses this so two floor tiles cannot occupy the same cell. `src` and `zone` allow overlap, so a sound source and a named zone can both cover the same ground as a tile.

## Reading entries

`getDataAt(type, minx, maxx, miny, maxy, minz, maxz)` returns every entry of `type` whose box overlaps the query box, in insertion order. `getOneAt(type, x, y, z)` returns the last matching entry (the most recently added one) at a single point, or `undefined` if nothing matches.

A typical use is reading the tile under a moving player:

```js
function tileUnderPlayer(map, player) {
	const tile = map.getOneAt('tile', player.x, player.y, player.z)
	return tile === undefined ? null : tile.tile
}

function soundsNear(map, player, radius) {
	return map.getDataAt(
		'src',
		player.x - radius, player.x + radius,
		player.y - radius, player.y + radius,
		player.z, player.z,
	)
}
```

Both functions accept the same type, min, and max arguments, and both throw if the type is not registered.

## Writing entries

`setDataAt(entry)` adds a single entry. The entry is a full object with a `type` and all six bounds, plus that type's required fields:

```js
map.setDataAt({
	type: 'tile',
	minx: 3, maxx: 3, miny: 3, maxy: 3, minz: 0, maxz: 0,
	tile: 'grass',
})
```

It throws if the entry is missing a required field, has a bound outside the map, or (for a type with overlap rejected) collides with an existing entry.

`removeDataAt(type, minx, maxx, miny, maxy, minz, maxz)` removes every entry of `type` that overlaps the given box:

```js
map.removeDataAt('tile', 3, 3, 3, 3, 0, 0)
```

## Registering a custom type

`registerType(name, { fields, overlap })` adds a new type. `fields` lists the names of required properties, and `overlap` is `'allow'` or `'error'`.

```js
map.registerType('trigger', { fields: ['event'], overlap: 'allow' })

map.setDataAt({
	type: 'trigger',
	minx: 8, maxx: 9, miny: 8, maxy: 9, minz: 0, maxz: 0,
	event: 'openGate',
})
```

A custom type behaves exactly like a built-in one: it validates its fields, respects its overlap policy, and appears in `getDataAt`, `getOneAt`, `removeDataAt`, and `serialize`.

## Saving

`serialize()` returns a plain object in the same shape a file uses, built from the map's current header and live entries:

```js
const saved = map.serialize()
// saved.entries no longer contains anything removed with removeDataAt
```

The result can be handed straight to `loadMap({ data: saved })` on a fresh `createMap()` instance. `serialize` throws if no map has been loaded yet, because there is no header to write.

`clear()` empties the map and drops the header, returning it to the state right after `createMap()`.

`header()` returns `{ name, maxx, maxy, maxz }`, or `null` if no map has been loaded.

## How it performs

The spatial index for each type builds lazily, on the first query after a change. Loading a map with `loadMap` pays for one index build per type, not one per entry.

Bounds are inclusive integers: `[0, 10]` and `[10, 20]` overlap at 10.

The x and y bounds are indexed; z is filtered afterward by scanning the x/y matches. Cost grows with how much content stacks on a single x/y footprint, not with the size of the map overall. Measured on a map with 500 entries stacked on one footprint, a point query through that stack takes about 19.4 microseconds. A 200,000 entry map loads in about 127 milliseconds.
