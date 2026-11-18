// viz/07-tilemap-camera/main.js
// WHAT: A top-down level seen through engine/2d/camera.js, plus a minimap of the whole level.

import { createTilemap } from "kindling/2d/tilemap.js";
import { createCamera } from "kindling/2d/camera.js";
import { createBody, moveAndCollide } from "kindling/2d/physics.js";
import { createKeyboard } from "kindling/input/keyboard.js";
import { createRandom } from "kindling/math/random.js";
import { themeColors, setupCanvas, createRunner, createControls, label } from "../kit.js";

const WIDTH = 720;
const HEIGHT = 330;
const view = setupCanvas(document.getElementById("stage"), WIDTH, HEIGHT);
const context = view.context;
const random = createRandom(11);

// Build a level: walls around the edge, some random rocks and a few long walls.
const columns = 60;
const rows = 34;
const lines = [];
for (let row = 0; row < rows; row++) {
  let line = "";
  for (let column = 0; column < columns; column++) {
    const edge = row === 0 || column === 0 || row === rows - 1 || column === columns - 1;
    const longWall = (row === 12 && column > 8 && column < 30) || (column === 40 && row > 6 && row < 26);
    const rock = random.chance(0.06);
    line += edge || longWall || rock ? "#" : ".";
  }
  lines.push(line);
}
lines[3] = lines[3].slice(0, 3) + "P" + lines[3].slice(4);
const level = createTilemap({ tileSize: 16, rows: lines, solid: "#" });
const start = level.replace("P", ".")[0];

// The game screen is 320 x 180 game pixels, drawn on its own small canvas.
const gameScreen = document.createElement("canvas");
gameScreen.width = 320;
gameScreen.height = 180;
const gameContext = gameScreen.getContext("2d");

const camera = createCamera({ width: 320, height: 180, smoothing: 6, deadZone: { width: 60, height: 40 },
  bounds: { x: 0, y: 0, width: level.width, height: level.height } });
const player = createBody({ x: start.x + 2, y: start.y + 2, width: 12, height: 12 });
camera.centerOn(player.x, player.y);

const keyboard = createKeyboard(view.canvas);
const settings = { showDeadZone: true, showChecks: true, speed: 110 };
let waypoint = { x: 400, y: 300 };

function pickWaypoint() {
  waypoint = { x: random.range(30, level.width - 30), y: random.range(30, level.height - 30) };
}

const step = 1 / 60;
let accumulator = 0;
function update() {
  let moveX = (keyboard.isDown("ArrowRight") || keyboard.isDown("KeyD") ? 1 : 0) - (keyboard.isDown("ArrowLeft") || keyboard.isDown("KeyA") ? 1 : 0);
  let moveY = (keyboard.isDown("ArrowDown") || keyboard.isDown("KeyS") ? 1 : 0) - (keyboard.isDown("ArrowUp") || keyboard.isDown("KeyW") ? 1 : 0);
  if (moveX === 0 && moveY === 0) {
    // Autopilot: walk toward a random point; pick a new one on arrival or when blocked.
    const dx = waypoint.x - player.x;
    const dy = waypoint.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 8) pickWaypoint();
    moveX = dx / (distance || 1);
    moveY = dy / (distance || 1);
  }
  const size = Math.hypot(moveX, moveY) || 1;
  player.velocityX = (moveX / size) * settings.speed;
  player.velocityY = (moveY / size) * settings.speed;
  if (moveAndCollide(player, step, level) && random.chance(0.05)) pickWaypoint();
  camera.follow(player, step);
  camera.update(step);
  keyboard.endStep();
}

function tick(seconds) {
  accumulator += seconds;
  while (accumulator >= step) {
    update();
    accumulator -= step;
  }
  draw();
}

function drawTile(tileContext, character, x, y) {
  if (character === "#") {
    tileContext.fillStyle = "#5b6178";
    tileContext.fillRect(x, y, 16, 16);
    tileContext.fillStyle = "#454a5e";
    tileContext.fillRect(x, y + 12, 16, 4);
  } else {
    tileContext.fillStyle = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? "#2a2f3d" : "#2e3443";
    tileContext.fillRect(x, y, 16, 16);
  }
}

function draw() {
  const colors = themeColors();
  context.fillStyle = colors.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // 1. The game view, drawn through the camera onto the small canvas.
  gameContext.fillStyle = "#1b1e27";
  gameContext.fillRect(0, 0, 320, 180);
  camera.begin(gameContext);
  level.draw(gameContext, drawTile, camera.view());
  if (settings.showChecks) {
    gameContext.strokeStyle = "#ff6b6b";
    const area = { x: player.x - 2, y: player.y - 2, width: player.width + 4, height: player.height + 4 };
    for (const tile of level.solidsNear(area)) gameContext.strokeRect(tile.x + 0.5, tile.y + 0.5, 15, 15);
  }
  gameContext.fillStyle = "#6cb6ff";
  gameContext.fillRect(Math.round(player.x), Math.round(player.y), player.width, player.height);
  camera.end(gameContext);
  if (settings.showDeadZone) {
    gameContext.strokeStyle = "#6fd08c";
    gameContext.setLineDash([3, 3]);
    gameContext.strokeRect(160 - camera.deadZone.width / 2 + 0.5, 90 - camera.deadZone.height / 2 + 0.5, camera.deadZone.width, camera.deadZone.height);
    gameContext.setLineDash([]);
  }
  context.imageSmoothingEnabled = false;
  label(context, "What the player sees (320 x 180)", 16, 18, colors.muted, 13);
  context.drawImage(gameScreen, 16, 34, 400, 225);
  context.strokeStyle = colors.border;
  context.strokeRect(16, 34, 400, 225);

  // 2. The minimap: the whole level, with the camera rectangle on top.
  const mapX = 440;
  const mapY = 34;
  const scale = 264 / level.width;
  label(context, "The whole level (camera in orange)", mapX, 18, colors.muted, 13);
  level.draw(context, (c, character, x, y) => {
    c.fillStyle = character === "#" ? colors.muted : colors.background;
    c.fillRect(mapX + x * scale, mapY + y * scale, 16 * scale + 0.5, 16 * scale + 0.5);
  });
  context.strokeStyle = colors.border;
  context.strokeRect(mapX, mapY, level.width * scale, level.height * scale);
  context.fillStyle = colors.accent2;
  context.fillRect(mapX + player.x * scale - 2, mapY + player.y * scale - 2, 5, 5);
  const visible = camera.view();
  context.strokeStyle = colors.accent;
  context.lineWidth = 2;
  context.strokeRect(mapX + visible.x * scale, mapY + visible.y * scale, visible.width * scale, visible.height * scale);
  context.lineWidth = 1;
  label(context, "camera x " + camera.x.toFixed(0) + ", y " + camera.y.toFixed(0), mapX, mapY + level.height * scale + 20, colors.text, 13);
}

const controls = createControls(document.getElementById("controls"));
const [playButton] = controls.addButtons([
  { label: "Pause", primary: true },
  { label: "Shake!", onClick: () => camera.shake(6, 0.4) },
]);
controls.addSlider({ label: "Smoothing (0 = snap)", min: 0, max: 20, value: 6, onChange: (v) => { camera.smoothing = v; } });
controls.addSlider({ label: "Dead zone width", min: 0, max: 200, step: 10, value: 60, unit: " px", onChange: (v) => { camera.deadZone.width = v; } });
controls.addSlider({ label: "Dead zone height", min: 0, max: 120, step: 10, value: 40, unit: " px", onChange: (v) => { camera.deadZone.height = v; } });
controls.addSlider({ label: "Zoom", min: 0.5, max: 2, step: 0.25, value: 1, unit: "x", onChange: (v) => { camera.zoom = v; } });
controls.addToggle("Show dead zone", true, (v) => { settings.showDeadZone = v; });
controls.addToggle("Show tiles checked for collision", true, (v) => { settings.showChecks = v; });

document.getElementById("readout").textContent = "Tip: click the picture, then steer with the arrow keys or WASD. Let go and it walks by itself.";
view.canvas.addEventListener("pointerdown", () => view.canvas.focus());
createRunner(tick, playButton);
window.addEventListener("kindling-theme-change", draw);
