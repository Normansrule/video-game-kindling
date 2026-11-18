// samples/2d/02-snake/main.js
// WHAT: Snake. Eat food, grow, don't hit the walls or yourself.
// WHY:  Shows a game that moves on a GRID in ticks (every 0.1 s), not smoothly.
//       The fixed-step loop still runs at 60 Hz; we count time and move a whole
//       cell when enough has built up. Also: an input queue, so two quick turns
//       in one tick both count, and a saved high score.
// TEACHES: grid movement, timers, input buffering, arrays as a body, storage.
// README: samples/2d/02-snake/README.md

import { createGame } from "kindling/game.js";
import { fillRect, text, dim } from "kindling/2d/draw.js";
import { createParticles, presets } from "kindling/2d/particles.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { createStorage } from "kindling/core/storage.js";
import { createRandom } from "kindling/math/random.js";

// ---- Tuning -------------------------------------------------------------------
const CELL = 8;                  // pixels per grid cell
const COLUMNS = 40;
const ROWS = 22;
const START_SECONDS_PER_MOVE = 0.12;
const FASTEST_SECONDS_PER_MOVE = 0.05;
const SPEED_UP_PER_FOOD = 0.003;

const game = createGame({
  width: COLUMNS * CELL,
  height: ROWS * CELL,
  pixelArt: true,
  background: "#0f1a14",
  actions: {
    up: ["ArrowUp", "KeyW", "pad:Up", "pad:LeftY-", "touch:up"],
    down: ["ArrowDown", "KeyS", "pad:Down", "pad:LeftY+", "touch:down"],
    left: ["ArrowLeft", "KeyA", "pad:Left", "pad:LeftX-", "touch:left"],
    right: ["ArrowRight", "KeyD", "pad:Right", "pad:LeftX+", "touch:right"],
    start: ["Space", "Enter", "pad:A", "pad:Start"],
  },
});
// A thumb pad in the bottom-right corner for phones.
const padX = game.width - 66;
const padY = game.height - 66;
game.input.touch.addButton("up", padX + 22, padY, 22, 22, "▲");
game.input.touch.addButton("left", padX, padY + 22, 22, 22, "◀");
game.input.touch.addButton("right", padX + 44, padY + 22, 22, 22, "▶");
game.input.touch.addButton("down", padX + 22, padY + 44, 22, 22, "▼");

const random = createRandom();
const audio = createAudio();
const storage = createStorage("kindling-snake");
const particles = createParticles(200);

// ---- Game state ---------------------------------------------------------------
let snake = [];                  // list of { column, row }; snake[0] is the head
let direction = { x: 1, y: 0 };
let turnQueue = [];              // turns pressed but not used yet
let food = { column: 0, row: 0 };
let secondsPerMove = START_SECONDS_PER_MOVE;
let timeSinceMove = 0;
let score = 0;
let best = storage.load("best", 0);
let growBy = 0;

function placeFood() {
  // Try random cells until we find one the snake isn't on.
  while (true) {
    const column = random.int(1, COLUMNS - 2);
    const row = random.int(1, ROWS - 2);
    if (!snake.some((part) => part.column === column && part.row === row)) {
      food = { column, row };
      return;
    }
  }
}

function resetGame() {
  snake = [{ column: 10, row: 11 }, { column: 9, row: 11 }, { column: 8, row: 11 }];
  direction = { x: 1, y: 0 };
  turnQueue = [];
  secondsPerMove = START_SECONDS_PER_MOVE;
  timeSinceMove = 0;
  score = 0;
  growBy = 0;
  placeFood();
}

// Remember turns in order. Reject a turn straight back into yourself.
function queueTurn(x, y) {
  const last = turnQueue.length ? turnQueue[turnQueue.length - 1] : direction;
  if (last.x === -x && last.y === -y) return;   // reversing would eat your own neck
  if (last.x === x && last.y === y) return;     // same direction: nothing to do
  if (turnQueue.length < 3) turnQueue.push({ x, y });
}

function moveSnake() {
  if (turnQueue.length) direction = turnQueue.shift();
  const head = snake[0];
  const next = { column: head.column + direction.x, row: head.row + direction.y };

  // Walls are the outer ring of cells.
  const hitWall = next.column <= 0 || next.row <= 0 || next.column >= COLUMNS - 1 || next.row >= ROWS - 1;
  // The tail moves away this tick (unless growing), so it doesn't count.
  const body = growBy > 0 ? snake : snake.slice(0, -1);
  const hitSelf = body.some((part) => part.column === next.column && part.row === next.row);
  if (hitWall || hitSelf) {
    particles.emit({ ...presets.explosion, x: head.column * CELL + 4, y: head.row * CELL + 4 });
    playSfx(audio, "explosion");
    if (score > best) {
      best = score;
      storage.save("best", best);
    }
    game.scenes.push("gameOver");
    return;
  }

  snake.unshift(next);              // new head
  if (growBy > 0) growBy -= 1;
  else snake.pop();                 // drop the tail

  if (next.column === food.column && next.row === food.row) {
    score += 1;
    growBy += 2;
    secondsPerMove = Math.max(FASTEST_SECONDS_PER_MOVE, secondsPerMove - SPEED_UP_PER_FOOD);
    particles.emit({ ...presets.sparkle, x: food.column * CELL + 4, y: food.row * CELL + 4, colors: ["#ff6b6b", "#ffd166"] });
    playSfx(audio, "coin");
    placeFood();
  }
}

function drawBoard(context) {
  // Walls.
  fillRect(context, 0, 0, COLUMNS * CELL, CELL, "#2d4a3a");
  fillRect(context, 0, (ROWS - 1) * CELL, COLUMNS * CELL, CELL, "#2d4a3a");
  fillRect(context, 0, 0, CELL, ROWS * CELL, "#2d4a3a");
  fillRect(context, (COLUMNS - 1) * CELL, 0, CELL, ROWS * CELL, "#2d4a3a");
  // Food and snake (head brighter than body).
  fillRect(context, food.column * CELL + 1, food.row * CELL + 1, CELL - 2, CELL - 2, "#ff6b6b");
  for (let i = snake.length - 1; i >= 0; i--) {
    const part = snake[i];
    fillRect(context, part.column * CELL, part.row * CELL, CELL - 1, CELL - 1, i === 0 ? "#b8f2a0" : "#5fbf5f");
  }
  particles.render(context);
  text(context, "SCORE " + score + "   BEST " + best, 10, 0, { size: 8, color: "#d8f5d0" });
}

// ---- Scenes -------------------------------------------------------------------
game.scenes.add("title", {
  enter: resetGame,
  update(game) {
    if (game.actions.wasPressed("start") || game.input.touch.wasTapped()) game.scenes.switchTo("play");
  },
  render(game, context) {
    drawBoard(context);
    dim(context, game.width, game.height, 0.5);
    text(context, "SNAKE", game.width / 2, 50, { size: 24, align: "center", bold: true, color: "#b8f2a0" });
    text(context, "Arrows or WASD. Space or tap to start.", game.width / 2, 100, { align: "center" });
  },
});

game.scenes.add("play", {
  enter: resetGame,
  update(game, stepSeconds) {
    if (game.actions.wasPressed("up")) queueTurn(0, -1);
    if (game.actions.wasPressed("down")) queueTurn(0, 1);
    if (game.actions.wasPressed("left")) queueTurn(-1, 0);
    if (game.actions.wasPressed("right")) queueTurn(1, 0);
    particles.update(stepSeconds);
    // Move one whole cell each time enough time has built up.
    timeSinceMove += stepSeconds;
    while (timeSinceMove >= secondsPerMove && game.scenes.currentName() === "play") {
      timeSinceMove -= secondsPerMove;
      moveSnake();
    }
    game.debug.watch("length", snake.length);
    game.debug.watch("seconds per move", secondsPerMove);
  },
  render(game, context) {
    drawBoard(context);
  },
});

game.scenes.add("gameOver", {
  update(game, stepSeconds) {
    particles.update(stepSeconds);
    if (game.actions.wasPressed("start") || game.input.touch.wasTapped()) game.scenes.switchTo("play");
  },
  render(game, context) {
    dim(context, game.width, game.height, 0.55);
    text(context, "GAME OVER", game.width / 2, 55, { size: 16, align: "center", bold: true, color: "#ff8a80" });
    text(context, "Score " + score + " · Best " + best, game.width / 2, 85, { align: "center" });
    text(context, "Space or tap to try again", game.width / 2, 105, { align: "center", color: "#bbbbbb" });
  },
});

game.start("title");
