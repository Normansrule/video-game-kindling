// tiny/starter/main.js
// WHAT: Spark Hop, a one-screen game for size-limited jams: hop between ledges,
//       grab sparks before the timer runs out, dodge the bouncing embers.
// WHY:  A complete game (title, play, game over, best score) that packs to about
//       4 KB zipped, so you start a 13 KB jam with a working game and room to grow.
// RUN:  cd ~/projects/my-tiny-game && python3 -m http.server 8000
// PACK: cd ~/projects/kindling && node tiny/pack.mjs ~/projects/my-tiny-game

import { start, down, hit, pointer, grid, move, overlap, random, beep, load, save, text, clamp } from "../kindling-tiny.js";

const W = 160;
const H = 120;
const map = grid([
  "####################",
  "#..................#",
  "#..................#",
  "#....####....####..#",
  "#..................#",
  "#..................#",
  "#.####........####.#",
  "#..................#",
  "#.......####.......#",
  "#..................#",
  "#...###......###...#",
  "#..................#",
  "#..................#",
  "#..................#",
  "####################",
]);
const open = [];                      // empty tiles with ground (or a ledge) under them
map.rows.forEach((line, row) => [...line].forEach((c, column) => {
  if (c === "." && map.at(column, row + 1) === "#") open.push({ x: column * 8 + 2, y: row * 8 + 2 });
}));

let state = "title";
let player, spark, embers, score, timeLeft, best = load("spark-hop-best", 0), rand = random(7);

function reset() {
  player = { x: 76, y: 96, w: 6, h: 7, vx: 0, vy: 0, ground: false };
  embers = [];
  score = 0;
  timeLeft = 10;
  rand = random(7);
  placeSpark();
}

function placeSpark() {
  const spot = open[Math.floor(rand() * open.length)];
  spark = { x: spot.x, y: spot.y, w: 4, h: 4 };
}

// Touch: left third moves left, right third moves right, middle (or any tap high up) jumps.
const touchLeft = () => pointer.down && pointer.x < W / 3;
const touchRight = () => pointer.down && pointer.x > (W * 2) / 3;
const touchJump = () => pointer.hit && (pointer.y < H / 2 || (pointer.x >= W / 3 && pointer.x <= (W * 2) / 3));

function update(seconds) {
  if (state !== "play") {
    if (hit("Space", "Enter") || pointer.hit) {
      reset();
      state = "play";
      beep(660, 0.08);
    }
    return;
  }
  const direction = (down("ArrowRight", "KeyD") || touchRight() ? 1 : 0) - (down("ArrowLeft", "KeyA") || touchLeft() ? 1 : 0);
  player.vx = direction * 60;
  player.vy = clamp(player.vy + 500 * seconds, -400, 240);
  if (player.ground && (hit("Space", "ArrowUp", "KeyW", "KeyZ") || touchJump())) {
    player.vy = -190;
    beep(330, 0.08, "square", 0.1, 520);
  }
  move(player, seconds, map);

  if (overlap(player, spark)) {
    score += 1;
    timeLeft = Math.min(10, timeLeft + 3);
    beep(880, 0.1, "triangle", 0.15, 1320);
    placeSpark();
    // Every third spark adds an ember that bounces around the room.
    if (score % 3 === 0) embers.push({ x: 8 + rand() * 140, y: 10, w: 4, h: 4, vx: rand() < 0.5 ? -40 : 40, vy: 30 });
  }
  for (const ember of embers) {
    ember.x += ember.vx * seconds;
    ember.y += ember.vy * seconds;
    if (ember.x < 8 || ember.x > W - 12) ember.vx = -ember.vx;
    if (ember.y < 8 || ember.y > H - 12) ember.vy = -ember.vy;
    if (overlap(player, ember)) timeLeft = 0;
  }
  timeLeft -= seconds;
  if (timeLeft <= 0) {
    state = "over";
    if (score > best) save("spark-hop-best", (best = score));
    beep(200, 0.4, "sawtooth", 0.15, 60);
  }
}

function draw(context) {
  context.fillStyle = "#3a2a4a";
  map.rows.forEach((line, row) => [...line].forEach((c, column) => c === "#" && context.fillRect(column * 8, row * 8, 8, 8)));
  if (state === "play") {
    context.fillStyle = "#ffd447";
    context.fillRect(spark.x, spark.y, spark.w, spark.h);
    context.fillStyle = "#ff5a3c";
    for (const ember of embers) context.fillRect(ember.x, ember.y, ember.w, ember.h);
    context.fillStyle = "#8ef";
    context.fillRect(player.x, player.y, player.w, player.h);
    context.fillStyle = "#ffb347";
    context.fillRect(8, 3, (timeLeft / 10) * 144, 2);
    text(context, score, W / 2, 20, 8, "#fff");
  } else {
    text(context, state === "title" ? "SPARK HOP" : "SCORE " + score, W / 2, 46, 12, "#ffd447");
    text(context, "BEST " + best, W / 2, 62, 8, "#ccc");
    text(context, "SPACE OR TAP TO START", W / 2, 80, 6, "#fff");
  }
}

start({ width: W, height: H, update, draw, background: "#120c1c" });
