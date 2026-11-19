# docs/

| Page | What it is |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the engine fits together, with diagrams. Start here. |
| [CHEATSHEET.md](CHEATSHEET.md) | The most used calls on one page. |
| [GLOSSARY.md](GLOSSARY.md) | Every term and acronym in plain English. |
| [RUNNING.md](RUNNING.md) | How to run everything locally (and why `file://` does not work). |
| [DECISIONS.md](DECISIONS.md) | Design decisions and why they were made. |
| [RESOURCES.md](RESOURCES.md) | Hand-picked free books, videos, tools and asset sites. Every link checked. |
| [REBUILD.md](REBUILD.md) | Rebuild the engine yourself, one stage at a time. |
| [bridges/](bridges/) | The same core ideas in Python, React and Rust, standard library only. |
| [../references/](../references/) | Complete games in Python (pygame-ce), Rust (macroquad) and React (react-three-fiber). |

## Engine modules

| Module | Covers |
|---|---|
| [game](modules/game.md) | `createGame()`: everything wired together |
| [core](modules/core.md) | Loop, time, scenes, events, tweens, timers, canvas, assets, storage, debug |
| [math](modules/math.md) | Scalars, vectors, matrices, quaternions, random, easing, noise |
| [input](modules/input.md) | Keyboard, mouse, touch, gamepad, actions |
| [2d](modules/2d.md) | Drawing, sprites, animation |
| [collision](modules/collision.md) | AABB, circles, rays, SAT, and 3D boxes |
| [physics](modules/physics.md) | Arcade bodies that stop at walls |
| [tilemap](modules/tilemap.md) | Levels as text grids |
| [camera](modules/camera.md) | 2D camera: follow, dead zone, bounds, shake, zoom |
| [particles](modules/particles.md) | Sparks, smoke and dust from a pool |
| [audio](modules/audio.md) | Web Audio: files, music, and sound effects from code |
| [3d](modules/3d.md) | WebGL 2 renderer, meshes, lighting, cameras, 3D collision, raycaster |
| [3d-stylized](modules/3d-stylized.md) | Kindling 2's world renderer: chunk meshing, ambient occlusion, shadow maps, sky, water, low-poly models |
| [world](modules/world.md) | Block worlds: the grid, island generation, picking blocks, the walker |
| [views](modules/views.md) | One world in five views: 2D map, isometric, raycaster, 3D third and first person |
| [library](modules/library.md) | 95 tiles and 31 sprites painted by code, and the pixel helpers behind them |
| [characters](modules/characters.md) | One JSON spec becomes a 3D model and a 2D sprite sheet; the character designer |
| [scene](modules/scene.md) | Entities, components and prefabs; scene files; `runScene`; the scene editor |
