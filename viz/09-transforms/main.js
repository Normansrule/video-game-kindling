// viz/09-transforms/main.js
// WHAT: A WebGL scene with sliders for the model matrix and the camera's field of view.

import { createGL } from "kindling/3d/gl.js";
import { createRenderer } from "kindling/3d/renderer.js";
import { createMesh } from "kindling/3d/mesh.js";
import { box, plane } from "kindling/3d/primitives.js";
import { createOrbitCamera } from "kindling/3d/camera3d.js";
import { createCheckerTexture } from "kindling/3d/texture.js";
import * as mat4 from "kindling/math/mat4.js";
import { degreesToRadians } from "kindling/math/scalar.js";
import { createRunner, createControls } from "../kit.js";

const screen = createGL({ canvas: "#stage", width: 720, height: 400, clearColor: [0.1, 0.11, 0.14] });
const renderer = createRenderer(screen);
const gl = screen.gl;
const cubeMesh = createMesh(gl, box(1, 1, 1));
const floorMesh = createMesh(gl, plane(10, 10, 1, 10));
const axisMesh = createMesh(gl, box(1, 1, 1));
const texture = createCheckerTexture(gl, 4, "#ffb347", "#b4500a");
const floorTexture = createCheckerTexture(gl, 2, "#3a3f4b", "#2d313b");
const camera = createOrbitCamera({ distance: 7, yaw: 0.7, pitch: 0.45, target: { x: 0, y: 0.5, z: 0 } });

const transform = { x: 0, y: 1, z: 0, rotateX: 0, rotateY: 30, rotateZ: 0, scale: 1, spin: true };

function modelMatrix() {
  let model = mat4.translation(transform.x, transform.y, transform.z);
  model = mat4.rotateY(model, degreesToRadians(transform.rotateY));
  model = mat4.rotateX(model, degreesToRadians(transform.rotateX));
  model = mat4.rotateZ(model, degreesToRadians(transform.rotateZ));
  model = mat4.scale(model, { x: transform.scale, y: transform.scale, z: transform.scale });
  return model;
}

function axis(x, y, z, length, color) {
  // A long thin box along one axis, starting at the origin.
  let model = mat4.translation(x * length / 2, y * length / 2 + 0.01, z * length / 2);
  model = mat4.scale(model, { x: x ? length : 0.04, y: y ? length : 0.04, z: z ? length : 0.04 });
  renderer.drawMesh(axisMesh, model, { color, specularStrength: 0 });
}

const matrixElement = document.getElementById("matrix");
function showMatrix(model) {
  // Print rows (the array is stored column by column).
  let textOut = "";
  for (let row = 0; row < 4; row++) {
    const values = [];
    for (let column = 0; column < 4; column++) values.push(model[column * 4 + row].toFixed(2).padStart(6));
    textOut += "[ " + values.join(" ") + " ]\n";
  }
  matrixElement.textContent = textOut;
  matrixElement.style.whiteSpace = "pre";
}

let sinceMatrixShown = 0;
function tick(seconds) {
  if (transform.spin) transform.rotateY = (transform.rotateY + seconds * 40) % 360;
  const model = modelMatrix();
  renderer.begin(camera, { position: [3, 6, 4], color: [1, 1, 1], ambient: 0.35 });
  renderer.drawMesh(floorMesh, mat4.identity(), { texture: floorTexture, specularStrength: 0 });
  axis(1, 0, 0, 3, [0.9, 0.28, 0.3]);
  axis(0, 1, 0, 3, [0.19, 0.64, 0.42]);
  axis(0, 0, 1, 3, [0.24, 0.39, 0.87]);
  renderer.drawMesh(cubeMesh, model, { texture, color: [1, 1, 1] });
  sinceMatrixShown += seconds;
  if (sinceMatrixShown > 0.15 || seconds === 0) {
    showMatrix(model);
    sinceMatrixShown = 0;
  }
}

// Drag to orbit the camera.
let lastPointer = null;
screen.canvas.addEventListener("pointerdown", (event) => { lastPointer = { x: event.clientX, y: event.clientY }; screen.canvas.setPointerCapture(event.pointerId); });
screen.canvas.addEventListener("pointermove", (event) => {
  if (!lastPointer) return;
  camera.rotate(event.clientX - lastPointer.x, event.clientY - lastPointer.y);
  lastPointer = { x: event.clientX, y: event.clientY };
});
screen.canvas.addEventListener("pointerup", () => { lastPointer = null; });

const controls = createControls(document.getElementById("controls"));
const [playButton] = controls.addButtons([{ label: "Pause", primary: true }]);
controls.addToggle("Spin around y", true, (v) => { transform.spin = v; });
controls.addSlider({ label: "Move x", min: -3, max: 3, step: 0.1, value: 0, onChange: (v) => { transform.x = v; } });
controls.addSlider({ label: "Move y", min: 0, max: 3, step: 0.1, value: 1, onChange: (v) => { transform.y = v; } });
controls.addSlider({ label: "Move z", min: -3, max: 3, step: 0.1, value: 0, onChange: (v) => { transform.z = v; } });
controls.addSlider({ label: "Rotate x", min: -180, max: 180, value: 0, unit: "°", onChange: (v) => { transform.rotateX = v; } });
controls.addSlider({ label: "Rotate z", min: -180, max: 180, value: 0, unit: "°", onChange: (v) => { transform.rotateZ = v; } });
controls.addSlider({ label: "Scale", min: 0.2, max: 2.5, step: 0.1, value: 1, unit: "x", onChange: (v) => { transform.scale = v; } });
controls.addSlider({ label: "Field of view", min: 20, max: 110, value: 60, unit: "°", onChange: (v) => { camera.fieldOfView = degreesToRadians(v); } });

document.getElementById("readout").textContent = "Tip: drag the picture to orbit the camera.";
createRunner(tick, playButton);
