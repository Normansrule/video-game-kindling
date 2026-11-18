// Game Code Example 03: Keyboard movement with actions
// WHAT: Move a square with WASD, the arrow keys or a gamepad, with acceleration and friction.
// WHY:  Name your controls once ("left", "right"...) and bind them to many keys. Game
//       code only asks game.actions.axis("left", "right"), never "is A or Left down?".
//       Accelerating toward a target speed feels much better than instant full speed.
// TRY:  Change ACCELERATION to 300 (floaty) or 4000 (snappy).

import { createGame } from "kindling/game.js";
import { fillRect, text } from "kindling/2d/draw.js";
import { approach, clamp } from "kindling/math/scalar.js";

const SPEED = 120;          // pixels per second
const ACCELERATION = 900;   // pixels per second, per second

const game = createGame({
  width: 320, height: 180, background: "#141821",
  actions: {
    left: ["KeyA", "ArrowLeft", "pad:LeftX-"],
    right: ["KeyD", "ArrowRight", "pad:LeftX+"],
    up: ["KeyW", "ArrowUp", "pad:LeftY-"],
    down: ["KeyS", "ArrowDown", "pad:LeftY+"],
  },
});
const player = { x: 150, y: 80, size: 16, velocityX: 0, velocityY: 0 };

game.scenes.add("play", {
  update(game, stepSeconds) {
    const inputX = game.actions.axis("left", "right");   // -1, 0 or +1
    const inputY = game.actions.axis("up", "down");
    // Move the velocity toward the target, a little each step.
    player.velocityX = approach(player.velocityX, inputX * SPEED, ACCELERATION * stepSeconds);
    player.velocityY = approach(player.velocityY, inputY * SPEED, ACCELERATION * stepSeconds);
    player.x = clamp(player.x + player.velocityX * stepSeconds, 0, game.width - player.size);
    player.y = clamp(player.y + player.velocityY * stepSeconds, 0, game.height - player.size);
  },
  render(game, context) {
    fillRect(context, player.x, player.y, player.size, player.size, "#5ac8fa");
    text(context, "WASD / arrows / gamepad", 6, 6, { color: "#9aa4b6" });
  },
});

game.start("play");
