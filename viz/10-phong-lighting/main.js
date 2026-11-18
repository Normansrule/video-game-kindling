// viz/10-phong-lighting/main.js
// WHAT: Lit shapes with switches for each part of Phong lighting.

import { createGL } from "kindling/3d/gl.js";
import { createRenderer } from "kindling/3d/renderer.js";
import { createMesh } from "kindling/3d/mesh.js";
import { box, plane, sphere } from "kindling/3d/primitives.js";
import { createOrbitCamera } from "kindling/3d/camera3d.js";
import * as mat4 from "kindling/math/mat4.js";
import { createRunner, createControls } from "../kit.js";

const screen = createGL({ canvas: "#stage", width: 720, height: 400, clearColor: [0.06, 0.07, 0.09] });
const renderer = createRenderer(screen);
const gl = screen.gl;
const sphereMesh = createMesh(gl, sphere(0.8, 48, 32));
const cubeMesh = createMesh(gl, box(1.2, 1.2, 1.2));
const floorMesh = createMesh(gl, plane(12, 12, 1));
const lampMesh = createMesh(gl, sphere(0.08, 12, 8));
const camera = createOrbitCamera({ distance: 6.5, yaw: 0.3, pitch: 0.35, target: { x: 0, y: 0.6, z: 0 } });

const settings = { ambient: 0.2, specularStrength: 0.6, shininess: 32, lightHeight: 2.5, orbit: 0, showAmbient: true, showDiffuse: true, showSpecular: true };

function tick(seconds) {
  settings.orbit += seconds * 0.8;
  const light = {
    position: [Math.cos(settings.orbit) * 3, settings.lightHeight, Math.sin(settings.orbit) * 3],
    color: [1, 0.97, 0.92],
    ambient: settings.ambient,
  };
  renderer.setTerms(settings.showAmbient ? 1 : 0, settings.showDiffuse ? 1 : 0, settings.showSpecular ? 1 : 0);
  renderer.begin(camera, light);
  const material = { specularStrength: settings.specularStrength, shininess: settings.shininess };
  renderer.drawMesh(floorMesh, mat4.identity(), { ...material, color: [0.45, 0.47, 0.52] });
  renderer.drawMesh(sphereMesh, mat4.translation(-1.1, 0.8, 0), { ...material, color: [0.95, 0.55, 0.2] });
  renderer.drawMesh(cubeMesh, mat4.rotateY(mat4.translation(1.2, 0.6, 0), 0.6), { ...material, color: [0.3, 0.55, 0.95] });
  // The lamp itself: full ambient so it always looks bright.
  renderer.setTerms(1, 0, 0);
  renderer.setLight({ ...light, ambient: 1 });
  gl.disable(gl.DEPTH_TEST);
  renderer.drawMesh(lampMesh, mat4.translation(light.position[0], light.position[1], light.position[2]), { color: [1, 0.85, 0.4] });
  gl.enable(gl.DEPTH_TEST);
}

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
controls.addToggle("Ambient", true, (v) => { settings.showAmbient = v; });
controls.addToggle("Diffuse", true, (v) => { settings.showDiffuse = v; });
controls.addToggle("Specular", true, (v) => { settings.showSpecular = v; });
controls.addSlider({ label: "Ambient strength", min: 0, max: 1, step: 0.05, value: settings.ambient, onChange: (v) => { settings.ambient = v; } });
controls.addSlider({ label: "Specular strength", min: 0, max: 1.5, step: 0.05, value: settings.specularStrength, onChange: (v) => { settings.specularStrength = v; } });
controls.addSlider({ label: "Shininess", min: 2, max: 256, value: settings.shininess, onChange: (v) => { settings.shininess = v; } });
controls.addSlider({ label: "Light height", min: 0.3, max: 6, step: 0.1, value: settings.lightHeight, onChange: (v) => { settings.lightHeight = v; } });

document.getElementById("readout").textContent = "Tip: drag the picture to move the camera and watch the highlight follow you.";
createRunner(tick, playButton);
