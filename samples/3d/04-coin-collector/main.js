// samples/3d/04-coin-collector/main.js
// WHAT: A tiny third-person platformer. Run and jump across floating platforms and
//       collect every coin before the clock runs out. Fall off and you go back to the start.
// WHY:  The 2D platformer, one dimension up. Same ideas: a body with velocity and gravity,
//       move one axis at a time, stop at boxes. New ideas: a camera that follows the
//       player, and moving relative to where the CAMERA faces, not the world.
// TEACHES: collision3d (AABB in 3D), follow camera, camera-relative movement, and the
//          Kindling 2 stylized renderer: the SAME boxes are collided as boxes and
//          drawn as textured blocks with real sun shadows, fog and a sky.
// README: samples/3d/04-coin-collector/README.md

import { createGame } from "kindling/game.js";
import { createWorldRenderer } from "kindling/3d/world-renderer.js";
import { createCharacter } from "kindling/3d/character.js";
import { coinModel, pineTree, rockModel, createModelBuilder } from "kindling/3d/lowpoly.js";
import { createOrbitCamera } from "kindling/3d/camera3d.js";
import { boxFromCenter, boxCenter, createBody3D, moveAndCollide3D, boxesOverlap } from "kindling/3d/collision3d.js";
import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { BLOCK } from "kindling/world/blocks.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { clamp, damp } from "kindling/math/scalar.js";
import * as mat4 from "kindling/math/mat4.js";

const RUN_SPEED = 6;          // meters per second
const JUMP_SPEED = 9;         // meters per second, upward
const TIME_LIMIT = 90;        // seconds
const START = { x: 0, y: 1, z: 0 };

const game = createGame({
  webgl: true,
  width: 640,
  height: 360,
  clearColor: [0.62, 0.78, 0.95],
  actions: {
    forward: ["KeyW", "ArrowUp", "pad:LeftY-"],
    back: ["KeyS", "ArrowDown", "pad:LeftY+"],
    left: ["KeyA", "ArrowLeft", "pad:LeftX-"],
    right: ["KeyD", "ArrowRight", "pad:LeftX+"],
    jump: ["Space", "pad:A"],
    turnLeft: ["KeyQ", "pad:RightX-"],
    turnRight: ["KeyE", "pad:RightX+"],
    restart: ["KeyR", "Enter", "pad:Start"],
  },
});
const renderer = createWorldRenderer(game.screen, { timeOfDay: 0.36, fogDensity: 0.014, shadowRadius: 22 });
const audio = createAudio();
const hud = document.getElementById("hud");

// Level: platforms are boxes given by center and size. The same boxes are drawn AND collided.
const platforms = [
  boxFromCenter(0, -0.5, 0, 8, 1, 8),        // start island
  boxFromCenter(0.5, 0.5, -7.5, 3, 1, 3),
  boxFromCenter(5.5, 1.5, -10.5, 3, 1, 3),
  boxFromCenter(10.5, 2.5, -7.5, 3, 1, 3),
  boxFromCenter(10, 1.5, -1, 4, 1, 6),
  boxFromCenter(-7, 0.5, -3, 4, 1, 4),
  boxFromCenter(-10.5, 1.5, -7.5, 3, 1, 3),
  boxFromCenter(-5.5, 3.5, -11.5, 3, 1, 3),
  boxFromCenter(0, 4.5, -16, 4, 1, 4),       // the high goal platform
  boxFromCenter(-2, 0.75, 3, 1.2, 1.5, 1.2),   // a crate to hop on
];
const coinSpots = [
  [0.5, 2, -7.5], [5.5, 3, -10.5], [10.5, 4, -7.5], [10, 3, 1], [-7, 2, -3],
  [-10.5, 3, -7.5], [-5.5, 5, -11.5], [0, 6, -16], [-2, 2.3, 3], [3, 1, 3],
];

// ---- Look: turn the platform boxes into blocks for the stylized renderer ----------
// Block worlds start at (0, 0, 0), so shift the level by OFFSET when drawing.
const OFFSET = { x: 16, y: 6, z: 24 };
const world = createVoxelWorld(32, 16, 32);
const propBoxes = [];        // boxes that aren't whole blocks (the crate) become models
for (const platform of platforms) {
  const x0 = platform.x + OFFSET.x, y0 = platform.y + OFFSET.y, z0 = platform.z + OFFSET.z;
  const whole = [x0, y0, z0, platform.width, platform.height, platform.depth].every(Number.isInteger);
  if (!whole) { propBoxes.push(platform); continue; }
  for (let y = y0; y < y0 + platform.height; y++) {
    world.fill(x0, y, z0, x0 + platform.width - 1, y, z0 + platform.depth - 1, y === y0 + platform.height - 1 ? BLOCK.GRASS : BLOCK.DIRT);
  }
  // A rocky "floating island" underside, narrower each layer down. Only for looks.
  for (let layer = 1; layer <= 3; layer++) {
    const inset = layer;
    if (platform.width - inset * 2 < 1 || platform.depth - inset * 2 < 1) break;
    world.fill(x0 + inset, y0 - layer, z0 + inset, x0 + platform.width - 1 - inset, y0 - layer, z0 + platform.depth - 1 - inset, layer === 1 ? BLOCK.DIRT : BLOCK.STONE);
  }
}
renderer.setWorld(world);

const character = createCharacter(renderer, { shirt: [0.95, 0.45, 0.2] });
const coinMesh = renderer.createModel(coinModel());
const treeMesh = renderer.createModel(pineTree(3.2));
const rockMesh = renderer.createModel(rockModel(4, 0.5));
const crate = createModelBuilder();
crate.box(0, 0, 0, 1, 1, 1, [0.72, 0.52, 0.3]);
crate.box(0, 0, 0, 1.02, 0.18, 1.02, [0.5, 0.34, 0.18]);
const crateMesh = renderer.createModel(crate.data());
const scenery = [
  { mesh: treeMesh, x: -3.2, z: -3.2 }, { mesh: treeMesh, x: 3.3, z: -2.6 }, { mesh: rockMesh, x: 2.8, z: 2.5 },
  { mesh: treeMesh, x: 11.4, z: 1.6, y: 2 }, { mesh: rockMesh, x: -8, z: -4, y: 1 },
];
let walkCycle = 0;

const player = createBody3D({ width: 0.7, height: 1, depth: 0.7 });
const camera = createOrbitCamera({ distance: 9, pitch: 0.5, far: 120 });
let coins = [];
let timeLeft = TIME_LIMIT;
let state = "playing";      // "playing" | "won" | "lost"
let facing = 0;             // which way the player model points (radians)
let joystick = null;        // touch: where the moving finger started

function restart() {
  coins = coinSpots.map(([x, y, z]) => ({ x, y, z, taken: false }));
  timeLeft = TIME_LIMIT;
  state = "playing";
  respawn();
}

function respawn() {
  player.x = START.x - player.width / 2;
  player.y = START.y;
  player.z = START.z - player.depth / 2;
  player.velocityX = player.velocityY = player.velocityZ = 0;
}

// Read movement input as a 2D stick: x = right, y = forward. Keys, gamepad and touch all end here.
function readStick() {
  const actions = game.actions;
  let x = actions.axis("left", "right");
  let y = actions.axis("back", "forward");
  let jump = actions.wasPressed("jump");
  // Touch: a finger on the left half is a joystick; a tap on the right half jumps.
  const touch = game.input.touch;
  const moving = touch.touches().find((t) => t.x < game.screen.width / 2);
  if (moving) {
    if (!joystick) joystick = { x: moving.x, y: moving.y };
    x = clamp((moving.x - joystick.x) / 40, -1, 1);
    y = clamp((joystick.y - moving.y) / 40, -1, 1);
  } else {
    joystick = null;
  }
  const tap = touch.wasTapped();
  if (tap && tap.x >= game.screen.width / 2) jump = true;
  return { x, y, jump };
}

game.scenes.add("play", {
  update(game, stepSeconds) {
    if (game.actions.wasPressed("restart") && state !== "playing") restart();
    if (state !== "playing") return;

    // Turn the camera with Q/E or a mouse drag.
    camera.yaw += game.actions.axis("turnRight", "turnLeft") * 2 * stepSeconds;
    if (game.input.mouse.isDown(0)) camera.rotate(game.input.mouse.movement().x, 0);

    // Camera-relative movement: "forward" means away from the camera, along the ground.
    const stick = readStick();
    const forward = { x: -Math.sin(camera.yaw), z: -Math.cos(camera.yaw) };
    const right = { x: Math.cos(camera.yaw), z: -Math.sin(camera.yaw) };
    let moveX = forward.x * stick.y + right.x * stick.x;
    let moveZ = forward.z * stick.y + right.z * stick.x;
    const length = Math.hypot(moveX, moveZ);
    if (length > 1) { moveX /= length; moveZ /= length; }   // diagonals are not faster
    player.velocityX = moveX * RUN_SPEED;
    player.velocityZ = moveZ * RUN_SPEED;
    if (length > 0.1) facing = Math.atan2(moveX, moveZ);

    if (stick.jump && player.onGround) {
      player.velocityY = JUMP_SPEED;
      playSfx(audio, "jump");
    }
    moveAndCollide3D(player, stepSeconds, platforms);
    if (player.y < -15) {           // fell into the sky below
      playSfx(audio, "hit");
      respawn();
    }

    for (const coin of coins) {
      if (!coin.taken && boxesOverlap(player, boxFromCenter(coin.x, coin.y, coin.z, 0.8, 0.8, 0.8))) {
        coin.taken = true;
        playSfx(audio, "coin", 0.1);
      }
    }
    timeLeft -= stepSeconds;
    if (coins.every((coin) => coin.taken)) { state = "won"; playSfx(audio, "powerup"); }
    else if (timeLeft <= 0) { state = "lost"; playSfx(audio, "lose"); }

    // The camera's target eases toward the player: smooth, but never far behind.
    const center = boxCenter(player);
    camera.target.x = damp(camera.target.x, center.x, 8, stepSeconds);
    camera.target.y = damp(camera.target.y, center.y, 4, stepSeconds);
    camera.target.z = damp(camera.target.z, center.z, 8, stepSeconds);
  },

  render(game) {
    const time = game.time.elapsed;
    // The camera works in level coordinates; the renderer draws the world shifted by
    // OFFSET, so give it a camera that is shifted the same way.
    const shifted = { ...camera, target: { x: camera.target.x + OFFSET.x, y: camera.target.y + OFFSET.y, z: camera.target.z + OFFSET.z } };
    shifted.position = () => { const p = camera.position(); return { x: p.x + OFFSET.x, y: p.y + OFFSET.y, z: p.z + OFFSET.z }; };
    shifted.view = () => mat4.multiply(camera.view(), mat4.translation(-OFFSET.x, -OFFSET.y, -OFFSET.z));
    function at(x, y, z) {
      return mat4.translation(x + OFFSET.x, y + OFFSET.y, z + OFFSET.z);
    }
    for (const item of scenery) renderer.queueModel(item.mesh, at(item.x, item.y || 0, item.z));
    for (const box of propBoxes) {
      const c = boxCenter(box);
      renderer.queueModel(crateMesh, mat4.scale(at(c.x, c.y, c.z), { x: box.width, y: box.height, z: box.depth }));
    }
    for (const coin of coins) {
      if (coin.taken) continue;
      const bob = Math.sin(time * 3 + coin.x) * 0.1;
      renderer.queueModel(coinMesh, mat4.rotateY(at(coin.x, coin.y + bob, coin.z), time * 3));
    }
    const moving = Math.hypot(player.velocityX, player.velocityZ) > 0.5 && player.onGround;
    walkCycle = moving ? walkCycle + 0.25 : 0;
    const feet = { x: player.x + player.width / 2 + OFFSET.x, y: player.y + OFFSET.y, z: player.z + player.depth / 2 + OFFSET.z };
    // facing is atan2(x, z); the character's yaw 0 faces -z, so turn it half a circle.
    character.queue(feet, facing + Math.PI, walkCycle, [1, 1, 1], 0.62);
    renderer.render(shifted, time);

    const taken = coins.filter((coin) => coin.taken).length;
    if (state === "won") hud.textContent = "All " + coins.length + " coins with " + Math.ceil(timeLeft) + " s to spare! Press R or Enter to play again.";
    else if (state === "lost") hud.textContent = "Out of time with " + taken + " of " + coins.length + " coins. Press R or Enter to try again.";
    else hud.textContent = "Coins " + taken + " / " + coins.length + " · time " + Math.ceil(timeLeft);
  },
});
restart();
game.start("play");
