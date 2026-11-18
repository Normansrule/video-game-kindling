# Sample 3D-02: Lit scene

**Play:** <https://normansrule.github.io/kindling/samples/3d/02-lit-scene/> · **Run locally:** `cd ~/projects/kindling && python3 -m http.server 8000`, then open <http://localhost:8000/samples/3d/02-lit-scene/>

| Controls | |
|---|---|
| Orbit | Drag with the mouse or a finger |
| Zoom | Mouse wheel |

## What it teaches

- **Loading a model:** `parseOBJ(await loadText("./tree.obj"))`. Open `tree.obj` in a text editor: it's just `v` (corner) and `f` (face) lines.
- **Instancing:** one tree mesh, drawn 40 times with 40 different model matrices (translate, rotate, scale).
- **Seeded randomness:** `createRandom(2024)` places everything the same way every run.
- **Fog** (`renderer.setFog(28)`) hides the edge of the world and adds depth for free.
- **A moving light:** the sun's position and color change over time.
- `createGame({ webgl: true })` gives you the loop, input and scenes with a WebGL canvas.

`tree.obj` is CC0, generated for Kindling. For more models see [RESOURCES.md](../../../docs/RESOURCES.md) (Kenney, Quaternius, Poly Pizza).

## Try changing

1. Export a model from Blender as `.obj` (Triangulate on, materials off) and load it instead of the tree.
2. Make the trees sway: add a small `rotateZ` based on `game.time.elapsed`.
3. Turn the sun into night: set ambient to 0.1 and the light color to a cold blue.
