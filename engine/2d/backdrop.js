// engine/2d/backdrop.js
// WHAT: A painted parallax background for 2D side-view games: a sky gradient with a
//       sun, drifting clouds, far mountains, rolling hills with tree silhouettes and
//       near bushes. Every layer scrolls at its own speed as the camera moves.
// WHY:  Parallax (far things move slower than near things) is the cheapest way to make
//       a flat 2D game feel deep. Each layer here is a "ridge line": a height for every
//       x, made from smooth noise, filled down to the bottom of the screen. No images.
// DOC:  docs/modules/2d.md (section "Parallax backdrop")
//
// Usage:
//   const backdrop = createBackdrop({ width: 320, height: 180, theme: "day" });
//   // in render, BEFORE camera.begin():
//   backdrop.render(context, camera.x, camera.y, game.time.elapsed);

import { createNoise } from "../math/noise.js";

export const backdropThemes = {
  day: { skyTop: "#5aa7e8", skyBottom: "#cfe9f7", sun: "#fff6d8", cloud: "#ffffff", far: "#9cc1dc", mid: "#6fae7a", near: "#3f8a55", tree: "#2f6e45" },
  dusk: { skyTop: "#2b2d6e", skyBottom: "#f29e6b", sun: "#ffd29a", cloud: "#f7c3b0", far: "#7a5f8f", mid: "#4d4472", near: "#2d2a4f", tree: "#221f3d" },
  night: { skyTop: "#070b1f", skyBottom: "#1d2a52", sun: "#e8eeff", cloud: "#2a3866", far: "#25335c", mid: "#1b2747", near: "#121b33", tree: "#0c1326" },
};

// options: width, height (the game's size), theme (name or an object like the ones above), seed
export function createBackdrop(options) {
  const width = options.width;
  const height = options.height;
  const theme = typeof options.theme === "object" ? options.theme : backdropThemes[options.theme || "day"];
  const noise = createNoise(options.seed || 5);

  // The sky never scrolls, so paint it once.
  const sky = document.createElement("canvas");
  sky.width = width;
  sky.height = height;
  const skyContext = sky.getContext("2d");
  const gradient = skyContext.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, theme.skyTop);
  gradient.addColorStop(1, theme.skyBottom);
  skyContext.fillStyle = gradient;
  skyContext.fillRect(0, 0, width, height);
  // Sun with a soft glow.
  const sunX = width * 0.78;
  const sunY = height * 0.28;
  const glow = skyContext.createRadialGradient(sunX, sunY, 2, sunX, sunY, height * 0.45);
  glow.addColorStop(0, theme.sun);
  glow.addColorStop(0.08, theme.sun);
  glow.addColorStop(0.1, "rgba(255,255,255,0.25)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  skyContext.fillStyle = glow;
  skyContext.fillRect(0, 0, width, height);
  // Stars, only on the night theme.
  if (options.theme === "night") {
    skyContext.fillStyle = "#ffffff";
    for (let i = 0; i < 70; i++) skyContext.fillRect((i * 97) % width, (i * 53) % Math.floor(height * 0.6), 1, 1);
  }

  // A ridge: for each 2-pixel column, a height from noise. scroll = camera x times the
  // layer's parallax factor (0 = glued to the sky, 1 = moves with the level).
  function ridge(context, scroll, baseY, roughness, amplitude, color, seedOffset) {
    context.fillStyle = color;
    for (let x = 0; x < width; x += 2) {
      const worldX = (x + scroll) * roughness;
      const top = baseY - (noise.fbm2(worldX, seedOffset, 3) * 0.5 + 0.5) * amplitude;
      context.fillRect(x, Math.round(top), 2, height - Math.round(top));
    }
  }

  // Little pine silhouettes standing on a ridge.
  function trees(context, scroll, baseY, roughness, amplitude, color, seedOffset, spacing) {
    context.fillStyle = color;
    const first = Math.floor(scroll / spacing) * spacing;
    for (let worldX = first; worldX < scroll + width + spacing; worldX += spacing) {
      const jitter = (noise.noise2(worldX * 0.37, seedOffset) * 0.5 + 0.5) * spacing * 0.8;
      const x = worldX + jitter - scroll;
      const groundY = baseY - (noise.fbm2((x + scroll) * roughness, seedOffset, 3) * 0.5 + 0.5) * amplitude;
      const treeHeight = 10 + (noise.noise2(worldX * 0.11, 3) * 0.5 + 0.5) * 12;
      for (let row = 0; row < treeHeight; row += 2) {
        const half = Math.max(1, Math.round((row / treeHeight) * treeHeight * 0.28));
        context.fillRect(Math.round(x - half), Math.round(groundY - treeHeight + row), half * 2, 2);
      }
    }
  }

  function clouds(context, scroll, time) {
    context.fillStyle = theme.cloud;
    context.globalAlpha = 0.85;
    for (let i = 0; i < 6; i++) {
      const span = width + 80;
      const x = ((i * 137 - scroll * 0.08 - time * (4 + i)) % span + span) % span - 40;
      const y = 12 + ((i * 41) % Math.floor(height * 0.3));
      const size = 8 + (i % 3) * 4;
      context.beginPath();
      context.ellipse(x, y, size * 2.2, size * 0.7, 0, 0, Math.PI * 2);
      context.ellipse(x - size, y + 2, size * 1.2, size * 0.55, 0, 0, Math.PI * 2);
      context.ellipse(x + size * 0.9, y - 2, size * 1.3, size * 0.6, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  // cameraX, cameraY: the camera's top-left in the level. time: seconds (moves clouds).
  function render(context, cameraX = 0, cameraY = 0, time = 0) {
    context.drawImage(sky, 0, 0);
    clouds(context, cameraX, time);
    const lift = -cameraY * 0.05;      // a touch of vertical parallax
    ridge(context, cameraX * 0.1, height * 0.62 + lift, 0.012, height * 0.3, theme.far, 1);
    ridge(context, cameraX * 0.25, height * 0.78 + lift * 2, 0.02, height * 0.22, theme.mid, 2);
    trees(context, cameraX * 0.25, height * 0.78 + lift * 2, 0.02, height * 0.22, theme.tree, 2, 26);
    ridge(context, cameraX * 0.45, height * 0.95 + lift * 3, 0.035, height * 0.14, theme.near, 3);
  }

  return { render, theme };
}
