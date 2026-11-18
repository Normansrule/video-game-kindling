// Game Code Example 11: Platformer physics with a tilemap
// WHAT: Run and jump on a level typed as text. Hold jump to jump higher.
// WHY:  createTilemap turns rows of characters into solid tiles; createBody +
//       moveAndCollide give gravity, landing and wall stops. Moving one axis at a time
//       is what makes you slide along walls instead of sticking.
//       Coyote time lets you jump a moment after leaving a ledge: it feels fair.
// TRY:  Change GRAVITY to 500 (moon) or JUMP_SPEED to 400. Add "=" one-way platforms.

import { createGame } from "kindling/game.js";
import { createTilemap } from "kindling/2d/tilemap.js";
import { createBody, moveAndCollide } from "kindling/2d/physics.js";
import { textureCanvases } from "kindling/world/textures.js";
import { approach } from "kindling/math/scalar.js";
import { fillRect } from "kindling/2d/draw.js";

const GRAVITY = 900, JUMP_SPEED = 300, RUN_SPEED = 100, COYOTE_SECONDS = 0.1;
const game = createGame({ width: 320, height: 176, pixelArt: true, background: "#7cc0ea",
  actions: { left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], jump: ["Space", "KeyW", "ArrowUp"] } });
const level = createTilemap({ tileSize: 16, solid: "#", rows: [
  "....................",
  "....................",
  "....................",
  "...............###..",
  "....................",
  "..........###.......",
  "....................",
  ".....###.........#..",
  "................##..",
  "#####....#####..##..",
  "####################",
] });
const textures = textureCanvases();
const player = createBody({ x: 20, y: 100, width: 12, height: 14, gravity: GRAVITY });
let coyote = 0;

game.scenes.add("play", {
  update(game, stepSeconds) {
    const move = game.actions.axis("left", "right");
    player.velocityX = approach(player.velocityX, move * RUN_SPEED, 1000 * stepSeconds);
    coyote = player.onGround ? COYOTE_SECONDS : coyote - stepSeconds;
    if (game.actions.wasPressed("jump") && coyote > 0) { player.velocityY = -JUMP_SPEED; coyote = 0; }
    // Let go early = shorter jump ("variable jump height").
    if (!game.actions.isDown("jump") && player.velocityY < 0) player.velocityY *= 0.85;
    moveAndCollide(player, stepSeconds, level);
    if (player.y > 200) { player.x = 20; player.y = 100; player.velocityY = 0; }
  },
  render(game, context) {
    level.draw(context, (tileContext, character, x, y, column, row) => {
      if (character !== "#") return;
      const grassOnTop = level.get(column, row - 1) !== "#";
      tileContext.drawImage(grassOnTop ? textures.grass_side : textures.dirt, x, y);
    });
    fillRect(context, Math.round(player.x), Math.round(player.y), player.width, player.height, "#ff9f43");
    fillRect(context, Math.round(player.x) + (player.velocityX < 0 ? 2 : 7), Math.round(player.y) + 3, 3, 3, "#1a0f04");
  },
});

game.start("play");
