// Game Code Example 07: Timers and tweens
// WHAT: Click to make a button "pop"; a timer spawns stars every half second and
//       each star tweens (animates) its size and position, then removes itself.
// WHY:  game.timers.after / every run code later without counting frames yourself.
//       game.tweens.to(object, goals, seconds, easing) animates any number property.
//       Easing (easeOutBack, easeOutBounce...) is what makes motion feel alive.
// TRY:  Swap easeOutBack for easeOutBounce or easeInOutSine.

import { createGame } from "kindling/game.js";
import { fillRect, fillCircle, text } from "kindling/2d/draw.js";
import { easeOutBack, easeOutCubic } from "kindling/math/easing.js";
import { createRandom } from "kindling/math/random.js";

const game = createGame({ width: 320, height: 180, background: "#141821" });
const random = createRandom(4);
const button = { x: 160, y: 90, scale: 1 };
const stars = [];

game.timers.every(0.5, () => {
  const star = { x: 160, y: 90, size: 0, alpha: 1 };
  stars.push(star);
  const tween = game.tweens.to(star, { x: random.range(20, 300), y: random.range(20, 160), size: random.range(3, 7) }, 1.2, easeOutCubic);
  tween.onDone = () => stars.splice(stars.indexOf(star), 1);
});

game.scenes.add("play", {
  update(game) {
    if (game.input.mouse.wasPressed(0) || game.input.touch.wasTapped()) {
      button.scale = 0.7;
      game.tweens.to(button, { scale: 1 }, 0.4, easeOutBack);
    }
  },
  render(game, context) {
    for (const star of stars) fillCircle(context, star.x, star.y, star.size, "#ffd166");
    const size = 60 * button.scale;
    fillRect(context, button.x - size / 2, button.y - size / 4, size, size / 2, "#ff9f43");
    text(context, "click me", 160, 86, { align: "center", color: "#1a0f04", size: 9 * button.scale });
  },
});

game.start("play");
