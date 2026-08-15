# Rotation and spatial math

The `audiogame-utils/rotation` module provides direction constants, movement helpers, distance calculations, and relative position descriptions. It is a JavaScript port of the NVGT rotation helpers and keeps their names and behavior for easier translation between the two languages.

```js
import {
	east,
	move,
	turnright,
	vector,
} from 'audiogame-utils/rotation'

let position = vector(4, 8, 0)
let facing = east

position = move(position.x, position.y, position.z, facing, 0)
facing = turnright(facing, 45)
```

You can also import the module as a namespace from the package root:

```js
import { rotation } from 'audiogame-utils'

const position = rotation.move(0, 0, rotation.north)
```

## Coordinate and angle conventions

Angles are measured in degrees and increase clockwise. `north` is 0 degrees, `east` is 90 degrees, `south` is 180 degrees, and `west` is 270 degrees.

Movement uses positive X for east, positive Y for north, and positive Z for up. Unless a function says otherwise, angles should be nonnegative and already close to the range from 0 through 359 degrees. Use `degree_limit()` when an integer angle may be outside that range.

## Constants

The eight horizontal direction constants are:

| Constant | Degrees |
| --- | ---: |
| `north` | 0 |
| `northeast` | 45 |
| `east` | 90 |
| `southeast` | 135 |
| `south` | 180 |
| `southwest` | 225 |
| `west` | 270 |
| `northwest` | 315 |

The vertical direction constants are `half_up` at 45, `straight_up` at 90, `half_down` at 135, and `straight_down` at 180.

The module also exports `pi`, `rotation_directions`, and `detailed_rotation_directions`. The first direction array contains the eight compass names. The detailed array contains 16 names at intervals of 22.5 degrees.

## Vectors and movement

### `vector(x = 0, y = 0, z = 0)`

Creates a plain object with `x`, `y`, and `z` properties.

```js
const origin = vector()
const listener = vector(10, 5, 2)
```

### `move(x, y, deg, dir = 0)`

### `move(x, y, z, deg, dir)`

### `move(x, y, z, deg, zdeg, dir, zdir)`

Returns a new vector one unit away from the supplied position. `deg` is the horizontal facing angle and `dir` is an offset from that facing. In the full form, `zdeg` is the vertical facing angle and `zdir` is its offset.

The function does not change an existing vector. Pass its coordinates and store the returned vector instead.

```js
const oneTileNorth = move(0, 0, north)
// { x: 0, y: 1, z: 0 }

const oneTileRight = move(0, 0, north, 90)
// { x: 1, y: 0, z: 0 }

const oneTileUp = move(0, 0, 0, north, straight_up, 0, 0)
// { x: 0, y: 0, z: 1 }
```

Floating point results can contain small rounding errors. For example, an X coordinate that is mathematically zero may be close to `1.2246467991473532e-16`.

### `calculate_theta(deg)`

Converts degrees to radians.

## Turning and direction names

### `getdir(facing)`

Returns the compass direction constant at or immediately below `facing`. Each 45 degree range maps to its starting direction. Values below 0 return `-1`. Values at or above 315 return `northwest`, so normalize large angles first when wraparound is wanted.

```js
getdir(67) // northeast
getdir(180) // south
```

### `snapleft(deg, direction, inc = 45)`

### `snapright(deg, direction, inc = 45)`

Moves `direction` left or right by `inc` degrees and wraps once at 0 or 360. The `deg` argument is retained for compatibility with NVGT and is not read by the current implementation.

```js
snapleft(0, north) // northwest
snapright(0, northwest) // north
```

### `turnleft(deg, inc)`

### `turnright(deg, inc)`

Turns an angle left or right by `inc` degrees. The result wraps into the usual compass range.

```js
turnleft(north, 90) // west
turnright(west, 180) // east
```

### `degree_limit(deg)`

Wraps an integer degree value into the range from 0 through 359.

```js
degree_limit(450) // 90
degree_limit(-45) // 315
```

### `dir_to_string(direction, more_detail = true)`

Returns a compass name for a nonnegative direction. Detailed mode uses the 16 direction names at intervals of 22.5 degrees. Pass `false` to use the eight basic compass names at intervals of 45 degrees.

```js
dir_to_string(45) // "northeast"
dir_to_string(22.5) // "north - northeast"
dir_to_string(67, false) // "northeast"
```

## Distance

### `get_1d_distance(x1, x2)`

Returns the absolute distance between two positions on one axis.

### `get_2d_distance(x1, y1, x2, y2)`

Returns the Euclidean distance between two points in two dimensions.

### `get_3d_distance(x1, y1, z1, x2, y2, z2)`

### `get_3d_distance(c1, c2)`

Returns the Euclidean distance between two points in three dimensions. The two argument form accepts objects with `x`, `y`, and `z` properties, including objects created by `vector()`.

```js
get_2d_distance(0, 0, 3, 4) // 5
get_3d_distance(vector(0, 0, 0), vector(2, 3, 6)) // 7
```

### `get_clamped_3d_distance(current, min, max)`

Returns the shortest Euclidean distance from `current` to an axis aligned box. `min` and `max` describe the box corners. The result is 0 when `current` is inside the box.

```js
const min = vector(0, 0, 0)
const max = vector(10, 10, 10)

get_clamped_3d_distance(vector(13, 14, 10), min, max) // 5
```

### `get_3d_distance_circle(x1, y1, z1, x2, y2, z2)`

Returns the sum of the absolute distance on each axis. This is also called Manhattan distance.

The two vector argument form is retained from the NVGT source, but it returns Euclidean distance because it delegates to `get_3d_distance()`. Use the six number form when axis summed distance is required.

```js
get_3d_distance_circle(0, 0, 0, 2, 3, 6) // 11
get_3d_distance_circle(vector(0, 0, 0), vector(2, 3, 6)) // 7
```

## Relative angles and descriptions

### `calculate_x_y_angle(x1, y1, x2, y2, deg, at_least_1_tile = true, floor_deg = true)`

Returns the clockwise bearing from the facing angle `deg` to a target point. A result of 0 means straight ahead, 90 means directly right, 180 means behind, and 270 means directly left.

When `at_least_1_tile` is true, targets less than one unit away return 0. When `floor_deg` is true, the result is rounded down to an integer.

```js
calculate_x_y_angle(0, 0, 5, 0, north) // 90
calculate_x_y_angle(0, 0, 0, 5, east) // 270
```

### `calculate_clamped_x_y_angle(current, min, max, deg, at_least_1_tile = true, floor_deg = true)`

Finds the nearest point within the two dimensional bounds described by `min` and `max`, then returns its relative bearing from `current`. The vectors may contain Z values, but this calculation reads only X and Y. It returns 0 when `current` is inside the bounds or less than one unit from them with the default options.

### `calculate_x_y_string(deg)`

Converts a relative angle from 0 through 360 into a spoken horizontal description such as `"straight in front"`, `"straight off to the right"`, or `"behind and slightly to the left"`. Values outside that range return an empty string.

```js
calculate_x_y_string(0) // "straight in front"
calculate_x_y_string(90) // "straight off to the right"
calculate_x_y_string(180) // "straight behind"
```

### `calculate_x_y_string3d(deg, z1, z2)`

Adds `"above"` when `z2` is greater than `z1`, or `"below"` when `z2` is less than `z1`, before the horizontal description.

```js
calculate_x_y_string3d(90, 0, 2)
// "above, straight off to the right"
```
