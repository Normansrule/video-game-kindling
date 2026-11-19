// templates/tower-defense/main.js
// WHAT: Tower defense. Monsters walk along the path; build towers on the grass to stop
//       them before they reach the castle. Each kill pays coins. Upgrade towers by
//       clicking them. Survive all the waves.
// WHY:  Shows three ideas every strategy game needs: following a path made of
//       waypoints, "find the nearest target in range", and spending a resource.
//       The rules are in four small tables (PATH, WAVES, MONSTERS, TOWER) so you can
//       rebalance the whole game without touching the code below them.
// GROW IT: a second tower type (slow, splash), flying monsters that ignore the path,
//       selling towers, or a map editor made with the scene editor's tiles.

import { createGame } from "kindling/game.js";
import { text, dim, fillCircle, strokeCircle, line } from "kindling/2d/draw.js";
import { createParticles, presets } from "kindling/2d/particles.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { tileCanvas } from "kindling/library/tiles.js";
import { spriteFrames } from "kindling/library/sprites.js";

const TILE = 16, COLUMNS = 20, ROWS = 10, TOP = 20, WIDTH = 320, HEIGHT = 180;
// The path, as corners in tile coordinates. Monsters walk from the first to the last.
const PATH = [[-1, 2], [4, 2], [4, 7], [9, 7], [9, 1], [14, 1], [14, 6], [17, 6], [17, 3], [20, 3]];
const MONSTERS = {
  slime: { sprite: "slime", health: 4, speed: 22, reward: 2 },
  bat: { sprite: "bat", health: 3, speed: 40, reward: 2 },
  skeleton: { sprite: "skeleton", health: 12, speed: 18, reward: 4 },
  ghost: { sprite: "ghost", health: 24, speed: 14, reward: 8 },
};
const WAVES = [
  "slime x6", "slime x8, bat x4", "bat x10", "skeleton x5, slime x6", "slime x10, skeleton x6",
  "bat x16", "skeleton x10, bat x8", "ghost x3, skeleton x8", "ghost x6, bat x14", "ghost x10, skeleton x12",
];
const TOWER = { cost: 10, upgrade: [15, 25], range: [36, 44, 54], damage: [1, 2, 4], reload: [0.6, 0.5, 0.4] };

const game = createGame({ width: WIDTH, height: HEIGHT, pixelArt: true, background: "#1d2a1d", actions: { wave: ["Space", "Enter", "pad:A"], restart: ["KeyR"] } });
const mouse = game.input.mouse;
const audio = createAudio();
const particles = createParticles(300);
const pictures = { grass: tileCanvas("grass"), path: tileCanvas("path"), tower: tileCanvas("stone_block"), castle: tileCanvas("castle_wall"), tree: tileCanvas("tree"), flowers: tileCanvas("flowers_yellow"), rock: tileCanvas("rock") };
const frames = Object.fromEntries(Object.keys(MONSTERS).map((name) => [name, spriteFrames(MONSTERS[name].sprite)]));

// Which cells are path? Walk the corners and mark every cell in between.
const pathCells = new Set();
for (let index = 1; index < PATH.length; index++) {
  const [x1, y1] = PATH[index - 1], [x2, y2] = PATH[index];
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) pathCells.add(x + "," + y);
}
const decorations = [[1, 6, "tree"], [2, 8, "flowers"], [7, 4, "rock"], [12, 8, "tree"], [11, 3, "flowers"], [16, 9, "rock"], [6, 0, "tree"]];

let towers, monsters, shots, coins, lives, wave, queue, spawnClock, state, time;
function reset() {
  towers = []; monsters = []; shots = [];
  coins = 30; lives = 10; wave = 0; queue = []; spawnClock = 0; state = "build"; time = 0;
}

function startWave() {
  if (state !== "build" || wave >= WAVES.length) return;
  // "slime x6, bat x4" -> ["slime", "slime", ... "bat", ...]
  queue = WAVES[wave].split(",").flatMap((part) => { const [name, count] = part.trim().split(" x"); return Array(Number(count)).fill(name); });
  wave++;
  state = "wave";
  playSfx(audio, "select");
}

// Where is a monster after walking "distance" pixels along the path?
const corners = PATH.map(([x, y]) => ({ x: x * TILE + TILE / 2, y: TOP + y * TILE + TILE / 2 }));
function pointAlong(distance) {
  for (let index = 1; index < corners.length; index++) {
    const a = corners[index - 1], b = corners[index];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (distance <= length) return { x: a.x + ((b.x - a.x) * distance) / length, y: a.y + ((b.y - a.y) * distance) / length, done: false };
    distance -= length;
  }
  return { ...corners[corners.length - 1], done: true };
}

function clickCell(column, row) {
  if (column < 0 || row < 0 || column >= COLUMNS || row >= ROWS || pathCells.has(column + "," + row)) return;
  const tower = towers.find((item) => item.column === column && item.row === row);
  if (tower) {
    const price = TOWER.upgrade[tower.level];
    if (price !== undefined && coins >= price) { coins -= price; tower.level++; playSfx(audio, "powerup"); }
    return;
  }
  if (decorations.some(([x, y]) => x === column && y === row) || coins < TOWER.cost) return;
  coins -= TOWER.cost;
  towers.push({ column, row, x: column * TILE + 8, y: TOP + row * TILE + 8, level: 0, reload: 0 });
  playSfx(audio, "bounce");
}

function update(game, step) {
  time += step;
  if (state === "won" || state === "lost") { if (game.actions.wasPressed("restart") || game.actions.wasPressed("wave")) reset(); return; }
  if (game.actions.wasPressed("wave")) startWave();
  if (mouse.wasPressed(0)) {
    const { x, y } = mouse.position;
    if (y < TOP && x > WIDTH - 86) startWave();
    else clickCell(Math.floor(x / TILE), Math.floor((y - TOP) / TILE));
  }

  // Spawn the queued monsters one by one.
  spawnClock -= step;
  if (queue.length && spawnClock <= 0) {
    const name = queue.shift();
    const type = MONSTERS[name];
    const toughness = 1 + wave * 0.12;   // later waves are a bit tougher
    monsters.push({ name, distance: 0, health: type.health * toughness, maxHealth: type.health * toughness, speed: type.speed, reward: type.reward, x: -8, y: 0, flash: 0 });
    spawnClock = 0.75;
  }

  for (const monster of monsters) {
    monster.distance += monster.speed * step;
    Object.assign(monster, pointAlong(monster.distance));
    monster.flash = Math.max(0, monster.flash - step);
    if (monster.done) { monster.health = 0; lives--; playSfx(audio, "hit"); if (lives <= 0) { state = "lost"; playSfx(audio, "lose"); } }
  }

  // Towers: pick the monster in range that has walked the FARTHEST (closest to the castle).
  for (const tower of towers) {
    tower.reload -= step;
    if (tower.reload > 0) continue;
    let target = null;
    for (const monster of monsters) {
      if (monster.health > 0 && Math.hypot(monster.x - tower.x, monster.y - tower.y) <= TOWER.range[tower.level] && (!target || monster.distance > target.distance)) target = monster;
    }
    if (!target) continue;
    tower.reload = TOWER.reload[tower.level];
    shots.push({ x: tower.x, y: tower.y - 6, target, damage: TOWER.damage[tower.level] });
    playSfx(audio, "laser", 0.08);
  }
  for (const shot of shots) {
    const dx = shot.target.x - shot.x, dy = shot.target.y - shot.y, distance = Math.hypot(dx, dy);
    if (distance < 4 || shot.target.health <= 0) {
      shot.hit = true;
      if (shot.target.health > 0) {
        shot.target.health -= shot.damage;
        shot.target.flash = 0.08;
        if (shot.target.health <= 0) { coins += shot.target.reward; particles.emit({ ...presets.explosion, count: 10, x: shot.target.x, y: shot.target.y }); playSfx(audio, "coin", 0.25); }
      }
    } else { shot.x += (dx / distance) * 220 * step; shot.y += (dy / distance) * 220 * step; }
  }
  shots = shots.filter((shot) => !shot.hit);
  monsters = monsters.filter((monster) => monster.health > 0);
  if (state === "wave" && !queue.length && !monsters.length) { state = wave >= WAVES.length ? "won" : "build"; coins += 5; playSfx(audio, "powerup"); }
  particles.update(step);
}

function render(game, context) {
  for (let row = 0; row < ROWS; row++) for (let column = 0; column < COLUMNS; column++) {
    context.drawImage(pathCells.has(column + "," + row) ? pictures.path : pictures.grass, column * TILE, TOP + row * TILE);
  }
  for (const [x, y, name] of decorations) context.drawImage(pictures[name], x * TILE, TOP + y * TILE);
  context.drawImage(pictures.castle, 19 * TILE, TOP + 2 * TILE);
  context.drawImage(pictures.castle, 19 * TILE, TOP + 4 * TILE);
  // Hovered cell: show the range a tower there would have.
  const hover = { column: Math.floor(mouse.position.x / TILE), row: Math.floor((mouse.position.y - TOP) / TILE) };
  const hovered = towers.find((tower) => tower.column === hover.column && tower.row === hover.row);
  if (hovered) strokeCircle(context, hovered.x, hovered.y, TOWER.range[hovered.level], "rgba(255,255,255,0.5)");
  else if (mouse.isInside() && hover.row >= 0 && !pathCells.has(hover.column + "," + hover.row)) strokeCircle(context, hover.column * TILE + 8, TOP + hover.row * TILE + 8, TOWER.range[0], "rgba(255,255,255,0.25)");
  for (const tower of towers) {
    context.drawImage(pictures.tower, tower.x - 8, tower.y - 8);
    fillCircle(context, tower.x, tower.y - 2, 3 + tower.level, ["#5ac8fa", "#ffd34d", "#ff6b81"][tower.level]);
  }
  for (const monster of monsters) {
    const list = frames[monster.name];
    const image = list[Math.floor(time * 6) % list.length];
    context.globalAlpha = monster.flash > 0 ? 0.5 : 1;
    context.drawImage(image, Math.round(monster.x - image.width / 2), Math.round(monster.y - image.height / 2));
    context.globalAlpha = 1;
    line(context, monster.x - 6, monster.y - 9, monster.x - 6 + 12 * (monster.health / monster.maxHealth), monster.y - 9, "#7bd389", 2);
  }
  for (const shot of shots) fillCircle(context, shot.x, shot.y, 1.5, "#ffffff");
  particles.render(context);

  context.fillStyle = "#10131a";
  context.fillRect(0, 0, WIDTH, TOP);
  text(context, "COINS " + coins + "   LIVES " + lives + "   WAVE " + wave + "/" + WAVES.length, 6, 5, { color: "#e9edf4" });
  const ready = state === "build" && wave < WAVES.length;
  context.fillStyle = ready ? "#ff9f43" : "#2a3140";
  context.fillRect(WIDTH - 84, 2, 82, 16);
  text(context, ready ? "▶ NEXT WAVE" : queue.length + monsters.length + " LEFT", WIDTH - 43, 5, { align: "center", color: ready ? "#1a0f04" : "#9aa4b6" });
  if (state === "build" && wave === 0) text(context, "Click grass to build a tower (10 coins)", WIDTH / 2, TOP + ROWS * TILE - 12, { align: "center", color: "#ffffff" });
  if (state === "won" || state === "lost") {
    dim(context, WIDTH, HEIGHT, 0.6);
    text(context, state === "won" ? "THE CASTLE IS SAFE!" : "THE CASTLE FELL", WIDTH / 2, 70, { size: 16, align: "center", bold: true, color: state === "won" ? "#ffd34d" : "#ff6b81" });
    text(context, "Space or R to play again", WIDTH / 2, 96, { align: "center" });
  }
}

reset();
game.scenes.add("play", { update, render });
game.start("play");
