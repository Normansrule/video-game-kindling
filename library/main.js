// library/main.js
// WHAT: Fills the library page: one tab each for tiles, blocks, sprites and
//       characters, a search box, and a detail panel with code for the chosen item.
// WHY:  The fastest way to find the right tile is to see them all. The page reads the
//       same lists the engine uses (tileCatalog, blockTypes, SPRITE_ART), so anything
//       added to the library shows up here by itself.

import { tileCatalog, tileCategories, tileCanvas } from "kindling/library/tiles.js";
import { spriteNames, spriteInfo, spriteCanvas, spriteCategories } from "kindling/library/sprites.js";
import { blockTypes, BLOCK } from "kindling/world/blocks.js";
import { textureCanvases } from "kindling/world/textures.js";
import { randomCharacter } from "kindling/characters/character-spec.js";
import { characterFrame } from "kindling/characters/character-sprite.js";
import { pixelsToCanvas } from "kindling/library/pixels.js";

const $ = (id) => document.getElementById(id);
const flagNames = (tile) => ["solid", "oneWay", "hurts", "climb", "goal", "exit", "light"].filter((flag) => tile[flag]);
const constName = (name) => Object.keys(BLOCK).find((key) => BLOCK[key] === blockTypes.find((type) => type.name === name)?.id) || name.toUpperCase();

// A block drawn as a little isometric cube from its top and side textures.
const textures = textureCanvases();
function blockCube(type, size = 48) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const half = size / 2, quarter = size / 4, top = textures[type.top], side = textures[type.side];
  const face = (image, a, b, c, d, e, f, shade) => {
    context.setTransform(a, b, c, d, e, f);
    context.drawImage(image, 0, 0);
    if (shade) { context.fillStyle = "rgba(0,0,0," + shade + ")"; context.fillRect(0, 0, 16, 16); }
  };
  const s = half / 16;
  face(top, s, s / 2, -s, s / 2, half, 0, 0);                 // top diamond
  face(side, s, s / 2, 0, s, 0, quarter, 0.18);               // left face
  face(side, s, -s / 2, 0, s, half, quarter + quarter, 0.34); // right face
  return canvas;
}

const KINDS = {
  tiles: {
    label: "Tiles · " + tileCatalog.length,
    groups: () => tileCategories.map((category) => ({ title: category, items: tileCatalog.filter((tile) => tile.category === category).map((tile) => ({
      name: tile.name, search: tile.name + " " + category + " " + flagNames(tile).join(" "), picture: () => tileCanvas(tile.name, 3),
      big: () => tileCanvas(tile.name, 10), about: "16 × 16 tile · " + category + (flagNames(tile).length ? " · " + flagNames(tile).join(", ") : ""),
      code: `import { tileCanvas, tileInfo } from "kindling/library/tiles.js";\n\nconst ${tile.name.replace(/_(.)/g, (_, letter) => letter.toUpperCase())} = tileCanvas("${tile.name}");   // a 16 × 16 canvas\ncontext.drawImage(${tile.name.replace(/_(.)/g, (_, letter) => letter.toUpperCase())}, x, y);\ntileInfo("${tile.name}");   // ${JSON.stringify(Object.fromEntries(flagNames(tile).map((flag) => [flag, true])))}\n\n// In a scene file's legend: { "#": "${tile.name}" }`,
    })) })),
  },
  blocks: {
    label: "Blocks · " + (blockTypes.length - 1),
    groups: () => [{ title: "3D blocks", items: blockTypes.filter((type) => type.id > 0).map((type) => ({
      name: type.name, search: type.name + (type.glow ? " glow light" : "") + (type.transparent ? " see-through" : ""), picture: () => blockCube(type, 48), big: () => blockCube(type, 160),
      about: "Block id " + type.id + (type.glow ? " · glows" : "") + (type.transparent ? " · see-through" : "") + " · textures: " + [...new Set([type.top, type.side, type.bottom])].join(", "),
      code: `import { BLOCK } from "kindling/world/blocks.js";\n\nworld.set(x, y, z, BLOCK.${constName(type.name)});   // id ${type.id}\nworld.fill(0, 0, 0, 9, 0, 9, BLOCK.${constName(type.name)});   // a 10 × 10 floor`,
    })) }],
  },
  sprites: {
    label: "Sprites · " + spriteNames.length,
    groups: () => spriteCategories.map((category) => ({ title: category, items: spriteNames.filter((name) => spriteInfo(name).category === category).map((name) => {
      const info = spriteInfo(name);
      return {
        name, search: name + " " + category, picture: () => spriteCanvas(name, 4), big: () => spriteCanvas(name, 12), frames: info.frameCount,
        about: info.width + " × " + info.height + " sprite · " + category + " · " + info.frameCount + (info.frameCount === 1 ? " frame" : " frames"),
        code: `import { spriteCanvas, spriteFrames } from "kindling/library/sprites.js";\n\ncontext.drawImage(spriteCanvas("${name}", 2), x, y);   // scale 2\n${info.frameCount > 1 ? `const frames = spriteFrames("${name}");          // ${info.frameCount} canvases\ncontext.drawImage(frames[Math.floor(time * 6) % frames.length], x, y);` : "// Recolor: spritePixels(\"" + name + "\", 0, { y: \"#7bd389\" })"}\n\n// In the scene editor: a Sprite component with image "${name}"`,
      };
    }) })),
  },
  characters: {
    label: "Characters",
    groups: () => [{ title: "Random characters (seeds 1 to 48)", items: Array.from({ length: 48 }, (_, index) => {
      const spec = randomCharacter(index + 1);
      return {
        name: spec.name + " #" + (index + 1), search: [spec.name, spec.hairStyle, spec.shirtStyle, spec.hat, spec.face, spec.back, spec.held].join(" "),
        picture: () => pixelsToCanvas(characterFrame(spec, "down", 0), 3), big: () => pixelsToCanvas(characterFrame(spec, "down", 0), 10),
        about: [spec.hairStyle + " hair", spec.shirtStyle, spec.hat !== "none" && spec.hat, spec.face !== "none" && spec.face, spec.back !== "none" && spec.back, spec.held !== "none" && spec.held].filter(Boolean).join(" · "),
        code: `import { randomCharacter } from "kindling/characters/character-spec.js";\nimport { characterSheet } from "kindling/characters/character-sprite.js";\n\nconst look = randomCharacter(${index + 1});   // same seed, same character\nconst sheet = characterSheet(look);      // 2D walk cycles\n// 3D: createCharacter(renderer, look)\n// Make your own: make/character-designer/`,
      };
    }) }],
  },
};

let kind = new URLSearchParams(location.search).get("kind") || "tiles";
if (!KINDS[kind]) kind = "tiles";
let chosen = null;

for (const key in KINDS) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "lib-tab";
  button.textContent = KINDS[key].label;
  button.dataset.kind = key;
  button.addEventListener("click", () => { kind = key; chosen = null; render(); });
  $("tabs").append(button, " ");
}
$("search").addEventListener("input", render);

function render() {
  for (const button of $("tabs").children) button.setAttribute("aria-pressed", String(button.dataset.kind === kind));
  const query = $("search").value.trim().toLowerCase();
  const box = $("items");
  box.replaceChildren();
  let first = null;
  for (const group of KINDS[kind].groups()) {
    const items = group.items.filter((item) => !query || item.search.toLowerCase().includes(query.replace(/ /g, "_")) || item.search.toLowerCase().includes(query));
    if (!items.length) continue;
    const section = document.createElement("section");
    section.className = "lib-group";
    section.innerHTML = "<h2></h2>";
    section.firstChild.textContent = group.title + " · " + items.length;
    const grid = document.createElement("div");
    grid.className = "lib-grid";
    for (const item of items) {
      first ||= item;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lib-item";
      button.setAttribute("aria-pressed", String(chosen === item.name));
      const picture = item.picture();
      const copy = document.createElement("canvas");
      copy.width = picture.width;
      copy.height = picture.height;
      copy.getContext("2d").drawImage(picture, 0, 0);
      button.append(copy, item.name.replace(/_/g, " "));
      button.addEventListener("click", () => { chosen = item.name; showDetail(item); for (const other of box.querySelectorAll(".lib-item")) other.setAttribute("aria-pressed", String(other === button)); });
      grid.append(button);
    }
    section.append(grid);
    box.append(section);
  }
  if (!box.children.length) box.innerHTML = '<p class="k-lead">Nothing matches that search.</p>';
  const current = KINDS[kind].groups().flatMap((group) => group.items).find((item) => item.name === chosen) || first;
  if (current) showDetail(current);
}

function showDetail(item) {
  const box = $("detail");
  box.replaceChildren();
  const picture = item.big();
  const canvas = document.createElement("canvas");
  canvas.width = picture.width;
  canvas.height = picture.height;
  canvas.style.maxWidth = "100%";
  canvas.getContext("2d").drawImage(picture, 0, 0);
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", item.name.replace(/_/g, " "));
  const title = document.createElement("h3");
  title.textContent = item.name.replace(/_/g, " ");
  const about = document.createElement("p");
  about.textContent = item.about;
  const code = document.createElement("pre");
  code.textContent = item.code;
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "k-button small";
  copy.textContent = "Copy code";
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(item.code); copy.textContent = "Copied"; } catch { copy.textContent = "Select the code to copy"; }
    setTimeout(() => (copy.textContent = "Copy code"), 1500);
  });
  box.append(canvas, title, about, code, copy);
}

render();
