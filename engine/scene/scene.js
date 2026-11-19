// engine/scene/scene.js
// WHAT: The scene file format and the functions that edit it: a grid of tiles in two
//       layers (back = decoration, main = solid ground and walls), plus a list of
//       entities. Scenes are plain JSON you can save, load, diff and write by hand.
// WHY:  The editor and the game share ONE format. Tile layers are stored as rows of
//       letters with a legend, exactly like the text tilemaps in the rest of Kindling:
//         legend: { "#": "grass_block", "=": "wood_platform" }
//         main:   ["..........", "...==.....", "##########"]
// DOC:  docs/modules/scene.md (section "The scene file")

import { tileInfo } from "../library/tiles.js";
import { normalizeComponent, COMPONENTS } from "./components.js";
import { createEntity } from "./prefabs.js";

export const SCENE_FORMAT = "kindling-scene";
export const LAYERS = ["back", "main"];
export const TEMPLATES = ["platformer", "topdown"];

// Letters handed out to new tiles, in order. "." always means "empty".
const LETTERS = "#=~^*+@%&$ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?<>()[]{}/|:;,'`-_\"";

export function createScene(options = {}) {
  const width = options.width || 40;
  const height = options.height || 15;
  const empty = () => Array.from({ length: height }, () => ".".repeat(width));
  return {
    format: SCENE_FORMAT,
    version: 1,
    name: options.name || "Untitled scene",
    template: TEMPLATES.includes(options.template) ? options.template : "platformer",
    tileSize: 16,
    width,
    height,
    background: options.background || (options.template === "topdown" ? "#2d3b2a" : "#8fd3ff"),
    fill: options.fill || "",            // a tile drawn under everything (top-down grass), or ""
    legend: {},
    layers: { back: empty(), main: empty() },
    entities: [],
    nextId: 1,
  };
}

// The tile name at a cell, or "" if empty.
export function getTile(scene, layer, column, row) {
  if (column < 0 || row < 0 || column >= scene.width || row >= scene.height) return "";
  const letter = scene.layers[layer][row][column];
  return letter === "." ? "" : scene.legend[letter] || "";
}

// The legend letter for a tile, adding one if this tile is new to the scene.
export function letterFor(scene, tileName) {
  if (!tileName) return ".";
  for (const letter in scene.legend) if (scene.legend[letter] === tileName) return letter;
  const used = new Set(Object.keys(scene.legend));
  let letter = [...LETTERS].find((candidate) => !used.has(candidate));
  for (let code = 0xc0; !letter; code++) if (!used.has(String.fromCharCode(code))) letter = String.fromCharCode(code);
  scene.legend[letter] = tileName;
  return letter;
}

// Returns true if the cell changed (so the editor knows whether to record an undo step).
export function setTile(scene, layer, column, row, tileName) {
  if (column < 0 || row < 0 || column >= scene.width || row >= scene.height) return false;
  if (tileName && !tileInfo(tileName)) throw new Error("No tile called '" + tileName + "'");
  const letter = letterFor(scene, tileName);
  const line = scene.layers[layer][row];
  if (line[column] === letter) return false;
  scene.layers[layer][row] = line.slice(0, column) + letter + line.slice(column + 1);
  return true;
}

// Flood fill from a cell: every connected cell with the same tile becomes tileName.
export function fillTiles(scene, layer, column, row, tileName) {
  const target = getTile(scene, layer, column, row);
  if (target === tileName) return 0;
  let changed = 0;
  const stack = [[column, row]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= scene.width || y >= scene.height || getTile(scene, layer, x, y) !== target) continue;
    setTile(scene, layer, x, y, tileName);
    changed++;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return changed;
}

// Grow or shrink the map. New cells are empty; entities outside are kept (and still saved).
export function resizeScene(scene, width, height) {
  for (const layer of LAYERS) {
    const rows = scene.layers[layer].slice(0, height).map((line) => (line + ".".repeat(width)).slice(0, width));
    while (rows.length < height) rows.push(".".repeat(width));
    scene.layers[layer] = rows;
  }
  scene.width = width;
  scene.height = height;
}

export function addEntity(scene, prefabName, x, y) {
  const entity = createEntity(prefabName, x, y, scene.nextId++);
  scene.entities.push(entity);
  return entity;
}

export function removeEntity(scene, id) {
  scene.entities = scene.entities.filter((entity) => entity.id !== id);
}

// Drop legend letters no layer uses any more (keeps saved files tidy).
export function tidyLegend(scene) {
  const used = new Set(LAYERS.flatMap((layer) => scene.layers[layer].join("").split("")));
  for (const letter of Object.keys(scene.legend)) if (!used.has(letter)) delete scene.legend[letter];
  return scene;
}

// Read a scene from JSON (text or object) and repair anything missing or broken, so a
// hand-edited file never crashes the editor. Unknown tiles become empty cells.
export function parseScene(input) {
  const data = typeof input === "string" ? JSON.parse(input) : input;
  if (!data || data.format !== SCENE_FORMAT) throw new Error("Not a Kindling scene (format should be '" + SCENE_FORMAT + "')");
  const scene = createScene({ width: data.width | 0 || 40, height: data.height | 0 || 15, template: data.template, name: data.name, background: data.background, fill: data.fill });
  if (data.fill && !tileInfo(data.fill)) scene.fill = "";
  const legend = data.legend || {};
  for (const layer of LAYERS) {
    const rows = (data.layers && data.layers[layer]) || [];
    for (let row = 0; row < scene.height; row++) {
      const line = rows[row] || "";
      for (let column = 0; column < scene.width; column++) {
        const name = legend[line[column]];
        if (name && tileInfo(name)) setTile(scene, layer, column, row, name);
      }
    }
  }
  scene.entities = (data.entities || []).filter((entity) => entity && typeof entity.x === "number" && typeof entity.y === "number").map((entity, index) => {
    const components = {};
    for (const name in entity.components || {}) if (COMPONENTS[name]) components[name] = normalizeComponent(name, entity.components[name]);
    const clean = { id: entity.id || index + 1, name: String(entity.name || entity.prefab || "Entity").slice(0, 40), prefab: entity.prefab || "", x: entity.x, y: entity.y, components };
    if (entity.look && typeof entity.look === "object") clean.look = entity.look;
    return clean;
  });
  scene.nextId = Math.max(data.nextId || 1, ...scene.entities.map((entity) => entity.id + 1), 1);
  return scene;
}

// Pretty JSON with one tile row per line, so files diff nicely in Git.
export function stringifyScene(scene) {
  tidyLegend(scene);
  const rows = (layer) => scene.layers[layer].map((line) => "      " + JSON.stringify(line)).join(",\n");
  const { layers, entities, ...head } = scene;
  const top = JSON.stringify(head, null, 2).slice(0, -2);
  return top + ',\n  "layers": {\n    "back": [\n' + rows("back") + '\n    ],\n    "main": [\n' + rows("main") + '\n    ]\n  },\n  "entities": ' +
    JSON.stringify(entities).replace(/\},\{"id"/g, '},\n    {"id"').replace(/^\[/, "[\n    ").replace(/\]$/, "\n  ]") + "\n}\n";
}
