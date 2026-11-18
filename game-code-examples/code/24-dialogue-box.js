// Game Code Example 24: Dialogue with a typewriter effect and choices
// WHAT: An NPC talks one line at a time, letters appearing like a typewriter. Some
//       lines offer choices (up/down + Enter) that jump to different lines.
// WHY:  Dialogue is DATA: a list of lines, each with an id, text, and where to go next.
//       Keeping it out of the code means writers can edit it, and you can load it from
//       a JSON file later. Press Enter while typing to show the whole line at once.
// TRY:  Add a line that gives the player an item (an "action" field the code checks).

import { createGame } from "kindling/game.js";
import { fillRect, strokeRect, text } from "kindling/2d/draw.js";
import { paintPixels } from "kindling/views/sprites.js";

const game = createGame({ width: 320, height: 180, pixelArt: true, background: "#24324a",
  actions: { next: ["Enter", "Space", "mouse:0"], up: ["ArrowUp", "KeyW"], down: ["ArrowDown", "KeyS"] } });
const DIALOGUE = {
  start: { text: "Oh! A traveler. Nobody comes to Ember Hill anymore.", next: "ask" },
  ask: { text: "Are you here for the festival, or for the dragon?", choices: [["The festival!", "festival"], ["The... dragon?", "dragon"]] },
  festival: { text: "Wonderful! Lanterns go up at sunset. Bring a snack.", next: "end" },
  dragon: { text: "Shh! It's asleep under the hill. Let's keep it that way.", next: "end" },
  end: { text: "Safe travels. (Press Enter to start over.)", next: "start" },
};
const villager = paintPixels(["..hhhh..", ".hhhhhh.", "..ssss..", "..eses..", "..ssss..", "gggggggg", "sggggggs", "..gggg..", "..b..b..", ".kk..kk."],
  { h: "#7a4a2a", s: "#fbcc8c", e: "#1a1a1f", g: "#7bd389", b: "#383f59", k: "#27201a" });
let lineId = "start", shown = 0, choice = 0;

game.scenes.add("talk", {
  update(game, stepSeconds) {
    const line = DIALOGUE[lineId];
    shown = Math.min(line.text.length, shown + 40 * stepSeconds);          // 40 letters a second
    const finished = shown >= line.text.length;
    if (finished && line.choices) {
      if (game.actions.wasPressed("up")) choice = (choice + line.choices.length - 1) % line.choices.length;
      if (game.actions.wasPressed("down")) choice = (choice + 1) % line.choices.length;
    }
    if (game.actions.wasPressed("next")) {
      if (!finished) { shown = line.text.length; return; }                  // skip the typing
      lineId = line.choices ? line.choices[choice][1] : line.next;
      shown = 0;
      choice = 0;
    }
  },
  render(game, context) {
    fillRect(context, 0, 120, 320, 60, "#3f8a55");
    context.drawImage(villager, 150, 72, 24, 30);
    const line = DIALOGUE[lineId];
    fillRect(context, 8, 112, 304, 60, "#0b0d12");
    strokeRect(context, 8.5, 112.5, 303, 59, "#e9edf4");
    text(context, line.text.slice(0, Math.floor(shown)), 16, 120, { size: 8 });
    if (shown >= line.text.length && line.choices) {
      line.choices.forEach(([label], index) => text(context, (index === choice ? "▶ " : "  ") + label, 24, 140 + index * 12, { color: index === choice ? "#ffd166" : "#9aa4b6" }));
    }
  },
});

game.start("talk");
