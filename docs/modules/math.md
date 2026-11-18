# Module: math

**Files:** [`engine/math/`](../../engine/math/) · **Visualizations:** [02 easing](https://normansrule.github.io/video-game-kindling/viz/02-easing/), [09 transforms](https://normansrule.github.io/video-game-kindling/viz/09-transforms/) · **Cheat sheet:** [CHEATSHEET.md](../CHEATSHEET.md#math)

Small, pure functions. "Pure" means they never change their inputs; they return new values. That makes them easy to test (see [`tests/checks/math.checks.js`](../../tests/checks/math.checks.js)).

## scalar.js: one number at a time

| Function | Example | Use it for |
|---|---|---|
| `clamp(value, min, max)` | `clamp(hp, 0, 100)` | Keep a value in range. |
| `lerp(start, end, t)` | `lerp(0, 10, 0.25)` → 2.5 | Blend: t = 0 gives start, t = 1 gives end. "Lerp" = linear interpolation. |
| `inverseLerp(start, end, value)` | `inverseLerp(0, 10, 2.5)` → 0.25 | How far along is value? |
| `remap(value, a, b, c, d)` | map 0..100 health to 0..48 bar pixels | Both of the above at once. |
| `approach(current, target, maxStep)` | `speed = approach(speed, 0, friction * dt)` | Move toward a target without overshooting. Great for acceleration. |
| `damp(current, target, sharpness, dt)` | camera smoothing | Exponential smoothing that behaves the same at any step size. |
| `wrap(value, min, max)` | angles, screen wrap | Loop around like Asteroids. |
| `degreesToRadians`, `radiansToDegrees` | `Math.sin` wants radians | 180 degrees = π radians. |
| `nearlyEqual(a, b, tolerance)` | tests | Floating point is never exact. |

## vec2.js and vec3.js: vectors

A vector is a plain object `{ x, y }` (or `{ x, y, z }`). It can mean a **position** (where), a **velocity** (how fast, which way), or a **direction** (length 1).

```js
import * as vec2 from "kindling/math/vec2.js";

const toPlayer = vec2.subtract(player, enemy);       // from enemy to player
const direction = vec2.normalize(toPlayer);          // length 1: just "which way"
enemy.velocity = vec2.scale(direction, 60);          // 60 pixels per second that way
```

| Function | Meaning |
|---|---|
| `add`, `subtract`, `scale` | Move, find the arrow between two points, make longer or shorter. |
| `length`, `distance`, `lengthSquared` | How long. Compare `lengthSquared` to `radius * radius` to skip the square root. |
| `normalize` | Same direction, length 1. Returns `{0, 0}` for a zero vector instead of NaN (not a number). |
| `dot(a, b)` | Positive: same general direction. Zero: at right angles. Negative: opposite. Used in lighting and SAT (Separating Axis Theorem). |
| `cross` | 2D: a number (which side is b on?). 3D: a vector at right angles to both (a surface normal). |
| `rotate`, `perpendicular`, `fromAngle`, `angle`, `limit`, `lerp` (2D) | Turning, aiming, capping speed. |
| `negate`, `toArray` (3D) | Flip, and convert to `[x, y, z]` for shaders. |

## mat4.js: 4×4 matrices for 3D

A matrix is a recipe for moving points: translate (move), rotate, scale. Kindling stores them **column-major** in a `Float32Array(16)`, which is what WebGL expects.

```js
let model = mat4.translation(0, 1, -5);        // put it 5 meters ahead, 1 up
model = mat4.rotateY(model, angle);            // then spin it
model = mat4.scale(model, { x: 2, y: 2, z: 2 });   // then make it twice as big
```

Read that bottom to top for the order things happen to the object's points: scale, then rotate, then move.

| Function | Meaning |
|---|---|
| `identity`, `clone`, `multiply(a, b)` | Do nothing; copy; a then... (a × b applies b first). |
| `translation`, `scaling`, `rotationX/Y/Z` | Make a fresh matrix. |
| `translate`, `scale`, `rotateX/Y/Z` | Add a step to an existing matrix. |
| `perspective(fov, aspect, near, far)` | The camera lens: far things smaller. fov = field of view, in radians. |
| `orthographic(...)` | A lens with no perspective (2D-style, isometric). |
| `lookAt(eye, target, up)` | The **view** matrix for a camera at `eye` looking at `target`. |
| `invert`, `transpose`, `normalMatrix(model)` | Undo; flip; and the matrix that keeps normals correct when an object is scaled unevenly. |
| `transformPoint(matrix, point)` | Apply a matrix to one `{ x, y, z }`. |
| `fromQuat(q)` | Rotation matrix from a quaternion. |

## quat.js: quaternions

A quaternion `{ x, y, z, w }` stores a rotation without the "gimbal lock" problem of three angles, and blends smoothly with `slerp` (spherical linear interpolation). Use them when an object tumbles freely (a spaceship); use plain yaw and pitch for cameras that stay upright.

`identity`, `fromAxisAngle(axis, radians)`, `fromEuler(pitch, yaw, roll)`, `multiply`, `normalize`, `conjugate`, `rotateVector(q, v)`, `slerp(a, b, t)`.

## random.js: random you can repeat

```js
const random = createRandom(42);    // same seed, same "random" level every time
random.range(10, 20);  random.int(1, 6);   /* 1 to 6, both included */  random.chance(0.25);  random.pick(items);  random.shuffle(list);
random.weighted({ common: 10, rare: 1 });   // "common" 10 times as often as "rare"
```

It uses mulberry32, a small fast generator. Seeds make bugs reproducible and let players share levels by number. `random` (already made, seeded from the clock) is exported for quick use.

## easing.js

Functions from 0..1 to (roughly) 0..1 that shape motion: `easeOutCubic` starts fast and settles, `easeOutBack` overshoots a little, `easeOutBounce` bounces. All are in the `easings` object by name. See them move in the [easing visualization](https://normansrule.github.io/video-game-kindling/viz/02-easing/).

## Go further

- Freya Holmér, [Math for Game Devs](https://www.youtube.com/playlist?list=PLImQaTpSAdsD88wprTConznD1OY1EfK_V) (video series).
- [Learn OpenGL: Transformations](https://learnopengl.com/Getting-started/Transformations) for matrices, explained slowly.
