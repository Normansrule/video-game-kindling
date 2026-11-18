// viz/06-physics/main.js
// WHAT: A player body on platforms (with a one-way platform) and bouncing balls.
//       Uses the same engine input (keyboard + actions) a real game would.

import { createBody, moveAndCollide, createSolids, keepInside, bounceCircles } from "kindling/2d/physics.js";
import { createKeyboard } from "kindling/input/keyboard.js";
import { createActions } from "kindling/input/actions.js";
import { approach } from "kindling/math/scalar.js";
import { createRandom } from "kindling/math/random.js";
import { themeColors, setupCanvas, createRunner, createControls, label } from "../kit.js";

const WIDTH = 720;
const HEIGHT = 360;
const view = setupCanvas(document.getElementById("stage"), WIDTH, HEIGHT);
const context = view.context;
const random = createRandom(3);

const settings = { gravity: 900, jumpSpeed: 380, runSpeed: 180, ballBounce: 0.8, showArrows: true };

const level = createSolids([
  { x: 0, y: 330, width: WIDTH, height: 30 },             // floor
  { x: 80, y: 250, width: 140, height: 14 },
  { x: 300, y: 200, width: 130, height: 14, oneWay: true },
  { x: 500, y: 140, width: 140, height: 14 },
  { x: 660, y: 230, width: 60, height: 100 },             // wall on the right
]);

const player = createBody({ x: 40, y: 280, width: 22, height: 28, gravity: settings.gravity });
const balls = [];
function addBall() {
  balls.push({ x: random.range(100, 600), y: 40, radius: random.range(10, 20), velocityX: random.range(-150, 150), velocityY: 0, mass: 1 });
  if (balls.length > 12) balls.shift();
}
for (let i = 0; i < 4; i++) addBall();

// Input: keyboard plus on-screen buttons (for phones).
const keyboard = createKeyboard(view.canvas);
const touchHeld = { left: false, right: false, jump: false };
const actions = createActions({
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  jump: ["Space", "ArrowUp", "KeyW"],
}, { keyboard });

let jumpWasHeld = false;
const trail = [];
const step = 1 / 120;
let accumulator = 0;

function update(stepSeconds) {
  // Player: run toward the target speed, jump when on the ground.
  let direction = actions.axis("left", "right");
  if (touchHeld.left) direction = -1;
  if (touchHeld.right) direction = 1;
  player.velocityX = approach(player.velocityX, direction * settings.runSpeed, 1400 * stepSeconds);
  const jumpHeld = actions.isDown("jump") || touchHeld.jump;
  const jumpPressed = actions.wasPressed("jump") || (touchHeld.jump && !jumpWasHeld);
  jumpWasHeld = jumpHeld;
  if (jumpPressed && player.onGround) player.velocityY = -settings.jumpSpeed;
  player.gravity = settings.gravity;
  moveAndCollide(player, stepSeconds, level);
  keepInside(player, { x: 0, y: -200, width: WIDTH, height: HEIGHT + 200 });

  // Balls: gravity, walls, floor and each other.
  for (const ball of balls) {
    ball.velocityY += settings.gravity * stepSeconds;
    ball.x += ball.velocityX * stepSeconds;
    ball.y += ball.velocityY * stepSeconds;
    const asBody = { x: ball.x - ball.radius, y: ball.y - ball.radius, width: ball.radius * 2, height: ball.radius * 2,
      velocityX: ball.velocityX, velocityY: ball.velocityY, bounce: settings.ballBounce };
    keepInside(asBody, { x: 0, y: -500, width: WIDTH, height: 330 + 500 });
    ball.x = asBody.x + ball.radius;
    ball.y = asBody.y + ball.radius;
    ball.velocityX = asBody.velocityX * 0.999;
    ball.velocityY = asBody.velocityY;
  }
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) bounceCircles(balls[i], balls[j], settings.ballBounce);
  }
  keyboard.endStep();
  actions.endStep();
}

function tick(seconds) {
  accumulator += seconds;
  while (accumulator >= step) {
    update(step);
    accumulator -= step;
  }
  if (seconds > 0) {
    trail.push({ x: player.x + player.width / 2, y: player.y + player.height });
    if (trail.length > 60) trail.shift();
  }
  draw();
}

function arrow(x, y, velocityX, velocityY, color) {
  const scale = 0.15;
  const endX = x + velocityX * scale;
  const endY = y + velocityY * scale;
  if (Math.hypot(endX - x, endY - y) < 3) return;
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(endX, endY);
  context.stroke();
  const angle = Math.atan2(endY - y, endX - x);
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(endX - 8 * Math.cos(angle - 0.5), endY - 8 * Math.sin(angle - 0.5));
  context.moveTo(endX, endY);
  context.lineTo(endX - 8 * Math.cos(angle + 0.5), endY - 8 * Math.sin(angle + 0.5));
  context.stroke();
}

function draw() {
  const colors = themeColors();
  context.fillStyle = colors.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  for (const solid of level.rects) {
    context.fillStyle = solid.oneWay ? colors.good : colors.muted;
    context.globalAlpha = solid.oneWay ? 0.8 : 0.45;
    context.fillRect(solid.x, solid.y, solid.width, solid.height);
  }
  context.globalAlpha = 1;
  // Jump trail.
  context.fillStyle = colors.accent2;
  for (let i = 0; i < trail.length; i += 3) context.fillRect(trail[i].x - 1, trail[i].y - 1, 2, 2);
  for (const ball of balls) {
    context.strokeStyle = colors.text;
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    context.stroke();
    if (settings.showArrows) arrow(ball.x, ball.y, ball.velocityX, ball.velocityY, colors.accent);
  }
  context.fillStyle = colors.accent2;
  context.fillRect(player.x, player.y, player.width, player.height);
  if (settings.showArrows) arrow(player.x + player.width / 2, player.y + player.height / 2, player.velocityX, player.velocityY, colors.accent);
  label(context, player.onGround ? "on ground" : "in the air", 16, 20, colors.muted, 14);
}

const readout = document.getElementById("readout");
setInterval(() => {
  readout.textContent = "Player velocity x " + player.velocityX.toFixed(0) + ", y " + player.velocityY.toFixed(0) + " px/s";
}, 200);

const controls = createControls(document.getElementById("controls"));
const buttons = controls.addButtons([
  { label: "Pause", primary: true },
  { label: "Drop a ball", onClick: addBall },
  { label: "← Left" }, { label: "Jump" }, { label: "Right →" },
]);
// Hold-to-press buttons for touch screens.
function holdButton(button, key) {
  button.addEventListener("pointerdown", () => { touchHeld[key] = true; });
  for (const name of ["pointerup", "pointerleave", "pointercancel"]) button.addEventListener(name, () => { touchHeld[key] = false; });
}
holdButton(buttons[2], "left");
holdButton(buttons[3], "jump");
holdButton(buttons[4], "right");
controls.addSlider({ label: "Gravity", min: 100, max: 2000, step: 50, value: settings.gravity, unit: " px/s²", onChange: (v) => { settings.gravity = v; } });
controls.addSlider({ label: "Jump speed", min: 100, max: 700, step: 10, value: settings.jumpSpeed, unit: " px/s", onChange: (v) => { settings.jumpSpeed = v; } });
controls.addSlider({ label: "Ball bounce", min: 0, max: 1, step: 0.05, value: settings.ballBounce, onChange: (v) => { settings.ballBounce = v; } });
controls.addToggle("Show velocity arrows", true, (v) => { settings.showArrows = v; });

createRunner(tick, buttons[0]);
view.canvas.addEventListener("pointerdown", () => view.canvas.focus());
window.addEventListener("kindling-theme-change", draw);
