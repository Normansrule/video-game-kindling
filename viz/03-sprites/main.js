// viz/03-sprites/main.js
// WHAT: Shows the whole sprite sheet with the current frame highlighted, and the
//       animated character drawn big next to it.

import { loadImage } from "kindling/core/assets.js";
import { createSpriteSheet } from "kindling/2d/sprite.js";
import { createAnimation } from "kindling/2d/animation.js";
import { themeColors, setupCanvas, createRunner, createControls, label } from "../kit.js";

const WIDTH = 720;
const HEIGHT = 320;
const view = setupCanvas(document.getElementById("stage"), WIDTH, HEIGHT);
const context = view.context;

const image = await loadImage("../../assets/sprites/hero.png");
const sheet = createSpriteSheet(image, 16, 16);

const animations = {
  idle: createAnimation([0, 1], 3),
  run: createAnimation([2, 3, 4, 5], 10),
  "jump then fall": createAnimation([6, 6, 7, 7], 4),
};
const state = { name: "run", flip: false, scale: 8 };

function tick(seconds) {
  animations[state.name].update(seconds);
  draw();
}

function draw() {
  const colors = themeColors();
  context.fillStyle = colors.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.imageSmoothingEnabled = false;   // keep pixel art crisp

  // The sheet, 4x bigger, with a grid and frame numbers.
  const sheetScale = 4;
  const sheetX = 20;
  const sheetY = 50;
  label(context, "Sprite sheet: hero.png (8 frames of 16 x 16)", sheetX, 24, colors.muted);
  context.drawImage(image, sheetX, sheetY, image.width * sheetScale, image.height * sheetScale);
  const frameSize = 16 * sheetScale;
  const current = animations[state.name].frame();
  for (let index = 0; index < sheet.frameCount; index++) {
    const x = sheetX + index * frameSize;
    context.strokeStyle = index === current ? colors.accent : colors.border;
    context.lineWidth = index === current ? 4 : 1;
    context.strokeRect(x + 1, sheetY + 1, frameSize - 2, frameSize - 2);
    label(context, String(index), x + frameSize / 2, sheetY + frameSize + 14, index === current ? colors.accent : colors.muted, 13, "center");
  }

  // The frame list for this animation.
  const frames = animations[state.name].frames;
  label(context, state.name + " = [" + frames.join(", ") + "]", sheetX, sheetY + frameSize + 50, colors.text, 16);
  label(context, "now showing frame " + current, sheetX, sheetY + frameSize + 76, colors.accent, 16);

  // The animated character, big.
  const bigX = 625;
  const bigY = 290;
  context.strokeStyle = colors.border;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(bigX - 80, bigY);
  context.lineTo(bigX + 80, bigY);
  context.stroke();
  sheet.draw(context, current, bigX, bigY, { scale: state.scale, flipX: state.flip, originX: 0.5, originY: 1 });
}

const controls = createControls(document.getElementById("controls"));
const [playButton] = controls.addButtons([{ label: "Pause", primary: true }]);
controls.addSelect("Animation", Object.keys(animations), state.name, (value) => { state.name = value; animations[value].reset(); });
controls.addSlider({ label: "Frames per second", min: 1, max: 24, value: 10, onChange: (value) => {
  for (const name in animations) animations[name].framesPerSecond = name === "run" ? value : Math.max(1, Math.round(value / 3));
} });
controls.addSlider({ label: "Scale", min: 2, max: 10, value: 8, unit: "x", onChange: (value) => { state.scale = value; } });
controls.addToggle("Flip horizontally (face left)", false, (value) => { state.flip = value; });

const readout = document.getElementById("readout");
setInterval(() => {
  readout.textContent = "Frame " + animations[state.name].frame() + " · " + animations[state.name].framesPerSecond + " frames per second";
}, 200);

createRunner(tick, playButton);
window.addEventListener("kindling-theme-change", draw);
