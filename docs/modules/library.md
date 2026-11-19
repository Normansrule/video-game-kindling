# Module: library (tiles, sprites and pixels)

**Files:** [`engine/library/`](../../engine/library/) (`tiles.js`, `tiles-ground.js`, `tiles-walls.js`, `tiles-props.js`, `tile-tools.js`, `sprites.js`, `sprite-art.js`, `pixels.js`) · **Browse it:** [the library page](https://normansrule.github.io/video-game-kindling/library/) · **Used by:** the [scene editor](scene.md), every [template](../../templates/)

A library of game art you can code with: **95 tiles** for 2D levels, **31 sprites** (items, creatures, effects), and **40 blocks** for 3D worlds (see [world.md](world.md)). Nothing is an image file. Every picture is painted by a small function, so:

- there is nothing to download or load before the game starts,
- you can read and change how each one looks,
- it is all yours to use for anything (CC0, public domain).

## Tiles

```js
import { tileCanvas, tileInfo, tilesIn, tileNames } from "kindling/library/tiles.js";

context.drawImage(tileCanvas("brick_wall"), x, y);    // a 16 × 16 canvas, cached
context.drawImage(tileCanvas("lava", 2), x, y);       // drawn 32 × 32
tileInfo("lava");      // { name, category: "liquid", solid: true, hurts: true, ... }
tilesIn("platform");   // ["grass_block", "snow_block", ..., "wood_platform", "cloud"]
```

| Category | Examples | Flags |
|---|---|---|
| terrain | grass, flowers, dirt, mud, sand, snow, ice, gravel, path, swamp | ground to walk on (top-down) |
| floor | wood, stone, dungeon, checker, marble, carpets, metal, tech | |
| liquid | water, deep water, lava, slime pool | `solid`, lava and slime `hurts` |
| wall | bricks, castle, sandstone, cave, hedge, logs, metal, glass, crystal | `solid` |
| roof | red, blue, thatch | `solid` |
| platform | grass block, snow, sand, bricks, `?` block, wood platform, ledge, cloud, bridge | `solid`, some `oneWay` (jump up through) |
| object | crate, barrel, chest, doors, ladder, sign, torch, fence, bookshelf, bed, stairs, flag, well | ladder `climb`, flag `goal`, stairs `exit`, torch `light` |
| nature | bushes, rocks, trees, pine, stump, mushroom, tall grass, cactus | cactus `hurts` |
| hazard | spikes | `hurts` |

Objects, nature, hazards and one-way platforms are **overlay tiles**: they have see-through pixels, so you draw them on top of a ground tile (`isOverlayTile(name)` tells you).

### How a tile is painted

Each tile is one function called for every pixel. It returns a color, or `null` for see-through:

```js
// From tiles-walls.js: a wooden platform. The top 4 rows are planks, the rest is see-through.
{ name: "wood_platform", category: "platform", solid: true, oneWay: true,
  paint: (x, y, rand) => (y < 5 ? (y === 4 ? [92, 60, 34] : shade([186, 136, 80], (x % 8 === 0 ? -30 : 0) + Math.round(rand * 10))) : null) },

// Patterns that many tiles share are helpers in tile-tools.js that RETURN a paint function:
{ name: "brick_wall", category: "wall", solid: true, paint: brickPattern([168, 74, 58], [204, 194, 178]) },
```

`rand` is a different number from 0 to 1 for every pixel (but the same every time you paint), which gives the grain. `shade(color, amount)` makes a color lighter or darker. `x % 8 === 0` darkens every 8th column: the gaps between planks. To add your own tile, add one line like that to a `tiles-*.js` file. It then shows up in the scene editor's palette and the library page by itself.

## Sprites

```js
import { spriteCanvas, spriteFrames, spritePixels } from "kindling/library/sprites.js";

context.drawImage(spriteCanvas("heart", 2), x, y);           // scale 2
const flap = spriteFrames("bat");                             // [canvas, canvas]
context.drawImage(flap[Math.floor(time * 6) % flap.length], x, y);
spritePixels("slime", 0, { G: "#5ac8fa", n: "#2a4aa0" });   // recolor: a blue slime
```

Sprites are drawn as rows of letters, one letter per pixel. The letters are colors from `PALETTE` in [`sprite-art.js`](../../engine/library/sprite-art.js) (`k` outline, `w` white, `l` `g` `d` grays, `r` `R` reds, `y` `Y` yellows, `G` `n` greens, `b` `B` blues, `s` skin, and so on), and `.` is see-through:

```js
heart: { category: "item", frames: [[
  "............",
  ".kkk...kkk..",
  "kwrrk.krrrk.",
  "kwrrrkrrrrRk",
  ...
]] },
```

Animated sprites list more than one frame. Change a letter and reload: that is the whole pipeline.

## Pixels: images as plain data

[`pixels.js`](../../engine/library/pixels.js) works on `{ width, height, data }`, where `data` is RGBA bytes like a canvas `ImageData`. Because it is plain data, it works in Node too (the tests use it).

| Function | Does |
|---|---|
| `createPixels(width, height)` | A see-through image |
| `pixelsFromRows(rows, legend)` | Letters to pixels (how sprites are made) |
| `pixelsFromFunction(width, height, paint)` | One function per pixel (how tiles are made) |
| `setPixel`, `getPixel`, `fillPixels` | Read and write |
| `flipPixels`, `stampPixels`, `outlinePixels` | Mirror, layer one image on another, add a 1-pixel outline |
| `pixelsToCanvas(image, scale)` | Browser only: a canvas you can `drawImage` |
