// Game Code Example 19: Enemy waves and difficulty
// WHAT: Waves of enemies walk in from the edges; each wave has more, faster enemies.
//       Click enemies to pop them. A short break between waves lets you breathe.
// WHY:  A wave table is data, not code: tune difficulty by editing numbers. A small
//       "director" reads the table, spawns on a timer, and starts the next wave
//       when the field is clear. Pacing (tension, then relief) keeps players hooked.
// TRY:  Add a boss every 5th wave: one big enemy with 10 hit points.

import { createGame } from "kindling/game.js";
import { fillCircle, text } from "kindling/2d/draw.js";
import { createRandom } from "kindling/math/random.js";

const game = createGame({ width: 320, height: 180, background: "#141821" });
const random = createRandom(2);
// Wave n: how many enemies, how fast, how often they appear.
function waveSettings(wave) {
  return { count: 3 + wave * 2, speed: 25 + wave * 6, spawnEvery: Math.max(0.25, 1.2 - wave * 0.1) };
}
let wave = 0, toSpawn = 0, spawnTimer = 0, breakTimer = 2, enemies = [], popped = 0;

function spawnEnemy(settings) {
  const side = random.int(0, 3);
  const position = [{ x: -10, y: random.range(10, 170) }, { x: 330, y: random.range(10, 170) }, { x: random.range(10, 310), y: -10 }, { x: random.range(10, 310), y: 190 }][side];
  enemies.push({ ...position, speed: settings.speed * random.range(0.8, 1.2) });
}

game.scenes.add("play", {
  update(game, stepSeconds) {
    const settings = waveSettings(wave);
    if (toSpawn === 0 && enemies.length === 0) {                 // field clear: rest, then next wave
      breakTimer -= stepSeconds;
      if (breakTimer <= 0) { wave += 1; toSpawn = waveSettings(wave).count; breakTimer = 2; }
    }
    spawnTimer -= stepSeconds;
    if (toSpawn > 0 && spawnTimer <= 0) { spawnEnemy(settings); toSpawn -= 1; spawnTimer = settings.spawnEvery; }
    for (const enemy of enemies) {                                 // walk to the middle
      const angle = Math.atan2(90 - enemy.y, 160 - enemy.x);
      enemy.x += Math.cos(angle) * enemy.speed * stepSeconds;
      enemy.y += Math.sin(angle) * enemy.speed * stepSeconds;
    }
    const click = game.input.mouse.wasPressed(0) ? game.input.mouse.position : game.input.touch.wasTapped();
    if (click) {
      const before = enemies.length;
      enemies = enemies.filter((enemy) => Math.hypot(enemy.x - click.x, enemy.y - click.y) > 10);
      popped += before - enemies.length;
    }
    enemies = enemies.filter((enemy) => Math.hypot(enemy.x - 160, enemy.y - 90) > 8);   // reached the core
  },
  render(game, context) {
    fillCircle(context, 160, 90, 10, "#5ac8fa");
    for (const enemy of enemies) fillCircle(context, enemy.x, enemy.y, 6, "#ff6b81");
    const resting = toSpawn === 0 && enemies.length === 0;
    text(context, (resting ? "Get ready: wave " + (wave + 1) : "Wave " + wave) + " · popped " + popped, 6, 6, { color: "#9aa4b6" });
  },
});

game.start("play");
