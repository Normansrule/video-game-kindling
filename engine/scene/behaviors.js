// engine/scene/behaviors.js
// WHAT: What each component DOES, one small function per component, run every step
//       for every entity that has it: player control, patrol, chase, fly, pickups,
//       hurting, springs, doors and goals.
// WHY:  This is the "system" half of entity + component: components are data (see
//       components.js), behaviors are code. Adding a component means adding its data
//       there and one function here.
// DOC:  docs/modules/scene.md (section "Behaviors")

import { moveAndCollide } from "../2d/physics.js";
import { approach } from "../math/scalar.js";

export const GRAVITY = 900;

export const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const center = (thing) => ({ x: thing.x + thing.width / 2, y: thing.y + thing.height / 2 });

// ---- The player ----
export function updatePlayer(world, player, step) {
  const { actions, platformer } = world;
  const settings = player.components.player;
  const moveX = actions.axis("left", "right");
  const moveY = actions.axis("up", "down");
  if (moveX) player.facing = moveX > 0 ? "right" : "left";
  if (platformer) {
    const climbing = world.tileFlagsAt(player, "climb");
    player.velocityX = approach(player.velocityX, moveX * settings.speed, (player.onGround ? 900 : 500) * step);
    player.coyote = player.onGround ? 0.1 : Math.max(0, player.coyote - step);
    if (climbing && moveY) { player.velocityY = moveY * settings.speed * 0.7; player.gravity = 0; }
    else player.gravity = climbing ? 0 : GRAVITY;
    if (climbing && !moveY) player.velocityY = 0;
    if (actions.wasPressed("jump") && (player.coyote > 0 || climbing)) {
      player.velocityY = -settings.jump;
      player.coyote = 0;
      world.sound("jump");
    }
    // Let go of jump early for a short hop.
    if (!actions.isDown("jump") && player.velocityY < -settings.jump * 0.45) player.velocityY = -settings.jump * 0.45;
  } else {
    const length = Math.hypot(moveX, moveY) || 1;
    player.velocityX = (moveX / length) * settings.speed;
    player.velocityY = (moveY / length) * settings.speed;
    if (moveY && !moveX) player.facing = moveY > 0 ? "down" : "up";
  }
  player.walking = Math.abs(player.velocityX) > 5 || (!platformer && Math.abs(player.velocityY) > 5);
  moveAndCollide(player, step, world.solids);
  player.invincible = Math.max(0, player.invincible - step);

  if (world.tileFlagsAt(player, "hurts")) world.hurtPlayer(1);
  if (world.tileFlagsAt(player, "goal")) world.win("You reached the flag!");
  if (player.y > world.height + 32) world.hurtPlayer(1, true);
}

// ---- Enemies and other movers ----
export function updatePatrol(world, thing, step) {
  const settings = thing.components.patrol;
  if (!thing.direction) thing.direction = -1;
  thing.velocityX = thing.direction * settings.speed;
  if (!world.platformer && !thing.components.fly) {
    thing.velocityY = 0;
  }
  // Ledge check: is there ground just past our front foot?
  if (world.platformer && settings.turnAtLedges && thing.onGround) {
    const footX = thing.direction > 0 ? thing.x + thing.width + 1 : thing.x - 1;
    if (!world.isSolidPoint(footX, thing.y + thing.height + 2)) thing.direction = -thing.direction;
  }
  if (thing.touching.left) thing.direction = 1;
  if (thing.touching.right) thing.direction = -1;
  thing.facing = thing.direction > 0 ? "right" : "left";
}

export function updateChase(world, thing, step) {
  const settings = thing.components.chase;
  const target = world.player;
  if (!target) return;
  const from = center(thing);
  const to = center(target);
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  if (distance > settings.range || distance < 1) {
    if (!thing.components.patrol) thing.velocityX = approach(thing.velocityX, 0, 200 * step);
    if (!world.platformer || thing.components.fly) thing.velocityY = thing.components.fly ? thing.velocityY : 0;
    return;
  }
  thing.velocityX = ((to.x - from.x) / distance) * settings.speed;
  if (!world.platformer || thing.components.fly) thing.velocityY = ((to.y - from.y) / distance) * settings.speed;
  thing.facing = to.x > from.x ? "right" : "left";
}

export function updateFly(world, thing, step) {
  const settings = thing.components.fly;
  thing.gravity = 0;
  if (thing.components.chase && Math.hypot(world.player.x - thing.x, world.player.y - thing.y) < thing.components.chase.range) return;
  const wanted = thing.homeY + Math.sin(world.time * settings.speed + thing.id) * settings.amplitude;
  thing.velocityY = (wanted - thing.y) * 6;
}

// Move anything with a body (the player moves itself in updatePlayer).
export function updateBody(world, thing, step) {
  thing.gravity = world.platformer && thing.components.body.gravity && !thing.components.fly ? GRAVITY : 0;
  moveAndCollide(thing, step, world.solids);
  if (thing.y > world.height + 64) thing.alive = false;
}

// ---- Things that react to touching the player ----
export function touchPlayer(world, thing) {
  const player = world.player;
  const c = thing.components;
  if (c.collectible) {
    world.collect(c.collectible.kind, c.collectible.value, thing);
    thing.alive = false;
  }
  if (c.hurt) {
    const falling = player.velocityY > 40;
    const fromAbove = player.y + player.height - thing.y < 8;
    if (world.platformer && c.hurt.stompable && falling && fromAbove) {
      thing.alive = false;
      player.velocityY = -player.components.player.jump * 0.7;
      world.burst(thing, "puff");
      world.sound("hit");
    } else {
      world.hurtPlayer(c.hurt.damage);
      player.velocityX = (player.x < thing.x ? -1 : 1) * 160;
      if (world.platformer) player.velocityY = -150;
    }
  }
  if (c.spring && player.velocityY > 0) {
    player.velocityY = -c.spring.power;
    world.sound("jump");
  }
  if (c.door && world.keys >= c.door.keys) {
    world.keys -= c.door.keys;
    thing.alive = false;
    world.burst(thing, "spark");
    world.sound("powerup");
  }
  if (c.goal) world.win(c.goal.message);
}
