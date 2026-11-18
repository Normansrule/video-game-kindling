// viz/15-voxel-lighting/main.js
// WHAT: A 3D block island with sliders and switches for every lighting setting of the
//       stylized renderer. Drag to orbit, wheel or pinch to zoom.
// WHY:  Each effect is small on its own; turning them off one by one shows what each adds.

import { createGL } from "kindling/3d/gl.js";
import { createWorldRenderer } from "kindling/3d/world-renderer.js";
import { createOrbitCamera } from "kindling/3d/camera3d.js";
import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { generateIsland } from "kindling/world/generate.js";
import { createRunner, createControls } from "../kit.js";

const canvas = document.getElementById("stage");
const screen = createGL({ canvas, width: 720, height: 405, fit: false });
canvas.style.width = "100%";
canvas.style.height = "auto";
const world = createVoxelWorld(56, 36, 56);
const island = generateIsland(world, { seed: 8, village: true });
const renderer = createWorldRenderer(screen, { timeOfDay: 0.36, shadowRadius: 40 });
renderer.setWorld(world);
renderer.setOcean(island.seaLevel);
const camera = createOrbitCamera({ target: { x: 28, y: island.seaLevel + 4, z: 28 }, distance: 46, pitch: 0.5, yaw: 0.7, far: 500 });

// Keep the drawing buffer as sharp as the canvas on screen.
function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round((canvas.clientWidth || 720) * ratio);
  canvas.height = Math.round(canvas.width * 405 / 720);
}
resize();
window.addEventListener("resize", resize);

// Drag to orbit (mouse or one finger), wheel to zoom.
let dragging = null;
let spin = true;
canvas.addEventListener("pointerdown", (event) => { dragging = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  camera.rotate(event.clientX - dragging.x, event.clientY - dragging.y);
  dragging = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener("pointerup", () => { dragging = null; });
canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  camera.distance = Math.max(12, Math.min(110, camera.distance + Math.sign(event.deltaY) * 3));
}, { passive: false });
canvas.style.touchAction = "none";

const readout = document.getElementById("readout");
let time = 0;
function tick(seconds) {
  time += seconds;
  if (spin && !dragging) camera.yaw += seconds * 0.08;
  renderer.render(camera, time);
  const s = renderer.settings;
  const clock = Math.floor(s.timeOfDay * 24);
  readout.textContent = "Time " + String(clock).padStart(2, "0") + ":" + String(Math.floor((s.timeOfDay * 24 - clock) * 60)).padStart(2, "0") +
    " · shadows " + (s.shadows ? "on" : "off") + " · ambient occlusion " + Math.round(s.ambientOcclusion * 100) + "% · fog " + s.fogDensity.toFixed(3) + " · " + renderer.chunkCount() + " chunks";
}

const controls = createControls(document.getElementById("controls"));
const [playButton] = controls.addButtons([{ label: "Pause", primary: true }]);
controls.addSlider({ label: "Time of day", min: 0, max: 1, step: 0.005, value: 0.36, onChange: (value) => { renderer.settings.timeOfDay = value; } });
controls.addToggle("Sun shadows", true, (on) => { renderer.settings.shadows = on; });
controls.addSlider({ label: "Ambient occlusion", min: 0, max: 100, value: 100, unit: "%", onChange: (value) => { renderer.settings.ambientOcclusion = value / 100; } });
controls.addSlider({ label: "Fog density (× 1000)", min: 0, max: 40, value: 11, onChange: (value) => { renderer.settings.fogDensity = value / 1000; } });
controls.addSlider({ label: "Exposure", min: 0.3, max: 1.6, step: 0.05, value: 0.8, onChange: (value) => { renderer.settings.exposure = value; } });
controls.addToggle("Turn slowly by itself", true, (on) => { spin = on; });
createRunner(tick, playButton);
