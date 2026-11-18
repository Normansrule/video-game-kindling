# Module: views

**Files:** [`engine/views/`](../../engine/views/) · **Visualizations:** [14 world modes](https://normansrule.github.io/video-game-kindling/viz/14-world-modes/), [11 raycaster](https://normansrule.github.io/video-game-kindling/viz/11-raycaster/) · **Sample:** [one world, five views](../../samples/modes/01-one-world/) · **Examples:** 26, 27, 28

A **view** draws a [block world](world.md) and a player. It never changes the world. Because the game (world, player, rules) does not know how it is drawn, you can pick 2D, 2.5D or 3D at the very end, and even switch while the game runs.

| Mode | File | Looks like | How it is drawn |
|---|---|---|---|
| `"2d"` | `map-view.js` | A top-down map | One textured square per column, the top block, shaded by height |
| `"iso"` | `iso-view.js` | An isometric diorama | Every visible block face as a skewed texture, back to front |
| `"raycast"` | `raycast-view.js` | Retro first person | One ray per screen column, floor casting per pixel, billboard sprites |
| `"3d"` | `world-view.js` + [`3d/world-renderer.js`](3d-stylized.md) | Third person | WebGL 2 triangles, with shadows and lighting |
| `"3d-fps"` | same | First person | Same renderer, camera at eye height |

## One object for all five

```js
import { createWorldView, VIEW_MODES, VIEW_LABELS } from "kindling/views/world-view.js";

const view = createWorldView({ container: "#stage", world, mode: "iso", seaLevel: island.seaLevel });
// every frame:
view.render(player, timeSeconds);          // player = { x, y, z, yaw, walkCycle }
// any time:
view.setMode("3d");
```

A `<canvas>` can only ever have one kind of context: 2D *or* WebGL. So switching between a Canvas 2D mode and a 3D mode swaps in a fresh canvas. (Switching between `"3d"` and `"3d-fps"` keeps it and only changes the camera.) The old WebGL context is released straight away with `WEBGL_lose_context`, because browsers only allow about 16 at once.

In third person the camera casts a ray from the player back toward itself (`raycastVoxels`). If a wall or a roof is in the way, it pulls in fast, then eases back out slowly, so you never see through walls.

## Isometric: the painter's algorithm

Isometric means the three axes are drawn at equal angles: a block becomes a hexagon with a diamond on top. To place a block, the projection is two lines:

```js
screenX = (x - z) * tileWidth / 2
screenY = (x + z) * tileWidth / 4 - y * tileWidth / 2
```

Draw far blocks first and near blocks last, and the near ones cover the far ones: the **painter's algorithm**, no depth buffer needed. Each face is a texture skewed with `context.setTransform(a, b, c, d, e, f)`, the 2D version of a matrix. Faces that touch another solid block are skipped, and the whole island is drawn once into an offscreen canvas and only redrawn when a block changes.

## Raycaster: perspective is 1 / distance

For each screen column, a ray walks the grid cell by cell (DDA) until it hits a wall. The wall slice is drawn `projection / distance` pixels tall: twice as far, half as tall. That one division *is* perspective. Floors go the other way: for each row below the horizon, `rowDistance = eyeHeight * projection / (row - horizon)` says how far away that strip of floor is, and you look up the floor texture there. Props (coins, crystals) are flat pictures that always face you, hidden column by column where a wall is nearer. See [viz 11](https://normansrule.github.io/video-game-kindling/viz/11-raycaster/).

## Sprites without image files

`sprites.js` paints small pixel-art pictures from rows of text:

```js
const coin = paintPixels([
  "..yy..",
  ".yYYy.",
  ".yYYy.",
  "..yy..",
], { y: "#d99a1e", Y: "#ffd34d" });   // a canvas you can drawImage
```
