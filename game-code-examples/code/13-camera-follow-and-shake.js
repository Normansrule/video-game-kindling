// Game Code Example 13: Camera follow, zoom and shake
// WHAT: A big world bigger than the screen. The camera follows you smoothly, stays
//       inside the world, zooms with Z/X and shakes when you press Space.
// WHY:  The camera is just an offset: camera.begin() shifts everything you draw by
//       -camera.x, -camera.y. Draw the world between begin() and end(); draw the HUD after.
// TRY:  Set smoothing to 2 (lazy camera) or 30 (tight). Give it a deadZone.

import { createGame } from "kindling/game.js";
import { createCamera } from "kindling/2d/camera.js";
import { fillRect, fillCircle, text } from "kindling/2d/draw.js";
import { createRandom } from "kindling/math/random.js";

const WORLD = { x: 0, y: 0, width: 1200, height: 700 };
const game = createGame({ width: 320, height: 180, background: "#10131a",
  actions: { left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"], shake: ["Space"], zoomIn: ["KeyZ"], zoomOut: ["KeyX"] } });
const camera = createCamera({ width: 320, height: 180, bounds: WORLD, smoothing: 8 });
const player = { x: 600, y: 350, width: 12, height: 12 };
const random = createRandom(9);
const rocks = Array.from({ length: 120 }, () => ({ x: random.range(0, 1200), y: random.range(0, 700), size: random.range(3, 12) }));

game.scenes.add("play", {
  update(game, stepSeconds) {
    player.x += game.actions.axis("left", "right") * 150 * stepSeconds;
    player.y += game.actions.axis("up", "down") * 150 * stepSeconds;
    if (game.actions.wasPressed("shake")) camera.shake(6, 0.3);
    if (game.actions.isDown("zoomIn")) camera.zoom = Math.min(3, camera.zoom + stepSeconds);
    if (game.actions.isDown("zoomOut")) camera.zoom = Math.max(0.5, camera.zoom - stepSeconds);
    camera.follow(player, stepSeconds);
    camera.update(stepSeconds);
  },
  render(game, context) {
    camera.begin(context);
    fillRect(context, 0, 0, WORLD.width, WORLD.height, "#1d2a3a");
    for (const rock of rocks) fillCircle(context, rock.x, rock.y, rock.size, "#2f4256");
    fillRect(context, player.x, player.y, player.width, player.height, "#ff9f43");
    camera.end(context);
    text(context, "WASD move · Space shake · Z/X zoom " + camera.zoom.toFixed(1) + "x", 6, 6, { color: "#9aa4b6" });
  },
});

game.start("play");
