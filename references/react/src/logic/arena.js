// references/react/src/logic/arena.js
// WHAT: All the rules of Neon arena as plain functions on a plain object: no React, no
//       canvas. createArena() makes the state, stepArena() advances it by one fixed step.
// WHY:  This split is the most useful React game pattern. The logic can be unit-tested in
//       Node (tests/arena.test.js), and the component only draws `state` and shows a HUD.
//       The state is mutated in place for speed; React never sees it directly.
import { createRandom } from "./random.js";

export const ARENA_WIDTH = 640;
export const ARENA_HEIGHT = 360;
const PLAYER_SPEED = 220;
const FIRE_SECONDS = 0.09;
const BULLET_SPEED = 660;

export function createArena(seed = 7) {
  return {
    random: createRandom(seed),
    player: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2, vx: 0, vy: 0, aim: 0, radius: 9 },
    bullets: [],
    enemies: [],
    particles: [],
    fireTimer: 0,
    wave: 0,
    waveTimer: 1,
    score: 0,
    lives: 3,
    invulnerable: 0,
    hitStop: 0,
    shake: 0,
    time: 0,
    over: false,
  };
}

// input: { moveX, moveY, aimX, aimY, firing } with aim in arena pixels.
export function stepArena(state, input, seconds) {
  state.time += seconds;
  updateParticles(state, seconds);
  state.shake = Math.max(0, state.shake - seconds * 1.5);
  if (state.over) return;
  if (state.hitStop > 0) {   // a few frozen frames make big hits feel heavy
    state.hitStop -= seconds;
    return;
  }
  const player = state.player;
  const length = Math.hypot(input.moveX, input.moveY) || 1;
  const smooth = 1 - Math.pow(0.0005, seconds);   // frame-rate-independent damping
  player.vx += (input.moveX / length * PLAYER_SPEED - player.vx) * smooth;
  player.vy += (input.moveY / length * PLAYER_SPEED - player.vy) * smooth;
  player.x = clamp(player.x + player.vx * seconds, 12, ARENA_WIDTH - 12);
  player.y = clamp(player.y + player.vy * seconds, 12, ARENA_HEIGHT - 12);
  player.aim = Math.atan2(input.aimY - player.y, input.aimX - player.x);

  state.fireTimer -= seconds;
  if (input.firing && state.fireTimer <= 0) {
    state.fireTimer = FIRE_SECONDS;
    const direction = player.aim + state.random.range(-0.05, 0.05);
    state.bullets.push({ x: player.x, y: player.y, vx: Math.cos(direction) * BULLET_SPEED, vy: Math.sin(direction) * BULLET_SPEED, life: 1 });
    burst(state, player.x + Math.cos(player.aim) * 12, player.y + Math.sin(player.aim) * 12, 3, "#ffd27a", 60, 160, 0.05, 0.15);
    state.shake = Math.min(1, state.shake + 0.03);
  }
  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * seconds;
    bullet.y += bullet.vy * seconds;
    bullet.life -= seconds;
  }
  state.bullets = state.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < ARENA_WIDTH && b.y > 0 && b.y < ARENA_HEIGHT);

  if (state.enemies.length === 0) {
    state.waveTimer -= seconds;
    if (state.waveTimer <= 0) {
      state.wave += 1;
      for (let i = 0; i < 3 + state.wave * 2; i++) spawnEnemy(state);
      state.waveTimer = 1.5;
    }
  }
  updateEnemies(state, seconds);
  state.invulnerable -= seconds;
}

function spawnEnemy(state) {
  const random = state.random;
  const side = random.pick(["top", "bottom", "left", "right"]);
  const x = side === "left" ? 0 : side === "right" ? ARENA_WIDTH : random.range(0, ARENA_WIDTH);
  const y = side === "top" ? 0 : side === "bottom" ? ARENA_HEIGHT : random.range(0, ARENA_HEIGHT);
  const kind = state.wave > 1 && random.next() < 0.35 ? "drifter" : "chaser";
  state.enemies.push({
    x, y, vx: 0, vy: 0, kind, spin: random.range(0, Math.PI * 2), flash: 0,
    radius: kind === "chaser" ? 10 : 14, health: kind === "chaser" ? 2 : 4,
    speed: random.range(70, 110) + state.wave * 6,
  });
}

function updateEnemies(state, seconds) {
  const player = state.player;
  const steer = 1 - Math.pow(0.1, seconds);
  for (const enemy of state.enemies) {
    let angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    if (enemy.kind === "drifter") angle += Math.sin(state.time * 2 + enemy.spin) * 0.9;
    enemy.vx += (Math.cos(angle) * enemy.speed - enemy.vx) * steer;
    enemy.vy += (Math.sin(angle) * enemy.speed - enemy.vy) * steer;
    enemy.x += enemy.vx * seconds;
    enemy.y += enemy.vy * seconds;
    enemy.spin += seconds * 3;
    enemy.flash -= seconds;
    for (const bullet of state.bullets) {
      if (bullet.life > 0 && circlesOverlap(bullet.x, bullet.y, 4, enemy.x, enemy.y, enemy.radius)) {
        bullet.life = 0;
        enemy.health -= 1;
        enemy.flash = 0.08;
        enemy.vx += bullet.vx * 0.15;
        enemy.vy += bullet.vy * 0.15;
      }
    }
    if (state.invulnerable <= 0 && circlesOverlap(player.x, player.y, player.radius, enemy.x, enemy.y, enemy.radius)) {
      hurt(state);
    }
  }
  for (const enemy of state.enemies) {
    if (enemy.health > 0) continue;
    burst(state, enemy.x, enemy.y, 26, enemy.kind === "chaser" ? "#ff46aa" : "#96ff6e", 80, 340, 0.3, 0.8);
    state.score += 10 * state.wave;
    state.shake = Math.min(1, state.shake + 0.12);
    state.hitStop = 0.03;
  }
  state.enemies = state.enemies.filter((enemy) => enemy.health > 0);
}

function hurt(state) {
  state.lives -= 1;
  state.invulnerable = 1.2;
  state.shake = Math.min(1, state.shake + 0.7);
  state.hitStop = 0.12;
  burst(state, state.player.x, state.player.y, 50, "#46dcff", 120, 440, 0.4, 1);
  if (state.lives <= 0) state.over = true;
}

function burst(state, x, y, count, color, minSpeed, maxSpeed, minLife, maxLife) {
  const random = state.random;
  for (let i = 0; i < count && state.particles.length < 2500; i++) {
    const angle = random.range(0, Math.PI * 2);
    const speed = random.range(minSpeed, maxSpeed);
    const life = random.range(minLife, maxLife);
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, size: random.range(2, 5), color });
  }
}

function updateParticles(state, seconds) {
  const slow = Math.max(0, 1 - 2.5 * seconds);
  for (const particle of state.particles) {
    particle.life -= seconds;
    particle.vx *= slow;
    particle.vy *= slow;
    particle.x += particle.vx * seconds;
    particle.y += particle.vy * seconds;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

export function circlesOverlap(ax, ay, aRadius, bx, by, bRadius) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy < (aRadius + bRadius) * (aRadius + bRadius);
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}
