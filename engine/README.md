# engine/

The Kindling engine: plain JavaScript (ES modules), Canvas 2D, raw WebGL 2 (Web Graphics Library 2) and Web Audio. No dependencies, no build step.

Rules for every file in here:

- Under about 300 lines, one concept per file.
- A top comment that says what the file does, why it exists, and which doc page explains it.
- Plain names (`velocity`, not `v`). A loop beats a clever one-liner.
- Engine files import each other with relative paths (`./time.js`, `../math/vec2.js`), never through the import map, so the folder works anywhere you copy it.

| Folder | Files | Doc |
|---|---|---|
| `game.js` | `createGame`: canvas, loop, input and scenes wired together | [game.md](../docs/modules/game.md) |
| `core/` | version, loop, time, scene, events, canvas, debug, assets, storage, tween | [core.md](../docs/modules/core.md) |
| `math/` | scalar, vec2, vec3, mat4, quat, random, easing, noise (value noise and fractal noise) | [math.md](../docs/modules/math.md) |
| `input/` | keyboard, mouse, touch, gamepad, actions | [input.md](../docs/modules/input.md) |
| `2d/` | draw, sprite, atlas, animation, collision, sat, physics, tilemap, camera, particles, backdrop (parallax sky and hills) | [2d.md](../docs/modules/2d.md) and its linked pages |
| `audio/` | audio (context, volume, music), sfx (sounds made from code) | [audio.md](../docs/modules/audio.md) |
| `3d/` | gl, shader, mesh, primitives, obj, texture, camera3d, lighting, renderer, collision3d, raycaster | [3d.md](../docs/modules/3d.md) |
| `3d/` (stylized engine) | world-renderer, voxel-mesh, stylized-shader, shadow-map, sky, lowpoly, character | [3d-stylized.md](../docs/modules/3d-stylized.md) |
| `world/` | blocks (40), textures and textures-extra (painted in code), voxel-world, generate (islands, trees, houses), walker | [world.md](../docs/modules/world.md) |
| `views/` | world-view (switch modes), map-view, iso-view, raycast-view, sprites | [views.md](../docs/modules/views.md) |
| `library/` | tiles (95, in three files), sprites and sprite-art (31), pixels, tile-tools | [library.md](../docs/modules/library.md) |
| `characters/` | character-spec, character-model (3D parts), character-sprite (2D frames and sheets) | [characters.md](../docs/modules/characters.md) |
| `scene/` | scene (file format and editing), components, prefabs, behaviors, runtime (`runScene`) | [scene.md](../docs/modules/scene.md) |

Every function is listed on one page in [docs/CHEATSHEET.md](../docs/CHEATSHEET.md).
