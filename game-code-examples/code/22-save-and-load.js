// Game Code Example 22: Saving and loading (high scores and settings)
// WHAT: A clicker: click to score. Your best score, total clicks and a color setting
//       survive a page reload. Press R to reset the save.
// WHY:  localStorage keeps small data in the browser between visits. createStorage adds
//       a prefix (so two games don't clash), turns values into JSON, and never crashes
//       when storage is blocked (private windows, some embeds): you just get the fallback.
// TRY:  Save the player's position in another game, and load it in its enter().

import { createGame } from "kindling/game.js";
import { createStorage } from "kindling/core/storage.js";
import { fillCircle, text } from "kindling/2d/draw.js";

const game = createGame({ width: 320, height: 180, background: "#141821" });
const storage = createStorage("kindling-example-22");
// load(key, fallback): the fallback is used the very first time.
const save = storage.load("save", { best: 0, totalClicks: 0, color: "#ff9f43" });
const COLORS = ["#ff9f43", "#5ac8fa", "#7bd389", "#ff6b81"];
let score = 0, timeLeft = 5;

game.scenes.add("play", {
  update(game, stepSeconds) {
    const clicked = game.input.mouse.wasPressed(0) || game.input.touch.wasTapped();
    if (clicked) {
      if (timeLeft <= 0) { score = 0; timeLeft = 5; }       // start a new round
      score += 1;
      save.totalClicks += 1;
    }
    if (score > 0 && timeLeft > 0) {
      timeLeft -= stepSeconds;
      if (timeLeft <= 0) {
        save.best = Math.max(save.best, score);
        storage.save("save", save);                       // write once, at the end of a round
      }
    }
    if (game.input.keyboard.wasPressed("KeyC")) { save.color = COLORS[(COLORS.indexOf(save.color) + 1) % COLORS.length]; storage.save("save", save); }
    if (game.input.keyboard.wasPressed("KeyR")) { storage.remove("save"); Object.assign(save, { best: 0, totalClicks: 0, color: "#ff9f43" }); }
  },
  render(game, context) {
    fillCircle(context, 160, 95, 30 + Math.min(score, 30), save.color);
    text(context, String(score), 160, 88, { size: 16, align: "center", bold: true, color: "#141821" });
    text(context, timeLeft > 0 && score > 0 ? "time " + timeLeft.toFixed(1) : "click fast for 5 seconds", 160, 20, { align: "center" });
    text(context, "best " + save.best + " · all-time clicks " + save.totalClicks + " · C color · R reset", 160, 160, { align: "center", color: "#9aa4b6" });
  },
});

game.start("play");
