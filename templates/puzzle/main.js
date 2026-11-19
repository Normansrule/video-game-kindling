// templates/puzzle/main.js
// WHAT: A block-pushing puzzle. Push every crate onto a button to open the next room.
//       Crates can be pushed, never pulled, and only one at a time.
// WHY:  Grid puzzles are the cleanest way to learn game STATE: the whole game is one
//       small grid of letters. Undo is just "keep a copy of the grid before each move".
//       Levels are text you can draw in any editor:
//         #  wall      .  button     $  crate     *  crate on a button
//         @  player    +  player on a button     (space)  floor
// GROW IT: add levels to LEVELS, ice that slides, keys and doors, or a move counter
//       that gives stars.

import { createGame } from "kindling/game.js";
import { text, dim } from "kindling/2d/draw.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { createStorage } from "kindling/core/storage.js";
import { tileCanvas } from "kindling/library/tiles.js";
import { characterSheet } from "kindling/characters/character-sprite.js";
import { normalizeCharacter } from "kindling/characters/character-spec.js";

const LEVELS = [
  ["#######", "#     #", "# @$. #", "#     #", "#######"],
  ["########", "#  .   #", "#  $   #", "#@ $ . #", "#      #", "########"],
  ["########", "#   #  #", "# $ $  #", "#. ##  #", "#.  @  #", "########"],
  ["  #####", "###   #", "#.@$  #", "### $.#", "#.##$ #", "# # . ##", "#$ *$$.#", "#   .  #", "########"],
];
const TILE = 16, WIDTH = 320, HEIGHT = 180;

const game = createGame({
  width: WIDTH, height: HEIGHT, pixelArt: true, background: "#1b1c26",
  actions: {
    left: ["ArrowLeft", "KeyA", "pad:Left", "touch:left"], right: ["ArrowRight", "KeyD", "pad:Right", "touch:right"],
    up: ["ArrowUp", "KeyW", "pad:Up", "touch:up"], down: ["ArrowDown", "KeyS", "pad:Down", "touch:down"],
    undo: ["KeyZ", "Backspace", "pad:B", "touch:undo"], restart: ["KeyR", "pad:Y"], next: ["KeyN", "Enter", "Space", "pad:A"],
  },
});
const touch = game.input.touch;
touch.addButton("up", 26, 112, 24, 22, "▲");
touch.addButton("left", 2, 134, 24, 22, "◀");
touch.addButton("right", 50, 134, 24, 22, "▶");
touch.addButton("down", 26, 156, 24, 22, "▼");
touch.addButton("undo", 280, 150, 36, 26, "UNDO");

function savedLook() {
  try { return normalizeCharacter((JSON.parse(localStorage.getItem("kindling:characters")) || [])[0]); } catch { return normalizeCharacter({}); }
}
const sheet = characterSheet(savedLook());
const pictures = { floor: tileCanvas("dungeon_floor"), wall: tileCanvas("dungeon_wall"), crate: tileCanvas("crate"), button: tileCanvas("button") };
const audio = createAudio();
const progress = createStorage("kindling-puzzle");

let level, grid, player, history, moves, facing, won, slide;

function loadLevel(index) {
  level = (index + LEVELS.length) % LEVELS.length;
  const rows = LEVELS[level];
  const width = Math.max(...rows.map((row) => row.length));
  // grid[y][x] = { wall, goal, crate }. The player is kept apart, as x and y.
  grid = rows.map((row, y) => [...row.padEnd(width)].map((letter, x) => {
    if (letter === "@" || letter === "+") player = { x, y };
    return { wall: letter === "#", goal: ".+*".includes(letter), crate: "$*".includes(letter) };
  }));
  // Which cells are inside the room? Flood out from the player; walls stop the flood.
  const stack = [[player.x, player.y]];
  while (stack.length) {
    const [x, y] = stack.pop();
    const cell = grid[y]?.[x];
    if (!cell || cell.wall || cell.inside) continue;
    cell.inside = true;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  history = [];
  moves = 0;
  facing = "Down";
  won = false;
  slide = null;
}

const snapshot = () => ({ crates: grid.map((row) => row.map((cell) => cell.crate)), player: { ...player }, moves });
function restore(state) {
  grid.forEach((row, y) => row.forEach((cell, x) => (cell.crate = state.crates[y][x])));
  player = state.player;
  moves = state.moves;
}

function tryMove(dx, dy) {
  const next = grid[player.y + dy]?.[player.x + dx];
  if (!next || next.wall) return;
  if (next.crate) {
    const beyond = grid[player.y + dy * 2]?.[player.x + dx * 2];
    if (!beyond || beyond.wall || beyond.crate) return;   // blocked: nothing happens
    history.push(snapshot());
    next.crate = false;
    beyond.crate = true;
    playSfx(audio, "bounce", 0.3);
  } else history.push(snapshot());
  slide = { fromX: player.x, fromY: player.y, time: 0 };
  player = { x: player.x + dx, y: player.y + dy };
  moves++;
  // Won when no crate is left off a button.
  if (grid.every((row) => row.every((cell) => !cell.crate || cell.goal))) {
    won = true;
    playSfx(audio, "powerup");
    const best = progress.load("level-" + level, 0);
    if (!best || moves < best) progress.save("level-" + level, moves);
  }
}

function update(game, step) {
  if (slide) { slide.time += step; if (slide.time > 0.08) slide = null; }
  if (won) { if (game.actions.wasPressed("next")) loadLevel(level + 1); return; }
  const directions = { left: [-1, 0, "Left"], right: [1, 0, "Right"], up: [0, -1, "Up"], down: [0, 1, "Down"] };
  for (const name in directions) {
    if (game.actions.wasPressed(name)) { const [dx, dy, face] = directions[name]; facing = face; tryMove(dx, dy); }
  }
  if (game.actions.wasPressed("undo") && history.length) restore(history.pop());
  if (game.actions.wasPressed("restart")) loadLevel(level);
  if (game.input.keyboard.wasPressed("KeyN")) loadLevel(level + 1);
}

function render(game, context) {
  // Small rooms are drawn bigger: the largest whole-number zoom that fits.
  const zoom = Math.max(1, Math.min(3, Math.floor(Math.min(WIDTH / (grid[0].length * TILE), (HEIGHT - 16) / (grid.length * TILE)))));
  const width = grid[0].length * TILE, height = grid.length * TILE;
  context.save();
  context.translate(Math.floor((WIDTH - width * zoom) / 2), Math.floor((HEIGHT - height * zoom) / 2) + 6);
  context.scale(zoom, zoom);
  const left = 0, top = 0;
  grid.forEach((row, y) => row.forEach((cell, x) => {
    const screenX = left + x * TILE, screenY = top + y * TILE;
    if (cell.wall) { context.drawImage(pictures.wall, screenX, screenY); return; }
    if (!cell.inside) return;     // spaces outside the walls stay empty
    context.drawImage(pictures.floor, screenX, screenY);
    if (cell.goal) context.drawImage(pictures.button, screenX, screenY);
    if (cell.crate) {
      context.drawImage(pictures.crate, screenX, screenY);
      if (cell.goal) { context.fillStyle = "rgba(123, 211, 137, 0.35)"; context.fillRect(screenX, screenY, TILE, TILE); }
    }
  }));
  // The player slides between cells for a moment, so moves are easy to follow.
  const t = slide ? Math.min(1, slide.time / 0.08) : 1;
  const drawX = slide ? slide.fromX + (player.x - slide.fromX) * t : player.x;
  const drawY = slide ? slide.fromY + (player.y - slide.fromY) * t : player.y;
  const list = sheet.frames[(slide ? "walk" : "idle") + facing];
  const frame = list[slide ? 1 : 0];
  context.drawImage(sheet.canvas, frame.x, frame.y, frame.width, frame.height, Math.round(left + drawX * TILE), Math.round(top + drawY * TILE - 6), frame.width, frame.height);
  context.restore();

  const best = progress.load("level-" + level, 0);
  text(context, "ROOM " + (level + 1) + "/" + LEVELS.length + "   MOVES " + moves + (best ? "   BEST " + best : ""), 6, 4, { color: "#e9edf4" });
  if (won) {
    dim(context, WIDTH, HEIGHT, 0.55);
    text(context, "SOLVED in " + moves + (moves === 1 ? " move" : " moves"), WIDTH / 2, 70, { size: 16, align: "center", bold: true, color: "#7bd389" });
    text(context, "Enter, Space or N for the next room", WIDTH / 2, 96, { align: "center" });
  }
  touch.render(context);   // the on-screen buttons appear after the first touch
}

loadLevel(0);
game.scenes.add("play", { update, render });
game.start("play");
