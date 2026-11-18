// engine/views/sprites.js
// WHAT: Little pixel-art sprites painted from code for the 2D and 2.5D views: the
//       player seen from above, the player standing (for isometric and billboards),
//       a coin and a crystal. Same colors as the 3D blocky character in 3d/lowpoly.js.
// WHY:  So all four views show the SAME game without any image files, and so you can
//       see that a sprite is just a small grid of colored squares.
// DOC:  docs/modules/views.md (section "Sprites from code")

// Draw a sprite from rows of letters. Each letter is a color from the legend; "." is empty.
export function paintPixels(rows, legend) {
  const canvas = document.createElement("canvas");
  canvas.width = rows[0].length;
  canvas.height = rows.length;
  const context = canvas.getContext("2d");
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = legend[row[x]];
      if (!color) continue;
      context.fillStyle = color;
      context.fillRect(x, y, 1, 1);
    }
  });
  return canvas;
}

const characterLegend = { s: "#fbcc8c", S: "#d9a46a", e: "#1a1a1f", b: "#3f8cf2", B: "#2c66b8", p: "#383f59", k: "#27201a" };

// 8 x 14: the blocky character standing, facing you.
const standingRows = [
  "..ssss..",
  "..ssss..",
  "..eses..",
  "..ssss..",
  "..SSSS..",
  "bbbbbbbb",
  "sbbbbbbs",
  "sbBbbBbs",
  "s.bbbb.s",
  "..pppp..",
  "..pp.p..",
  "..pp.p..",
  "..pp.p..",
  ".kkk.kk.",
];

let cache = null;
export function spriteCanvases() {
  if (cache) return cache;
  cache = {
    character: paintPixels(standingRows, characterLegend),
    coin: paintPixels([
      "..yyyy..",
      ".yYYYYy.",
      "yYyyyyYy",
      "yYyOOyYy",
      "yYyOOyYy",
      "yYyyyyYy",
      ".yYYYYy.",
      "..yyyy..",
    ], { y: "#ffcf40", Y: "#ffe78a", O: "#d99a1e" }),
    crystal: paintPixels([
      "...c...",
      "..cCc..",
      ".cCCdc.",
      "cCCCddc",
      ".cCCdc.",
      "..cdc..",
      "...c...",
    ], { c: "#3cb8e8", C: "#9aefff", d: "#2a86b8" }),
  };
  return cache;
}

// The player from above: a shoulders-and-head blob with a nose showing which way it faces.
// yaw 0 faces north (up the screen), like the 3D first-person camera (looking down -z).
export function drawCharacterIcon(context, x, y, size, yaw = 0) {
  context.save();
  context.translate(x, y);
  context.fillStyle = "rgba(0,0,0,0.3)";
  context.beginPath();
  context.ellipse(2, 3, size * 0.55, size * 0.4, 0, 0, Math.PI * 2);
  context.fill();
  context.rotate(-yaw);
  context.fillStyle = "#3f8cf2";                       // shoulders
  context.fillRect(-size * 0.5, -size * 0.18, size, size * 0.36);
  context.fillStyle = "#fbcc8c";                       // head
  context.fillRect(-size * 0.25, -size * 0.25, size * 0.5, size * 0.5);
  context.fillStyle = "#1a1a1f";                       // eyes = facing direction
  context.fillRect(-size * 0.18, -size * 0.3, size * 0.1, size * 0.1);
  context.fillRect(size * 0.08, -size * 0.3, size * 0.1, size * 0.1);
  context.restore();
}
