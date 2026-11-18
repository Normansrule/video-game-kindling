// Game Code Example 29: 3D hello world: a lit, spinning cube
// WHAT: The smallest 3D program: a WebGL 2 canvas, a cube mesh, a camera, a light.
// WHY:  3D drawing is: shapes (meshes) + where they are (a model matrix) + where you
//       look from (a camera) + light. renderer.drawMesh does the WebGL details.
//       Drag to orbit the camera around the cube.
// TRY:  Draw a second cube: renderer.drawMesh(cube, mat4.translation(2, 0, 0), {...}).

import { createGame } from "kindling/game.js";
import { createRenderer } from "kindling/3d/renderer.js";
import { createMesh } from "kindling/3d/mesh.js";
import { box, plane } from "kindling/3d/primitives.js";
import { createOrbitCamera } from "kindling/3d/camera3d.js";
import * as mat4 from "kindling/math/mat4.js";

const game = createGame({ webgl: true, width: 640, height: 360, clearColor: [0.08, 0.1, 0.14] });
const renderer = createRenderer(game.screen);
const cube = createMesh(game.gl, box(1, 1, 1));
const floor = createMesh(game.gl, plane(8, 8));
const camera = createOrbitCamera({ distance: 4, pitch: 0.45 });

game.scenes.add("cube", {
  update(game) {
    if (game.input.mouse.isDown(0)) camera.rotate(game.input.mouse.movement().x, game.input.mouse.movement().y);
  },
  render(game) {
    const angle = game.time.elapsed;
    renderer.begin(camera, { position: [3, 5, 4], color: [1, 0.97, 0.92], ambient: 0.25 });
    // Model matrix = move up half a block, then spin around y (read right to left).
    const model = mat4.multiply(mat4.translation(0, 0.6, 0), mat4.rotationY(angle));
    renderer.drawMesh(cube, model, { color: [1, 0.62, 0.26], shininess: 48 });
    renderer.drawMesh(floor, mat4.identity(), { color: [0.25, 0.3, 0.38], specularStrength: 0.05 });
  },
});

game.start("cube");
