// Game Code Example 06: Scenes: title, play, pause, game over
// WHAT: A tiny dodge game with a title screen, a pause menu (P) and a game over screen.
// WHY:  A scene is one "screen" of your game. switchTo() replaces the scene; push()
//       puts one ON TOP (the game keeps drawing underneath a pause menu); pop() removes it.
//       game.state holds anything that must survive scene changes (best score).
// TRY:  Add a "how to play" scene between title and play.

import { createGame } from "kindling/game.js";
import { fillRect, fillCircle, text, dim } from "kindling/2d/draw.js";
import { createRandom } from "kindling/math/random.js";

const game = createGame({
  width: 320, height: 180, background: "#141821",
  actions: { left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"], start: ["Enter", "Space"], pause: ["KeyP", "Escape"] },
});
const random = createRandom();
game.state.best = 0;
let player, rocks, seconds;

game.scenes.add("title", {
  update(game) { if (game.actions.wasPressed("start")) game.scenes.switchTo("play"); },
  render(game, context) {
    text(context, "ROCK DODGE", 160, 60, { size: 20, align: "center", bold: true, color: "#ff9f43" });
    text(context, "Enter to start · P to pause", 160, 100, { align: "center", color: "#9aa4b6" });
    text(context, "Best: " + game.state.best.toFixed(1) + " s", 160, 120, { align: "center" });
  },
});

game.scenes.add("play", {
  enter() { player = { x: 152, width: 16 }; rocks = []; seconds = 0; },
  update(game, stepSeconds) {
    if (game.actions.wasPressed("pause")) { game.scenes.push("pause"); return; }
    seconds += stepSeconds;
    player.x += game.actions.axis("left", "right") * 160 * stepSeconds;
    player.x = Math.max(0, Math.min(game.width - player.width, player.x));
    if (random.chance(0.03 + seconds * 0.002)) rocks.push({ x: random.range(0, 320), y: -8, speed: random.range(60, 140) });
    for (const rock of rocks) {
      rock.y += rock.speed * stepSeconds;
      if (rock.y > 150 && rock.y < 168 && rock.x > player.x - 6 && rock.x < player.x + player.width + 6) {
        game.scenes.switchTo("over", { seconds });
      }
    }
    rocks = rocks.filter((rock) => rock.y < 200);
  },
  render(game, context) {
    for (const rock of rocks) fillCircle(context, rock.x, rock.y, 6, "#9aa4b6");
    fillRect(context, player.x, 156, player.width, 12, "#5ac8fa");
    text(context, seconds.toFixed(1) + " s", 6, 6);
  },
});

// Drawn ON TOP of the frozen play scene, because it was push()ed.
game.scenes.add("pause", {
  update(game) { if (game.actions.wasPressed("pause") || game.actions.wasPressed("start")) game.scenes.pop(); },
  render(game, context) {
    dim(context, game.width, game.height, 0.6);
    text(context, "PAUSED", 160, 80, { size: 16, align: "center", bold: true });
  },
});

game.scenes.add("over", {
  enter(game, data) { game.state.best = Math.max(game.state.best, data.seconds); this.seconds = data.seconds; },
  update(game) { if (game.actions.wasPressed("start")) game.scenes.switchTo("title"); },
  render(game, context) {
    text(context, "GAME OVER", 160, 70, { size: 18, align: "center", bold: true, color: "#ff6b81" });
    text(context, "You lasted " + this.seconds.toFixed(1) + " s · Enter", 160, 100, { align: "center" });
  },
});

game.start("title");
