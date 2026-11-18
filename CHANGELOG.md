# Changelog

All notable changes. Versions follow [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH.

## [2.0.0] - 2026-11-18

Kindling 2: our own stylized graphics engine, one world in 2D, 2.5D and 3D, a live playground and 35 Game Code Examples. Release notes: [docs/RELEASE-NOTES-v2.0.0.md](docs/RELEASE-NOTES-v2.0.0.md).

### Added
- **Stylized 3D renderer** (`engine/3d/world-renderer.js` and friends): chunked block meshes with face culling, per-corner ambient occlusion, sky light, a sun shadow map with soft edges (PCF), hemisphere ambient, ACES tone mapping, fog with sun haze, see-through water with a Fresnel reflection, an ocean to the horizon, a sky with clouds and stars, a day–night cycle and lantern lights.
- **Low-poly models** (`3d/lowpoly.js`): a model builder plus trees, rocks, coins, crystals and an animated blocky character (`3d/character.js`).
- **Block worlds** (`engine/world/`): block types, 16 × 16 textures painted in code, `createVoxelWorld`, `raycastVoxels`, island generation with villages, and a walker with gravity, sliding and auto-step.
- **Five view modes** (`engine/views/`): `createWorldView` draws one world as a 2D map, an isometric diorama, a raycaster, 3D third person or 3D first person, switchable while running.
- `math/noise.js` (seeded value noise and fractal noise) and `2d/backdrop.js` (painted parallax backgrounds).
- **Game Code Examples** (`game-code-examples/`): 35 runnable examples in five topics, a gallery with thumbnails, and `frame.html` to run any one.
- **Playground** (`playground/`): edit any example and see it run, with a console and saved drafts.
- **Samples**: One world, five views (`samples/modes/01-one-world/`) and Island builder (`samples/3d/06-island-builder/`).
- **Visualizations**: 14 one world four views, 15 lighting a block world.
- Docs: `docs/modules/world.md`, `views.md`, `3d-stylized.md`; cheatsheet sections for block worlds and the new renderer.
- New checks for noise, blocks, textures, meshing, ambient occlusion, picking, the walker and spawn points.

### Changed
- New site design (`assets/kindling.css`): the landing page has a live demo touring all five views; new examples, playground and samples pages.
- README rewritten around the five views, with a new animated header.
- Platformer, tilemap adventure and coin collector samples now use the painted textures, sprites and the new 3D renderer.
- The smoke check opens every Game Code Example and runs WebGL through SwiftShader.

## [1.1.0] - 2026-11-18

The after-1.0 roadmap. Release notes: [docs/RELEASE-NOTES-v1.1.0.md](docs/RELEASE-NOTES-v1.1.0.md).

### Added
- **13k path** (`tiny/`): `kindling-tiny.js` (about 2 KB packed), the Spark Hop starter game (3.4 KB zipped), `new-tiny-game.sh`, and `pack.mjs`, which bundles a game into one page, zips it and reports the bytes left. Dependency-free zip writer and bundler in `tiny/zip.js` and `tiny/bundle.js`.
- **Texture atlases**: `engine/2d/atlas.js` with `packRects()` (skyline packing that tries several widths), `createAtlas()`, `atlas.sequence()` for animations, and `drawRegion()` in `sprite.js`.
- **Sprite packer** (`make/sprite-packer/`): drop in PNGs, download `atlas.png` and `atlas.json`.
- **Level editor** (`make/level-editor/`): paint, rectangle, fill, pick and scroll tools; undo/redo; autosave; warnings; paste or open the platformer levels; export `level.js`; instant play-testing with keyboard or touch.
- `make/` hub page, tool guide, and 21 new checks (76 in all).

### Changed
- The repository is now `Normansrule/video-game-kindling`; every link and the Pages address follow. The engine is still called Kindling and the `kindling/` import maps are unchanged.
- js13kGames is back on the jam list, through the 13k path.

## [1.0.0] - 2026-11-14

The first complete release. Release notes: [docs/RELEASE-NOTES-v1.0.0.md](docs/RELEASE-NOTES-v1.0.0.md).

### Engine
- Core: fixed-timestep loop, time, scenes with a stack, events, tweens, timers, canvas scaling, assets, storage, debug overlay, `createGame()` and `game.destroy()`.
- Math: scalar helpers, vec2, vec3, mat4, quaternions, seeded random, easing.
- Input: keyboard, mouse (with pointer lock), touch buttons, gamepad, named actions.
- 2D: drawing, sprite sheets, animation, AABB and circle collision, SAT, arcade physics, tilemaps, camera, particles.
- Audio: Web Audio playback, music, and sound effects generated from code.
- 3D: WebGL 2 setup, shaders, meshes, primitives, OBJ loader, textures, orbit and first-person cameras, Phong lighting with fog, renderer, 3D box collision, raycaster.

### Learning material
- 11 samples (6 in 2D, 5 in 3D), 13 visualizations, 13 lessons in 2D, 3D and design tracks.
- 12 module docs, architecture, cheat sheet, glossary, resources.
- Language bridges for Python, React and Rust, with tested code.

### Reference games (`references/`)
- Python (pygame-ce): Neon platformer, Neon arena, Raycast halls, Fireworks; 18 tests.
- Rust (macroquad): Neon platformer, Crystal islands 3D, Raycast halls, Fireworks; 14 tests, clippy clean.
- React (React 18, react-three-fiber, Vite): Neon arena, Crystal islands 3D, Easing playground; 6 tests. Built for GitHub Pages by the workflow.

### Jam kit
- Starter game, `new-game.sh`, `zip-game.sh`, 48 h and 72 h checklists, scope cutter, itch.io guide, postmortem template, jam list.

## [0.0.1] - 2026-11-12
- S0 skeleton: landing page, import-map pattern, tests, GitHub Pages workflow.
