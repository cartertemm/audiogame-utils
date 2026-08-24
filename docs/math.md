# Math helpers

The `audiogame-utils/math` module provides interpolation, range conversion, wrapping, angle math, and pseudo-random selection functions.

```js
import { clamp, lerp, range_convert, wrap, random_choice } from 'audiogame-utils/math'

const health = clamp(currentHealth + 25, 0, 100)
const volume = lerp(0, 1, 0.5)
const targetItem = random_choice(['potion', 'shield', 'sword'])
```

You can also import the module as a namespace from the package root:

```js
import { math } from 'audiogame-utils'

const snappedAngle = math.wrap(370, 0, 360)
```

## Range and interpolation

### `clamp(value, min, max)`

Clamps `value` to the closed range between `min` and `max`.

```js
clamp(150, 0, 100) // 100
clamp(-10, 0, 100) // 0
clamp(42, 0, 100)  // 42
```

### `lerp(a, b, t)`

Performs linear interpolation between `a` and `b` by factor `t`. When `t = 0`, it returns `a`; when `t = 1`, it returns `b`.

```js
lerp(0, 100, 0.25) // 25
lerp(10, 20, 0.5)   // 15
```

### `inverse_lerp(a, b, value)`

Calculates the linear interpolation factor `t` for `value` between `a` and `b`. Returns `0` if `a === b`.

```js
inverse_lerp(0, 100, 25) // 0.25
inverse_lerp(10, 20, 15)  // 0.5
```

### `range_convert(value, in_min, in_max, out_min, out_max)`

Maps `value` from an input range `[in_min, in_max]` to an output range `[out_min, out_max]`.

```js
// Map volume from distance (0 to 50 meters) to audio gain (1.0 to 0.0)
range_convert(25, 0, 50, 1.0, 0.0) // 0.5
```

## Angles and wrapping

### `angle_difference(from, to)`

Returns the signed shortest turn from heading `from` to heading `to` in degrees. A positive value indicates turning right (clockwise), a negative value indicates turning left (counterclockwise), and a direct reversal returns `180`.

```js
angle_difference(0, 90)   // 90 (turn right)
angle_difference(90, 0)   // -90 (turn left)
angle_difference(350, 10) // 20
```

### `wrap(value, min, max)`

Wraps `value` into the half-open range `[min, max)`. `min` is included, `max` is excluded, so `wrap(360, 0, 360)` returns `0`.

```js
wrap(365, 0, 360) // 5
wrap(-10, 0, 360) // 350
```

## Randomness

### `random_int(min, max)`

Returns a random integer between `min` and `max` inclusive.

```js
random_int(1, 6) // Random roll between 1 and 6
```

### `random_float(min = 0, max = 1)`

Returns a random floating-point number in the half-open range `[min, max)`.

```js
random_float()       // Float between 0.0 and 1.0
random_float(5, 10)  // Float between 5.0 and 10.0
```

### `random_choice(list)`

Selects a random element from an array. Returns `undefined` if `list` is empty.

```js
random_choice(['apple', 'banana', 'cherry'])
```

### `weighted_choice(list, weights)`

Selects an element from `list` according to an array of relative numeric `weights`. Returns `undefined` if the sum of weights is `<= 0`.

```js
const items = ['common', 'rare', 'legendary']
const weights = [80, 19, 1]

const loot = weighted_choice(items, weights)
```

### `shuffle(list)`

Returns a new array containing the elements of `list` in randomized order (Fisher-Yates algorithm). Does not mutate the original array.

```js
const deck = [1, 2, 3, 4, 5]
const shuffledDeck = shuffle(deck)
```
