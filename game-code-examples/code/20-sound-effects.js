// Game Code Example 20: Sound effects made from code
// WHAT: Click a button (or press 1-9) to play each built-in sound. The bottom row
//       builds a custom sound with playTone.
// WHY:  Web Audio can make sounds from oscillators (beeps, sweeps) and noise (hits,
//       explosions). A "frequency sweep" (start high, end low) is how most retro effects
//       work. No audio files means nothing to download or license.
//       Browsers only allow sound after the player clicks or presses a key.
// TRY:  Make a "power down": type "sawtooth", frequency 900 to 60, duration 0.8.

import { createGame } from "kindling/game.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx, playTone, sfxPresets } from "kindling/audio/sfx.js";
import { fillRect, text } from "kindling/2d/draw.js";
import { pointInRect } from "kindling/2d/collision.js";

const game = createGame({ width: 320, height: 180, background: "#141821" });
const audio = createAudio();
const names = Object.keys(sfxPresets);
const buttons = names.map((name, index) => ({ name, x: 12 + (index % 3) * 102, y: 24 + Math.floor(index / 3) * 34, width: 94, height: 26 }));
const custom = { name: "custom", x: 12, y: 136, width: 296, height: 26 };
let lastPlayed = "";

function press(button) {
  lastPlayed = button.name;
  if (button === custom) playTone(audio, { type: "square", frequency: 120, frequencyEnd: 1800, duration: 0.3, volume: 0.15 });
  else playSfx(audio, button.name);
}

game.scenes.add("board", {
  update(game) {
    const mouse = game.input.mouse;
    const point = mouse.wasPressed(0) ? mouse.position : game.input.touch.wasTapped();
    if (point) for (const button of [...buttons, custom]) if (pointInRect(point, button)) press(button);
    names.forEach((name, index) => { if (game.input.keyboard.wasPressed("Digit" + (index + 1))) press(buttons[index]); });
  },
  render(game, context) {
    for (const button of [...buttons, custom]) {
      fillRect(context, button.x, button.y, button.width, button.height, button.name === lastPlayed ? "#ff9f43" : "#252d3c");
      text(context, button.name, button.x + button.width / 2, button.y + 9, { align: "center", color: button.name === lastPlayed ? "#1a0f04" : "#e9edf4" });
    }
    text(context, "click a sound, or keys 1-9", 12, 8, { color: "#9aa4b6" });
  },
});

game.start("board");
