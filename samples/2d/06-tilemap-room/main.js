// samples/2d/06-tilemap-room/main.js
// WHAT: A small top-down adventure: walk between rooms, read signs, find a key,
//       open a door, reach the treasure.
// WHY:  Shows a flip-screen camera (one room at a time, sliding with a tween),
//       talking to things in the world, and simple game state (has the key?).
// TEACHES: tilemap lookups, room math, tweens on the camera, a text box.
// README: samples/2d/06-tilemap-room/README.md

import { createGame } from "kindling/game.js";
import { createTilemap } from "kindling/2d/tilemap.js";
import { createBody, moveAndCollide } from "kindling/2d/physics.js";
import { createCamera } from "kindling/2d/camera.js";
import { fillRect, strokeRect, text, dim } from "kindling/2d/draw.js";
import { textureCanvases } from "kindling/world/textures.js";
import { paintPixels, drawCharacterIcon } from "kindling/views/sprites.js";
import { createParticles, presets } from "kindling/2d/particles.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { easeInOutSine } from "kindling/math/easing.js";
import { WORLD, SIGNS } from "./world.js";

const TILE = 16;
const ROOM_WIDTH = 20 * TILE;    // 320
const ROOM_HEIGHT = 11 * TILE;   // 176
const WALK_SPEED = 80;

const game = createGame({
  width: ROOM_WIDTH,
  height: ROOM_HEIGHT,
  pixelArt: true,
  background: "#3e7d3a",
  actions: {
    left: ["ArrowLeft", "KeyA", "pad:Left", "pad:LeftX-", "touch:left"],
    right: ["ArrowRight", "KeyD", "pad:Right", "pad:LeftX+", "touch:right"],
    up: ["ArrowUp", "KeyW", "pad:Up", "pad:LeftY-", "touch:up"],
    down: ["ArrowDown", "KeyS", "pad:Down", "pad:LeftY+", "touch:down"],
    use: ["KeyE", "Space", "Enter", "pad:A", "touch:use"],
  },
});
const touch = game.input.touch;
touch.addButton("up", 26, 108, 22, 22, "▲");
touch.addButton("left", 4, 130, 22, 22, "◀");
touch.addButton("right", 48, 130, 22, 22, "▶");
touch.addButton("down", 26, 152, 22, 22, "▼");
touch.addButton("use", 276, 130, 40, 40, "USE");

const audio = createAudio();
const particles = createParticles(200);
const camera = createCamera({ width: ROOM_WIDTH, height: ROOM_HEIGHT, smoothing: 0 });

let map;
let player;
let hasKey;
let message;          // text in the box at the bottom, or null
let sliding;          // true while the camera moves to the next room
let won;

function resetGame() {
  map = createTilemap({ tileSize: TILE, rows: WORLD, solid: "#T~DX" });
  const start = map.replace("P", ".")[0];
  player = createBody({ x: start.x + 3, y: start.y + 3, width: 10, height: 10 });
  hasKey = false;
  message = null;
  sliding = false;
  won = false;
  const room = roomOf(player);
  camera.x = room.x;
  camera.y = room.y;
}

// Which room is this point in? Rooms are a grid of ROOM_WIDTH x ROOM_HEIGHT.
function roomOf(thing) {
  const centerX = thing.x + (thing.width || 0) / 2;
  const centerY = thing.y + (thing.height || 0) / 2;
  return {
    x: Math.floor(centerX / ROOM_WIDTH) * ROOM_WIDTH,
    y: Math.floor(centerY / ROOM_HEIGHT) * ROOM_HEIGHT,
  };
}

// The tile the player is facing, one step ahead of their center.
let facing = { x: 0, y: 1 };
function tileInFront() {
  const centerX = player.x + player.width / 2 + facing.x * 12;
  const centerY = player.y + player.height / 2 + facing.y * 12;
  return { column: map.columnAt(centerX), row: map.rowAt(centerY) };
}

function useThing() {
  const spot = tileInFront();
  const character = map.get(spot.column, spot.row);
  if (character === "S") {
    message = SIGNS[spot.column + "," + spot.row] || "The sign is blank.";
    playSfx(audio, "select");
  } else if (character === "D") {
    if (hasKey) {
      // Open both door tiles next to each other.
      for (const door of map.find("D")) map.set(door.column, door.row, ".");
      message = "The door creaks open.";
      playSfx(audio, "powerup");
    } else {
      message = "Locked. There must be a key somewhere.";
      playSfx(audio, "hit");
    }
  } else if (character === "X") {
    won = true;
    particles.emit({ ...presets.sparkle, count: 40, x: spot.column * TILE + 8 - camera.x, y: spot.row * TILE + 8 - camera.y });
    playSfx(audio, "powerup");
    message = "You found the treasure! Thanks for playing. (Press E to play again)";
  }
}

function update(game, stepSeconds) {
  particles.update(stepSeconds);
  if (sliding) return;                     // freeze the player during the room change

  if (message) {
    if (game.actions.wasPressed("use")) {
      if (won) resetGame();
      message = null;
    }
    return;
  }

  const moveX = game.actions.axis("left", "right");
  const moveY = moveX === 0 ? game.actions.axis("up", "down") : 0;   // four directions only
  if (moveX !== 0 || moveY !== 0) facing = { x: moveX, y: moveY };
  player.velocityX = moveX * WALK_SPEED;
  player.velocityY = moveY * WALK_SPEED;
  moveAndCollide(player, stepSeconds, map);

  // Pick up the key by walking over it.
  const under = map.get(map.columnAt(player.x + 5), map.rowAt(player.y + 5));
  if (under === "K") {
    map.set(map.columnAt(player.x + 5), map.rowAt(player.y + 5), ".");
    hasKey = true;
    message = "You found a key!";
    playSfx(audio, "coin");
  }

  if (game.actions.wasPressed("use")) useThing();

  // Left the room? Slide the camera to the new one with a tween.
  const room = roomOf(player);
  if (room.x !== camera.x || room.y !== camera.y) {
    sliding = true;
    game.tweens.to(camera, { x: room.x, y: room.y }, 0.5, easeInOutSine).onDone = () => {
      sliding = false;
    };
  }
}

// ---- Look: textures painted from code (engine/world/textures.js), no image files ----
const textures = textureCanvases();
const chest = paintPixels([
  "..oooooooooo..",
  ".oYYYYYYYYYYo.",
  "oYyyyyyyyyyyYo",
  "oooooooooooooo",
  "oBBBBBkkBBBBBo",
  "oBbbbbkkbbbbBo",
  "oBbbbbbbbbbbBo",
  "oooooooooooooo",
], { o: "#4a2f14", Y: "#d9a521", y: "#ffd166", B: "#8a5a2b", b: "#a8743c", k: "#2b2b2b" });
const key = paintPixels([".yy.....", "y..yyyyy", "y..y.y.y", ".yy....."], { y: "#ffd166" });
const sign = paintPixels(["oooooooooo", "obbbbbbbbo", "ob-----bbo", "obb----bbo", "oooooooooo", "....oo....", "....oo...."], { o: "#5a3b1e", b: "#c79a5a", "-": "#7a5530" });

function isBlocking(character) {
  return character === "#" || character === "~" || character === "D";
}

function render(game, context) {
  camera.begin(context);
  map.draw(context, (tileContext, character, x, y, column, row) => {
    // Everything stands on grass (flowers here and there), except walls and water.
    if (character === "#") {
      tileContext.drawImage(textures.stone, x, y);
      // Light the top edge of a wall that has open ground above it.
      if (!isBlocking(map.get(column, row - 1) || "#")) { tileContext.fillStyle = "rgba(255,255,255,0.18)"; tileContext.fillRect(x, y, 16, 3); }
      return;
    }
    if (character === "~") {
      // Water: slide the texture with time so it ripples.
      const offset = Math.floor(game.time.elapsed * 6) % 16;
      tileContext.drawImage(textures.water, offset, 0, 16 - offset, 16, x, y, 16 - offset, 16);
      if (offset > 0) tileContext.drawImage(textures.water, 0, 0, offset, 16, x + 16 - offset, y, offset, 16);
      return;
    }
    tileContext.drawImage((column * 7 + row * 3) % 11 === 0 ? textures.flowers : textures.grass_top, x, y);
    // Soft shadow on the ground just below a wall, so walls look tall.
    if (isBlocking(map.get(column, row - 1) || ".")) { tileContext.fillStyle = "rgba(10,20,10,0.28)"; tileContext.fillRect(x, y, 16, 5); }
    if (character === "T") {
      tileContext.fillStyle = "rgba(0,0,0,0.25)";
      tileContext.beginPath(); tileContext.ellipse(x + 9, y + 13, 7, 3, 0, 0, Math.PI * 2); tileContext.fill();
      tileContext.drawImage(textures.log_side, 6, 0, 4, 6, x + 6, y + 9, 4, 6);
      tileContext.fillStyle = "#2f7a3e";
      tileContext.beginPath(); tileContext.arc(x + 8, y + 6, 7, 0, Math.PI * 2); tileContext.fill();
      tileContext.fillStyle = "#4fa356";
      tileContext.beginPath(); tileContext.arc(x + 6, y + 4, 4, 0, Math.PI * 2); tileContext.fill();
    } else if (character === "S") {
      tileContext.drawImage(sign, x + 3, y + 4);
    } else if (character === "K") {
      tileContext.drawImage(key, x + 4, y + 6);
    } else if (character === "D") {
      tileContext.drawImage(textures.planks, x, y);
      tileContext.fillStyle = "#ffd166";
      tileContext.fillRect(x + 11, y + 7, 2, 2);
    } else if (character === "X") {
      tileContext.drawImage(chest, x + 1, y + 5);
    }
  }, camera.view());
  drawCharacterIcon(context, Math.round(player.x + player.width / 2), Math.round(player.y + player.height / 2), 12, Math.atan2(-facing.x, -facing.y));
  camera.end(context);
  particles.render(context);

  text(context, hasKey ? "KEY: yes" : "KEY: no", 4, 4, { shadow: "#000000" });
  if (message) {
    dim(context, ROOM_WIDTH, ROOM_HEIGHT, 0.25);
    fillRect(context, 8, ROOM_HEIGHT - 52, ROOM_WIDTH - 16, 44, "#101018");
    strokeRect(context, 8.5, ROOM_HEIGHT - 51.5, ROOM_WIDTH - 17, 43, "#ffffff");
    drawWrapped(context, message, 16, ROOM_HEIGHT - 46, ROOM_WIDTH - 32);
  }
}

// Split text into lines that fit `maxWidth`, word by word.
function drawWrapped(context, words, x, y, maxWidth) {
  context.font = "8px monospace";
  let line = "";
  let lineY = y;
  for (const word of words.split(" ")) {
    const attempt = line ? line + " " + word : word;
    if (context.measureText(attempt).width > maxWidth && line) {
      text(context, line, x, lineY);
      line = word;
      lineY += 10;
    } else {
      line = attempt;
    }
  }
  text(context, line, x, lineY);
}

game.scenes.add("play", { enter: resetGame, update, render });
game.start("play");
