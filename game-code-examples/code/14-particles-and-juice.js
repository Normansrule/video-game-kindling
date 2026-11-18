// Game Code Example 14: Particles and "juice"
// WHAT: Click to blow things up: particles, screen shake, a white flash, a sound and
//       a few frames of freeze ("hit stop").
// WHY:  "Juice" is the feedback that makes actions feel powerful. None of it changes
//       the rules; all of it changes how the game FEELS. Particles come from a pool, so
//       making hundreds a second never slows the game down.
// TRY:  Use presets.fire every step at the mouse for a torch. Remove one effect at a time.

import { createGame } from "kindling/game.js";
import { createParticles, presets } from "kindling/2d/particles.js";
import { createCamera } from "kindling/2d/camera.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { text } from "kindling/2d/draw.js";

const game = createGame({ width: 320, height: 180, background: "#141821" });
const particles = createParticles(600);
const camera = createCamera({ width: 320, height: 180 });
const audio = createAudio();
let flash = 0;
let freeze = 0;

game.scenes.add("play", {
  update(game, stepSeconds) {
    if (freeze > 0) { freeze -= stepSeconds; return; }   // hit stop: skip a few steps
    const mouse = game.input.mouse;
    const tap = game.input.touch.wasTapped();
    if (mouse.wasPressed(0) || tap) {
      const point = tap || mouse.position;
      particles.emit({ ...presets.explosion, x: point.x, y: point.y });
      particles.emit({ ...presets.smoke, x: point.x, y: point.y });
      camera.shake(5, 0.25);
      flash = 0.12;
      freeze = 0.05;
      playSfx(audio, "explosion");
    }
    particles.update(stepSeconds);
    camera.update(stepSeconds);
    flash = Math.max(0, flash - stepSeconds);
  },
  render(game, context) {
    camera.begin(context);
    particles.render(context, true);    // true = round, soft particles
    camera.end(context);
    if (flash > 0) { context.fillStyle = "rgba(255,255,255," + flash * 4 + ")"; context.fillRect(0, 0, 320, 180); }
    text(context, "click or tap", 6, 6, { color: "#9aa4b6" });
  },
});

game.start("play");
