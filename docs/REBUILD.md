# Rebuild Kindling yourself

The best way to understand an engine is to write one. This page is the order Kindling was built in. For each stage: what to build, which files to read **after** you try, and how you know you are done. Start an empty folder, keep this repository open next to it, and resist peeking until you are stuck.

| Stage | Build | Read after | Done when |
|---|---|---|---|
| S0 | A page with an import map, a server (`python3 -m http.server`), one module that exports a version, a test runner that works in the browser and in Node. | `index.html`, `tests/`, [RUNNING.md](RUNNING.md) | The page shows the version, `node --test` passes. |
| S1 | Fixed-timestep loop with `advance(frameSeconds)`, a clock, scenes, events, keyboard with pressed/released, vec2 and scalar math. | `engine/core/loop.js`, `time.js`, `scene.js`, `engine/input/keyboard.js`, [lesson 2D-1](../lessons/2d-1-game-loop.html) | A square moves at the same speed at 30 and 144 Hz. |
| S2 | Canvas scaling, drawing helpers, sprite sheets, animation, AABB and circle collision with push-out, arcade physics, tilemaps, a camera, particles. | `engine/2d/*`, [lessons 2D-2 to 2D-5](../lessons/index.html#2d) | A box runs and jumps through a text level that scrolls. |
| S3 | Web Audio: unlock on first input, play a file, sound effects from oscillators. | `engine/audio/*`, [viz 13](https://normansrule.github.io/kindling/viz/13-sound/) | A jump makes a sound you designed. |
| S4 | Pong, then Breakout, then a platformer with coyote time. Mouse, touch and gamepad through actions. | `samples/2d/*`, [lesson 2D-6](../lessons/2d-6-juice.html) | Someone else finishes your platformer without help. |
| S5 | WebGL 2: compile a shader, a mesh in a VAO, mat4, a camera, Phong lighting, a texture. Then a raycaster with only Canvas 2D. Then 3D box collision. | `engine/3d/*`, [3D lessons](../lessons/index.html#3d) | A lit, textured cube spins; you can walk a maze. |
| S6 | Write the docs and one lesson for something you built. Explaining it shows you what you do not understand yet. | `docs/modules/*`, `lessons/` | A friend follows your lesson. |
| S7 | A jam starter and a script that copies it with the engine. | `jam/` | You submit a game to a real jam. |
| S8 | A README with a GIF, issue templates, a changelog, a release. | the repository root | Your engine has a v1.0.0. |

## Rules that help

- Write the test before the function for anything with math: collision, vectors, the loop.
- Keep every file under 300 lines. When it grows, you have found a second concept.
- Make a visualization when an idea will not stick. Drawing it forces you to understand it.

Rebuilding in another language? See the [language bridges](bridges/README.md) for the core ideas in Python and Rust.
