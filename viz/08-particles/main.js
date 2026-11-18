// viz/08-particles/main.js
// WHAT: A live particle emitter with presets and sliders.

import { createParticles, presets } from "kindling/2d/particles.js";
import { themeColors, setupCanvas, createRunner, createControls } from "../kit.js";

const WIDTH = 720;
const HEIGHT = 340;
const view = setupCanvas(document.getElementById("stage"), WIDTH, HEIGHT);
const context = view.context;
const particles = createParticles(1500);

const emitter = { x: WIDTH / 2, y: HEIGHT / 2 + 40 };
// Start from a copy of a preset; sliders change this copy.
let settings = { ...presets.fire, burstsPerSecond: 30 };
let sinceLastBurst = 0;

function tick(seconds) {
  sinceLastBurst += seconds;
  const interval = 1 / settings.burstsPerSecond;
  while (sinceLastBurst >= interval && seconds > 0) {
    // We draw at 2x, so particle positions are half the canvas position.
    particles.emit({ ...settings, x: emitter.x / 2, y: emitter.y / 2 });
    sinceLastBurst -= interval;
  }
  particles.update(seconds);
  draw();
}

function draw() {
  const colors = themeColors();
  context.fillStyle = "#14161b";            // particles read best on dark, in both themes
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.save();
  context.scale(2, 2);                      // particle sizes are in game pixels; show them 2x
  particles.render(context, true);
  context.restore();
  context.strokeStyle = colors.accent;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(emitter.x, emitter.y, 6, 0, Math.PI * 2);
  context.stroke();
}

view.canvas.style.touchAction = "none";
function moveEmitter(event) {
  const point = view.toLocal(event);
  emitter.x = point.x;
  emitter.y = point.y;
}
view.canvas.addEventListener("pointerdown", (event) => { moveEmitter(event); view.canvas.setPointerCapture(event.pointerId); });
view.canvas.addEventListener("pointermove", (event) => { if (event.buttons) moveEmitter(event); });

const controls = createControls(document.getElementById("controls"));
const [playButton] = controls.addButtons([
  { label: "Pause", primary: true },
  { label: "One explosion", onClick: () => particles.emit({ ...presets.explosion, x: emitter.x / 2, y: emitter.y / 2 }) },
]);
const sliders = {};
controls.addSelect("Preset", Object.keys(presets), "fire", (name) => {
  settings = { ...presets[name], burstsPerSecond: name === "explosion" ? 2 : settings.burstsPerSecond || 30 };
  for (const key in sliders) sliders[key].value = settings[key] ?? sliders[key].value;
  for (const key in sliders) sliders[key].dispatchEvent(new Event("input"));
});
function slider(key, text, min, max, step, unit) {
  sliders[key] = controls.addSlider({ label: text, min, max, step, value: settings[key] ?? 0, unit, onChange: (v) => { settings[key] = v; } });
}
slider("burstsPerSecond", "Bursts per second", 1, 60, 1, "");
slider("count", "Particles per burst", 1, 40, 1, "");
slider("speedMax", "Speed (max)", 0, 200, 5, " px/s");
slider("spread", "Spread", 0, 6.28, 0.1, " rad");
slider("gravity", "Gravity", -200, 400, 10, "");
slider("lifeMax", "Life (max)", 0.1, 3, 0.1, " s");
slider("sizeStart", "Size at start", 0, 10, 0.5, " px");
slider("sizeEnd", "Size at end", 0, 10, 0.5, " px");

const readout = document.getElementById("readout");
setInterval(() => { readout.textContent = particles.count() + " particles alive (pool of 1500)"; }, 200);
createRunner(tick, playButton);
window.addEventListener("kindling-theme-change", draw);
