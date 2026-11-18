# Module: world

**Files:** [`engine/world/`](../../engine/world/) · **Visualizations:** [14 world modes](https://normansrule.github.io/video-game-kindling/viz/14-world-modes/) · **Samples:** [one world, five views](../../samples/modes/01-one-world/), [island builder](../../samples/3d/06-island-builder/) · **Examples:** 17, 26 to 34 in [Game Code Examples](../../game-code-examples/)

A **block world** (a "voxel" world, from *volume pixel*) is a 3D grid where every cell holds one small number: `0` is air, `1` is grass, `3` is stone and so on. That is the whole model. Everything else (meshes, maps, physics) is computed from that grid, so the same world can be drawn in 2D, 2.5D or 3D by the [views](views.md).

| File | What it gives you |
|---|---|
| `blocks.js` | `BLOCK` ids (AIR, GRASS, DIRT, STONE, SAND, LOG, LEAVES, WATER, PLANKS, BRICK, SNOW, LANTERN, ROOF, PATH, FLOWERS), `blockType(id)`, `isSolid`, `isTransparent`, `textureLayer(id, face)` |
| `textures.js` | 16 × 16 pixel-art textures painted by code, as raw pixels (`paintTexture(name)`), plus `textureCanvases()` for Canvas 2D |
| `voxel-world.js` | `createVoxelWorld(width, height, depth)`, `raycastVoxels`, save and load (`toJSON`, `voxelWorldFromJSON`) |
| `generate.js` | `generateIsland`, `generateFlat`, `placeTree`, `placeHouse`, `findOpenSpot` |
| `walker.js` | A character that walks, jumps, slides along walls and steps up ledges: `createWalker`, `updateWalker`, `wishFromYaw` |

## The grid

```js
import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { BLOCK } from "kindling/world/blocks.js";

const world = createVoxelWorld(64, 40, 64);   // x (east), y (up), z (south)
world.fill(0, 0, 0, 63, 2, 63, BLOCK.STONE);   // a stone floor 3 blocks thick
world.set(10, 3, 10, BLOCK.BRICK);
world.get(10, 3, 10);                          // 9 (BRICK)
world.topY(10, 10);                            // 3: the highest solid block in that column
```

It is stored as one flat `Uint8Array`, index `x + z * width + y * width * depth`. One byte per block: a 64 × 40 × 64 world is 160 KB. `world.get` outside the grid returns air, so you never need bounds checks.

Every `set` bumps `world.version` and tells listeners (`world.onChange((x, y, z) => ...)`). That is how the 3D renderer knows which chunk to rebuild after you break a block.

## Generating an island

```js
import { generateIsland } from "kindling/world/generate.js";
const island = generateIsland(world, { seed: 7, village: true });
// island.seaLevel, island.spawn { x, y, z, yaw }, island.houses
```

How it works, in order:

1. **Height map.** For every column, fractal noise (`fbm2`, several layers of smooth noise added together, from [`math/noise.js`](../../engine/math/noise.js)) gives a height. Multiplying by a "falloff" that drops toward the edges turns hills into an island.
2. **Layers.** Stone underneath, dirt on top, then grass, or sand near the sea, or snow up high. Water fills everything below sea level.
3. **Decoration.** Trees on grass (`placeTree`), with a seeded random so the same seed always gives the same island.
4. **Village.** `findOpenSpot` searches outward for a flat 5 × 5 patch of natural ground, and `placeHouse` builds a house with a pyramid roof and a lantern.
5. **Spawn.** A flat spot near the first house, facing the middle of the island.

Same seed, same island, on every computer. Try seeds in [example 17](../../game-code-examples/code/17-procedural-noise-map.js).

## Picking blocks: `raycastVoxels`

To break or place the block under the crosshair, walk a ray through the grid one cell at a time (the DDA, *digital differential analyzer*, the same walk the raycaster uses):

```js
const hit = raycastVoxels(world, eyePosition, lookDirection, 6);
if (hit) {
  world.set(hit.x, hit.y, hit.z, BLOCK.AIR);                    // break it
  world.set(hit.x + hit.normal.x, hit.y + hit.normal.y, hit.z + hit.normal.z, BLOCK.PLANKS); // or place next to it
}
```

`hit.normal` is the face you hit, so "place" puts the new block against that face. See [example 34](../../game-code-examples/code/34-3d-break-and-place-blocks.js).

## Walking around

```js
const player = createWalker(island.spawn);
// each fixed step:
wishFromYaw(player, forward, right);    // turn "W/A/S/D" into world directions
player.wantsJump = keyboard.isDown("Space");
updateWalker(world, player, stepSeconds);
```

The player is an upright box 0.6 wide and 1.7 tall. Each step moves it **one axis at a time**, and if the box would end up inside a solid block, that axis is undone. Moving axis by axis is why you slide along walls instead of sticking to them. If a move is blocked but the spot one block higher is free, the walker steps up (`autoStep`), so you never need to jump up a single block.

The walker knows nothing about drawing, so the same player works in every view.
