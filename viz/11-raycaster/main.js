// viz/11-raycaster/main.js
// WHAT: Left: the grid map from above with every ray drawn. Right: the 3D view.

import { castRays, drawRaycastView, moveInGrid } from "kindling/3d/raycaster.js";
import { createKeyboard } from "kindling/input/keyboard.js";
import { degreesToRadians } from "kindling/math/scalar.js";
import { themeColors, setupCanvas, createRunner, createControls, label } from "../kit.js";

const WIDTH = 720;
const HEIGHT = 330;
const view = setupCanvas(document.getElementById("stage"), WIDTH, HEIGHT);
const context = view.context;

const MAP = [
  "################",
  "#..............#",
  "#..##......22..#",
  "#..#.......22..#",
  "#..............#",
  "#......1.......#",
  "#......1...#####",
  "#..........#...#",
  "#..33......#...#",
  "#..........#...#",
  "#..............#",
  "################",
];
const WALL_COLORS = { "#": "#8d93a3", 1: "#d9822b", 2: "#3e8ede", 3: "#3fa66a" };

const player = { x: 5.5, y: 9.5, angle: -1.2 };
const settings = { fieldOfView: degreesToRadians(66), rays: 120, fixFisheye: true, autoTurn: true };
const keyboard = createKeyboard(view.canvas);

// The 3D view is drawn on its own small canvas and then scaled into place.
const viewWidth = 320;
const viewHeight = 240;
const view3d = document.createElement("canvas");
view3d.width = viewWidth;
view3d.height = viewHeight;
const view3dContext = view3d.getContext("2d");

function tick(seconds) {
  const turn = (keyboard.isDown("ArrowRight") || keyboard.isDown("KeyD") ? 1 : 0) - (keyboard.isDown("ArrowLeft") || keyboard.isDown("KeyA") ? 1 : 0);
  const walk = (keyboard.isDown("ArrowUp") || keyboard.isDown("KeyW") ? 1 : 0) - (keyboard.isDown("ArrowDown") || keyboard.isDown("KeyS") ? 1 : 0);
  if (turn === 0 && walk === 0 && settings.autoTurn) player.angle += seconds * 0.35;
  player.angle += turn * 2.2 * seconds;
  const speed = walk * 2.5 * seconds;
  moveInGrid(MAP, player, Math.cos(player.angle) * speed, Math.sin(player.angle) * speed);
  draw();
}

function draw() {
  const colors = themeColors();
  context.fillStyle = colors.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const hits = castRays(MAP, player, settings.fieldOfView, settings.rays, settings.fixFisheye);

  // Map from above.
  const cell = 18;
  const mapX = 16;
  const mapY = 34;
  label(context, "Map from above", mapX, 18, colors.muted, 13);
  for (let row = 0; row < MAP.length; row++) {
    for (let column = 0; column < MAP[row].length; column++) {
      const character = MAP[row][column];
      if (character === ".") continue;
      context.fillStyle = WALL_COLORS[character];
      context.fillRect(mapX + column * cell, mapY + row * cell, cell - 1, cell - 1);
    }
  }
  context.strokeStyle = colors.accent;
  context.globalAlpha = 0.5;
  context.lineWidth = 1;
  context.beginPath();
  const step = Math.max(1, Math.floor(hits.length / 60));   // draw at most ~60 rays so it stays readable
  for (let i = 0; i < hits.length; i += step) {
    const hit = hits[i];
    if (!hit) continue;
    context.moveTo(mapX + player.x * cell, mapY + player.y * cell);
    context.lineTo(mapX + hit.hitX * cell, mapY + hit.hitY * cell);
  }
  context.stroke();
  context.globalAlpha = 1;
  context.fillStyle = colors.accent2;
  context.beginPath();
  context.arc(mapX + player.x * cell, mapY + player.y * cell, 5, 0, Math.PI * 2);
  context.fill();

  // The 3D view.
  drawRaycastView(view3dContext, hits, viewWidth, viewHeight, { wallColors: WALL_COLORS });
  const viewX = 330;
  label(context, "What the player sees (" + settings.rays + " rays = " + settings.rays + " stripes)", viewX, 18, colors.muted, 13);
  context.imageSmoothingEnabled = false;
  context.drawImage(view3d, viewX, mapY, 374, 280);
}

const controls = createControls(document.getElementById("controls"));
const [playButton] = controls.addButtons([{ label: "Pause", primary: true }]);
controls.addSlider({ label: "Field of view", min: 30, max: 120, value: 66, unit: "°", onChange: (v) => { settings.fieldOfView = degreesToRadians(v); } });
controls.addSlider({ label: "Number of rays", min: 8, max: 320, value: 120, onChange: (v) => { settings.rays = v; } });
controls.addToggle("Fix fisheye", true, (v) => { settings.fixFisheye = v; });
controls.addToggle("Turn slowly by itself", true, (v) => { settings.autoTurn = v; });

document.getElementById("readout").textContent = "Tip: click the picture, then walk with the arrow keys or WASD.";
view.canvas.addEventListener("pointerdown", () => view.canvas.focus());
createRunner(tick, playButton);
window.addEventListener("kindling-theme-change", draw);
