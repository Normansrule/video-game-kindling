// viz/02-easing/main.js
// WHAT: Plots an easing curve and animates two boxes: the chosen easing and plain linear.

import { easings } from "kindling/math/easing.js";
import { lerp } from "kindling/math/scalar.js";
import { themeColors, setupCanvas, createRunner, createControls, label } from "../kit.js";

const WIDTH = 720;
const HEIGHT = 340;
const view = setupCanvas(document.getElementById("stage"), WIDTH, HEIGHT);
const context = view.context;

const state = { name: "easeOutCubic", duration: 1.5, elapsed: 0, holdSeconds: 0.6 };

// Chart area: t on the x axis, eased value on the y axis.
const chart = { x: 50, y: 40, size: 240 };

function tick(seconds) {
  state.elapsed = state.elapsed + seconds;
  // Run the animation, hold at the end for a moment, then restart.
  if (state.elapsed > state.duration + state.holdSeconds) state.elapsed = 0;
  draw();
}

function draw() {
  const colors = themeColors();
  const ease = easings[state.name];
  const t = Math.min(state.elapsed / state.duration, 1);
  const eased = ease(t);

  context.fillStyle = colors.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // Chart frame. Value 0 sits at the bottom line, 1 at the top line.
  // We leave room above and below because back/elastic go past 0..1.
  const bottom = chart.y + chart.size * 0.8;
  const top = chart.y + chart.size * 0.2;
  function valueToY(value) {
    return lerp(bottom, top, value);
  }
  context.strokeStyle = colors.border;
  context.lineWidth = 1;
  context.strokeRect(chart.x, chart.y, chart.size, chart.size);
  context.setLineDash([4, 4]);
  for (const value of [0, 1]) {
    context.beginPath();
    context.moveTo(chart.x, valueToY(value));
    context.lineTo(chart.x + chart.size, valueToY(value));
    context.stroke();
  }
  context.setLineDash([]);
  label(context, "1", chart.x - 12, valueToY(1), colors.muted, 12, "right");
  label(context, "0", chart.x - 12, valueToY(0), colors.muted, 12, "right");
  label(context, "time t →", chart.x + chart.size, chart.y + chart.size + 16, colors.muted, 12, "right");

  // Linear reference line, then the easing curve.
  context.strokeStyle = colors.muted;
  context.beginPath();
  context.moveTo(chart.x, valueToY(0));
  context.lineTo(chart.x + chart.size, valueToY(1));
  context.stroke();

  context.strokeStyle = colors.accent;
  context.lineWidth = 3;
  context.beginPath();
  for (let i = 0; i <= 120; i++) {
    const sampleT = i / 120;
    const x = chart.x + sampleT * chart.size;
    const y = valueToY(ease(sampleT));
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();

  // The moving dot on the curve.
  context.fillStyle = colors.accent;
  context.beginPath();
  context.arc(chart.x + t * chart.size, valueToY(eased), 7, 0, Math.PI * 2);
  context.fill();

  // Two lanes on the right: eased box and linear box.
  const laneStart = 360;
  const laneEnd = WIDTH - 60;
  drawBox("eased", laneStart, laneEnd, 120, eased, colors.accent, colors);
  drawBox("linear", laneStart, laneEnd, 220, t, colors.muted, colors);
  label(context, state.name, laneStart, 60, colors.text, 16);
}

function drawBox(name, startX, endX, y, value, color, colors) {
  context.strokeStyle = colors.border;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(startX, y + 22);
  context.lineTo(endX + 30, y + 22);
  context.stroke();
  context.fillStyle = color;
  context.fillRect(lerp(startX, endX, value), y - 14, 30, 30);
  label(context, name, startX, y - 28, colors.muted, 12);
}

const readout = document.getElementById("readout");
setInterval(function () {
  const t = Math.min(state.elapsed / state.duration, 1);
  readout.textContent = "t = " + t.toFixed(2) + "   " + state.name + "(t) = " + easings[state.name](t).toFixed(3);
}, 200);

const controls = createControls(document.getElementById("controls"));
const [playButton] = controls.addButtons([
  { label: "Pause", primary: true },
  { label: "Replay", onClick: () => { state.elapsed = 0; draw(); } },
]);
controls.addSelect("Easing", Object.keys(easings), state.name, (value) => { state.name = value; state.elapsed = 0; });
controls.addSlider({ label: "Duration", min: 0.3, max: 4, step: 0.1, value: 1.5, unit: " s", onChange: (v) => { state.duration = v; } });

createRunner(tick, playButton);
draw();
window.addEventListener("kindling-theme-change", draw);
