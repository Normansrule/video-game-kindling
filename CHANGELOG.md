# Changelog

All notable changes. Versions follow [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH.

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
