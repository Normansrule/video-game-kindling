// Game Code Example 15: Enemy AI with a state machine
// WHAT: A guard patrols between two points, CHASES you when you come close, and gives up
//       and RETURNS when you get away. Its color shows its state.
// WHY:  A "finite state machine" keeps AI readable: the enemy is in exactly one state,
//       each state has its own small update, and clear rules switch between them.
//       Almost every game enemy, from Pac-Man ghosts to bosses, is built like this.
// TRY:  Add a "search" state: after losing you, wait 2 seconds where it last saw you.

import { createGame } from "kindling/game.js";
import { fillRect, fillCircle, strokeCircle, text } from "kindling/2d/draw.js";

const SIGHT = 60, GIVE_UP = 100;
const game = createGame({ width: 320, height: 180, background: "#141821",
  actions: { left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"] } });
const player = { x: 40, y: 150 };
const guard = { x: 80, y: 60, state: "patrol", target: 0 };
const patrol = [{ x: 80, y: 60 }, { x: 240, y: 60 }];
const COLORS = { patrol: "#7bd389", chase: "#ff6b81", return: "#ffd166" };

function moveToward(thing, point, speed, stepSeconds) {
  const dx = point.x - thing.x, dy = point.y - thing.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return true;            // arrived
  const step = Math.min(distance, speed * stepSeconds);
  thing.x += (dx / distance) * step;
  thing.y += (dy / distance) * step;
  return false;
}

// One small function per state. Each returns the NEXT state.
const states = {
  patrol(stepSeconds, distanceToPlayer) {
    if (moveToward(guard, patrol[guard.target], 40, stepSeconds)) guard.target = 1 - guard.target;
    return distanceToPlayer < SIGHT ? "chase" : "patrol";
  },
  chase(stepSeconds, distanceToPlayer) {
    moveToward(guard, player, 70, stepSeconds);
    return distanceToPlayer > GIVE_UP ? "return" : "chase";
  },
  return(stepSeconds, distanceToPlayer) {
    if (distanceToPlayer < SIGHT) return "chase";
    return moveToward(guard, patrol[guard.target], 50, stepSeconds) ? "patrol" : "return";
  },
};

game.scenes.add("play", {
  update(game, stepSeconds) {
    player.x += game.actions.axis("left", "right") * 90 * stepSeconds;
    player.y += game.actions.axis("up", "down") * 90 * stepSeconds;
    const distance = Math.hypot(player.x - guard.x, player.y - guard.y);
    guard.state = states[guard.state](stepSeconds, distance);
  },
  render(game, context) {
    strokeCircle(context, guard.x, guard.y, SIGHT, "#3a4458");
    fillCircle(context, guard.x, guard.y, 8, COLORS[guard.state]);
    fillRect(context, player.x - 5, player.y - 5, 10, 10, "#5ac8fa");
    text(context, "guard: " + guard.state.toUpperCase() + "  (WASD to tease it)", 6, 6, { color: "#9aa4b6" });
  },
});

game.start("play");
