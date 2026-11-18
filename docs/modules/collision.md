# Module: collision (boxes, circles, rays, SAT)

**Files:** [`engine/2d/collision.js`](../../engine/2d/collision.js), [`engine/2d/sat.js`](../../engine/2d/sat.js), and for 3D [`engine/3d/collision3d.js`](../../engine/3d/collision3d.js) · **Visualizations:** [04 collision](https://normansrule.github.io/kindling/viz/04-collision/), [05 SAT](https://normansrule.github.io/kindling/viz/05-sat/) · **Lesson:** [2D-3 Collision](../../lessons/2d-3-collision.html)

Collision has two questions: **are these two shapes touching?** (detection) and **how do I push them apart?** (resolution).

## Shapes

```js
const box = { x: 10, y: 20, width: 16, height: 16 };   // AABB, x/y = top-left corner
const ball = { x: 100, y: 50, radius: 4 };             // circle, x/y = center
```

An **AABB** (axis-aligned bounding box) is a rectangle that never rotates. Most 2D games are made of AABBs and circles, and their tests are tiny:

- Two boxes overlap unless one is entirely to the left, right, above or below the other.
- Two circles overlap when the distance between centers is less than the sum of the radii (compare squared values to skip the square root).

## collision.js

| Function | Returns |
|---|---|
| `pointInRect(point, rect)`, `pointInCircle(point, circle)` | `true` / `false`. Use for mouse clicks. |
| `rectsOverlap(a, b)`, `circlesOverlap(a, b)`, `circleRectOverlap(circle, rect)` | `true` / `false`. |
| `closestPointInRect(x, y, rect)` | The point of the box nearest to (x, y). The heart of circle-versus-box. |
| `rectPushOut(a, b)`, `circlePushOut(a, b)`, `circleRectPushOut(circle, rect)` | `null` when apart, else `{ x, y }`: the **smallest** move that gets A out of B. Add it to A's position. |
| `rayRect(origin, direction, rect)` | `null` for a miss, else the distance along the ray to the first hit. Use for line of sight and fast bullets. |
| `rectCenter(rect)` | `{ x, y }` of the middle. |

```js
const push = rectPushOut(player, wall);
if (push) {
  player.x += push.x;
  player.y += push.y;
  if (push.y < 0) player.onGround = true;   // pushed up: we are standing on it
}
```

For whole worlds of walls, use [physics](physics.md), which moves one axis at a time and handles this for you.

## sat.js: rotated shapes

The **SAT** (Separating Axis Theorem): two convex shapes do not touch if you can find one direction where their "shadows" (projections onto a line) do not overlap. For polygons you only need to try the directions at right angles to each edge (the **edge normals**). If every direction overlaps, they touch, and the direction with the smallest overlap is the push-out.

```js
const ship = createBoxPolygon(20, 10, 100, 80, angle);    // width, height, x, y, rotation
const rock = createPolygon([{ x: -8, y: -6 }, { x: 9, y: -4 }, { x: 6, y: 8 }, { x: -7, y: 5 }], 140, 90);
const hit = polygonsCollide(ship, rock);   // null, or { depth, normal }
if (hit) { ship.x += hit.normal.x * hit.depth; ship.y += hit.normal.y * hit.depth; }   // push the ship out
```

| Function | Notes |
|---|---|
| `createPolygon(localPoints, x, y, rotation)` | Points around the shape's own center. Change `x`, `y`, `rotation` freely. |
| `createBoxPolygon(width, height, x, y, rotation)` | A rotatable box. |
| `worldPoints(polygon)`, `edgeNormals(points)`, `project(points, axis)` | The building blocks, exported so the visualization (and you) can see each step. |
| `polygonsCollide(a, b)`, `polygonCircleCollide(polygon, circle)` | `null` or `{ depth, normal }`: move A by `normal × depth` to separate them. |

**Convex only:** no dents. Split an L shape into two boxes.

## collision3d.js: the same ideas in 3D

Boxes become `{ x, y, z, width, height, depth }` (x, y, z = the minimum corner; +y is up). `boxesOverlap`, `pointInBox`, `boxCenter`, `boxFromCenter`, `rayBox` (returns `null` for a miss), and `createBody3D` + `moveAndCollide3D` for characters. See [3d](3d.md) and [sample 3D-04](../../samples/3d/04-coin-collector/).

## Gotchas

- **Fast things tunnel.** A bullet moving 20 pixels per step can skip a 4-pixel wall. Use `rayRect` from the old position to the new one, or make steps smaller.
- **Touching is not overlapping.** Boxes that share an edge do not overlap, which is what you want for standing on floors.

## Go further

- Jeffrey Thompson, [Collision Detection](https://www.jeffreythompson.org/collision-detection/table_of_contents.php): every shape pair, with interactive examples.
- Metanet Software, [N Tutorial A: Collision Detection and Response](https://www.metanetsoftware.com/technique/tutorialA.html), the classic SAT explanation.
