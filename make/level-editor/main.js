// make/level-editor/main.js
// WHAT: The level editor page: palette, tools, painting with mouse or touch,
//       undo/redo, autosave, import/export and the Play button.
// WHY:  See index.html. All level changes go through grid.js, so they're tested.
// DOC:  make/README.md

import {
  createLevel, levelFromPaste, levelToRows, levelToModule, getCell,
  paintLine, paintRect, floodFill, resizeLevel, checkLevel, createHistory,
} from "./grid.js";
import { createPlaytest } from "./play.js";

// The tiles of samples/2d/04-platformer. Change this list to edit levels for your own game.
const LEGEND = [
  { char: ".", label: "Empty", color: "transparent" },
  { char: "#", label: "Ground", color: "#7a5a43" },
  { char: "B", label: "Brick", color: "#b5562f" },
  { char: "=", label: "One-way platform", color: "#d9b26f" },
  { char: "^", label: "Spikes", color: "#e0524a" },
  { char: "C", label: "Coin", color: "#ffd447" },
  { char: "E", label: "Enemy", color: "#b36bff" },
  { char: "P", label: "Player start", color: "#4fc3f7", required: true, unique: true },
  { char: "F", label: "Flag (finish)", color: "#2ecc71", required: true, unique: true },
];
const COLORS = Object.fromEntries(LEGEND.map((entry) => [entry.char, entry.color]));
const MARKERS = "CEPF";        // drawn as a letter on a dark tile, so they stand out
const STORAGE_KEY = "kindling:level-editor";

const $ = (id) => document.getElementById(id);
const canvas = $("grid");
const context = canvas.getContext("2d");
const history = createHistory();

let level = loadSaved() || starterLevel();
let tool = "paint";
let current = "#";
let cellSize = 20;
let stroke = null;           // { button char, last cell, start cell } while the pointer is down
let hover = null;
let playtest = null;

function starterLevel() {
  const fresh = createLevel(40, 12);
  paintRect(fresh, 0, 10, 39, 11, "#");
  paintRect(fresh, 14, 7, 18, 7, "=");
  paintRect(fresh, 24, 10, 26, 10, "^");
  fresh.cells[9][2] = "P";
  fresh.cells[9][37] = "F";
  fresh.cells[6][16] = "C";
  fresh.cells[9][20] = "E";
  return fresh;
}

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? levelFromPaste(JSON.stringify(saved)) : null;
  } catch {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levelToRows(level)));
  } catch {
    // Storage blocked (private window): the editor still works, it just won't remember.
  }
}

// ---- Palette and tools --------------------------------------------------------
function buildPalette() {
  $("palette").replaceChildren(...LEGEND.map((entry, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.char = entry.char;
    button.title = entry.label + (index < 9 ? " (" + (index + 1) + ")" : "");
    const swatch = document.createElement("span");
    swatch.className = "swatch" + (entry.char === "." ? " checker" : "");
    swatch.style.background = entry.char === "." ? "" : entry.color;
    swatch.textContent = MARKERS.includes(entry.char) ? entry.char : "";
    swatch.setAttribute("aria-hidden", "true");
    button.append(swatch, entry.char === "." ? "Empty (erase)" : entry.label + " " + entry.char);
    button.addEventListener("click", () => choose(entry.char));
    item.append(button);
    return item;
  }));
  choose(current);
}

function choose(char) {
  current = char;
  for (const button of document.querySelectorAll("#palette button")) button.setAttribute("aria-pressed", String(button.dataset.char === char));
  if (tool === "pick") setTool("paint");
}

function setTool(name) {
  tool = name;
  // Scroll lets a finger move around a big level instead of painting it.
  canvas.classList.toggle("scrolling", name === "scroll");
  for (const button of document.querySelectorAll("[data-tool]")) button.setAttribute("aria-pressed", String(button.dataset.tool === name));
}

// ---- Drawing the grid -----------------------------------------------------------
function draw() {
  const size = cellSize;
  canvas.width = level.columns * size;
  canvas.height = level.rows * size;
  context.fillStyle = "#15161b";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 " + Math.round(size * 0.6) + "px ui-monospace, monospace";
  for (let row = 0; row < level.rows; row++) {
    for (let column = 0; column < level.columns; column++) drawCell(column, row, level.cells[row][column], 1);
  }
  // Rectangle preview while dragging.
  if (stroke && tool === "rect" && hover) {
    const left = Math.min(stroke.start[0], hover[0]);
    const top = Math.min(stroke.start[1], hover[1]);
    context.strokeStyle = "#ffb347";
    context.lineWidth = 2;
    context.strokeRect(left * size + 1, top * size + 1, (Math.abs(hover[0] - stroke.start[0]) + 1) * size - 2, (Math.abs(hover[1] - stroke.start[1]) + 1) * size - 2);
  }
  // Grid lines: faint, and stronger every 10 tiles so you can count.
  for (let column = 0; column <= level.columns; column++) {
    context.fillStyle = column % 10 === 0 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)";
    context.fillRect(column * size, 0, 1, canvas.height);
  }
  for (let row = 0; row <= level.rows; row++) {
    context.fillStyle = row % 10 === 0 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)";
    context.fillRect(0, row * size, canvas.width, 1);
  }
  if (hover) {
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1;
    context.strokeRect(hover[0] * size + 0.5, hover[1] * size + 0.5, size - 1, size - 1);
  }
}

function drawCell(column, row, char, alpha) {
  if (char === ".") return;
  const size = cellSize;
  const x = column * size;
  const y = row * size;
  context.globalAlpha = alpha;
  const color = COLORS[char] || "#888";
  if (MARKERS.includes(char)) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x + size / 2, y + size / 2, size * 0.42, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#111";
    context.fillText(char, x + size / 2, y + size / 2 + 1);
  } else if (char === "=") {
    context.fillStyle = color;
    context.fillRect(x, y, size, Math.max(3, size * 0.3));
  } else if (char === "^") {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x, y + size);
    context.lineTo(x + size / 2, y + size * 0.25);
    context.lineTo(x + size, y + size);
    context.fill();
  } else {
    context.fillStyle = color;
    context.fillRect(x, y, size, size);
    if (!COLORS[char]) {
      context.fillStyle = "#fff";
      context.fillText(char, x + size / 2, y + size / 2 + 1);
    }
  }
  context.globalAlpha = 1;
}

// ---- Painting -------------------------------------------------------------------
function cellAt(event) {
  const box = canvas.getBoundingClientRect();
  const column = Math.floor(((event.clientX - box.left) / box.width) * level.columns);
  const row = Math.floor(((event.clientY - box.top) / box.height) * level.rows);
  return getCell(level, column, row) === null ? null : [column, row];
}

canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("pointerdown", (event) => {
  const cell = cellAt(event);
  if (!cell || tool === "scroll") return;
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  const char = event.button === 2 ? "." : current;   // right-click erases
  if (tool === "pick") {
    choose(getCell(level, cell[0], cell[1]));
    return;
  }
  history.remember(level);
  stroke = { char, start: cell, last: cell, outline: event.shiftKey };
  if (tool === "fill") {
    floodFill(level, cell[0], cell[1], char);
    stroke = null;
    changed();
  } else if (tool === "paint") {
    paintLine(level, cell[0], cell[1], cell[0], cell[1], char);
    changed();
  }
  hover = cell;
  draw();
});
canvas.addEventListener("pointermove", (event) => {
  const cell = cellAt(event);
  hover = cell;
  if (cell) $("status").textContent = "Column " + cell[0] + ", row " + cell[1] + ": " + describe(getCell(level, cell[0], cell[1]));
  if (stroke && cell && tool === "paint") {
    paintLine(level, stroke.last[0], stroke.last[1], cell[0], cell[1], stroke.char);
    stroke.last = cell;
    changed(false);
  }
  draw();
});
function endStroke(event) {
  if (stroke && tool === "rect") {
    const end = cellAt(event) || hover || stroke.start;
    paintRect(level, stroke.start[0], stroke.start[1], end[0], end[1], stroke.char, stroke.outline || event.shiftKey);
    changed();
  } else if (stroke) {
    changed();
  }
  stroke = null;
  draw();
}
canvas.addEventListener("pointerup", endStroke);
canvas.addEventListener("pointercancel", () => { stroke = null; draw(); });
canvas.addEventListener("pointerleave", () => { if (!stroke) { hover = null; draw(); } });

function describe(char) {
  const entry = LEGEND.find((item) => item.char === char);
  return entry ? entry.label + " (" + char + ")" : JSON.stringify(char);
}

// After every change: export text, warnings, buttons and autosave.
// full = false while dragging, to keep painting smooth on slow phones.
function changed(full = true) {
  if (!full) return;
  $("export").value = levelToModule(level, "LEVEL", LEGEND.filter((entry) => entry.char !== "."));
  const warnings = checkLevel(level, LEGEND);
  $("warnings").replaceChildren(...(warnings.length ? warnings : ["Ready to play."]).map((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    if (!warnings.length) item.className = "ok";
    return item;
  }));
  $("undo").disabled = !history.canUndo;
  $("redo").disabled = !history.canRedo;
  $("columns").value = level.columns;
  $("rows").value = level.rows;
  save();
}

function replaceLevel(next) {
  history.remember(level);
  level = next;
  changed();
  draw();
}

function undo() {
  const previous = history.undo(level);
  if (previous) { level = previous; changed(); draw(); }
}
function redo() {
  const next = history.redo(level);
  if (next) { level = next; changed(); draw(); }
}

// ---- Buttons ----------------------------------------------------------------------
for (const button of document.querySelectorAll("[data-tool]")) button.addEventListener("click", () => setTool(button.dataset.tool));
$("undo").addEventListener("click", undo);
$("redo").addEventListener("click", redo);
$("zoom-in").addEventListener("click", () => { cellSize = Math.min(40, cellSize + 4); draw(); });
$("zoom-out").addEventListener("click", () => { cellSize = Math.max(8, cellSize - 4); draw(); });
$("resize").addEventListener("click", () => {
  const columns = clampNumber($("columns").value, 4, 400, level.columns);
  const rows = clampNumber($("rows").value, 4, 200, level.rows);
  replaceLevel(resizeLevel(level, columns, rows, ".", $("anchor").value));
});
$("new").addEventListener("click", () => {
  const fresh = createLevel(level.columns, level.rows);
  paintRect(fresh, 0, fresh.rows - 1, fresh.columns - 1, fresh.rows - 1, "#");
  replaceLevel(fresh);
});
$("open-paste").addEventListener("click", () => {
  try {
    replaceLevel(levelFromPaste($("paste").value));
    $("status").textContent = "Opened the pasted level.";
  } catch (error) {
    $("status").textContent = "Couldn't read that: " + error.message;
  }
});
for (const button of document.querySelectorAll("[data-sample]")) {
  button.addEventListener("click", async () => {
    const { LEVELS } = await import("../../samples/2d/04-platformer/level.js");
    replaceLevel(levelFromPaste(JSON.stringify(LEVELS[Number(button.dataset.sample)])));
    $("status").textContent = "Opened platformer level " + (Number(button.dataset.sample) + 1) + ".";
  });
}
$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("export").value);
    $("status").textContent = "Copied. Paste it into your level.js.";
  } catch {
    $("export").select();
    $("status").textContent = "Your browser blocked copying: the text is selected, press Ctrl+C.";
  }
});
$("download").addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([$("export").value], { type: "text/javascript" }));
  link.download = "level.js";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

function clampNumber(value, low, high, fallback) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.max(low, Math.min(high, number)) : fallback;
}

// ---- Keyboard shortcuts ---------------------------------------------------------
addEventListener("keydown", (event) => {
  if (event.target.closest("input, textarea, select")) return;
  if (playtest) return;
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === "z") { event.preventDefault(); return event.shiftKey ? redo() : undo(); }
  if ((event.ctrlKey || event.metaKey) && key === "y") { event.preventDefault(); return redo(); }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const tools = { b: "paint", r: "rect", g: "fill", i: "pick", s: "scroll" };
  if (tools[key]) setTool(tools[key]);
  const number = Number(event.key);
  if (number >= 1 && number <= Math.min(9, LEGEND.length)) choose(LEGEND[number - 1].char);
});

// ---- Play-test ----------------------------------------------------------------------
const held = new Set();
const touch = { left: false, right: false, jump: false };
let jumpQueued = false;
const playKeys = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "jump", ArrowUp: "jump", KeyW: "jump", KeyZ: "jump" };
addEventListener("keydown", (event) => {
  if (!playtest) return;
  if (event.code === "Escape") return stopPlay();
  const action = playKeys[event.code];
  if (!action) return;
  event.preventDefault();
  if (action === "jump" && !event.repeat) jumpQueued = true;
  held.add(action);
});
addEventListener("keyup", (event) => held.delete(playKeys[event.code]));
for (const button of document.querySelectorAll("[data-touch]")) {
  const action = button.dataset.touch;
  button.addEventListener("pointerdown", (event) => { event.preventDefault(); touch[action] = true; if (action === "jump") jumpQueued = true; });
  for (const type of ["pointerup", "pointerleave", "pointercancel"]) button.addEventListener(type, () => (touch[action] = false));
}

let frameRequest = 0;
function startPlay() {
  const warnings = checkLevel(level, LEGEND);
  playtest = createPlaytest({
    rows: levelToRows(level),
    colors: COLORS,
    canvas: $("play-canvas"),
    input: {
      left: () => held.has("left") || touch.left,
      right: () => held.has("right") || touch.right,
      jump: () => { const queued = jumpQueued; jumpQueued = false; return queued; },
      jumpHeld: () => held.has("jump") || touch.jump,
    },
    onStatus: (text) => ($("play-status").textContent = text),
  });
  if (warnings.length) $("play-status").textContent = warnings[0] + " " + $("play-status").textContent;
  $("edit-view").hidden = true;
  $("play-view").hidden = false;
  $("play").textContent = "Stop";
  $("play-canvas").focus?.();
  // Fixed 1/60 s steps, like the engine's loop.
  let last = performance.now();
  let saved = 0;
  const frame = (now) => {
    if (!playtest) return;
    saved += Math.min(0.25, (now - last) / 1000);
    last = now;
    while (saved >= 1 / 60) {
      playtest.update(1 / 60);
      saved -= 1 / 60;
    }
    playtest.draw();
    frameRequest = requestAnimationFrame(frame);
  };
  frameRequest = requestAnimationFrame(frame);
}

function stopPlay() {
  playtest = null;
  cancelAnimationFrame(frameRequest);
  held.clear();
  $("edit-view").hidden = false;
  $("play-view").hidden = true;
  $("play").textContent = "Play";
  draw();
}

$("play").addEventListener("click", () => (playtest ? stopPlay() : startPlay()));
$("stop").addEventListener("click", stopPlay);
$("restart").addEventListener("click", () => playtest && playtest.reset());

buildPalette();
changed();
draw();
