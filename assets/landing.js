// assets/landing.js
// WHAT: The live demo at the top of the landing page: a generated block island with a
//       little explorer who wanders around on their own, shown in any of the five views.
//       The tabs switch views; until you pick one, it tours them every few seconds.
// WHY:  The fastest way to show "2D, 2.5D and 3D from one engine" is to show it.
//       The explorer is the same walker the samples use, steered by a tiny "AI":
//       wander, and turn away from walls and water.
// DOC:  samples/modes/01-one-world/ (the playable version of this demo)

import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { generateIsland } from "kindling/world/generate.js";
import { createWalker, updateWalker, wishFromYaw } from "kindling/world/walker.js";
import { createWorldView, VIEW_MODES, VIEW_LABELS } from "kindling/views/world-view.js";
import { createLoop } from "kindling/core/loop.js";
import { createNoise } from "kindling/math/noise.js";

const stage = document.getElementById("hero-stage");
const tabs = document.getElementById("hero-modes");
const caption = document.getElementById("hero-caption");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const world = createVoxelWorld(64, 40, 64);
const island = generateIsland(world, { seed: 3 });
const explorer = createWalker(island.spawn);
explorer.speed = 2.6;
explorer.walkCycle = 0;
const noise = createNoise(9);

const TOUR = ["3d", "iso", "raycast", "2d", "3d-fps"];
const TOUR_SECONDS = 7;
let touring = !reducedMotion;
let tourTime = 0;
let time = 0;

const view = createWorldView({
  container: stage,
  world,
  mode: "3d",
  seaLevel: island.seaLevel,
  label: "Live demo: a blocky island with a village, drawn by the Kindling engine.",
});

// Is the block one step ahead (in the walking direction) safe dry land?
function safeAhead(yaw, distance) {
  const x = explorer.x - Math.sin(yaw) * distance;
  const z = explorer.z - Math.cos(yaw) * distance;
  if (x < 3 || z < 3 || x > world.width - 3 || z > world.depth - 3) return false;
  const ground = world.groundHeight(x, z);
  return ground > island.seaLevel + 0.5 && ground - explorer.y < 1.5;
}

function update(stepSeconds) {
  time += stepSeconds;
  // Wander: smooth noise nudges the heading left and right.
  explorer.yaw += noise.noise2(time * 0.25, 0) * 1.6 * stepSeconds;
  // Look ahead; if it's water, a cliff or the edge, turn toward whichever side is clear.
  if (!safeAhead(explorer.yaw, 2)) explorer.yaw += (safeAhead(explorer.yaw + 0.8, 2) ? 1 : -1) * 2.4 * stepSeconds;
  const beforeX = explorer.x;
  const beforeZ = explorer.z;
  wishFromYaw(explorer, 1, 0);
  updateWalker(world, explorer, stepSeconds);
  // Stuck against something too tall to step up: turn harder.
  if (Math.hypot(explorer.x - beforeX, explorer.z - beforeZ) < explorer.speed * stepSeconds * 0.3) explorer.yaw += 2.5 * stepSeconds;
  explorer.walkCycle += stepSeconds * 8;

  if (touring) {
    tourTime += stepSeconds;
    if (tourTime > TOUR_SECONDS) {
      tourTime = 0;
      choose(TOUR[(TOUR.indexOf(view.mode) + 1) % TOUR.length], false);
    }
  }
}

function choose(mode, byUser) {
  if (byUser) touring = false;
  view.setMode(mode);
  view.canvas.tabIndex = -1;          // the demo is not interactive; keep it out of the tab order
  for (const button of tabs.children) button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
  caption.textContent = VIEW_LABELS[mode] + (touring ? " · touring all five views" : "");
}

for (const mode of VIEW_MODES) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "k-tab";
  button.dataset.mode = mode;
  button.textContent = VIEW_LABELS[mode];
  button.addEventListener("click", () => {
    choose(mode, true);
    if (reducedMotion) view.render(explorer, time);
  });
  tabs.appendChild(button);
}
choose("3d", false);

const loop = createLoop({ update, render: () => view.render(explorer, time) });
if (reducedMotion) {
  // One still frame per view instead of a moving scene.
  update(0.016);
  view.render(explorer, time);
} else {
  loop.start();
  // Don't spend battery drawing a demo nobody can see.
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? loop.start() : loop.stop())).observe(stage);
}
