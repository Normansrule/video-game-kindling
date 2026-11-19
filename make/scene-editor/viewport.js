// make/scene-editor/viewport.js
// WHAT: The scene view in the middle of the editor: draws the tile layers, a grid and
//       the entities, and turns mouse, pen and touch input into edits (paint, erase,
//       fill, select and move, place, pan, zoom).
// WHY:  Kept apart from the panels so you can read the "how do clicks become edits"
//       part on its own. The view never owns the scene: it changes editor.scene and
//       calls hooks.edited() so main.js can record undo steps and save.

import { tileCanvas, tileInfo } from "kindling/library/tiles.js";
import { spriteCanvas } from "kindling/library/sprites.js";
import { characterFrame } from "kindling/characters/character-sprite.js";
import { randomCharacter, defaultCharacter } from "kindling/characters/character-spec.js";
import { pixelsToCanvas } from "kindling/library/pixels.js";
import { getTile, setTile, fillTiles, addEntity } from "kindling/scene/scene.js";
import { PREFABS } from "kindling/scene/prefabs.js";

// ---- Pictures for entities (shared with the panels for list icons) ----
const imageCache = new Map();
export function entityImage(entity) {
  const image = entity.components.sprite ? entity.components.sprite.image : "coin";
  const key = image === "character" ? "character:" + JSON.stringify(entity.look || {}) : image;
  if (!imageCache.has(key)) {
    let canvas;
    if (image === "character") {
      const look = entity.look || {};
      const spec = look.skin ? look : look.seed ? randomCharacter(look.seed) : defaultCharacter();
      canvas = pixelsToCanvas(characterFrame(spec, "down", 0));
    } else if (image.startsWith("tile:")) canvas = tileInfo(image.slice(5)) ? tileCanvas(image.slice(5)) : spriteCanvas("coin");
    else canvas = spriteCanvas(image) || spriteCanvas("coin");
    imageCache.set(key, canvas);
  }
  return imageCache.get(key);
}

// The box an entity takes up: its body, or 12 × 12 like the runtime uses.
export function entityBox(entity) {
  const body = entity.components.body;
  return { x: entity.x, y: entity.y, width: body ? body.width : 12, height: body ? body.height : 12 };
}

export function createViewport(editor, canvas, hooks) {
  const context = canvas.getContext("2d");
  const view = { x: -16, y: -16, zoom: 3 };
  let hover = null;          // { column, row } under the pointer
  let action = null;         // what the current drag is doing
  let spaceHeld = false;
  let queued = false;

  const size = () => editor.scene.tileSize;
  const toWorld = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / view.zoom + view.x, y: (event.clientY - rect.top) / view.zoom + view.y };
  };
  const cellAt = (point) => ({ column: Math.floor(point.x / size()), row: Math.floor(point.y / size()) });

  function fit() {
    const rect = canvas.getBoundingClientRect();
    const scene = editor.scene;
    const exact = Math.min(rect.width / (scene.width * size() + 32), rect.height / (scene.height * size() + 32));
    // Whole steps look crisp at zoom 1 and up; below 1, quarter steps are fine.
    view.zoom = Math.max(0.5, Math.min(4, exact >= 1 ? Math.floor(exact * 2) / 2 : Math.floor(exact * 4) / 4));
    view.x = (scene.width * size()) / 2 - rect.width / view.zoom / 2;
    view.y = (scene.height * size()) / 2 - rect.height / view.zoom / 2;
    render();
  }

  function render() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(draw);
  }

  function draw() {
    queued = false;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
    }
    const scene = editor.scene;
    const tile = size();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = getComputedStyle(canvas).getPropertyValue("--bg") || "#0b0d12";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(ratio * view.zoom, 0, 0, ratio * view.zoom, -view.x * ratio * view.zoom, -view.y * ratio * view.zoom);
    context.imageSmoothingEnabled = false;
    context.fillStyle = scene.background;
    context.fillRect(0, 0, scene.width * tile, scene.height * tile);

    // Only the cells on screen are drawn, so big scenes stay fast.
    const first = { column: Math.max(0, Math.floor(view.x / tile)), row: Math.max(0, Math.floor(view.y / tile)) };
    const last = { column: Math.min(scene.width - 1, Math.floor((view.x + rect.width / view.zoom) / tile)), row: Math.min(scene.height - 1, Math.floor((view.y + rect.height / view.zoom) / tile)) };
    for (let row = first.row; row <= last.row; row++) {
      for (let column = first.column; column <= last.column; column++) {
        if (scene.fill) context.drawImage(tileCanvas(scene.fill), column * tile, row * tile);
        for (const layer of ["back", "main"]) {
          const name = getTile(scene, layer, column, row);
          if (!name || !editor.visible[layer]) continue;
          context.globalAlpha = editor.layer === "back" && layer === "main" ? 0.45 : 1;
          context.drawImage(tileCanvas(name), column * tile, row * tile);
        }
        context.globalAlpha = 1;
      }
    }

    if (editor.visible.entities) {
      for (const entity of scene.entities) {
        const box = entityBox(entity);
        const image = entityImage(entity);
        const scale = entity.components.sprite ? entity.components.sprite.scale : 1;
        const width = image.width * scale, height = image.height * scale;
        context.drawImage(image, Math.round(box.x + box.width / 2 - width / 2), Math.round(box.y + box.height - height), width, height);
        if (entity.id === editor.selected) {
          context.strokeStyle = "#ff9f43";
          context.lineWidth = 2 / view.zoom;
          context.strokeRect(box.x - 1, box.y - 1, box.width + 2, box.height + 2);
        }
      }
    }

    if (editor.showGrid) {
      context.strokeStyle = "rgba(255, 255, 255, 0.12)";
      context.lineWidth = 1 / view.zoom;
      context.beginPath();
      for (let column = 0; column <= scene.width; column++) { context.moveTo(column * tile, 0); context.lineTo(column * tile, scene.height * tile); }
      for (let row = 0; row <= scene.height; row++) { context.moveTo(0, row * tile); context.lineTo(scene.width * tile, row * tile); }
      context.stroke();
    }
    context.strokeStyle = "rgba(255, 159, 67, 0.8)";
    context.lineWidth = 2 / view.zoom;
    context.strokeRect(0, 0, scene.width * tile, scene.height * tile);

    // Brush preview under the pointer.
    if (hover && ["paint", "fill", "erase"].includes(editor.tool) && hover.column >= 0 && hover.row >= 0 && hover.column < scene.width && hover.row < scene.height) {
      if (editor.tool !== "erase" && editor.brush.kind === "tile") {
        context.globalAlpha = 0.6;
        context.drawImage(tileCanvas(editor.brush.name), hover.column * tile, hover.row * tile);
        context.globalAlpha = 1;
      }
      context.strokeStyle = editor.tool === "erase" ? "#ff6b81" : "#ffffff";
      context.strokeRect(hover.column * tile, hover.row * tile, tile, tile);
    }
  }

  // ---- Editing actions ----
  function paintAt(point) {
    const cell = cellAt(point);
    const name = editor.tool === "erase" ? "" : editor.brush.name;
    if (setTile(editor.scene, editor.layer, cell.column, cell.row, name)) render();
  }

  function placeAt(point) {
    const cell = cellAt(point);
    const prefab = PREFABS[editor.brush.name];
    const [width, height] = prefab.size;
    const tile = size();
    // Stand it on the bottom of the cell, centered: that's where things "rest".
    const entity = addEntity(editor.scene, editor.brush.name, cell.column * tile + Math.round((tile - width) / 2), cell.row * tile + tile - height);
    editor.selected = entity.id;
    hooks.edited("Add " + entity.name);
  }

  function entityAt(point) {
    for (let index = editor.scene.entities.length - 1; index >= 0; index--) {
      const entity = editor.scene.entities[index];
      const box = entityBox(entity);
      const pad = 3;
      if (point.x >= box.x - pad && point.x < box.x + box.width + pad && point.y >= box.y - pad && point.y < box.y + box.height + pad) return entity;
    }
    return null;
  }

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerdown", (event) => {
    canvas.focus();
    canvas.setPointerCapture(event.pointerId);
    const point = toWorld(event);
    if (event.button === 1 || spaceHeld || editor.tool === "pan") {
      action = { kind: "pan", startX: event.clientX, startY: event.clientY, viewX: view.x, viewY: view.y };
      return;
    }
    if (event.button === 2) {   // right click: pick up the tile under the pointer (eyedropper)
      const name = getTile(editor.scene, editor.layer, cellAt(point).column, cellAt(point).row);
      if (name) hooks.pickBrush({ kind: "tile", name });
      return;
    }
    if (editor.tool === "select") {
      const entity = entityAt(point);
      hooks.select(entity ? entity.id : null);
      if (entity) action = { kind: "move", entity, offsetX: point.x - entity.x, offsetY: point.y - entity.y, moved: false };
      return;
    }
    if (editor.brush.kind === "prefab" && editor.tool === "paint") { placeAt(point); return; }
    if (editor.tool === "fill") {
      const cell = cellAt(point);
      if (fillTiles(editor.scene, editor.layer, cell.column, cell.row, editor.brush.kind === "tile" ? editor.brush.name : "")) hooks.edited("Fill");
      return;
    }
    if (editor.tool === "paint" || editor.tool === "erase") {
      action = { kind: "paint" };
      paintAt(point);
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    const point = toWorld(event);
    const cell = cellAt(point);
    if (!hover || hover.column !== cell.column || hover.row !== cell.row) { hover = cell; render(); hooks.hover(cell); }
    if (!action) return;
    if (action.kind === "pan") {
      view.x = action.viewX - (event.clientX - action.startX) / view.zoom;
      view.y = action.viewY - (event.clientY - action.startY) / view.zoom;
      render();
    } else if (action.kind === "paint") paintAt(point);
    else if (action.kind === "move") {
      // Snap to a 4 pixel grid, or 1 pixel with Shift held, so lining things up is easy.
      const snap = event.shiftKey ? 1 : 4;
      action.entity.x = Math.round((point.x - action.offsetX) / snap) * snap;
      action.entity.y = Math.round((point.y - action.offsetY) / snap) * snap;
      action.moved = true;
      render();
      hooks.moved(action.entity);
    }
  });

  const finish = () => {
    if (action && action.kind === "paint") hooks.edited(editor.tool === "erase" ? "Erase" : "Paint");
    if (action && action.kind === "move" && action.moved) hooks.edited("Move " + action.entity.name);
    action = null;
  };
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
  canvas.addEventListener("pointerleave", () => { hover = null; render(); });

  // Wheel or two fingers on a trackpad: scroll the view (Shift scrolls sideways).
  // Ctrl + wheel, or a trackpad pinch (which browsers report as Ctrl + wheel): zoom.
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) { zoomAt(event.deltaY < 0 ? 1.15 : 0.87, event); return; }
    const sideways = event.shiftKey && !event.deltaX;
    view.x += (sideways ? event.deltaY : event.deltaX) / view.zoom;
    view.y += (sideways ? 0 : event.deltaY) / view.zoom;
    render();
  }, { passive: false });

  function zoomAt(factor, event) {
    const rect = canvas.getBoundingClientRect();
    const anchor = event ? toWorld(event) : { x: view.x + rect.width / view.zoom / 2, y: view.y + rect.height / view.zoom / 2 };
    const zoom = Math.max(0.5, Math.min(8, view.zoom * factor));
    const screenX = (anchor.x - view.x) * view.zoom, screenY = (anchor.y - view.y) * view.zoom;
    view.zoom = zoom;
    view.x = anchor.x - screenX / zoom;
    view.y = anchor.y - screenY / zoom;
    render();
  }

  addEventListener("keydown", (event) => { if (event.code === "Space" && document.activeElement === canvas) { spaceHeld = true; event.preventDefault(); } });
  addEventListener("keyup", (event) => { if (event.code === "Space") spaceHeld = false; });
  new ResizeObserver(render).observe(canvas);

  return { render, fit, zoomIn: () => zoomAt(1.25), zoomOut: () => zoomAt(0.8), view };
}
