# Physics, vectors, and spatial indexing

The `audiogame-utils/physics` module provides three dimensional coordinate vectors and static spatial indexing.

## Vectors

### `vector(x = 0, y = 0, z = 0)`

Creates a plain object with `x`, `y`, and `z` properties. Positive X points east, positive Y points north, and positive Z points up. TypeScript users can import the returned object's `Vector3` interface from the same module.

```js
import { vector } from 'audiogame-utils/physics'

const origin = vector()
// { x: 0, y: 0, z: 0 }

const listener = vector(10, 5, 2)
// { x: 10, y: 5, z: 2 }
```

## Spatial indexing

`createRTree` helps a game find objects inside or near a rectangular area. Common uses include finding walls near a player, collecting possible collision targets, and locating objects inside an audible region.

Checking every object on a large map for every search becomes expensive. A spatial index groups nearby areas so a search can skip most objects. An R tree is one kind of spatial index. It stores a bounding box for each object, which is a rectangle that encloses the object. The rectangle is axis aligned, meaning its sides follow the X and Y axes and cannot be rotated.

This R tree is static. It copies the supplied bounding boxes when it is created and provides no method for updating them. Rebuild the tree after adding, removing, resizing, or moving indexed objects. For frequently changing collections, another data structure may be a better fit.

```js
import { createRTree } from 'audiogame-utils/physics'

const walls = ['west wall', 'east wall', 'center wall']
const wallBoxes = [
	[0, 10, 0, 10],   // west wall
	[20, 30, 20, 30], // east wall
	[5, 15, 5, 15],   // center wall
]

// Pack each rectangle as [minimum x, maximum x, minimum y, maximum y].
const bounds = new Int32Array(wallBoxes.length * 4)
wallBoxes.forEach((box, index) => bounds.set(box, index * 4))

const tree = createRTree(bounds, wallBoxes.length)
const matchingWalls = tree.search(4, 6, 4, 6).map((index) => walls[index])
// matchingWalls contains 'west wall' and 'center wall'.
```

You can also import the module as a namespace from the package root:

```js
import { physics } from 'audiogame-utils'

const origin = physics.vector()
const tree = physics.createRTree(bounds, wallBoxes.length)
```

## R tree functions

### `createRTree(bounds, count, node_size = 16)`

Builds a static R tree index from a packed array of bounding boxes. Packing means storing every rectangle consecutively in one typed array rather than creating a separate array or object for each rectangle. This compact representation reduces memory use when indexing large maps.

#### Parameters

* `bounds`: An `Int32Array` containing packed bounding boxes in `[minx, maxx, miny, maxy]` order. Each item occupies 4 consecutive integers, so the total array length must be `count * 4`. An `Int32Array` stores whole numbers. Decimal values assigned to it are converted to integers.
* `count`: The number of objects represented in `bounds`. Their positions become the indices returned by `search`.
* `node_size` *(optional, default: 16)*: The maximum number of entries grouped in each tree node. It must be at least 2. Leave the default unchanged unless measurements with your own map show that another value performs better.

#### Return value

Returns an object with a single `search` method:

### `tree.search(minx, maxx, miny, maxy)`

Queries the R tree for all indexed items whose bounding boxes overlap the search rectangle `[minx, maxx]` by `[miny, maxy]`. A point search uses the same minimum and maximum for each axis, such as `tree.search(x, x, y, y)`.

* Overlap is inclusive on boundaries. Touching edges or points, such as `10` touching `10`, count as an overlap.
* The search only compares rectangles. If an object's real shape does not fill its bounding box, perform a more precise check on each result when needed.
* Returns an array of integer item indices corresponding to their positions in the original `bounds` input, starting at `0`. Use those indices to look up the matching objects in your own array.
