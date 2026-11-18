// samples/3d/05-first-person-walk/main.js
// WHAT: Walk around a small stone courtyard in first person and find the five glowing
//       crystals. Click to capture the mouse for looking around; Escape gives it back.
// WHY:  The real-3D version of the raycaster maze: the level is still a grid of letters,
//       but every wall is a textured WebGL box, so you can look up and down, and the
//       floor, fog and light are real. This is the skeleton of a walking sim or a shooter.
// TEACHES: first-person camera, pointer lock, levels from text, canvas textures, fog.
// README: samples/3d/05-first-person-walk/README.md

import { createGame } from "kindling/game.js";
import { createRenderer } from "kindling/3d/renderer.js";
import { createMesh } from "kindling/3d/mesh.js";
import { box, plane, sphere } from "kindling/3d/primitives.js";
import { createFirstPersonCamera } from "kindling/3d/camera3d.js";
import { createCanvasTexture } from "kindling/3d/texture.js";
import { boxFromCenter, createBody3D, moveAndCollide3D } from "kindling/3d/collision3d.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { clamp } from "kindling/math/scalar.js";
import * as mat4 from "kindling/math/mat4.js";

const CELL = 2;              // each letter in the map is a 2 x 2 meter square
const WALL_HEIGHT = 3;
const WALK_SPEED = 4;        // meters per second
const EYE_HEIGHT = 1.6;
// # wall   . floor   P pillar   C crystal   S start
const MAP = [
  "################",
  "#S.....#.......#",
  "#......#...C...#",
  "#..P...#.......#",
  "#......###..####",
  "#..............#",
  "####..P....P...#",
  "#C.#...........#",
  "#..#..####..#..#",
  "#.....#C.#..#..#",
  "#..P..#..#..#C.#",
  "#.....#.....#..#",
  "#..C..#..P.....#",
  "################",
];

const game = createGame({
  webgl: true,
  width: 640,
  height: 360,
  clearColor: [0.08, 0.09, 0.14],
  actions: {
    forward: ["KeyW", "ArrowUp", "pad:LeftY-"],
    back: ["KeyS", "ArrowDown", "pad:LeftY+"],
    left: ["KeyA", "pad:LeftX-"],
    right: ["KeyD", "pad:LeftX+"],
    turnLeft: ["ArrowLeft", "pad:RightX-"],
    turnRight: ["ArrowRight", "pad:RightX+"],
  },
});
const renderer = createRenderer(game.screen);
renderer.setFog(22);          // fog in the same color as the sky hides the far walls softly
const audio = createAudio();
const hud = document.getElementById("hud");

// Textures painted with the 2D canvas API: no image files to load.
const stone = createCanvasTexture(game.gl, 128, (context, size) => {
  context.fillStyle = "#6d6a73";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#56535c";
  const brickHeight = size / 4;
  for (let row = 0; row < 4; row++) {
    const offset = row % 2 === 0 ? 0 : size / 4;   // every other row is shifted half a brick
    context.fillRect(0, row * brickHeight, size, 3);
    for (let x = offset; x <= size; x += size / 2) context.fillRect(x, row * brickHeight, 3, brickHeight);
  }
});
const floorTiles = createCanvasTexture(game.gl, 64, (context, size) => {
  context.fillStyle = "#3b4a3a";
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "#2c372b";
  context.lineWidth = 4;
  context.strokeRect(0, 0, size, size);
});

// Turn the text map into boxes (for drawing and collision) and points of interest.
const walls = [];
const pillars = [];
const crystals = [];
let start = { x: 3, z: 3 };
MAP.forEach((line, row) => {
  [...line].forEach((letter, column) => {
    const x = column * CELL + CELL / 2;
    const z = row * CELL + CELL / 2;
    if (letter === "#") walls.push(boxFromCenter(x, WALL_HEIGHT / 2, z, CELL, WALL_HEIGHT, CELL));
    if (letter === "P") pillars.push(boxFromCenter(x, WALL_HEIGHT / 2, z, 0.8, WALL_HEIGHT, 0.8));
    if (letter === "C") crystals.push({ x, z, found: false });
    if (letter === "S") start = { x, z };
  });
});
const mapWidth = MAP[0].length * CELL;
const mapDepth = MAP.length * CELL;
const floor = boxFromCenter(mapWidth / 2, -0.5, mapDepth / 2, mapWidth, 1, mapDepth);
const solids = [floor, ...walls, ...pillars];

const cubeMesh = createMesh(game.gl, box(1, 1, 1));
const floorMesh = createMesh(game.gl, plane(mapWidth, mapDepth, 1, MAP[0].length));
const crystalMesh = createMesh(game.gl, sphere(0.3, 4, 2));    // 4 x 2 segments = a diamond shape

const player = createBody3D({ x: start.x - 0.3, y: 0, z: start.z - 0.3, width: 0.6, height: 1.7, depth: 0.6 });
const camera = createFirstPersonCamera({ yaw: -Math.PI / 2, far: 60 });   // facing +x, into the room
let lookTouch = null;     // touch: the finger on the right half, for looking
let moveTouch = null;     // touch: where the finger on the left half started

game.scenes.add("walk", {
  update(game, stepSeconds) {
    const mouse = game.input.mouse;
    if (mouse.wasPressed(0) && !mouse.isLocked()) mouse.lock();
    if (mouse.isLocked()) {
      const moved = mouse.movement();
      // Some browsers report one huge jump right after the lock starts. Ignore spikes.
      if (Math.abs(moved.x) < 300 && Math.abs(moved.y) < 300) camera.look(moved.x, moved.y);
    }
    camera.yaw -= game.actions.axis("turnLeft", "turnRight") * 2.2 * stepSeconds;

    let forwardInput = game.actions.axis("back", "forward");
    let sideInput = game.actions.axis("left", "right");
    // Touch: left half = move joystick, right half = drag to look.
    const width = game.screen.width;
    const touches = game.input.touch.touches();
    const mover = touches.find((t) => t.x < width / 2);
    const looker = touches.find((t) => t.x >= width / 2);
    if (mover) {
      if (!moveTouch) moveTouch = { x: mover.x, y: mover.y };
      sideInput = clamp((mover.x - moveTouch.x) / 40, -1, 1);
      forwardInput = clamp((moveTouch.y - mover.y) / 40, -1, 1);
    } else {
      moveTouch = null;
    }
    if (looker && lookTouch) camera.look((looker.x - lookTouch.x) * 3, (looker.y - lookTouch.y) * 3);
    lookTouch = looker ? { x: looker.x, y: looker.y } : null;

    // Walk along the ground: flatForward ignores pitch, so looking up never makes you fly.
    const forward = camera.flatForward();
    const right = camera.right();
    let moveX = forward.x * forwardInput + right.x * sideInput;
    let moveZ = forward.z * forwardInput + right.z * sideInput;
    const length = Math.hypot(moveX, moveZ);
    if (length > 1) { moveX /= length; moveZ /= length; }
    player.velocityX = moveX * WALK_SPEED;
    player.velocityZ = moveZ * WALK_SPEED;
    moveAndCollide3D(player, stepSeconds, solids);

    // The camera sits at eye height in the middle of the body.
    camera.position.x = player.x + player.width / 2;
    camera.position.y = player.y + EYE_HEIGHT;
    camera.position.z = player.z + player.depth / 2;

    for (const crystal of crystals) {
      const distance = Math.hypot(crystal.x - camera.position.x, crystal.z - camera.position.z);
      if (!crystal.found && distance < 1) {
        crystal.found = true;
        playSfx(audio, "powerup");
      }
    }
  },

  render(game) {
    // The light floats above the player like a lantern, so nearby walls are brightest.
    const lantern = { position: [camera.position.x, 2.6, camera.position.z], color: [1, 0.85, 0.65], ambient: 0.25 };
    renderer.begin(camera, lantern);
    renderer.drawMesh(floorMesh, mat4.translation(mapWidth / 2, 0, mapDepth / 2), { texture: floorTiles, color: [1, 1, 1], specularStrength: 0 });
    for (const solid of walls.concat(pillars)) {
      let model = mat4.translation(solid.x + solid.width / 2, solid.y + solid.height / 2, solid.z + solid.depth / 2);
      model = mat4.scale(model, { x: solid.width, y: solid.height, z: solid.depth });
      renderer.drawMesh(cubeMesh, model, { texture: stone, color: [1, 1, 1], specularStrength: 0.05 });
    }
    // Crystals: they spin and bob, and have their own light (ambient 1 = fully lit, a "glow").
    renderer.setLight({ position: lantern.position, color: [1, 1, 1], ambient: 1 });
    const time = game.time.elapsed;
    for (const crystal of crystals) {
      if (crystal.found) continue;
      let model = mat4.translation(crystal.x, 1.2 + Math.sin(time * 2 + crystal.x) * 0.15, crystal.z);
      model = mat4.rotateY(model, time * 1.5);
      model = mat4.scale(model, { x: 1, y: 1.8, z: 1 });
      renderer.drawMesh(crystalMesh, model, { color: [0.35, 0.9, 1], specularStrength: 0 });
    }
    const found = crystals.filter((crystal) => crystal.found).length;
    const where = game.input.mouse.isLocked() ? "Escape frees the mouse" : "Click to look with the mouse";
    hud.textContent = found === crystals.length
      ? "You found all " + crystals.length + " crystals. The courtyard is yours."
      : "Crystals " + found + " / " + crystals.length + " · " + where;
  },
});
game.start("walk");
