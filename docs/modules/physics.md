# Module: physics (arcade)

**File:** [`engine/2d/physics.js`](../../engine/2d/physics.js) · **Visualization:** [06 physics](https://normansrule.github.io/kindling/viz/06-physics/) · **Lesson:** [2D-4 Platformer physics](../../lessons/2d-4-platformer-physics.html) · **Sample:** [2D-04 platformer](../../samples/2d/04-platformer/)

"Arcade" physics means: things have a velocity and maybe gravity, and they **stop at walls**. No spinning, no stacking, no friction simulation. That is what platformers, top-down games and shooters need, and it fits in about 150 lines.

## The idea: one axis at a time

Each step, a body moves along **x first**, and if it is now inside a wall it is pushed back out along x. Then the same for **y**. Doing the two axes separately means we always know which way to push (the way we came), and the body slides along walls instead of sticking on corners.

Velocity is changed by gravity first, then position by velocity. This order ("semi-implicit Euler") is stable and simple.

## Quick example

```js
import { createBody, moveAndCollide } from "kindling/2d/physics.js";
import { createTilemap } from "kindling/2d/tilemap.js";

const level = createTilemap({ rows: LEVEL_ROWS, tileSize: 16, solid: "#", oneWay: "=" });
const player = createBody({ x: 32, y: 32, width: 12, height: 14, gravity: 900 });

// in update():
player.velocityX = game.actions.axis("left", "right") * 90;
if (game.actions.wasPressed("jump") && player.onGround) player.velocityY = -300;
moveAndCollide(player, stepSeconds, level);   // a tilemap works as the world
```

## API

| Function | Notes |
|---|---|
| `createBody({ x, y, width, height, velocityX, velocityY, gravity, maxFallSpeed, bounce })` | Units: pixels and seconds. +y is **down** in 2D. `bounce` 0 stops at walls, 1 bounces perfectly. |
| `moveAndCollide(body, stepSeconds, world)` | Applies gravity, moves x then y, sets `body.onGround` and `body.touching.{left,right,top,bottom}`. Returns `true` if it hit anything. |
| `createSolids(rects)` | A world from a list of rectangles. Give a rectangle `oneWay: true` for a platform you can jump up through. |
| `keepInside(body, bounds)` | Keep a body inside a rectangle such as the screen. Returns which edges it hit. |
| `bounceCircles(a, b, restitution)` | Two moving circles `{ x, y, radius, velocityX, velocityY, mass }` bounce off each other. Heavier circles move less. |

A **world** is anything with `solidsNear(rect)` that returns nearby solid rectangles. Both `createSolids` and tilemaps have it, so you can write your own (moving platforms, doors).

## Making jumps feel good

These are game-feel tricks you add in your game code; the [platformer sample](../../samples/2d/04-platformer/main.js) has all of them:

- **Coyote time:** allow a jump for ~0.1 s after walking off a ledge.
- **Jump buffering:** remember a jump press for ~0.1 s before landing.
- **Variable jump height:** when jump is released while rising, cut `velocityY` in half.
- **Higher gravity when falling** makes jumps feel less floaty.

## Gotchas

- **Do not move faster than one tile per step** (16 px per step = 960 px/s at 60 steps per second), or bodies can pass through thin walls. `maxFallSpeed` (default 600) keeps falls safe.
- **Set `velocityX` from input each step** (as above) for tight controls; add to it with `approach()` from [math](math.md) for icy, slidey ones.
