// samples/modes/01-one-world/main.js
// WHAT: Walk around a generated island and collect coins, in any of five views:
//       2D map, 2.5D isometric, 2.5D raycaster, 3D third person, 3D first person.
// WHY:  Shows the most important idea in Kindling 2: keep the GAME (world, player,
//       rules) separate from the VIEW (how it is drawn). Everything above the
//       "draw" section works without knowing which view is on screen.
// TEACHES: world/voxel-world, world/generate, world/walker, views/world-view.
// README: samples/modes/01-one-world/README.md

import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { generateIsland } from "kindling/world/generate.js";
import { createWalker, updateWalker, wishFromYaw } from "kindling/world/walker.js";
import { createWorldView, VIEW_MODES, VIEW_LABELS } from "kindling/views/world-view.js";
import { createKeyboard } from "kindling/input/keyboard.js";
import { createActions } from "kindling/input/actions.js";
import { createLoop } from "kindling/core/loop.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { createRandom } from "kindling/math/random.js";

// ---------- The game: data and rules (no drawing here) ----------

const world = createVoxelWorld(64, 40, 64);
const island = generateIsland(world, { seed: 3 });
const player = createWalker(island.spawn);
player.walkCycle = 0;

// Put 8 coins on random dry ground.
const random = createRandom(11);
while (world.props.length < 8) {
  const x = random.int(8, 55);
  const z = random.int(8, 55);
  const ground = world.groundHeight(x, z);
  if (ground > island.seaLevel + 1) world.props.push({ kind: "coin", x: x + 0.5, y: ground, z: z + 0.5 });
}
let coins = 0;

const keyboard = createKeyboard();
const actions = createActions({
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  turnLeft: ["KeyQ"],
  turnRight: ["KeyE"],
  jump: ["Space"],
}, { keyboard });
const audio = createAudio();

// In the overhead views, keys move in SCREEN directions. In the first-person and
// third-person views, W walks where you face and A/D turn.
function readMovement(mode) {
  const forward = actions.axis("back", "forward");
  const side = actions.axis("left", "right");
  const turn = actions.axis("turnLeft", "turnRight");
  if (mode === "2d") {
    player.wishX = side;
    player.wishZ = -forward;
  } else if (mode === "iso") {
    // Screen up is north-west in the isometric world: rotate input by 45 degrees.
    player.wishX = (side - forward) * Math.SQRT1_2;
    player.wishZ = (-side - forward) * Math.SQRT1_2;
  } else {
    player.yaw -= (side + turn) * 0.045;
    wishFromYaw(player, forward, 0);
    return;
  }
  player.yaw -= turn * 0.045;
  // Face the way you walk.
  if (player.wishX !== 0 || player.wishZ !== 0) player.yaw = Math.atan2(-player.wishX, -player.wishZ);
}

function update(stepSeconds) {
  readMovement(view.mode);
  player.wantsJump = actions.isDown("jump");
  updateWalker(world, player, stepSeconds);
  const moving = player.wishX !== 0 || player.wishZ !== 0;
  player.walkCycle = moving && player.onGround ? player.walkCycle + stepSeconds * 10 : 0;

  for (const coin of world.props) {
    if (coin.hidden) continue;
    if (Math.hypot(coin.x - player.x, coin.z - player.z) < 0.8 && Math.abs(coin.y - player.y) < 1.5) {
      coin.hidden = true;
      coins = coins + 1;
      playSfx(audio, "coin");
      hud.textContent = coins === 8 ? "All 8 coins! Try another view." : "Coins " + coins + " / 8";
    }
  }
  keyboard.endStep();
  actions.endStep();
}

// ---------- The view: everything below only DRAWS ----------

const hud = document.getElementById("hud");
const view = createWorldView({
  container: "#stage",
  world,
  mode: new URLSearchParams(location.search).get("mode") || "iso",
  seaLevel: island.seaLevel,
  label: "A small blocky island with a village, trees and gold coins.",
});

let time = 0;
function render() {
  view.render(player, time);
}

// Mode buttons, built from the list of modes, plus number keys 1 to 5.
const buttons = document.getElementById("modes");
for (const mode of VIEW_MODES) {
  const button = document.createElement("button");
  button.className = "k-tab";
  button.textContent = VIEW_MODES.indexOf(mode) + 1 + " · " + VIEW_LABELS[mode];
  button.addEventListener("click", () => chooseMode(mode));
  buttons.appendChild(button);
}
function chooseMode(mode) {
  view.setMode(mode);
  if (view.renderer) view.renderer.settings.timeOfDay = Number(timeSlider.value);
  for (const button of buttons.children) button.setAttribute("aria-pressed", String(button.textContent.includes(VIEW_LABELS[mode])));
  view.canvas.focus();
}
window.addEventListener("keydown", (event) => {
  const index = Number(event.key) - 1;
  if (index >= 0 && index < VIEW_MODES.length) chooseMode(VIEW_MODES[index]);
});

const timeSlider = document.getElementById("time");
timeSlider.addEventListener("input", () => {
  if (view.renderer) view.renderer.settings.timeOfDay = Number(timeSlider.value);
});

// Touch: the on-screen pad pretends to be the keyboard.
for (const button of document.querySelectorAll("#pad button")) {
  const code = button.dataset.key;
  button.addEventListener("pointerdown", () => window.dispatchEvent(new KeyboardEvent("keydown", { code })));
  button.addEventListener("pointerup", () => window.dispatchEvent(new KeyboardEvent("keyup", { code })));
  button.addEventListener("pointerleave", () => window.dispatchEvent(new KeyboardEvent("keyup", { code })));
}

chooseMode(view.mode);
const loop = createLoop({
  update(stepSeconds) { time += stepSeconds; update(stepSeconds); },
  render,
});
loop.start();
