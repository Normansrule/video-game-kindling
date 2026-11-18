# Sample 3D-01: Spinning cube

**Play:** <https://normansrule.github.io/video-game-kindling/samples/3d/01-spinning-cube/> · **Run locally:** `cd ~/projects/kindling && python3 -m http.server 8000`, then open <http://localhost:8000/samples/3d/01-spinning-cube/>

## What it teaches

The smallest complete 3D program, in five steps per frame:

1. `renderer.begin(camera, light)` clears the screen and sends the camera and light to the shader.
2. A **model matrix** says where the cube is and how it's turned: `rotationY`, then `rotateX`.
3. `renderer.drawMesh(mesh, model, material)` draws it.

And two one-time setups: `createMesh(gl, cube(1.4))` uploads the shape to the graphics card, and `createCanvasTexture` paints a texture with the normal 2D canvas API.

Engine modules used: `3d/gl.js`, `3d/renderer.js` (which uses `3d/shader.js` and `3d/lighting.js`), `3d/mesh.js`, `3d/primitives.js`, `3d/camera3d.js`, `3d/texture.js`, `core/loop.js`, `math/mat4.js`.

See it explained: [viz 9, 3D transforms](https://normansrule.github.io/video-game-kindling/viz/09-transforms/).

## Try changing

1. Swap `cube(1.4)` for `sphere(1, 32, 16)` (import it from `kindling/3d/primitives.js`).
2. Draw a second cube next to the first: `mat4.translate(model, { x: 2, y: 0, z: 0 })`.
3. Make the light red: `color: [1, 0.3, 0.3]`.
