// samples/3d/04-coin-collector/main.js
// WHAT: A tiny third-person platformer. Run and jump across floating platforms and
//       collect every coin before the clock runs out. Fall off and you go back to the start.
// WHY:  The 2D platformer, one dimension up. Same ideas: a body with velocity and gravity,
//       move one axis at a time, stop at boxes. New ideas: a camera that follows the
//       player, and moving relative to where the CAMERA faces, not the world.
// TEACHES: collision3d (AABB in 3D), follow camera, camera-relative movement, blob shadows.
// README: samples/3d/04-coin-collector/README.md

import { createGame } from "kindling/game.js";
import { createRenderer } from "kindling/3d/renderer.js";
import { createMesh } from "kindling/3d/mesh.js";
import { box, sphere } from "kindling/3d/primitives.js";
import { createOrbitCamera } from "kindling/3d/camera3d.js";
import { createCheckerTexture } from "kindling/3d/texture.js";
import { boxFromCenter, boxCenter, createBody3D, moveAndCollide3D, boxesOverlap, rayBox } from "kindling/3d/collision3d.js";
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
const renderer = createRenderer(game.screen);
renderer.setFog(45);
const audio = createAudio();
const hud = document.getElementById("hud");

// Level: platforms are boxes given by center and size. The same boxes are drawn AND collided.
const platforms = [
  boxFromCenter(0, -0.5, 0, 8, 1, 8),        // start island
  boxFromCenter(0, 0.5, -8, 3, 1, 3),
  boxFromCenter(5, 1.5, -11, 3, 1, 3),
  boxFromCenter(10, 2.5, -8, 3, 1, 3),
  boxFromCenter(10, 1, -1, 4, 1, 6),
  boxFromCenter(-7, 0, -3, 4, 1, 4),
  boxFromCenter(-11, 1.5, -8, 3, 1, 3),
  boxFromCenter(-6, 3, -12, 3, 1, 3),
  boxFromCenter(0, 4.5, -16, 4, 1, 4),       // the high goal platform
  boxFromCenter(-2, 0.75, 3, 1.2, 1.5, 1.2),   // a crate to hop on
];
const coinSpots = [
  [0, 2, -8], [5, 3, -11], [10, 4, -8], [10, 2.5, 1], [-7, 1.5, -3],
  [-11, 3, -8], [-6, 4.5, -12], [0, 6, -16], [-2, 2.3, 3], [3, 1, 3],
];

const cubeMesh = createMesh(game.gl, box(1, 1, 1));
const coinMesh = createMesh(game.gl, sphere(0.5, 16, 8));
const grass = createCheckerTexture(game.gl, 2, "#86c06c", "#7ab461");

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
    renderer.begin(camera, { position: [20, 40, 15], color: [1, 0.97, 0.9], ambient: 0.4 });
    for (const platform of platforms) {
      const c = boxCenter(platform);
      const model = mat4.scale(mat4.translation(c.x, c.y, c.z), { x: platform.width, y: platform.height, z: platform.depth });
      renderer.drawMesh(cubeMesh, model, { texture: grass, color: [1, 1, 1], specularStrength: 0.05 });
    }
    const spin = game.time.elapsed * 3;
    for (const coin of coins) {
      if (coin.taken) continue;
      // A coin is a sphere squashed flat into a disc, spinning around y.
      let model = mat4.translation(coin.x, coin.y + Math.sin(spin + coin.x) * 0.1, coin.z);
      model = mat4.rotateY(model, spin);
      model = mat4.scale(model, { x: 0.7, y: 0.7, z: 0.15 });
      renderer.drawMesh(coinMesh, model, { color: [1, 0.8, 0.15], specularStrength: 0.9, shininess: 48 });
    }
    // Blob shadow: a dark flat disc on whatever is below the player. It tells you where you will land.
    const center = boxCenter(player);
    let below = Infinity;
    for (const platform of platforms) {
      const distance = rayBox(center, { x: 0, y: -1, z: 0 }, platform);
      if (distance !== null && distance < below) below = distance;
    }
    if (below < Infinity) {
      const model = mat4.scale(mat4.translation(center.x, center.y - below + 0.02, center.z), { x: 0.8, y: 0.02, z: 0.8 });
      renderer.drawMesh(coinMesh, model, { color: [0.1, 0.15, 0.1], specularStrength: 0 });
    }
    // The player: a body, and a "nose" so you can see which way it faces.
    let model = mat4.translation(center.x, center.y, center.z);
    model = mat4.rotateY(model, facing);
    renderer.drawMesh(cubeMesh, mat4.scale(model, { x: player.width, y: player.height, z: player.depth }), { color: [0.95, 0.45, 0.2] });
    renderer.drawMesh(cubeMesh, mat4.scale(mat4.translate(model, { x: 0, y: 0.2, z: 0.4 }), { x: 0.3, y: 0.2, z: 0.2 }), { color: [0.2, 0.2, 0.25] });

    const taken = coins.filter((coin) => coin.taken).length;
    if (state === "won") hud.textContent = "All " + coins.length + " coins with " + Math.ceil(timeLeft) + " s to spare! Press R or Enter to play again.";
    else if (state === "lost") hud.textContent = "Out of time with " + taken + " of " + coins.length + " coins. Press R or Enter to try again.";
    else hud.textContent = "Coins " + taken + " / " + coins.length + " · time " + Math.ceil(timeLeft);
  },
});
restart();
game.start("play");
