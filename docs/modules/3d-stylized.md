# Module: 3d (the stylized world renderer)

**Files:** [`engine/3d/`](../../engine/3d/) (`world-renderer.js`, `voxel-mesh.js`, `stylized-shader.js`, `shadow-map.js`, `sky.js`, `lowpoly.js`, `character.js`) · **Visualization:** [15 voxel lighting](https://normansrule.github.io/video-game-kindling/viz/15-voxel-lighting/) · **Examples:** 30 to 35 · **Basics first:** [3d.md](3d.md)

Kindling 2's graphics engine. It draws a [block world](world.md) the way blocky games like Minecraft and Roblox do: simple shapes and crisp pixel textures, made to look good by **lighting**. No Three.js, no libraries: raw WebGL 2 (Web Graphics Library 2) and two shaders.

```js
import { createWorldRenderer } from "kindling/3d/world-renderer.js";
const renderer = createWorldRenderer(game.screen, { timeOfDay: 0.38 });
renderer.setWorld(world);
renderer.setOcean(island.seaLevel);           // a sea all the way to the horizon
// every frame:
renderer.queueModel(treeMesh, mat4.translation(10, 8, 12));
renderer.render(camera, game.time.elapsed);
// any time:
renderer.settings.timeOfDay = 0.75;           // sunset
renderer.settings.shadows = false;
```

## The render pipeline

The order of drawing in one frame:

```text
1. shadow pass   from the sun, draw only depth into a 2048 × 2048 texture (the shadow map)
2. sky           one triangle that covers the screen: gradient, sun, clouds, stars
3. blocks        one mesh per 16 × 16 chunk
4. models        low-poly trees, rocks, coins, the character
5. water         last, see-through, blended over what is under it
```

## Meshing: only the faces you can see

A 64 × 40 × 64 world has 163,840 cells. Drawing 6 faces for each would be a million squares. `voxel-mesh.js` instead loops over each chunk and adds a face only where a solid block touches air (or water, or glass-like leaves). Inside a hill, nothing is drawn. That is **face culling**, and it is the reason block games can be fast at all.

Each corner of each face also stores four extra numbers: which texture layer, an ambient occlusion value, a sky value and a glow value.

## Ambient occlusion: dark corners for free

Where two blocks meet in a corner, less light gets in. For each corner of a face, look at the 3 neighbours around it (two sides and the diagonal):

```js
function cornerOcclusion(side1, side2, diagonal) {
  if (side1 && side2) return 0;                // a full inside corner: darkest
  return (3 - (side1 + side2 + diagonal)) / 3;  // 1 = open, 0 = closed
}
```

The graphics card blends the four corner values across the face, which gives the soft, darker creases that make blocky worlds look solid. One trick: a square is two triangles, and which diagonal you split it on changes how the blend looks. Split along the diagonal with the brighter pair, or you get a visible streak.

## Light: sun, sky, lanterns

In the fragment shader, every pixel's color is the texture color times the sum of:

- **Sun.** `max(0, dot(normal, sunDirection))` (Lambert's law), times "is this pixel in shadow?".
- **Sky.** A hemisphere: surfaces facing up get the sky color, facing down get a dim ground bounce. Times how much open sky is above the block (a cave is dark even at noon).
- **Lanterns.** The 8 nearest glowing blocks act as point lights that fade with distance.

Then **fog** (exponential, tinted toward the sun when you look at it), **tone mapping** (ACES, which squeezes bright light into the screen's range so sunsets don't clip to white), and conversion back to sRGB.

## Shadow mapping

1. Render the scene from the sun's point of view into a depth texture: "how far is the closest thing along each sun ray?"
2. When drawing a pixel, move it into the sun's view and compare its distance with the stored one. Farther away means something is in front of it: shadow.

Three fixes make it look right: render back faces in the shadow pass (stops "shadow acne" stripes), snap the shadow camera to whole texels (stops shadow edges shimmering as you move), and sample 4 nearby texels with `sampler2DShadow` (percentage-closer filtering, PCF) for soft edges.

## Time of day

`sky.js` has a table of key moments (midnight, dawn, morning, noon, evening, dusk) with sun color, sky color, ambient and fog. `skyAtTime(t)` blends between the two nearest keys. `t` is 0 to 1: 0.25 is sunrise, 0.5 noon, 0.75 sunset.

## Low-poly models and the character

`lowpoly.js` builds flat-shaded, vertex-colored meshes from boxes, cones, cylinders and lumpy rocks: `pineTree()`, `roundTree()`, `rockModel()`, `coinModel()`, `crystalModel()`, `blockyCharacter()`. Build your own with `createModelBuilder()`:

```js
const builder = createModelBuilder();
builder.box(0, 0.8, 0, 1.2, 0.1, 0.8, [0.55, 0.36, 0.2]);  // a table top: center x, y, z, then width, height, depth, color
const table = renderer.createModel(builder.data());
```

`character.js` animates the blocky character by swinging its arms and legs on pivots at the shoulders and hips. `walkCycle` drives the swing.
