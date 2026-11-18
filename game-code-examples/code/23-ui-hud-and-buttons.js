// Game Code Example 23: HUD and buttons drawn on the canvas
// WHAT: A health bar that eases down when hurt, a coin counter that pops, and buttons
//       with hover and press states (mouse and touch).
// WHY:  A HUD (Heads-Up Display) is drawn AFTER the world, in screen space. A button is
//       a rectangle plus three questions: is the pointer over it, is it held, was it
//       released over it? Showing the displayed health chase the real health makes
//       damage readable.
// TRY:  Add a "heal" button. Make the bar flash white for 0.1 s when hit.

import { createGame } from "kindling/game.js";
import { fillRect, strokeRect, text } from "kindling/2d/draw.js";
import { pointInRect } from "kindling/2d/collision.js";
import { damp } from "kindling/math/scalar.js";
import { easeOutBack } from "kindling/math/easing.js";

const game = createGame({ width: 320, height: 180, background: "#141821" });
const player = { health: 100, shownHealth: 100, coins: 0 };
const coinPop = { scale: 1 };
const buttons = [
  { label: "Take damage", x: 40, y: 110, width: 110, height: 30, onClick: () => { player.health = Math.max(0, player.health - 15); } },
  { label: "Get coin", x: 170, y: 110, width: 110, height: 30, onClick: () => { player.coins += 1; coinPop.scale = 1.6; game.tweens.to(coinPop, { scale: 1 }, 0.3, easeOutBack); } },
];

game.scenes.add("ui", {
  update(game, stepSeconds) {
    const mouse = game.input.mouse;
    const finger = game.input.touch.touches()[0];
    const pointer = finger || mouse.position;
    for (const button of buttons) {
      button.hover = pointInRect(pointer, button);
      button.held = button.hover && (mouse.isDown(0) || Boolean(finger));
      const released = mouse.wasReleased(0) || game.input.touch.wasTapped();
      if (button.hover && released) button.onClick();
    }
    player.shownHealth = damp(player.shownHealth, player.health, 4, stepSeconds);
  },
  render(game, context) {
    // Health bar: dark back, red "damage trail", green current health.
    fillRect(context, 10, 10, 120, 12, "#252d3c");
    fillRect(context, 10, 10, 1.2 * player.shownHealth, 12, "#ff6b81");
    fillRect(context, 10, 10, 1.2 * player.health, 12, "#7bd389");
    strokeRect(context, 9.5, 9.5, 121, 13, "#e9edf4");
    text(context, "HP " + player.health, 136, 12, { color: "#e9edf4" });
    text(context, "● " + player.coins, 300, 10, { align: "right", size: 12 * coinPop.scale, color: "#ffd166" });
    for (const button of buttons) {
      const offset = button.held ? 2 : 0;
      fillRect(context, button.x, button.y + 3, button.width, button.height, "#0b0d12");                    // shadow
      fillRect(context, button.x, button.y + offset, button.width, button.height, button.hover ? "#ffb066" : "#ff9f43");
      text(context, button.label, button.x + button.width / 2, button.y + 11 + offset, { align: "center", color: "#1a0f04" });
    }
  },
});

game.start("ui");
