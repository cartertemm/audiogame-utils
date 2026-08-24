# Physics and spatial indexing

The `audiogame-utils/physics` module exports `createRTree` for static 2D spatial indexing and fast bounding box overlap queries.

```js
import { createRTree } from 'audiogame-utils/physics'

// Pack item bounding boxes: [minx, maxx, miny, maxy] for each item
const items = [
	[0, 10, 0, 10],   // Item 0
	[20, 30, 20, 30], // Item 1
	[5, 15, 5, 15],   // Item 2
]

const bounds = new Int32Array(items.length * 4)
items.forEach((box, i) => bounds.set(box, i * 4))

const tree = createRTree(bounds, items.length)
const matches = tree.search(4, 6, 4, 6) // Returns array of matching indices: [0, 2]
```

You can also import the module as a namespace from the package root:

```js
import { physics } from 'audiogame-utils'

const tree = physics.createRTree(bounds, count)
```

## Functions

### `createRTree(bounds, count, node_size = 16)`

Builds a static Sort-Tile-Recursive (STR) R-Tree index from a packed array of bounding boxes.

#### Parameters

- `bounds`: An `Int32Array` containing packed bounding boxes in `[minx, maxx, miny, maxy]` order. Each item occupies 4 contiguous 32-bit integers, requiring a total array length of `count * 4`.
- `count`: The number of items packed into `bounds`.
- `node_size` *(optional, default: 16)*: The maximum number of entries per tree node. Must be at least 2.

#### Return value

Returns an object with a single `search` method:

### `tree.search(minx, maxx, miny, maxy)`

Queries the R-Tree for all indexed items whose bounding boxes overlap the search range `[minx, maxx]` by `[miny, maxy]`.

- Overlap is inclusive on boundaries: touching edges or points (e.g. `10` touching `10`) count as an overlap.
- Returns an array of integer item indices corresponding to their 0-based positions in the original `bounds` input.
