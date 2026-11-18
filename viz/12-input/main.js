// viz/12-input/main.js
// WHAT: A timeline of one action ("jump") over the last 48 game steps: held, pressed, released.
//       Slow the step rate down and tap quickly to see why games ask "was it PRESSED
//       since the last step?" instead of only "is it down right now?".

import { createKeyboard } from "kindling/input/keyboard.js";
import { createMouse } from "kindling/input/mouse.js";
import { createGamepad } from "kindling/input/gamepad.js";
import { createActions } from "kindling/input/actions.js";
import { createLoop } from "kindling/core/loop.js";
import { themeColors, setupCanvas, createRunner, createControls, label } from "../kit.js";

const WIDTH = 720;
const HEIGHT = 240;
const COLUMNS = 48;
const view = setupCanvas(document.getElementById("stage"), WIDTH, HEIGHT);
const context = view.context;
const readout = document.getElementById("readout");

// The devices. The mouse only needs a canvas and a way to convert positions.
const keyboard = createKeyboard(window);
const mouse = createMouse({ canvas: view.canvas, toGamePosition: () => ({ x: 0, y: 0 }) });
const gamepad = createGamepad();
const actions = createActions({ jump: ["Space", "KeyJ", "mouse:0", "pad:A"] }, { keyboard, mouse, gamepad });

const history = [];      // one entry per step: { down, pressed, released }
let stepsPerSecond = 10;
let tapsCaught = 0;
let tapsMissed = 0;

function update() {
  gamepad.update();
  const column = {
    down: actions.isDown("jump"),
    pressed: actions.wasPressed("jump"),
    released: keyboard.wasReleased("Space") || keyboard.wasReleased("KeyJ") || mouse.wasReleased(0),
  };
  // A tap that started AND ended between two steps: down is false, but pressed is true.
  if (column.pressed && !column.down) tapsMissed++;
  if (column.pressed) tapsCaught++;
  history.push(column);
  if (history.length > COLUMNS) history.shift();
  // The important part: forget "pressed" and "released" once every step has seen them.
  keyboard.endStep();
  mouse.endStep();
  actions.endStep();
}

let loop = createLoop({ update, render() {}, stepSeconds: 1 / stepsPerSecond });

function draw() {
  const colors = themeColors();
  context.fillStyle = colors.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const left = 150;
  const columnWidth = (WIDTH - left - 10) / COLUMNS;
  const rows = [
    { name: "isDown", y: 50, key: "down", color: colors.accent2 },
    { name: "wasPressed", y: 110, key: "pressed", color: colors.good },
    { name: "wasReleased", y: 170, key: "released", color: colors.accent },
  ];
  for (const row of rows) {
    label(context, row.name + "()", 12, row.y, colors.text, 14);
    context.strokeStyle = colors.border;
    context.strokeRect(left, row.y - 18, WIDTH - left - 10, 36);
    history.forEach((column, index) => {
      if (!column[row.key]) return;
      context.fillStyle = row.color;
      const x = left + index * columnWidth;
      if (row.key === "down") context.fillRect(x, row.y - 14, columnWidth, 28);
      else context.fillRect(x + columnWidth * 0.2, row.y - 14, Math.max(columnWidth * 0.6, 3), 28);
    });
  }
  label(context, "older steps ←", left, 222, colors.muted, 12);
  label(context, "→ newest step", WIDTH - 10, 222, colors.muted, 12, "right");
  // Step ticks along the top, so you can see each step is one column.
  context.fillStyle = colors.muted;
  for (let i = 0; i <= COLUMNS; i++) context.fillRect(left + i * columnWidth, 22, 1, 6);
  label(context, stepsPerSecond + " steps per second", left, 12, colors.muted, 12);
  readout.textContent = "Presses seen: " + tapsCaught + " · of those, taps too quick for isDown(): " + tapsMissed +
    (gamepad.isConnected() ? " · gamepad connected" : "");
}

const runner = createRunner((seconds) => {
  loop.advance(seconds);
  draw();
});

const controls = createControls(document.getElementById("controls"));
controls.addSlider({
  label: "Steps per second",
  min: 2, max: 60, value: stepsPerSecond,
  onChange(value) {
    stepsPerSecond = value;
    loop = createLoop({ update, render() {}, stepSeconds: 1 / value });
  },
});
const [playButton] = controls.addButtons([{ label: "Pause" }, { label: "Clear", onClick() { history.length = 0; tapsCaught = 0; tapsMissed = 0; } }]);
playButton.addEventListener("click", () => {
  runner.setPlaying(!runner.isPlaying());
  playButton.textContent = runner.isPlaying() ? "Pause" : "Play";
});
playButton.textContent = runner.isPlaying() ? "Pause" : "Play";
// Keep Space from scrolling the page while you try this.
window.addEventListener("keydown", (event) => { if (event.code === "Space" && event.target === document.body) event.preventDefault(); });
draw();
