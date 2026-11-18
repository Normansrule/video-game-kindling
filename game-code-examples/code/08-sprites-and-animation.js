// Game Code Example 08: Sprites and animation (no image files)
// WHAT: Paints a 4-frame walking sprite sheet from text, then plays it with the animator.
// WHY:  A sprite sheet is one image with frames side by side. Here we PAINT it from
//       rows of letters so you can see every pixel. With an image file instead, use
//       loadImages() and createSpriteSheet(image, 16, 16): the animation code is identical.
// TRY:  Draw a fifth frame, or change the "b" color to make a red hero.

import { createGame } from "kindling/game.js";
import { createSpriteSheet } from "kindling/2d/sprite.js";
import { createAnimation, createAnimator } from "kindling/2d/animation.js";
import { paintPixels } from "kindling/views/sprites.js";
import { fillRect, text } from "kindling/2d/draw.js";

const game = createGame({ width: 160, height: 90, pixelArt: true, background: "#24324a",
  actions: { left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"] } });

const head = ["...ss...", "..ssss..", "..eses..", "..ssss.."];
const legs = [
  ["..p..p..", "..p..p..", ".kk..kk."],
  [".p....p.", "p......p", "k......k"],
  ["..p..p..", "..p..p..", ".kk..kk."],
  ["...pp...", "...pp...", "...kk..."],
];
// Glue four 8 x 10 frames side by side into one 32 x 10 sheet.
const rows = [];
for (let y = 0; y < 10; y++) {
  let row = "";
  for (let frame = 0; frame < 4; frame++) {
    const body = [...head, "bbbbbbbb", "sbbbbbbs", "..bbbb.."];
    row += y < 7 ? body[y] : legs[frame][y - 7];
  }
  rows.push(row);
}
const sheetImage = paintPixels(rows, { s: "#fbcc8c", e: "#1a1a1f", b: "#3f8cf2", p: "#383f59", k: "#27201a" });
const sheet = createSpriteSheet(sheetImage, 8, 10);
const animator = createAnimator({ idle: createAnimation([0], 1), walk: createAnimation([0, 1, 2, 3], 8) }, "idle");
const hero = { x: 80, facingLeft: false };

game.scenes.add("play", {
  update(game, stepSeconds) {
    const move = game.actions.axis("left", "right");
    hero.x += move * 40 * stepSeconds;
    if (move !== 0) hero.facingLeft = move < 0;
    animator.play(move !== 0 ? "walk" : "idle");
    animator.update(stepSeconds);
  },
  render(game, context) {
    fillRect(context, 0, 70, 160, 20, "#3f8a55");
    sheet.draw(context, animator.frame(), hero.x, 70, { originX: 0.5, originY: 1, flipX: hero.facingLeft, scale: 2 });
    context.drawImage(sheetImage, 4, 4);   // the whole sheet, top-left
    text(context, "the sheet", 40, 6, { size: 6, color: "#9aa4b6" });
  },
});

game.start("play");
