// Game Code Example 09: Box collision (AABB) and pushing out
// WHAT: Move the blue box into the grey walls; it stops and slides along them.
// WHY:  AABB (Axis-Aligned Bounding Box) collision is the workhorse of 2D games:
//       two rectangles overlap when they overlap on x AND on y. rectPushOut() also
//       tells you the smallest move that separates them, so walls feel solid.
// TRY:  Make the walls move (change a wall's x in update) and see the box get pushed.

import { createGame } from "kindling/game.js";
import { fillRect, strokeRect, text } from "kindling/2d/draw.js";
import { rectsOverlap, rectPushOut } from "kindling/2d/collision.js";

const game = createGame({ width: 320, height: 180, background: "#141821",
  actions: { left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"] } });
const player = { x: 30, y: 80, width: 18, height: 18 };
const walls = [
  { x: 90, y: 30, width: 20, height: 120 },
  { x: 150, y: 60, width: 120, height: 18 },
  { x: 200, y: 110, width: 30, height: 40 },
];

game.scenes.add("play", {
  update(game, stepSeconds) {
    player.x += game.actions.axis("left", "right") * 100 * stepSeconds;
    player.y += game.actions.axis("up", "down") * 100 * stepSeconds;
    for (const wall of walls) {
      const push = rectPushOut(player, wall);   // null when not overlapping
      if (push) { player.x += push.x; player.y += push.y; }
    }
  },
  render(game, context) {
    for (const wall of walls) {
      fillRect(context, wall.x, wall.y, wall.width, wall.height, "#3a4458");
      // Outline the wall red while we touch it (touching = overlapping a 1 px bigger box).
      const grown = { x: wall.x - 1, y: wall.y - 1, width: wall.width + 2, height: wall.height + 2 };
      if (rectsOverlap(player, grown)) strokeRect(context, wall.x + 0.5, wall.y + 0.5, wall.width - 1, wall.height - 1, "#ff6b81");
    }
    fillRect(context, player.x, player.y, player.width, player.height, "#5ac8fa");
    text(context, "WASD into the walls", 6, 6, { color: "#9aa4b6" });
  },
});

game.start("play");
