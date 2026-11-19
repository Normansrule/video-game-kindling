// make/character-designer/main.js
// WHAT: The character designer. Every control edits one field of a character spec;
//       after each change the 3D model, the four walking sprites, the sprite sheet
//       and the export code are all rebuilt from that one spec.
// WHY:  This is the "data drives everything" idea that big engines are built on:
//       the designer never draws a character itself, it only edits data, and the
//       engine's own functions (createCharacter, characterSheet) do the drawing.
// DOC:  docs/modules/characters.md

import { createGL } from "kindling/3d/gl.js";
import { createWorldRenderer } from "kindling/3d/world-renderer.js";
import { createOrbitCamera } from "kindling/3d/camera3d.js";
import { createCharacter } from "kindling/3d/character.js";
import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { BLOCK } from "kindling/world/blocks.js";
import { CHARACTER_OPTIONS, SWATCHES, defaultCharacter, normalizeCharacter, randomCharacter } from "kindling/characters/character-spec.js";
import { characterFrame, characterSheet, DIRECTIONS } from "kindling/characters/character-sprite.js";
import { pixelsToCanvas } from "kindling/library/pixels.js";
import { swatchRow, chipRow, savedCharacters, saveCharacters, copyText, downloadFile, pickTextFile, readStorage, writeStorage } from "../shared.js";

const $ = (id) => document.getElementById(id);
const DRAFT_KEY = "kindling:character-draft";
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let spec = normalizeCharacter(readStorage(DRAFT_KEY, defaultCharacter()));
let format = "js";
let walking = !reduceMotion;
let spinning = !reduceMotion;

// ---- Controls: built from CHARACTER_OPTIONS, so a new option shows up by itself ----
const controls = [];   // { set(spec) } for each control, to refresh after load/randomize
const panel = $("controls");
function section(title) {
  const heading = document.createElement("h2");
  heading.textContent = title;
  panel.append(heading);
}
function colorControl(label, field, colors) {
  const wrap = document.createElement("div");
  wrap.className = "ed-field";
  const text = document.createElement("span");
  text.textContent = label;
  const row = swatchRow(label, colors, (hex) => change({ [field]: hex }));
  wrap.append(text, row.element);
  panel.append(wrap);
  controls.push({ set: (current) => row.set(current[field]) });
}
function choiceControl(label, field) {
  const row = chipRow(label, CHARACTER_OPTIONS[field], (value) => change({ [field]: value }));
  panel.append(row.element);
  controls.push({ set: (current) => row.set(current[field]) });
}
function sliderControl(label, field, min, max) {
  const wrap = document.createElement("label");
  wrap.className = "ed-field";
  const text = document.createElement("span");
  const input = document.createElement("input");
  Object.assign(input, { type: "range", min, max, step: 0.01 });
  input.addEventListener("input", () => change({ [field]: Number(input.value) }));
  wrap.append(text, input);
  panel.append(wrap);
  controls.push({ set: (current) => { input.value = current[field]; text.textContent = label + ": " + Math.round(current[field] * 100) + "%"; } });
}

section("Body");
colorControl("Skin", "skin", SWATCHES.skin);
colorControl("Eyes", "eyes", ["#1a1c22", "#3b6fd1", "#2f8a4a", "#7a4a22", "#a03050"]);
sliderControl("Height", "height", 0.8, 1.2);
sliderControl("Head size", "headSize", 0.85, 1.3);
section("Hair");
choiceControl("Style", "hairStyle");
colorControl("Color", "hair", SWATCHES.hair);
section("Clothes");
choiceControl("Shirt", "shirtStyle");
colorControl("Shirt color", "shirt", SWATCHES.cloth);
colorControl("Pants", "pants", SWATCHES.cloth);
colorControl("Shoes", "shoes", ["#27201a", "#5a3a20", "#2c3e50", "#ecf0f1", "#c0392b"]);
section("Accessories");
choiceControl("Hat", "hat");
colorControl("Hat color", "hatColor", SWATCHES.cloth);
choiceControl("Face", "face");
choiceControl("On the back", "back");
colorControl("Back color", "backColor", SWATCHES.cloth);
choiceControl("In the hand", "held");

$("name").addEventListener("input", () => change({ name: $("name").value }));
$("random").addEventListener("click", () => setSpec(randomCharacter(Date.now())));
$("reset").addEventListener("click", () => setSpec(defaultCharacter()));
for (const [id, apply] of [["walk", (on) => (walking = on)], ["spin", (on) => (spinning = on)]]) {
  const button = $(id);
  button.setAttribute("aria-pressed", String(id === "walk" ? walking : spinning));
  button.addEventListener("click", () => {
    const on = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(on));
    apply(on);
  });
}

function change(patch) {
  setSpec({ ...spec, ...patch }, false);
}
function setSpec(next, refreshControls = true) {
  spec = normalizeCharacter(next);
  if (typeof next.name === "string" && !next.name.trim()) spec.name = "";   // let the box be empty while typing
  writeStorage(DRAFT_KEY, spec);
  if (refreshControls) $("name").value = spec.name;
  for (const control of controls) control.set(spec);
  rebuild();
}

// ---- 3D preview: a little grass block to stand on, lit by the stylized renderer ----
let renderer = null, camera = null, character = null;
try {
  const canvas = $("stage");
  const screen = createGL({ canvas, width: 640, height: 480, fit: false });
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  const world = createVoxelWorld(32, 4, 32);
  world.fill(0, 0, 0, 31, 1, 31, BLOCK.DIRT);
  world.fill(0, 2, 0, 31, 2, 31, BLOCK.GRASS);
  renderer = createWorldRenderer(screen, { timeOfDay: 0.4, shadowRadius: 10 });
  renderer.setWorld(world);
  camera = createOrbitCamera({ target: { x: 16, y: 3.95, z: 16 }, distance: 4.9, pitch: 0.2, yaw: 0.5, far: 200 });
  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  };
  new ResizeObserver(resize).observe(canvas);
  let drag = null;
  canvas.addEventListener("pointerdown", (event) => { drag = event.clientX; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener("pointermove", (event) => { if (drag !== null) { camera.yaw -= (event.clientX - drag) * 0.01; drag = event.clientX; } });
  canvas.addEventListener("pointerup", () => (drag = null));
} catch (error) {
  $("error").hidden = false;
  $("error").textContent = "3D preview unavailable: " + error.message + " The 2D sprites and export still work.";
}

// ---- 2D sprites: one animated canvas per direction ----
const SCALE = 5;
const spriteCanvases = DIRECTIONS.map((direction) => {
  const figure = document.createElement("figure");
  const canvas = document.createElement("canvas");
  canvas.width = 16 * SCALE;
  canvas.height = 20 * SCALE;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Sprite walking " + direction);
  const caption = document.createElement("figcaption");
  caption.textContent = direction;
  figure.append(canvas, caption);
  $("sprites").append(figure);
  return { direction, canvas, frames: [] };
});

function rebuild() {
  for (const sprite of spriteCanvases) sprite.frames = [0, 1, 0, 2].map((step) => pixelsToCanvas(characterFrame(spec, sprite.direction, step), SCALE));
  const sheet = characterSheet(spec, 3).canvas;
  const target = $("sheet");
  target.width = sheet.width;
  target.height = sheet.height;
  target.getContext("2d").drawImage(sheet, 0, 0);
  if (renderer) {
    if (character) character.destroy();
    character = createCharacter(renderer, spec);
  }
  showCode();
  renderSaved();
}

// ---- Export ----
function exportText() {
  const json = JSON.stringify(spec, null, 2);
  if (format === "json") return json;
  return `import { createCharacter } from "kindling/3d/character.js";
import { characterSheet } from "kindling/characters/character-sprite.js";

const ${safeName()} = ${json};

// 3D: an animated model for the world renderer
const hero3d = createCharacter(renderer, ${safeName()});
// each frame: hero3d.queue({ x, y, z }, yaw, walkCycle);

// 2D: a sprite sheet with walk cycles in four directions
const sheet = characterSheet(${safeName()}, 1);
// sheet.frames.walkRight[i] is { x, y, width, height } on sheet.canvas`;
}
function safeName() {
  const word = (spec.name || "hero").replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ")
    .map((part, index) => (index ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part.toLowerCase())).join("");
  return /^[a-z]/.test(word) ? word : "hero";
}
function showCode() {
  $("code").textContent = exportText();
  $("show-js").setAttribute("aria-pressed", String(format === "js"));
  $("show-json").setAttribute("aria-pressed", String(format === "json"));
}
const status = (text) => { $("status").textContent = text; setTimeout(() => ($("status").textContent = ""), 2500); };
$("show-js").addEventListener("click", () => { format = "js"; showCode(); });
$("show-json").addEventListener("click", () => { format = "json"; showCode(); });
$("copy").addEventListener("click", async () => status((await copyText(exportText())) ? "Copied" : "Copy failed"));
$("download").addEventListener("click", () => downloadFile(safeName() + ".character.json", JSON.stringify(spec, null, 2) + "\n"));
$("download-png").addEventListener("click", () => characterSheet(spec, 1).canvas.toBlob((blob) => downloadFile(safeName() + "-sheet.png", blob)));
$("load").addEventListener("click", async () => {
  const text = await pickTextFile();
  if (!text) return;
  try { setSpec(JSON.parse(text)); status("Opened"); } catch { status("That file is not valid JSON"); }
});

// ---- Saved characters (shared with the scene editor) ----
function renderSaved() {
  const list = $("saved");
  list.replaceChildren();
  const saved = savedCharacters();
  if (!saved.length) list.innerHTML = '<li class="ed-hint">Nothing saved yet.</li>';
  saved.forEach((item, index) => {
    const row = document.createElement("li");
    const open = document.createElement("button");
    open.type = "button";
    open.append(pixelsToCanvas(characterFrame(item, "down", 0), 2), document.createTextNode(item.name || "Unnamed"));
    if (item.name === spec.name) open.setAttribute("aria-current", "true");
    open.addEventListener("click", () => setSpec(item));
    const remove = document.createElement("small");
    remove.innerHTML = '<button type="button" aria-label="Delete ' + (item.name || "character").replace(/[<>&"]/g, "") + '">✕</button>';
    remove.firstChild.addEventListener("click", (event) => {
      event.stopPropagation();
      saveCharacters(saved.filter((_, other) => other !== index));
      renderSaved();
    });
    open.append(remove);
    row.append(open);
    list.append(row);
  });
}
$("save").addEventListener("click", () => {
  if (!spec.name) spec.name = "Hero";
  const saved = savedCharacters().filter((item) => item.name !== spec.name);
  status(saveCharacters([spec, ...saved]) ? "Saved “" + spec.name + "”" : "This browser blocks saving");
  renderSaved();
});

// ---- Animation loop ----
let last = performance.now(), time = 0, frame = 0, frameClock = 0;
function tick(now) {
  const seconds = Math.min(0.1, (now - last) / 1000);
  last = now;
  time += seconds;
  frameClock += seconds;
  if (frameClock > 0.16) { frameClock = 0; frame = (frame + 1) % 4; }
  for (const sprite of spriteCanvases) {
    const context = sprite.canvas.getContext("2d");
    context.clearRect(0, 0, sprite.canvas.width, sprite.canvas.height);
    context.drawImage(sprite.frames[walking ? frame : 0], 0, 0);
  }
  if (renderer && character) {
    if (spinning) camera.yaw += seconds * 0.5;
    character.queue({ x: 16, y: 3, z: 16 }, 0, walking ? time * 7 : 0);
    renderer.render(camera, time);
  }
  requestAnimationFrame(tick);
}
setSpec(new URLSearchParams(location.search).has("random") ? randomCharacter(Date.now()) : spec);
requestAnimationFrame(tick);
