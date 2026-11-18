// Game Code Example 17: Procedural maps with noise
// WHAT: Generates an island map from a seed: deep sea, shallows, sand, grass, forest,
//       rock and snow. Click for a new seed; press 1 to 4 to change the number of
//       noise octaves (layers of detail).
// WHY:  Noise is smooth randomness. fbm (fractal noise) adds layers of it: big shapes
//       first, small details after. Pick a block by height, and push the edges down
//       so the map becomes an island. Same seed = same map, every time.
// TRY:  Add rivers: where noise.noise2(x * 0.02, y * 0.02) is close to 0, draw water.

import { createGame } from "kindling/game.js";
import { createNoise } from "kindling/math/noise.js";
import { text } from "kindling/2d/draw.js";

const game = createGame({ width: 240, height: 135, pixelArt: true, background: "#000" });
const BANDS = [
  [-0.25, "#1c4f8a"], [-0.08, "#2f7ac2"], [0.0, "#e2ce98"], [0.18, "#6ab04c"],
  [0.32, "#3f8a3e"], [0.45, "#808490"], [1, "#eef4fa"],
];
let seed = 1;
let octaves = 4;
let image = null;

function generate() {
  const noise = createNoise(seed);
  image = new ImageData(game.width, game.height);
  for (let y = 0; y < game.height; y++) {
    for (let x = 0; x < game.width; x++) {
      const edge = Math.hypot(x / game.width - 0.5, (y / game.height - 0.5) * 0.8) * 2;  // 0 middle, 1 edge
      const height = noise.fbm2(x * 0.03, y * 0.03, octaves) + 0.3 - edge * edge * 0.9;
      const color = BANDS.find(([limit]) => height < limit)?.[1] || "#eef4fa";
      const index = (y * game.width + x) * 4;
      image.data[index] = parseInt(color.slice(1, 3), 16);
      image.data[index + 1] = parseInt(color.slice(3, 5), 16);
      image.data[index + 2] = parseInt(color.slice(5, 7), 16);
      image.data[index + 3] = 255;
    }
  }
}
generate();

game.scenes.add("map", {
  update(game) {
    if (game.input.mouse.wasPressed(0) || game.input.touch.wasTapped()) { seed += 1; generate(); }
    for (let key = 1; key <= 4; key++) if (game.input.keyboard.wasPressed("Digit" + key)) { octaves = key * 2 - 1; generate(); }
  },
  render(game, context) {
    context.putImageData(image, 0, 0);
    text(context, "seed " + seed + " · octaves " + octaves + " · click / keys 1-4", 4, 4, { size: 7, shadow: "#000" });
  },
});

game.start("map");
