// samples/3d/06-island-builder/main.js
// WHAT: A first-person block sandbox. Walk around a generated island, break and
//       place blocks, and watch a full day pass (lanterns glow at night).
// WHY:  The flagship of the Kindling 2 3D look. It shows how little game code a
//       block game needs once the engine owns the world and the rendering:
//         - the world is world/voxel-world.js (a Uint8Array of block ids)
//         - walking is world/walker.js
//         - "what am I looking at?" is raycastVoxels (a grid walk, like the raycaster)
//         - drawing is 3d/world-renderer.js (it rebuilds only the chunk you edit)
// TEACHES: pointer lock mouse look, voxel picking, editing a world live, time of day.
// README: samples/3d/06-island-builder/README.md

import { createGL } from "kindling/3d/gl.js";
import { createWorldRenderer } from "kindling/3d/world-renderer.js";
import { createFirstPersonCamera } from "kindling/3d/camera3d.js";
import { createVoxelWorld, raycastVoxels } from "kindling/world/voxel-world.js";
import { generateIsland } from "kindling/world/generate.js";
import { BLOCK, blockType, blockTypes } from "kindling/world/blocks.js";
import { textureCanvases } from "kindling/world/textures.js";
import { createWalker, updateWalker, wishFromYaw, collides } from "kindling/world/walker.js";
import { createKeyboard } from "kindling/input/keyboard.js";
import { createLoop } from "kindling/core/loop.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { createStorage } from "kindling/core/storage.js";

const REACH = 6;                    // blocks you can reach
const DAY_SECONDS = 240;            // one full day at speed 1
const HOTBAR = [BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.PLANKS, BLOCK.LOG, BLOCK.BRICK, BLOCK.ROOF, BLOCK.LEAVES, BLOCK.LANTERN];

// ---------- World and player ----------
const world = createVoxelWorld(80, 44, 80);
const island = generateIsland(world, { seed: 21 });
const player = createWalker(island.spawn);
player.pitch = -0.15;
player.yaw += Math.PI / 2;         // start facing a house front, not a wall
let selected = 3;                   // index into HOTBAR

// ---------- Screen and renderer ----------
const stage = document.getElementById("stage");
const canvas = document.createElement("canvas");
canvas.setAttribute("aria-label", "First-person view of a blocky island with trees, houses and the sea.");
canvas.style.cssText = "display:block;width:100%;aspect-ratio:16/9;outline:none";
stage.prepend(canvas);
const screen = createGL({ canvas, width: 960, height: 540, fit: false });
screen.destroy();                   // we size the canvas ourselves below
function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * ratio);
  canvas.height = Math.round(canvas.clientWidth * 9 / 16 * ratio);
}
resize();
window.addEventListener("resize", resize);
const renderer = createWorldRenderer(screen, { timeOfDay: 0.3, shadowRadius: 40 });
renderer.setWorld(world);
renderer.setOcean(island.seaLevel);
const camera = createFirstPersonCamera({ fieldOfView: 1.25, far: 500 });
const audio = createAudio();
const keyboard = createKeyboard();
const hud = document.getElementById("hud");

// ---------- Mouse look with pointer lock ----------
// Pointer lock hides the cursor and reports raw movement, so you can turn forever.
canvas.addEventListener("click", () => { if (document.pointerLockElement !== canvas) canvas.requestPointerLock(); });
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas) return;
  player.yaw -= event.movementX * 0.0025;
  player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch - event.movementY * 0.0025));
});
canvas.addEventListener("mousedown", (event) => {
  if (document.pointerLockElement !== canvas) return;
  if (event.button === 0) breakBlock();
  if (event.button === 2) placeBlock();
});

// ---------- Building ----------
function lookTarget() {
  camera.position = { x: player.x, y: player.y + 1.6, z: player.z };
  camera.yaw = player.yaw;
  camera.pitch = player.pitch;
  return raycastVoxels(world, camera.position, camera.forward(), REACH);
}

function breakBlock() {
  const hit = lookTarget();
  if (!hit) return;
  world.set(hit.x, hit.y, hit.z, BLOCK.AIR);
  playSfx(audio, "hit", 0.15);
}

function placeBlock() {
  const hit = lookTarget();
  if (!hit) return;
  // Place on the face we hit: one step back along that face's normal.
  const x = hit.x + hit.normal.x;
  const y = hit.y + hit.normal.y;
  const z = hit.z + hit.normal.z;
  world.set(x, y, z, HOTBAR[selected]);
  // Don't bury yourself: undo the placement if it overlaps the player.
  if (collides(world, player, player.x, player.y, player.z)) world.set(x, y, z, BLOCK.AIR);
  else playSfx(audio, "blip", 0.1);
}

// ---------- Hotbar (HTML buttons with the block's texture) ----------
const hotbar = document.getElementById("hotbar");
const textures = textureCanvases();
HOTBAR.forEach((id, index) => {
  const button = document.createElement("button");
  button.className = "slot";
  const icon = document.createElement("canvas");
  icon.width = 16;
  icon.height = 16;
  button.append(icon, String(index + 1));
  button.addEventListener("click", () => select(index));
  hotbar.appendChild(button);
  paintSlot(index);
});
function paintSlot(index) {
  const button = hotbar.children[index];
  const icon = button.querySelector("canvas").getContext("2d");
  icon.clearRect(0, 0, 16, 16);
  icon.drawImage(textures[blockType(HOTBAR[index]).side], 0, 0);
  button.title = blockType(HOTBAR[index]).name;
}
// [ and ] (or the mouse wheel) swap the selected slot through every block in the library.
const ALL_BLOCKS = blockTypes.filter((type) => type.id !== BLOCK.AIR && type.id !== BLOCK.WATER).map((type) => type.id);
function cycle(direction) {
  const at = ALL_BLOCKS.indexOf(HOTBAR[selected]);
  HOTBAR[selected] = ALL_BLOCKS[(at + direction + ALL_BLOCKS.length) % ALL_BLOCKS.length];
  paintSlot(selected);
  hud.textContent = "Slot " + (selected + 1) + ": " + blockType(HOTBAR[selected]).name.replace(/_/g, " ");
}
window.addEventListener("wheel", (event) => cycle(Math.sign(event.deltaY)), { passive: true });
function select(index) {
  selected = index;
  [...hotbar.children].forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
}
select(selected);
window.addEventListener("keydown", (event) => {
  const number = Number(event.key);
  if (number >= 1 && number <= HOTBAR.length) select(number - 1);
  if (event.code === "KeyF") placeBlock();
  if (event.code === "BracketRight") cycle(1);
  if (event.code === "BracketLeft") cycle(-1);
});

// ---------- Save and load (press K to save, L to load) ----------
const storage = createStorage("kindling-island-builder");
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyK") { storage.save("world", Array.from(world.blocks)); hud.textContent = "Saved"; }
  if (event.code === "KeyL") {
    const saved = storage.load("world");
    if (saved) { world.blocks.set(saved); renderer.setWorld(world); hud.textContent = "Loaded"; }
  }
});

// ---------- The loop ----------
const speedSlider = document.getElementById("speed");
let time = 0;
function update(stepSeconds) {
  const forward = (keyboard.isDown("KeyW") || keyboard.isDown("ArrowUp") ? 1 : 0) - (keyboard.isDown("KeyS") || keyboard.isDown("ArrowDown") ? 1 : 0);
  const right = (keyboard.isDown("KeyD") || keyboard.isDown("ArrowRight") ? 1 : 0) - (keyboard.isDown("KeyA") || keyboard.isDown("ArrowLeft") ? 1 : 0);
  wishFromYaw(player, forward, right);
  player.wantsJump = keyboard.isDown("Space");
  updateWalker(world, player, stepSeconds);
  time += stepSeconds;
  renderer.settings.timeOfDay = (renderer.settings.timeOfDay + stepSeconds * Number(speedSlider.value) / DAY_SECONDS) % 1;
  keyboard.endStep();
}

function render() {
  const hit = lookTarget();
  renderer.render(camera, time);
  const hour = Math.floor(renderer.settings.timeOfDay * 24);
  const looking = hit ? " · looking at " + blockType(hit.id).name : "";
  if (document.pointerLockElement === canvas) hud.textContent = String(hour).padStart(2, "0") + ":00" + looking;
}

createLoop({ update, render }).start();
