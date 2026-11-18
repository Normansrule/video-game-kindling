// Game Code Example 02: The game loop and delta time
// WHAT: A ball moves and bounces. Its speed is in PIXELS PER SECOND, multiplied by
//       stepSeconds, so it moves the same on a 60 Hz and a 144 Hz screen.
// WHY:  update() runs at a fixed 60 steps a second (a "fixed timestep");
//       render() runs once per screen refresh. Rules go in update, drawing in render.
// TRY:  Set game.time.scale = 0.25 below for slow motion. Press ` (backtick) for the debug overlay.

import { createGame } from "kindling/game.js";
import { fillCircle, text } from "kindling/2d/draw.js";

const game = createGame({ width: 320, height: 180, background: "#141821" });
const ball = { x: 160, y: 90, radius: 8, velocityX: 140, velocityY: 95 };
game.time.scale = 1;   // 0.5 = half speed, 0 = paused

game.scenes.add("play", {
  update(game, stepSeconds) {
    // position += velocity * time. This one line is most of game physics.
    ball.x = ball.x + ball.velocityX * stepSeconds;
    ball.y = ball.y + ball.velocityY * stepSeconds;
    // Bounce: flip the velocity when the ball leaves the screen.
    if (ball.x < ball.radius || ball.x > game.width - ball.radius) ball.velocityX = -ball.velocityX;
    if (ball.y < ball.radius || ball.y > game.height - ball.radius) ball.velocityY = -ball.velocityY;
  },
  render(game, context) {
    fillCircle(context, ball.x, ball.y, ball.radius, "#ff9f43");
    text(context, "steps: " + game.time.steps + "   fps: " + game.time.fps, 6, 6, { color: "#9aa4b6" });
  },
});

game.start("play");
