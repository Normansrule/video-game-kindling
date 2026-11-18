// samples/3d/01-spinning-cube/main.js
// WHAT: The "hello world" of 3D: one lit, textured cube spinning in space.
// WHY:  Shows the smallest complete 3D program and the five steps every 3D frame takes:
//         1. clear the screen   2. set the camera   3. set the light
//         4. build a model matrix for each object   5. draw its mesh
// TEACHES: createGL, meshes from primitives, canvas textures, model matrices.
// README: samples/3d/01-spinning-cube/README.md

import { createGL } from "kindling/3d/gl.js";
import { createRenderer } from "kindling/3d/renderer.js";
import { createMesh } from "kindling/3d/mesh.js";
import { cube } from "kindling/3d/primitives.js";
import { createOrbitCamera } from "kindling/3d/camera3d.js";
import { createCanvasTexture } from "kindling/3d/texture.js";
import { createLoop } from "kindling/core/loop.js";
import * as mat4 from "kindling/math/mat4.js";

const screen = createGL({ canvas: "#game", width: 640, height: 360 });
const renderer = createRenderer(screen);

// The shape: a cube's corners, normals, texture coordinates and triangles, sent to the GPU once.
const cubeMesh = createMesh(screen.gl, cube(1.4));

// A texture painted with the ordinary 2D canvas API: an orange crate with a border and a K.
const crateTexture = createCanvasTexture(screen.gl, 128, (context, size) => {
  context.fillStyle = "#c46a1b";
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "#7a3d0c";
  context.lineWidth = 12;
  context.strokeRect(6, 6, size - 12, size - 12);
  context.fillStyle = "#ffe0a8";
  context.font = "bold 72px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("K", size / 2, size / 2 + 4);
});

const camera = createOrbitCamera({ distance: 4, pitch: 0.35 });
const light = { position: [3, 4, 5], color: [1, 1, 1], ambient: 0.3 };
let angle = 0;

const loop = createLoop({
  update(stepSeconds) {
    angle = angle + stepSeconds * 0.9;   // radians per second
  },
  render() {
    renderer.begin(camera, light);
    // Model matrix: rotate around y, then tilt around x, so you see three faces.
    let model = mat4.rotationY(angle);
    model = mat4.rotateX(model, angle * 0.6);
    renderer.drawMesh(cubeMesh, model, { texture: crateTexture, color: [1, 1, 1], shininess: 24 });
  },
});
loop.start();
