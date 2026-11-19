// templates/3d-adventure/main.js
// WHAT: A third-person 3D adventure on a generated block island. Find all the
//       crystals as fast as you can. Your character is the first one you saved in
//       the character designer (or the default hero).
// WHY:  The smallest complete 3D game: a world (voxel grid), a player that walks and
//       jumps in it (walker), things to find (props), and a view that draws it all
//       with the stylized renderer. Swap the view mode and the same game is 2.5D.
// GROW IT: a different seed for a new island, enemies that walk with createWalker,
//       building and breaking blocks (see samples/3d/06-island-builder), or a day
//       and night cycle with view.renderer.settings.timeOfDay.

import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { generateIsland } from "kindling/world/generate.js";
import { createWalker, updateWalker, wishFromYaw } from "kindling/world/walker.js";
import { createWorldView } from "kindling/views/world-view.js";
import { createKeyboard } from "kindling/input/keyboard.js";
import { createActions } from "kindling/input/actions.js";
import { createLoop } from "kindling/core/loop.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { createRandom } from "kindling/math/random.js";
import { createStorage } from "kindling/core/storage.js";
import { normalizeCharacter } from "kindling/characters/character-spec.js";

const CRYSTALS = 10;
const CAMERAS = ["3d", "3d-fps", "iso"];

// ---------- The game ----------
const world = createVoxelWorld(72, 44, 72);
const island = generateIsland(world, { seed: 21, village: true });
const player = createWalker(island.spawn);
player.walkCycle = 0;

// Crystals on dry ground, at least 10 blocks apart so you have to explore.
const random = createRandom(5);
while (world.props.length < CRYSTALS) {
  const x = random.int(6, 65), z = random.int(6, 65);
  const ground = world.groundHeight(x, z);
  const farEnough = world.props.every((prop) => Math.hypot(prop.x - x, prop.z - z) > 10);
  if (ground > island.seaLevel + 1 && farEnough) world.props.push({ kind: "crystal", x: x + 0.5, y: ground, z: z + 0.5 });
}
let found = 0, clock = 0, finished = false;
const best = createStorage("kindling-3d-adventure");

const keyboard = createKeyboard();
const actions = createActions({
  forward: ["KeyW", "ArrowUp"], back: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
  turnLeft: ["KeyQ"], turnRight: ["KeyE"], jump: ["Space"],
}, { keyboard });
const audio = createAudio();

function update(step) {
  const forward = actions.axis("back", "forward");
  const side = actions.axis("left", "right");
  const turn = actions.axis("turnLeft", "turnRight");
  if (view.mode === "iso") {
    // Isometric: keys move in screen directions (screen up is north-west).
    player.wishX = (side - forward) * Math.SQRT1_2;
    player.wishZ = (-side - forward) * Math.SQRT1_2;
    if (player.wishX || player.wishZ) player.yaw = Math.atan2(-player.wishX, -player.wishZ);
  } else {
    player.yaw -= (side + turn) * 0.045;   // A and D turn, W walks where you face
    wishFromYaw(player, forward, 0);
  }
  player.wantsJump = actions.isDown("jump");
  updateWalker(world, player, step);
  const moving = player.wishX !== 0 || player.wishZ !== 0;
  player.walkCycle = moving && player.onGround ? player.walkCycle + step * 10 : 0;
  if (player.y < island.seaLevel - 6) Object.assign(player, island.spawn);   // fell off: back to the start

  if (!finished) clock += step;
  for (const crystal of world.props) {
    if (crystal.hidden || Math.hypot(crystal.x - player.x, crystal.z - player.z) > 0.9 || Math.abs(crystal.y - player.y) > 1.6) continue;
    crystal.hidden = true;
    found++;
    playSfx(audio, found === CRYSTALS ? "powerup" : "coin");
    if (found === CRYSTALS) {
      finished = true;
      if (!best.load("best", 0) || clock < best.load("best", 0)) best.save("best", clock);
    }
  }
  hud.textContent = finished
    ? "All " + CRYSTALS + " crystals in " + clock.toFixed(1) + " s! Best " + best.load("best", 0).toFixed(1) + " s. Reload the page to race again."
    : "Crystals " + found + " / " + CRYSTALS + " · " + clock.toFixed(1) + " s" + (best.load("best", 0) ? " · best " + best.load("best", 0).toFixed(1) + " s" : "");
  keyboard.endStep();
  actions.endStep();
}

// ---------- The view ----------
function savedLook() {
  try { return normalizeCharacter((JSON.parse(localStorage.getItem("kindling:characters")) || [])[0]); } catch { return normalizeCharacter({}); }
}
const hud = document.getElementById("hud");
const view = createWorldView({
  container: "#stage", world, mode: "3d", seaLevel: island.seaLevel, character: savedLook(), timeOfDay: 0.33,
  label: "A block island with a village. Glowing crystals are hidden around it.",
});
addEventListener("keydown", (event) => {
  const index = Number(event.key) - 1;
  if (index >= 0 && index < CAMERAS.length) view.setMode(CAMERAS[index]);
});

let time = 0;
createLoop({
  update(step) { time += step; update(step); },
  render() { view.render(player, time); },
}).start();
