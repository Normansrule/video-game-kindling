// templates/match-3/main.js
// WHAT: A match-three puzzle. Swap two neighbors to line up three or more of a kind.
//       Matches vanish, everything above falls, new pieces drop in, and chains score
//       more. 25 moves to get the highest score you can.
// WHY:  Match-three is a loop of four small steps: find matches, clear them, let
//       pieces fall, refill, then look for matches again (that is a "cascade").
//       Pieces store a drawn position that eases toward their grid position, so the
//       falling animation needs no animation system at all.
// GROW IT: special pieces for matches of 4 and 5, a goal ("clear 20 hearts"),
//       obstacles that need two matches, or hints after 5 seconds of no move.

import { createGame } from "kindling/game.js";
import { text, dim, strokeRect } from "kindling/2d/draw.js";
import { createParticles, presets } from "kindling/2d/particles.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { createRandom } from "kindling/math/random.js";
import { createStorage } from "kindling/core/storage.js";
import { spriteCanvas } from "kindling/library/sprites.js";
import { tileCanvas } from "kindling/library/tiles.js";

const SIZE = 8, CELL = 20, WIDTH = 320, HEIGHT = 180, LEFT = 150, TOP = 10, MOVES = 25;
const KINDS = ["gem", "heart", "star", "apple", "potion_blue", "coin"];
const pictures = KINDS.map((name) => spriteCanvas(name, 1));

const game = createGame({
  width: WIDTH, height: HEIGHT, pixelArt: true, background: "#1a1430",
  actions: { left: ["ArrowLeft", "KeyA", "pad:Left"], right: ["ArrowRight", "KeyD", "pad:Right"], up: ["ArrowUp", "KeyW", "pad:Up"], down: ["ArrowDown", "KeyS", "pad:Down"], pick: ["Space", "Enter", "pad:A"], restart: ["KeyR", "pad:Start"] },
});
const mouse = game.input.mouse;
const random = createRandom();
const audio = createAudio();
const particles = createParticles(400);
const best = createStorage("kindling-match3");
const floor = tileCanvas("tiles_blue");

let board, selected, cursor, score, moves, chain, busy, time, swapBack;

// A new board with no ready-made matches: pick again if a kind would make three.
function newBoard() {
  board = [];
  for (let row = 0; row < SIZE; row++) {
    board.push([]);
    for (let column = 0; column < SIZE; column++) {
      let kind;
      do kind = random.int(0, KINDS.length - 1);
      while ((column >= 2 && board[row][column - 1].kind === kind && board[row][column - 2].kind === kind) || (row >= 2 && board[row - 1][column].kind === kind && board[row - 2][column].kind === kind));
      board[row].push({ kind, drawY: row - SIZE - 2, drawX: column });
    }
  }
  selected = null; cursor = { column: 3, row: 3 }; score = 0; moves = MOVES; chain = 0; busy = 0; time = 0; swapBack = null;
}

// Every cell that is part of a horizontal or vertical line of 3 or more.
function findMatches() {
  const found = new Set();
  const scan = (get, length) => {
    for (let line = 0; line < SIZE; line++) {
      let run = 1;
      for (let index = 1; index <= length; index++) {
        const same = index < length && get(line, index) && get(line, index - 1) && get(line, index).kind === get(line, index - 1).kind;
        if (same) { run++; continue; }
        if (run >= 3) for (let back = 1; back <= run; back++) found.add(get(line, index - back));
        run = 1;
      }
    }
  };
  scan((row, column) => board[row][column], SIZE);
  scan((column, row) => board[row][column], SIZE);
  return found;
}

function swap(a, b) {
  const first = board[a.row][a.column];
  board[a.row][a.column] = board[b.row][b.column];
  board[b.row][b.column] = first;
}

function trySwap(a, b) {
  if (Math.abs(a.column - b.column) + Math.abs(a.row - b.row) !== 1 || moves <= 0) return;
  swap(a, b);
  if (findMatches().size) { moves--; chain = 0; busy = 0.18; playSfx(audio, "select"); }
  else { swapBack = { a, b }; busy = 0.18; playSfx(audio, "bounce", 0.3); }   // no match: swap back after the slide
}

// Clear matches, let pieces fall, refill from the top. Returns true if anything cleared.
function resolve() {
  const matches = findMatches();
  if (!matches.size) return false;
  chain++;
  score += matches.size * 10 * chain;
  playSfx(audio, chain > 1 ? "powerup" : "coin", 0.35);
  for (let column = 0; column < SIZE; column++) {
    const kept = [];
    for (let row = SIZE - 1; row >= 0; row--) {
      const piece = board[row][column];
      if (matches.has(piece)) particles.emit({ ...presets.sparkle, count: 6, x: LEFT + column * CELL + CELL / 2, y: TOP + row * CELL + CELL / 2 });
      else kept.push(piece);
    }
    let fresh = 0;
    for (let row = SIZE - 1; row >= 0; row--) {
      const piece = kept.shift() || { kind: random.int(0, KINDS.length - 1), drawY: -1 - fresh++, drawX: column };
      board[row][column] = piece;
    }
  }
  return true;
}

function update(game, step) {
  time += step;
  particles.update(step);
  // Ease every piece toward its cell. Falling pieces speed up a little like gravity.
  let settling = false;
  board.forEach((row, rowIndex) => row.forEach((piece, column) => {
    piece.drawX += (column - piece.drawX) * Math.min(1, step * 18);
    piece.drawY = Math.min(rowIndex, piece.drawY + step * (8 + Math.max(0, rowIndex - piece.drawY) * 6));
    if (Math.abs(column - piece.drawX) > 0.02 || piece.drawY < rowIndex - 0.02) settling = true;
  }));
  if (busy > 0) { busy -= step; return; }
  if (swapBack) { swap(swapBack.a, swapBack.b); swapBack = null; busy = 0.18; return; }
  if (!settling && resolve()) { busy = 0.15; return; }
  if (settling) return;
  if (moves <= 0) { if (score > best.load("best", 0)) best.save("best", score); if (game.actions.wasPressed("restart") || game.actions.wasPressed("pick") || mouse.wasPressed(0)) newBoard(); return; }
  if (game.actions.wasPressed("restart")) newBoard();

  // Mouse or touch: click one piece, then a neighbor. Dragging works too.
  const column = Math.floor((mouse.position.x - LEFT) / CELL), row = Math.floor((mouse.position.y - TOP) / CELL);
  const inside = column >= 0 && row >= 0 && column < SIZE && row < SIZE;
  if (mouse.wasPressed(0) && inside) {
    if (selected && Math.abs(selected.column - column) + Math.abs(selected.row - row) === 1) { trySwap(selected, { column, row }); selected = null; }
    else selected = { column, row };
    cursor = { column, row };
  }
  if (mouse.isDown(0) && selected && inside && (column !== selected.column || row !== selected.row)) { trySwap(selected, { column, row }); selected = null; }
  // Keyboard or gamepad: move a cursor, press to pick, move again to swap.
  for (const [name, dx, dy] of [["left", -1, 0], ["right", 1, 0], ["up", 0, -1], ["down", 0, 1]]) {
    if (!game.actions.wasPressed(name)) continue;
    const next = { column: Math.max(0, Math.min(SIZE - 1, cursor.column + dx)), row: Math.max(0, Math.min(SIZE - 1, cursor.row + dy)) };
    if (selected) { trySwap(selected, next); selected = null; } else cursor = next;
  }
  if (game.actions.wasPressed("pick")) selected = selected ? null : { ...cursor };
}

function render(game, context) {
  for (let row = 0; row < SIZE; row++) for (let column = 0; column < SIZE; column++) {
    context.globalAlpha = (row + column) % 2 ? 0.55 : 0.75;
    context.drawImage(floor, LEFT + column * CELL, TOP + row * CELL, CELL, CELL);
  }
  context.globalAlpha = 1;
  context.save();
  context.beginPath();
  context.rect(LEFT, TOP, SIZE * CELL, SIZE * CELL);
  context.clip();   // pieces falling in from above stay hidden until they enter the board
  board.forEach((row) => row.forEach((piece) => {
    const picture = pictures[piece.kind];
    context.drawImage(picture, Math.round(LEFT + piece.drawX * CELL + (CELL - picture.width) / 2), Math.round(TOP + piece.drawY * CELL + (CELL - picture.height) / 2));
  }));
  context.restore();
  if (selected) strokeRect(context, LEFT + selected.column * CELL + 1, TOP + selected.row * CELL + 1, CELL - 2, CELL - 2, "#ffd34d", 2);
  strokeRect(context, LEFT + cursor.column * CELL + 0.5, TOP + cursor.row * CELL + 0.5, CELL - 1, CELL - 1, "rgba(255,255,255,0.6)");
  particles.render(context);

  text(context, "MATCH THREE", 14, 14, { size: 14, bold: true, color: "#ffd34d" });
  text(context, "SCORE " + score, 14, 44, { color: "#ffffff" });
  text(context, "MOVES " + moves, 14, 60, { color: moves <= 5 ? "#ff6b81" : "#ffffff" });
  text(context, "BEST " + best.load("best", 0), 14, 76, { color: "#b39dff" });
  if (chain > 1 && busy > 0) text(context, "CHAIN x" + chain + "!", 14, 100, { color: "#7bd389", bold: true });
  text(context, "Swap neighbors to", 14, 130, { color: "#9aa4b6" });
  text(context, "line up 3 or more.", 14, 142, { color: "#9aa4b6" });
  if (moves <= 0 && busy <= 0 && !swapBack) {
    dim(context, WIDTH, HEIGHT, 0.6);
    text(context, "OUT OF MOVES", WIDTH / 2, 64, { size: 16, align: "center", bold: true, color: "#ffd34d" });
    text(context, "Score " + score + " · best " + best.load("best", 0), WIDTH / 2, 90, { align: "center" });
    text(context, "Click, Space or R for a new board", WIDTH / 2, 108, { align: "center", color: "#cccccc" });
  }
}

newBoard();
game.scenes.add("play", { update, render });
game.start("play");
