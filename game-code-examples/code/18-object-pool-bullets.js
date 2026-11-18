// Game Code Example 18: Shooting with an object pool
// WHAT: Hold the mouse (or Space) to fire a stream of bullets toward the pointer.
// WHY:  Creating and throwing away hundreds of objects a second makes the garbage
//       collector pause your game now and then (a "stutter"). A pool creates every
//       bullet ONCE and reuses dead ones. The counter shows: always the same 200.
// TRY:  Make the gun spread: add a random angle of up to 0.1 radians to each shot.

import { createGame } from "kindling/game.js";
import { fillRect, fillCircle, text } from "kindling/2d/draw.js";

const game = createGame({ width: 320, height: 180, background: "#141821", actions: { fire: ["mouse:0", "Space"] } });
const POOL_SIZE = 200;
const pool = Array.from({ length: POOL_SIZE }, () => ({ alive: false, x: 0, y: 0, velocityX: 0, velocityY: 0 }));
const gun = { x: 160, y: 160, cooldown: 0 };

function fire(targetX, targetY) {
  const bullet = pool.find((item) => !item.alive);   // reuse a dead bullet
  if (!bullet) return;                                // pool empty: skip this shot
  const angle = Math.atan2(targetY - gun.y, targetX - gun.x);
  bullet.alive = true;
  bullet.x = gun.x;
  bullet.y = gun.y;
  bullet.velocityX = Math.cos(angle) * 300;
  bullet.velocityY = Math.sin(angle) * 300;
}

game.scenes.add("play", {
  update(game, stepSeconds) {
    gun.cooldown -= stepSeconds;
    if (game.actions.isDown("fire") && gun.cooldown <= 0) {
      fire(game.input.mouse.position.x, game.input.mouse.position.y);
      gun.cooldown = 0.04;   // 25 shots a second
    }
    for (const bullet of pool) {
      if (!bullet.alive) continue;
      bullet.x += bullet.velocityX * stepSeconds;
      bullet.y += bullet.velocityY * stepSeconds;
      if (bullet.x < -5 || bullet.x > 325 || bullet.y < -5 || bullet.y > 185) bullet.alive = false;  // back to the pool
    }
  },
  render(game, context) {
    let alive = 0;
    for (const bullet of pool) if (bullet.alive) { alive++; fillCircle(context, bullet.x, bullet.y, 2, "#ffd166"); }
    fillRect(context, gun.x - 6, gun.y - 6, 12, 12, "#5ac8fa");
    text(context, "bullets in use: " + alive + " / " + POOL_SIZE + " (never more objects)", 6, 6, { color: "#9aa4b6" });
  },
});

game.start("play");
