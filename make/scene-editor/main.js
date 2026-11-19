// make/scene-editor/main.js
// WHAT: Wires the scene editor together: the shared editor state, the toolbar and
//       keyboard shortcuts, undo and redo, saving in the browser, new and open,
//       export, and Play (which runs the real game runtime on a copy of the scene).
// WHY:  Undo here is the simplest version that works: after every edit, keep a JSON
//       copy of the whole scene. Scenes are a few kilobytes, so 100 copies is cheap,
//       and "undo" is just "load the previous copy". No command objects needed.
// DOC:  docs/modules/scene.md (section "The scene editor")

import { createScene, parseScene, stringifyScene, setTile, addEntity } from "kindling/scene/scene.js";
import { runScene } from "kindling/scene/runtime.js";
import { createViewport } from "./viewport.js";
import { createPanels } from "./panels.js";
import { readStorage, writeStorage, copyText, downloadFile, pickTextFile } from "../shared.js";

const $ = (id) => document.getElementById(id);
const SAVE_KEY = "kindling:scene-editor";
const HISTORY_LIMIT = 100;

const editor = {
  scene: null,
  tool: "paint",
  layer: "main",
  brush: { kind: "tile", name: "grass_block" },
  selected: null,             // entity id, or null for "the scene itself"
  showGrid: true,
  visible: { back: true, main: true, entities: true },
};

// ---- History: every edit stores a JSON copy of the scene ----
let current = "";
const undoStack = [];
const redoStack = [];
function record(label) {
  const snapshot = JSON.stringify(editor.scene);
  if (snapshot === current) return;
  undoStack.push(current);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack.length = 0;
  current = snapshot;
  save();
  status(label);
}
function travel(from, to, word) {
  if (!from.length) return;
  to.push(current);
  current = from.pop();
  editor.scene = JSON.parse(current);
  if (!editor.scene.entities.some((entity) => entity.id === editor.selected)) editor.selected = null;
  save();
  refresh();
  status(word);
}
const save = () => writeStorage(SAVE_KEY, editor.scene);

// ---- Loading scenes ----
function load(scene, message) {
  editor.scene = parseScene(scene);
  editor.selected = null;
  current = JSON.stringify(editor.scene);
  undoStack.length = redoStack.length = 0;
  save();
  refresh();
  view.fit();
  status(message);
}
async function loadTemplate(name) {
  const response = await fetch("../../templates/" + name + "/scene.json");
  if (!response.ok) throw new Error("Could not load the " + name + " template (" + response.status + ")");
  load(await response.json(), "Opened the starter " + name);
}
function blank(template) {
  const scene = template === "topdown" ? createScene({ template, width: 30, height: 20, fill: "grass" }) : createScene({ template, width: 40, height: 15 });
  if (template === "platformer") for (let column = 0; column < scene.width; column++) { setTile(scene, "main", column, 13, "grass_block"); setTile(scene, "main", column, 14, "dirt"); }
  addEntity(scene, "player", 32, template === "platformer" ? 190 : 64);
  load(scene, "New " + template + " scene");
}

// ---- Status line ----
let statusTimer = 0;
function status(text) {
  $("status").textContent = text || "";
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => ($("status").textContent = ""), 2500);
}

// ---- Views and panels ----
const hooks = {
  edited(label) { record(label); refresh(); },
  select(id) { editor.selected = id; if (id !== null && editor.tool !== "select") setTool("select"); panels.renderHierarchy(); panels.renderInspector(); view.render(); },
  moved() { /* the inspector shows X and Y; it refreshes when the drag ends */ },
  pickBrush(brush) {
    editor.brush = brush;
    if (editor.tool !== "paint" && editor.tool !== "fill") setTool("paint");
    panels.renderPalette();
    view.render();
  },
  hover(cell) { $("cell").textContent = "column " + cell.column + ", row " + cell.row + " · x " + cell.column * 16 + ", y " + cell.row * 16; },
  duplicate(entity) {
    const copy = JSON.parse(JSON.stringify(entity));
    copy.id = editor.scene.nextId++;
    copy.x += 16;
    editor.scene.entities.push(copy);
    editor.selected = copy.id;
    record("Duplicate " + entity.name);
    refresh();
  },
};
const view = createViewport(editor, $("view"), hooks);
const panels = createPanels(editor, {
  palette: $("palette"), search: $("search"), brush: $("brush"), hierarchy: $("hierarchy"), inspector: $("inspector"),
  tabs: [...document.querySelectorAll("[data-tab]")],
}, hooks);
function refresh() {
  if (!editor.scene) return;
  panels.refresh();
  view.render();
  $("undo").disabled = !undoStack.length;
  $("redo").disabled = !redoStack.length;
  $("layer-note").textContent = editor.layer === "main" ? "Painting the main layer (solid ground, walls, hazards)" : "Painting the back layer (decoration)";
}

// ---- Toolbar ----
function setTool(tool) {
  editor.tool = tool;
  for (const button of document.querySelectorAll("[data-tool]")) button.setAttribute("aria-pressed", String(button.dataset.tool === tool));
  $("view").style.cursor = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair";
  if (editor.scene) view.render();
}
function setLayer(layer) {
  editor.layer = layer;
  for (const button of document.querySelectorAll("[data-layer]")) button.setAttribute("aria-pressed", String(button.dataset.layer === layer));
  refresh();
}
for (const button of document.querySelectorAll("[data-tool]")) button.addEventListener("click", () => setTool(button.dataset.tool));
for (const button of document.querySelectorAll("[data-layer]")) button.addEventListener("click", () => setLayer(button.dataset.layer));
$("undo").addEventListener("click", () => travel(undoStack, redoStack, "Undo"));
$("redo").addEventListener("click", () => travel(redoStack, undoStack, "Redo"));
$("zoom-in").addEventListener("click", view.zoomIn);
$("zoom-out").addEventListener("click", view.zoomOut);
$("fit").addEventListener("click", view.fit);
$("grid").addEventListener("click", () => { editor.showGrid = !editor.showGrid; $("grid").setAttribute("aria-pressed", String(editor.showGrid)); view.render(); });
$("grid").setAttribute("aria-pressed", "true");
$("new").addEventListener("change", async () => {
  const [kind, name] = $("new").value.split(":");
  $("new").value = "";
  try {
    if (kind === "template") await loadTemplate(name);
    else if (kind === "blank") blank(name);
    else if (kind === "file") { const text = await pickTextFile(); if (text) load(text, "Opened a file"); }
  } catch (error) { status(error.message); }
});

// ---- Export ----
let exportFormat = "json";
function exportText() {
  const json = stringifyScene(JSON.parse(JSON.stringify(editor.scene)));
  if (exportFormat === "json") return json;
  return `// Save the scene as scene.json next to this file, or paste it in as an object.
import { runScene } from "kindling/scene/runtime.js";

const scene = await (await fetch("./scene.json")).json();
const play = runScene(scene, {
  canvas: "#game",
  onWin: (message) => console.log(message),
});
// play.restart() starts over, play.world has coins, keys and hearts.`;
}
function showExport() {
  $("export-code").textContent = exportText();
  for (const button of document.querySelectorAll("[data-format]")) button.setAttribute("aria-pressed", String(button.dataset.format === exportFormat));
}
$("export").addEventListener("click", () => { showExport(); $("export-box").showModal(); });
$("export-close").addEventListener("click", () => $("export-box").close());
for (const button of document.querySelectorAll("[data-format]")) button.addEventListener("click", () => { exportFormat = button.dataset.format; showExport(); });
$("export-copy").addEventListener("click", async () => status((await copyText(exportText())) ? "Copied" : "Copy failed"));
$("export-download").addEventListener("click", () => downloadFile("scene.json", stringifyScene(JSON.parse(JSON.stringify(editor.scene)))));

// ---- Play: the real runtime, on a copy, in an overlay ----
let playing = null;
function play() {
  if (playing) return;
  const box = $("play-box");
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-label", "Your scene, running");
  box.prepend(canvas);
  box.hidden = false;
  $("play-help").textContent = editor.scene.template === "platformer"
    ? "Arrows or A/D to run · Space to jump · E to talk · R to restart"
    : "Arrows or WASD to walk · E to talk · R to restart";
  playing = { canvas, run: runScene(editor.scene, { canvas, onWin: (message) => status("Won: " + message) }) };
  canvas.focus();
}
function stop() {
  if (!playing) return;
  playing.run.destroy();
  playing.canvas.remove();
  playing = null;
  $("play-box").hidden = true;
  $("play").focus();
}
$("play").addEventListener("click", play);
$("stop").addEventListener("click", stop);

// ---- Keyboard shortcuts (ignored while typing in a box) ----
addEventListener("keydown", (event) => {
  if (playing) { if (event.key === "Escape") stop(); return; }
  if (event.target.closest("input, textarea, select, dialog")) return;
  const command = event.ctrlKey || event.metaKey;
  if (command && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? travel(redoStack, undoStack, "Redo") : travel(undoStack, redoStack, "Undo"); return; }
  if (command && event.key.toLowerCase() === "y") { event.preventDefault(); travel(redoStack, undoStack, "Redo"); return; }
  if (command && event.key.toLowerCase() === "d" && editor.selected !== null) { event.preventDefault(); hooks.duplicate(editor.scene.entities.find((entity) => entity.id === editor.selected)); return; }
  if (command) return;
  const keys = { b: () => setTool("paint"), e: () => setTool("erase"), g: () => setTool("fill"), v: () => setTool("select"), h: () => setTool("pan"), 1: () => setLayer("back"), 2: () => setLayer("main"), p: play, f: view.fit };
  if (keys[event.key.toLowerCase()]) { keys[event.key.toLowerCase()](); return; }
  if ((event.key === "Delete" || event.key === "Backspace") && editor.selected !== null) {
    const entity = editor.scene.entities.find((item) => item.id === editor.selected);
    editor.scene.entities = editor.scene.entities.filter((item) => item.id !== editor.selected);
    editor.selected = null;
    hooks.edited("Delete " + (entity ? entity.name : "entity"));
  }
});

// ---- Start: ?template=NAME, else the last scene you worked on, else the platformer ----
setTool("paint");
setLayer("main");
const asked = new URLSearchParams(location.search).get("template");
const saved = readStorage(SAVE_KEY, null);
try {
  if (asked === "platformer" || asked === "topdown") await loadTemplate(asked);
  else if (saved) load(saved, "Welcome back: your last scene");
  else await loadTemplate("platformer");
} catch (error) {
  status(error.message);
  blank("platformer");
}
