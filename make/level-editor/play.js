// make/level-editor/play.js
// WHAT: A small platformer that plays whatever level is in the editor: run, jump,
//       grab coins, stomp enemies, avoid spikes, reach the flag.
// WHY:  Play-testing right away is the fastest way to find a jump that's too long.
//       It uses the same engine pieces as samples/2d/04-platformer (tilemap,
//       physics, collision), so a level that works here works there.
// DOC:  make/README.md

import { createTilemap } from "kindling/2d/tilemap.js";
import { createBody, moveAndCollide } from "kindling/2d/physics.js";
import { rectsOverlap } from "kindling/2d/collision.js";
import { approach, clamp } from "kindling/math/scalar.js";

const TILE = 16;
const WIDTH = 320;
const HEIGHT = 180;
// The same feel numbers as the platformer sample.
const RUN_SPEED = 95;
const ACCELERATION = 900;
const FRICTION = 1200;
const GRAVITY = 900;
const JUMP_SPEED = 290;
const COYOTE_SECONDS = 0.1;
const ENEMY_SPEED = 30;

// rows: the level text. colors: { char: "#hex" }. canvas: where to draw.
// input: { left(), right(), jump(), jumpHeld() } so keys and touch buttons both work.
// onStatus(text): messages for the page.
export function createPlaytest({ rows, colors, canvas, input, onStatus }) {
  const context = canvas.getContext("2d");
  let map, player, coins, enemies, flag, score, coyote, cameraX, cameraY, won, deaths;

  function reset() {
    map = createTilemap({ tileSize: TILE, rows, solid: "#B", oneWay: "=" });
    const start = map.replace("P", ".")[0] || { x: TILE, y: TILE };
    coins = map.replace("C", ".").map((spot) => ({ x: spot.x + 4, y: spot.y + 4, width: 8, height: 8 }));
    enemies = map.replace("E", ".").map((spot) => createBody({ x: spot.x + 2, y: spot.y + 4, width: 12, height: 12, gravity: GRAVITY, velocityX: -ENEMY_SPEED }));
    const flagSpot = map.find("F")[0];
    flag = flagSpot ? { x: flagSpot.x + 2, y: flagSpot.y, width: 12, height: 16 } : null;
    player = createBody({ x: start.x + 3, y: start.y + 2, width: 10, height: 14, gravity: GRAVITY });
    score = 0;
    coyote = 0;
    won = false;
    cameraX = player.x - WIDTH / 2;
    cameraY = player.y - HEIGHT / 2;
    onStatus(flag ? "Reach the flag. Coins: 0 / " + coins.length : "No flag (F) in this level: explore freely.");
  }
  deaths = 0;
  reset();

  function hurt() {
    deaths += 1;
    reset();
    onStatus("Ouch! Back to the start. (" + deaths + (deaths === 1 ? " try" : " tries") + " so far)");
  }

  function update(step) {
    if (won) return;
    const direction = (input.right() ? 1 : 0) - (input.left() ? 1 : 0);
    player.velocityX = direction
      ? approach(player.velocityX, direction * RUN_SPEED, ACCELERATION * step)
      : approach(player.velocityX, 0, FRICTION * step);
    coyote = player.onGround ? COYOTE_SECONDS : coyote - step;
    if (input.jump() && coyote > 0) {
      player.velocityY = -JUMP_SPEED;
      coyote = 0;
    }
    if (!input.jumpHeld() && player.velocityY < 0) player.velocityY *= Math.pow(0.45, step * 60);
    moveAndCollide(player, step, map);

    const under = map.get(map.columnAt(player.x + 5), map.rowAt(player.y + 15));
    if (under === "^" || player.y > map.height + 32) return hurt();

    for (const coin of coins) {
      if (!coin.taken && rectsOverlap(player, coin)) {
        coin.taken = true;
        score += 1;
        onStatus("Coins: " + score + " / " + coins.length);
      }
    }
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      moveAndCollide(enemy, step, map);
      const aheadX = enemy.velocityX > 0 ? enemy.x + enemy.width + 1 : enemy.x - 1;
      if (enemy.touching.left) enemy.velocityX = ENEMY_SPEED;
      else if (enemy.touching.right) enemy.velocityX = -ENEMY_SPEED;
      else if (enemy.onGround && !map.isSolidAt(aheadX, enemy.y + enemy.height + 1)) enemy.velocityX = -enemy.velocityX;
      if (rectsOverlap(player, enemy)) {
        if (player.velocityY > 0 && player.y + player.height - enemy.y < 8) {
          enemy.dead = true;
          player.velocityY = -220;
        } else {
          return hurt();
        }
      }
    }
    if (flag && rectsOverlap(player, flag)) {
      won = true;
      onStatus("Level complete! Coins: " + score + " / " + coins.length + ". Press Restart to try again.");
    }

    // Camera: follow the player, but never show outside the level.
    const targetX = clamp(player.x + 5 - WIDTH / 2, 0, Math.max(0, map.width - WIDTH));
    const targetY = clamp(player.y + 7 - HEIGHT / 2, 0, Math.max(0, map.height - HEIGHT));
    cameraX += (targetX - cameraX) * Math.min(1, step * 10);
    cameraY += (targetY - cameraY) * Math.min(1, step * 10);
  }

  function draw() {
    context.fillStyle = "#1d2235";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.save();
    context.translate(-Math.round(cameraX), -Math.round(cameraY));
    const firstColumn = Math.max(0, Math.floor(cameraX / TILE));
    const firstRow = Math.max(0, Math.floor(cameraY / TILE));
    for (let row = firstRow; row < Math.min(map.rows, firstRow + HEIGHT / TILE + 2); row++) {
      for (let column = firstColumn; column < Math.min(map.columns, firstColumn + WIDTH / TILE + 2); column++) {
        const char = map.get(column, row);
        if (char === "." || !colors[char]) continue;
        context.fillStyle = colors[char];
        if (char === "=") context.fillRect(column * TILE, row * TILE, TILE, 5);
        else if (char === "^") {
          context.beginPath();
          for (let i = 0; i < 2; i++) {
            context.moveTo(column * TILE + i * 8, row * TILE + TILE);
            context.lineTo(column * TILE + i * 8 + 4, row * TILE + 6);
            context.lineTo(column * TILE + i * 8 + 8, row * TILE + TILE);
          }
          context.fill();
        } else if (char !== "F") context.fillRect(column * TILE, row * TILE, TILE, TILE);
      }
    }
    if (flag) {
      context.fillStyle = "#e8eef7";
      context.fillRect(flag.x, flag.y, 2, 16);
      context.fillStyle = colors.F || "#2ecc71";
      context.fillRect(flag.x + 2, flag.y, 10, 7);
    }
    context.fillStyle = colors.C || "#ffd447";
    for (const coin of coins) if (!coin.taken) context.fillRect(coin.x, coin.y, coin.width, coin.height);
    context.fillStyle = colors.E || "#8e44ad";
    for (const enemy of enemies) if (!enemy.dead) context.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    context.fillStyle = colors.P || "#4fc3f7";
    context.fillRect(Math.round(player.x), Math.round(player.y), player.width, player.height);
    context.restore();
  }

  return { reset, update, draw, get won() { return won; } };
}
