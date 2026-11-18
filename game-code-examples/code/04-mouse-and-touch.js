// Game Code Example 04: Mouse and touch
// WHAT: A creature follows the pointer; click or tap to drop a flower.
// WHY:  Positions come in GAME pixels (not screen pixels), so the same code works at
//       any canvas size. Mouse and touch are separate devices; a game that reads both
//       works on laptops and phones.
// TRY:  Make flowers grow over time (store a "born" time and scale the radius).

import { createGame } from "kindling/game.js";
import { fillCircle, text } from "kindling/2d/draw.js";
import { damp } from "kindling/math/scalar.js";

const game = createGame({ width: 320, height: 180, background: "#1f3a2a" });
const creature = { x: 160, y: 90 };
const flowers = [];

game.scenes.add("garden", {
  update(game, stepSeconds) {
    const mouse = game.input.mouse;
    const touch = game.input.touch;
    // Where is the pointer? Prefer a finger on the screen, else the mouse.
    const finger = touch.touches()[0];
    const target = finger || mouse.position;
    // damp() eases toward the target: fast when far, gentle when near.
    creature.x = damp(creature.x, target.x, 6, stepSeconds);
    creature.y = damp(creature.y, target.y, 6, stepSeconds);
    const tap = touch.wasTapped();
    if (mouse.wasPressed(0)) flowers.push({ x: mouse.position.x, y: mouse.position.y });
    if (tap) flowers.push({ x: tap.x, y: tap.y });
  },
  render(game, context) {
    for (const flower of flowers) {
      for (let petal = 0; petal < 5; petal++) {
        const angle = (petal / 5) * Math.PI * 2;
        fillCircle(context, flower.x + Math.cos(angle) * 4, flower.y + Math.sin(angle) * 4, 3, "#ff6b81");
      }
      fillCircle(context, flower.x, flower.y, 2.5, "#ffd166");
    }
    fillCircle(context, creature.x, creature.y, 9, "#ffffff");
    fillCircle(context, creature.x - 3, creature.y - 2, 1.5, "#141821");
    fillCircle(context, creature.x + 3, creature.y - 2, 1.5, "#141821");
    text(context, "move the mouse, click or tap", 6, 6, { color: "#cfe9d5" });
  },
});

game.start("garden");
