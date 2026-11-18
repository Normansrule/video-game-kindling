// Game Code Example 12: Top-down movement on a tilemap
// WHAT: Walk around a little garden; walls, trees and water block you.
// WHY:  The same tilemap + moveAndCollide as a platformer, just with gravity 0 and
//       up/down movement. Most RPGs and adventure games are exactly this.
// TRY:  Add a "D" door tile that is solid until you press E next to it.

import { createGame } from "kindling/game.js";
import { createTilemap } from "kindling/2d/tilemap.js";
import { createBody, moveAndCollide } from "kindling/2d/physics.js";
import { textureCanvases } from "kindling/world/textures.js";
import { drawCharacterIcon } from "kindling/views/sprites.js";

const game = createGame({ width: 320, height: 176, pixelArt: true, background: "#000",
  actions: { left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"] } });
const map = createTilemap({ tileSize: 16, solid: "#~T", rows: [
  "####################",
  "#..................#",
  "#..T.....~~~~......#",
  "#........~~~~...T..#",
  "#..................#",
  "#.....####.........#",
  "#........#....T....#",
  "#..T.....#.........#",
  "#..................#",
  "#.........~~.......#",
  "####################",
] });
const textures = textureCanvases();
const TILE_TEXTURE = { "#": "brick", "~": "water", ".": "grass_top", T: "leaves" };
const player = createBody({ x: 40, y: 60, width: 10, height: 10 });
let facing = 0;

game.scenes.add("play", {
  update(game, stepSeconds) {
    const moveX = game.actions.axis("left", "right");
    const moveY = game.actions.axis("up", "down");
    const length = Math.hypot(moveX, moveY) || 1;   // diagonals are not faster
    player.velocityX = (moveX / length) * 80;
    player.velocityY = (moveY / length) * 80;
    if (moveX || moveY) facing = Math.atan2(-moveX, -moveY);
    moveAndCollide(player, stepSeconds, map);
  },
  render(game, context) {
    map.draw(context, (tileContext, character, x, y) => tileContext.drawImage(textures[TILE_TEXTURE[character]], x, y));
    drawCharacterIcon(context, player.x + 5, player.y + 5, 12, facing);
  },
});

game.start("play");
