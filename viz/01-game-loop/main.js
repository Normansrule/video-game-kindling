// viz/01-game-loop/main.js
// WHAT: Drives engine/core/loop.js with pretend screen frames so you can watch it work.
// WHY:  Real frames are too fast to see. We slow the clock down and let you change
//       the frame rate, update rate and jitter.

import { createLoop } from "kindling/core/loop.js";
import { createRandom } from "kindling/math/random.js";
import { themeColors, setupCanvas, createRunner, createControls, label } from "../kit.js";

const WIDTH = 720;
const HEIGHT = 380;
const view = setupCanvas(document.getElementById("stage"), WIDTH, HEIGHT);
const context = view.context;
const random = createRandom(1);

const settings = { frameRate: 60, updateRate: 20, jitter: 0, playbackSpeed: 0.15 };

// The "game": one ball moving right at a constant speed.
const ball = { x: 0, previousX: 0, speed: 160 };

// History for the timeline, in pretend seconds.
const frameMarks = [];
const stepMarks = [];
let clock = 0;               // pretend real time
let nextFrameAt = 0;
let lastFrameAt = 0;
let lastStepsThisFrame = 0;

// What the screen currently shows (only changes when a frame is drawn).
const shown = { snapped: 0, blended: 0 };

const loop = createLoop({
  stepSeconds: 1 / settings.updateRate,
  update(step) {
    ball.previousX = ball.x;
    ball.x = ball.x + ball.speed * step;
    stepMarks.push(clock - loop.getAccumulator());
  },
  render(alpha) {
    shown.snapped = ball.x;
    shown.blended = ball.previousX + (ball.x - ball.previousX) * alpha;
    frameMarks.push(clock);
  },
});

function tick(realSeconds) {
  clock = clock + realSeconds * settings.playbackSpeed;
  // Draw pretend frames at the chosen frame rate, with optional jitter.
  while (clock >= nextFrameAt) {
    const frameSeconds = nextFrameAt - lastFrameAt;
    lastFrameAt = nextFrameAt;
    lastStepsThisFrame = loop.advance(frameSeconds);
    const wobble = 1 + settings.jitter * (random.next() * 2 - 1);
    nextFrameAt = nextFrameAt + wobble / settings.frameRate;
  }
  // Forget marks older than the visible window.
  while (frameMarks.length && frameMarks[0] < clock - 1) frameMarks.shift();
  while (stepMarks.length && stepMarks[0] < clock - 1) stepMarks.shift();
  draw();
}

function timeToX(seconds) {
  // The last 1 second of pretend time fills the timeline, newest on the right.
  return 40 + (seconds - (clock - 1)) * (WIDTH - 80);
}

function draw() {
  const colors = themeColors();
  context.fillStyle = colors.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // Timeline lanes.
  label(context, "Frames drawn", 40, 22, colors.muted);
  label(context, "Update steps", 40, 92, colors.muted);
  context.fillStyle = colors.accent2;
  for (const mark of frameMarks) context.fillRect(timeToX(mark) - 1, 34, 3, 36);
  context.fillStyle = colors.accent;
  for (const mark of stepMarks) {
    context.beginPath();
    context.arc(timeToX(mark), 120, 6, 0, Math.PI * 2);
    context.fill();
  }
  label(context, "1 second ago", 40, 148, colors.muted, 11);
  label(context, "now", WIDTH - 40, 148, colors.muted, 11, "right");

  // Accumulator bar: how much real time is waiting to be simulated.
  const fill = loop.getAccumulator() / loop.time.step;
  label(context, "Accumulator (time not yet simulated)", 40, 178, colors.muted);
  context.strokeStyle = colors.border;
  context.lineWidth = 2;
  context.strokeRect(40, 192, WIDTH - 80, 22);
  context.fillStyle = colors.accent;
  context.fillRect(40, 192, (WIDTH - 80) * Math.min(fill, 1), 22);
  label(context, "one full step", WIDTH - 44, 203, colors.text, 11, "right");

  // Two balls: snapped to the last update vs blended with alpha.
  drawLane("Drawn at last update position (can stutter)", 252, shown.snapped, colors, colors.bad);
  drawLane("Blended with alpha (smooth)", 322, shown.blended, colors, colors.good);
}

function drawLane(text, y, worldX, colors, color) {
  label(context, text, 40, y - 24, colors.muted);
  context.strokeStyle = colors.border;
  context.beginPath();
  context.moveTo(40, y + 14);
  context.lineTo(WIDTH - 40, y + 14);
  context.stroke();
  const laneWidth = WIDTH - 100;
  const x = 50 + (((worldX % laneWidth) + laneWidth) % laneWidth);
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, 12, 0, Math.PI * 2);
  context.fill();
}

// Readout, refreshed a few times a second so it is readable.
const readout = document.getElementById("readout");
setInterval(function () {
  readout.textContent =
    "Last frame ran " + lastStepsThisFrame + " update step(s) · alpha " + loop.time.alpha.toFixed(2) +
    " · step " + (loop.time.step * 1000).toFixed(1) + " ms";
}, 250);

const controls = createControls(document.getElementById("controls"));
const [playButton] = controls.addButtons([
  { label: "Pause", primary: true },
  { label: "Next frame", onClick: () => { runner.setPlaying(false); clock = nextFrameAt; tick(0); } },
]);
controls.addSlider({ label: "Screen frame rate", min: 10, max: 144, value: 60, unit: " Hz", onChange: (v) => { settings.frameRate = v; } });
controls.addSlider({ label: "Update rate (fixed step)", min: 5, max: 120, value: 20, unit: " Hz", onChange: (v) => { loop.time.step = 1 / v; } });
controls.addSlider({ label: "Frame jitter", min: 0, max: 80, value: 0, unit: " %", onChange: (v) => { settings.jitter = v / 100; } });
controls.addSlider({ label: "Playback speed", min: 5, max: 100, value: 15, unit: " %", onChange: (v) => { settings.playbackSpeed = v / 100; } });

const runner = createRunner(tick, playButton);
window.addEventListener("kindling-theme-change", draw);
