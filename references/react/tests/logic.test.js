// references/react/tests/logic.test.js
// WHAT: Node tests for the pure game logic (no browser, no React): `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createActions } from "../src/logic/actions.js";
import { createArena, stepArena, ARENA_WIDTH } from "../src/logic/arena.js";
import { createPlayer, stepPlayer, touchedCrystals, CRYSTALS } from "../src/logic/islands.js";
import { createRandom } from "../src/logic/random.js";

test("a tap shorter than one step still counts as a press", () => {
  const actions = createActions({ jump: ["Space"] });
  actions.keyDown("Space");
  actions.keyUp("Space");
  assert.equal(actions.wasPressed("jump"), true);
  assert.equal(actions.isDown("jump"), false);
  actions.endStep();
  assert.equal(actions.wasPressed("jump"), false);
});

test("seeded random repeats", () => {
  const a = createRandom(5), b = createRandom(5);
  assert.deepEqual([a.next(), a.next()], [b.next(), b.next()]);
});

test("arena: waves spawn and shooting scores", () => {
  const state = createArena(3);
  for (let i = 0; i < 60 * 6; i++) {
    const target = state.enemies[0] || { x: ARENA_WIDTH, y: 0 };
    stepArena(state, { moveX: 0, moveY: 0, aimX: target.x, aimY: target.y, firing: true }, 1 / 60);
  }
  assert.ok(state.wave >= 1);
  assert.ok(state.score > 0);
});

test("arena: running out of lives ends the game", () => {
  const state = createArena(1);
  state.lives = 1;
  state.enemies.push({ x: state.player.x, y: state.player.y, vx: 0, vy: 0, kind: "chaser", spin: 0, flash: 0, radius: 10, health: 9, speed: 0 });
  stepArena(state, { moveX: 0, moveY: 0, aimX: 0, aimY: 0, firing: false }, 1 / 60);
  assert.equal(state.over, true);
});

test("islands: the player lands on the start island and can jump", () => {
  const player = createPlayer();
  player.y = 2;
  for (let i = 0; i < 120; i++) stepPlayer(player, { moveX: 0, moveZ: 0 }, 0, 1 / 60);
  assert.equal(player.onGround, true);
  assert.ok(Math.abs(player.y) < 1e-6);
  const { jumped } = stepPlayer(player, { moveX: 0, moveZ: 0, jumpPressed: true }, 0, 1 / 60);
  assert.equal(jumped, true);
  assert.ok(player.vy > 0);
});

test("islands: touching a crystal collects it", () => {
  const player = createPlayer();
  [player.x, player.y, player.z] = [CRYSTALS[0][0], CRYSTALS[0][1] - 0.5, CRYSTALS[0][2]];
  assert.deepEqual(touchedCrystals(player, [0, 1]), [0]);
});
