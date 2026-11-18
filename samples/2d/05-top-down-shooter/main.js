// samples/2d/05-top-down-shooter/main.js
// WHAT: Survive waves of enemies in an arena. Move with WASD, aim with the mouse,
//       hold the button (or Space) to shoot. Gamepad: left stick moves, right stick aims.
// WHY:  Many moving things at once: bullets, enemies, particles. Shows how to keep
//       lists of objects, remove dead ones safely, and spawn in waves.
// TEACHES: vectors for aiming, circle collision, object lists, waves, hit feedback.
// README: samples/2d/05-top-down-shooter/README.md

import { createGame } from "kindling/game.js";
import * as vec2 from "kindling/math/vec2.js";
import { circlesOverlap } from "kindling/2d/collision.js";
import { fillCircle, fillRect, line, text, dim } from "kindling/2d/draw.js";
import { createParticles, presets } from "kindling/2d/particles.js";
import { createCamera } from "kindling/2d/camera.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { clamp } from "kindling/math/scalar.js";
import { createRandom } from "kindling/math/random.js";

const WIDTH = 320;
const HEIGHT = 180;
const PLAYER_SPEED = 90;
const PLAYER_RADIUS = 5;
const BULLET_SPEED = 260;
const SECONDS_BETWEEN_SHOTS = 0.12;
const ENEMY_RADIUS = 6;
const INVULNERABLE_SECONDS = 1;

const game = createGame({
  width: WIDTH,
  height: HEIGHT,
  background: "#15171f",
  actions: {
    left: ["KeyA", "ArrowLeft", "pad:LeftX-", "touch:left"],
    right: ["KeyD", "ArrowRight", "pad:LeftX+", "touch:right"],
    up: ["KeyW", "ArrowUp", "pad:LeftY-", "touch:up"],
    down: ["KeyS", "ArrowDown", "pad:LeftY+", "touch:down"],
    shoot: ["mouse:0", "Space", "pad:RT", "touch:shoot"],
    start: ["Space", "Enter", "mouse:0", "pad:A", "pad:Start"],
  },
});
const touch = game.input.touch;
touch.addButton("up", 26, 110, 24, 22, "▲");
touch.addButton("left", 2, 132, 24, 22, "◀");
touch.addButton("right", 50, 132, 24, 22, "▶");
touch.addButton("down", 26, 154, 24, 22, "▼");
touch.addButton("shoot", 270, 130, 46, 46, "FIRE");

const random = createRandom();
const audio = createAudio();
const particles = createParticles(600);
const camera = createCamera({ width: WIDTH, height: HEIGHT, smoothing: 0 });

let player;
let bullets;
let enemies;
let wave;
let score;
let shotCooldown;
let aim = { x: 1, y: 0 };

function resetGame() {
  player = { x: WIDTH / 2, y: HEIGHT / 2, radius: PLAYER_RADIUS, health: 3, invulnerable: 0 };
  bullets = [];
  enemies = [];
  wave = 0;
  score = 0;
  shotCooldown = 0;
  startNextWave();
}

// Each wave has more enemies, and some are fast. They appear at the edges.
function startNextWave() {
  wave += 1;
  const count = 3 + wave * 2;
  for (let i = 0; i < count; i++) {
    // Pick a side of the screen, then a random spot just outside it.
    const side = random.pick(["top", "right", "bottom", "left"]);
    let position;
    if (side === "top") position = { x: random.range(0, WIDTH), y: -10 };
    else if (side === "right") position = { x: WIDTH + 10, y: random.range(0, HEIGHT) };
    else if (side === "bottom") position = { x: random.range(0, WIDTH), y: HEIGHT + 10 };
    else position = { x: -10, y: random.range(0, HEIGHT) };
    const fast = random.chance(Math.min(0.1 * wave, 0.5));
    enemies.push({ ...position, radius: fast ? 4 : ENEMY_RADIUS, speed: fast ? 55 : 32 + wave * 2, health: fast ? 1 : 2, flash: 0 });
  }
}

function updateAim() {
  // Gamepad right stick wins if it is pushed; otherwise aim at the mouse.
  const stick = { x: game.input.gamepad.axis("RightX"), y: game.input.gamepad.axis("RightY") };
  if (vec2.length(stick) > 0.3) {
    aim = vec2.normalize(stick);
    return;
  }
  if (touch.isTouching()) {
    // On phones, aim at the nearest enemy.
    let nearest = null;
    for (const enemy of enemies) {
      if (!nearest || vec2.distance(enemy, player) < vec2.distance(nearest, player)) nearest = enemy;
    }
    if (nearest) aim = vec2.normalize(vec2.subtract(nearest, player));
    return;
  }
  const toMouse = vec2.subtract(game.input.mouse.position, player);
  if (vec2.length(toMouse) > 2) aim = vec2.normalize(toMouse);
}

function update(game, stepSeconds) {
  // Move: normalize so diagonals aren't faster than straight lines.
  const move = vec2.normalize({ x: game.actions.axis("left", "right"), y: game.actions.axis("up", "down") });
  player.x = clamp(player.x + move.x * PLAYER_SPEED * stepSeconds, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS);
  player.y = clamp(player.y + move.y * PLAYER_SPEED * stepSeconds, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS);
  player.invulnerable = Math.max(0, player.invulnerable - stepSeconds);
  updateAim();

  // Shoot while held, limited by a cooldown.
  shotCooldown -= stepSeconds;
  if (game.actions.isDown("shoot") && shotCooldown <= 0) {
    shotCooldown = SECONDS_BETWEEN_SHOTS;
    const spread = vec2.rotate(aim, random.range(-0.06, 0.06));
    bullets.push({ x: player.x + aim.x * 7, y: player.y + aim.y * 7, radius: 2, velocity: vec2.scale(spread, BULLET_SPEED), life: 1.2 });
    playSfx(audio, "laser", 0.1);
  }

  for (const bullet of bullets) {
    bullet.x += bullet.velocity.x * stepSeconds;
    bullet.y += bullet.velocity.y * stepSeconds;
    bullet.life -= stepSeconds;
  }

  for (const enemy of enemies) {
    // Walk straight at the player.
    const toPlayer = vec2.normalize(vec2.subtract(player, enemy));
    enemy.x += toPlayer.x * enemy.speed * stepSeconds;
    enemy.y += toPlayer.y * enemy.speed * stepSeconds;
    enemy.flash = Math.max(0, enemy.flash - stepSeconds);

    for (const bullet of bullets) {
      if (bullet.life > 0 && circlesOverlap(bullet, enemy)) {
        bullet.life = 0;
        enemy.health -= 1;
        enemy.flash = 0.08;
        // Knockback: shove the enemy along the bullet's direction.
        const push = vec2.scale(vec2.normalize(bullet.velocity), 6);
        enemy.x += push.x;
        enemy.y += push.y;
        if (enemy.health <= 0) {
          score += 10;
          particles.emit({ ...presets.explosion, count: 18, x: enemy.x, y: enemy.y });
          camera.shake(2, 0.12);
          playSfx(audio, "hit");
        }
      }
    }
    if (enemy.health > 0 && player.invulnerable === 0 && circlesOverlap(enemy, player)) {
      player.health -= 1;
      player.invulnerable = INVULNERABLE_SECONDS;
      camera.shake(6, 0.35);
      playSfx(audio, "explosion");
      particles.emit({ ...presets.blood, x: player.x, y: player.y });
      if (player.health <= 0) game.scenes.push("gameOver");
    }
  }

  // Remove dead things by building new lists (safer than deleting while looping).
  bullets = bullets.filter((bullet) => bullet.life > 0 && bullet.x > -10 && bullet.x < WIDTH + 10 && bullet.y > -10 && bullet.y < HEIGHT + 10);
  enemies = enemies.filter((enemy) => enemy.health > 0);
  if (enemies.length === 0) {
    startNextWave();
    playSfx(audio, "powerup");
  }

  particles.update(stepSeconds);
  camera.update(stepSeconds);
  game.debug.watch("bullets", bullets.length);
  game.debug.watch("enemies", enemies.length);
}

function render(game, context) {
  camera.begin(context);
  // Floor grid for a sense of motion.
  for (let x = 0; x < WIDTH; x += 20) fillRect(context, x, 0, 1, HEIGHT, "#1c1f2a");
  for (let y = 0; y < HEIGHT; y += 20) fillRect(context, 0, y, WIDTH, 1, "#1c1f2a");
  for (const enemy of enemies) {
    let color = enemy.radius < ENEMY_RADIUS ? "#ff9f43" : "#ee5253";   // small = fast
    if (enemy.flash > 0) color = "#ffffff";
    fillCircle(context, enemy.x, enemy.y, enemy.radius, color);
  }
  for (const bullet of bullets) fillCircle(context, bullet.x, bullet.y, bullet.radius, "#feca57");
  // Blink while invulnerable.
  if (player.invulnerable === 0 || Math.floor(player.invulnerable * 12) % 2 === 0) {
    fillCircle(context, player.x, player.y, player.radius, "#48dbfb");
    line(context, player.x, player.y, player.x + aim.x * 9, player.y + aim.y * 9, "#c8f7ff", 2);
  }
  particles.render(context);
  camera.end(context);
  text(context, "WAVE " + wave + "   SCORE " + score, 6, 6, { color: "#dddddd" });
  text(context, "♥".repeat(Math.max(player.health, 0)), WIDTH - 6, 4, { align: "right", size: 10, color: "#ff6b6b", font: "sans-serif" });
}

game.scenes.add("title", {
  enter: resetGame,
  update(game) {
    if (game.actions.wasPressed("start") || touch.wasTapped()) game.scenes.switchTo("play");
  },
  render(game, context) {
    text(context, "ARENA", WIDTH / 2, 50, { size: 24, align: "center", bold: true, color: "#48dbfb" });
    text(context, "WASD move · mouse aim · hold click to shoot", WIDTH / 2, 95, { align: "center" });
    text(context, "Click, Space or tap to start", WIDTH / 2, 115, { align: "center", color: "#aaaaaa" });
  },
});
game.scenes.add("play", { enter: resetGame, update, render });
game.scenes.add("gameOver", {
  update(game, stepSeconds) {
    particles.update(stepSeconds);
    if (game.input.keyboard.wasPressed("Enter") || game.input.keyboard.wasPressed("KeyR") || touch.wasTapped()) game.scenes.switchTo("play");
  },
  render(game, context) {
    dim(context, WIDTH, HEIGHT, 0.6);
    text(context, "GAME OVER", WIDTH / 2, 60, { size: 16, align: "center", bold: true, color: "#ff6b6b" });
    text(context, "Wave " + wave + " · Score " + score, WIDTH / 2, 90, { align: "center" });
    text(context, "Press R, Enter or tap to try again", WIDTH / 2, 110, { align: "center", color: "#aaaaaa" });
  },
});

game.start("title");
