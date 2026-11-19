// make/scene-editor/panels.js
// WHAT: The side panels: the palette (every library tile and every prefab), the
//       hierarchy (the list of entities), and the inspector (the settings of the
//       selected entity, or of the scene when nothing is selected).
// WHY:  The inspector is not hand-made per entity. It is generated from COMPONENTS in
//       engine/scene/components.js: add a component there and it appears here, with
//       the right kind of input for each field. That is how big editors scale.

import { tileCatalog, tileCategories, tileCanvas, tilesIn } from "kindling/library/tiles.js";
import { COMPONENTS, COMPONENT_NAMES, componentDefaults, spriteChoices } from "kindling/scene/components.js";
import { PREFABS, PREFAB_NAMES, createEntity } from "kindling/scene/prefabs.js";
import { TEMPLATES, resizeScene, removeEntity } from "kindling/scene/scene.js";
import { savedCharacters } from "../shared.js";
import { entityImage } from "./viewport.js";

const element = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter((child) => child !== null && child !== undefined));
  return node;
};
const label = (text, input) => element("label", { className: "ed-field" }, element("span", { textContent: text }), input);
const flags = (tile) => ["solid", "oneWay", "hurts", "climb", "goal", "exit", "light"].filter((flag) => tile[flag]).map((flag) => (flag === "oneWay" ? "one-way" : flag)).join(", ");

export function createPanels(editor, places, hooks) {
  let tab = "tiles";
  let search = "";

  // ---- Palette ----
  function renderPalette() {
    const box = places.palette;
    box.replaceChildren();
    const query = search.trim().toLowerCase();
    const matches = (name, extra = "") => !query || name.includes(query.replace(/ /g, "_")) || extra.includes(query);
    const brushButton = (kind, name, picture, title) => {
      const button = element("button", { type: "button", title });
      button.setAttribute("aria-label", title);
      button.setAttribute("aria-pressed", String(editor.brush.kind === kind && editor.brush.name === name));
      button.append(picture);
      button.addEventListener("click", () => hooks.pickBrush({ kind, name }));
      return button;
    };
    if (tab === "tiles") {
      for (const category of tileCategories) {
        const tiles = tileCatalog.filter((tile) => tile.category === category && matches(tile.name, category + " " + flags(tile)));
        if (!tiles.length) continue;
        const grid = element("div", { className: "ed-palette" });
        for (const tile of tiles) grid.append(brushButton("tile", tile.name, tileCanvas(tile.name, 2), tile.name.replace(/_/g, " ") + (flags(tile) ? " (" + flags(tile) + ")" : "")));
        box.append(element("h2", { textContent: category + " · " + tiles.length }), grid);
      }
    } else {
      const groups = {};
      for (const name of PREFAB_NAMES) if (matches(name, PREFABS[name].category)) (groups[PREFABS[name].category] ||= []).push(name);
      for (const category in groups) {
        const grid = element("div", { className: "ed-palette" });
        for (const name of groups[category]) {
          const picture = entityImage(createEntity(name, 0, 0, 0));
          const canvas = element("canvas", { width: picture.width, height: picture.height });
          canvas.getContext("2d").drawImage(picture, 0, 0);
          grid.append(brushButton("prefab", name, canvas, name.replace(/_/g, " ") + ": " + Object.keys(PREFABS[name].components).join(", ")));
        }
        box.append(element("h2", { textContent: category }), grid);
      }
    }
    if (!box.children.length) box.append(element("p", { className: "ed-hint", textContent: "Nothing matches “" + search + "”." }));
    const tile = editor.brush.kind === "tile" ? tileCatalog.find((item) => item.name === editor.brush.name) : null;
    places.brush.textContent = editor.brush.name.replace(/_/g, " ") + (tile && flags(tile) ? " · " + flags(tile) : editor.brush.kind === "prefab" ? " · click to place" : "");
  }
  places.search.addEventListener("input", () => { search = places.search.value; renderPalette(); });
  for (const button of places.tabs) {
    button.addEventListener("click", () => {
      tab = button.dataset.tab;
      for (const other of places.tabs) other.setAttribute("aria-pressed", String(other === button));
      renderPalette();
    });
  }

  // ---- Hierarchy ----
  function renderHierarchy() {
    const list = places.hierarchy;
    list.replaceChildren();
    const row = (text, note, picture, current, onClick) => {
      const button = element("button", { type: "button" }, picture, element("span", { textContent: text }), note ? element("small", { textContent: note }) : null);
      if (current) button.setAttribute("aria-current", "true");
      button.addEventListener("click", onClick);
      return element("li", {}, button);
    };
    list.append(row("Scene: " + editor.scene.name, editor.scene.width + "×" + editor.scene.height, null, editor.selected === null, () => hooks.select(null)));
    for (const entity of editor.scene.entities) {
      const picture = entityImage(entity);
      const icon = element("canvas", { width: picture.width, height: picture.height });
      icon.getContext("2d").drawImage(picture, 0, 0);
      list.append(row(entity.name, entity.prefab.replace(/_/g, " "), icon, entity.id === editor.selected, () => hooks.select(entity.id)));
    }
  }

  // ---- Inspector ----
  function input(value, type, onCommit, extra = {}) {
    const field = element("input", { type, value, ...extra });
    field.addEventListener("change", () => onCommit(type === "number" ? Number(field.value) : field.value));
    return field;
  }
  function select(options, value, onCommit) {
    const field = element("select", {}, ...options.map(([optionValue, text]) => element("option", { value: optionValue, textContent: text, selected: optionValue === value })));
    field.addEventListener("change", () => onCommit(field.value));
    return field;
  }

  function sceneInspector() {
    const scene = editor.scene;
    const box = places.inspector;
    box.append(element("h2", { textContent: "Scene" }));
    box.append(label("Name", input(scene.name, "text", (value) => { scene.name = value.slice(0, 60) || "Untitled scene"; hooks.edited("Rename scene"); })));
    box.append(label("Template (how the player moves)", select(TEMPLATES.map((name) => [name, name === "platformer" ? "Platformer: side view, gravity, jump" : "Top-down: walk in four directions"]), scene.template, (value) => { scene.template = value; hooks.edited("Template"); })));
    const width = input(scene.width, "number", () => {}, { min: 8, max: 256 });
    const height = input(scene.height, "number", () => {}, { min: 6, max: 128 });
    const apply = element("button", { type: "button", className: "k-button small", textContent: "Resize" });
    apply.addEventListener("click", () => {
      resizeScene(scene, Math.max(8, Math.min(256, Number(width.value) | 0)), Math.max(6, Math.min(128, Number(height.value) | 0)));
      hooks.edited("Resize");
    });
    box.append(element("div", { className: "ed-row" }, label("Width", width), label("Height", height), apply));
    box.append(label("Background color", input(scene.background, "color", (value) => { scene.background = value; hooks.edited("Background"); })));
    const fills = [["", "None"], ...["terrain", "floor"].flatMap((category) => tilesIn(category).map((name) => [name, name.replace(/_/g, " ")]))];
    box.append(label("Ground under everything", select(fills, scene.fill, (value) => { scene.fill = value; hooks.edited("Ground fill"); })));
    box.append(element("p", { className: "ed-hint", textContent: "Tip: pick a thing from the palette and click the scene to place it. Select it to change its components here." }));
  }

  function entityInspector(entity) {
    const box = places.inspector;
    const edited = (what) => hooks.edited(what + " · " + entity.name);
    box.append(element("h2", { textContent: "Entity" }));
    box.append(label("Name", input(entity.name, "text", (value) => { entity.name = value.slice(0, 40) || "Entity"; edited("Rename"); })));
    box.append(element("div", { className: "ed-row" },
      label("X", input(entity.x, "number", (value) => { entity.x = Math.round(value) || 0; edited("Move"); }, { step: 1 })),
      label("Y", input(entity.y, "number", (value) => { entity.y = Math.round(value) || 0; edited("Move"); }, { step: 1 }))));

    if (entity.components.sprite && entity.components.sprite.image === "character") {
      const saved = savedCharacters();
      const current = entity.look && entity.look.skin ? "saved:" + entity.look.name : entity.look && entity.look.seed ? "seed" : "default";
      const options = [["default", "Default hero"], ["seed", "Random (seed " + ((entity.look && entity.look.seed) || 1) + ")"], ...saved.map((spec) => ["saved:" + spec.name, "Saved: " + spec.name])];
      if (current.startsWith("saved:") && !saved.some((spec) => "saved:" + spec.name === current)) options.push([current, entity.look.name + " (in this scene)"]);
      const pick = select(options, current, (value) => {
        if (value === "default") delete entity.look;
        else if (value === "seed") entity.look = { seed: Math.floor(Math.random() * 100000) };
        else if (saved.some((spec) => "saved:" + spec.name === value)) entity.look = saved.find((spec) => "saved:" + spec.name === value);
        edited("Look");
      });
      const reroll = element("button", { type: "button", className: "k-button small", textContent: "🎲" });
      reroll.setAttribute("aria-label", "New random look");
      reroll.addEventListener("click", () => { entity.look = { seed: Math.floor(Math.random() * 100000) }; edited("Look"); });
      box.append(element("div", { className: "ed-row" }, label("Look", pick), reroll));
      box.append(element("p", { className: "ed-hint" }, "Design looks in the ", element("a", { href: "../character-designer/", textContent: "character designer" }), " and save them."));
    }

    for (const name of Object.keys(entity.components)) {
      const component = COMPONENTS[name];
      const set = element("fieldset", { className: "ed-field" });
      const remove = element("button", { type: "button", className: "ed-tool", textContent: "Remove" });
      remove.addEventListener("click", () => { delete entity.components[name]; edited("Remove " + component.label); });
      set.append(element("legend", {}, element("strong", { textContent: component.label }), " ", remove));
      set.append(element("p", { className: "ed-hint", textContent: component.description }));
      for (const field in component.fields) {
        const rule = component.fields[field];
        const value = entity.components[name][field];
        const commit = (next) => { entity.components[name][field] = next; edited(component.label + " " + field); };
        let control;
        if (rule.type === "number") control = input(value, "number", (next) => commit(Math.min(rule.max, Math.max(rule.min, isFinite(next) ? next : rule.default))), { min: rule.min, max: rule.max, step: rule.step || 1 });
        else if (rule.type === "boolean") { control = element("input", { type: "checkbox", checked: value }); control.addEventListener("change", () => commit(control.checked)); }
        else if (rule.type === "select") control = select(rule.options.map((option) => [option, option]), value, commit);
        else if (rule.type === "sprite") control = select([...spriteChoices(), ...(value.startsWith("tile:") ? [value] : [])].map((option) => [option, option]), value, commit);
        else { control = element("textarea", { value, rows: 2 }); control.addEventListener("change", () => commit(control.value.slice(0, 400))); }
        set.append(rule.type === "boolean" ? element("label", { className: "ed-row" }, control, field) : label(field, control));
      }
      box.append(set);
    }
    const missing = COMPONENT_NAMES.filter((name) => !entity.components[name]);
    if (missing.length) {
      box.append(label("Add component", select([["", "Choose…"], ...missing.map((name) => [name, COMPONENTS[name].label + ": " + COMPONENTS[name].description])], "", (value) => {
        if (!value) return;
        entity.components[value] = componentDefaults(value);
        edited("Add " + COMPONENTS[value].label);
      })));
    }
    const duplicate = element("button", { type: "button", className: "k-button small", textContent: "Duplicate" });
    duplicate.addEventListener("click", () => hooks.duplicate(entity));
    const remove = element("button", { type: "button", className: "k-button small", textContent: "Delete" });
    remove.addEventListener("click", () => { removeEntity(editor.scene, entity.id); hooks.select(null); hooks.edited("Delete " + entity.name); });
    box.append(element("div", { className: "ed-row" }, duplicate, remove));
  }

  function renderInspector() {
    places.inspector.replaceChildren();
    const entity = editor.scene.entities.find((item) => item.id === editor.selected);
    if (entity) entityInspector(entity);
    else sceneInspector();
  }

  return {
    renderPalette, renderHierarchy, renderInspector,
    refresh() { renderPalette(); renderHierarchy(); renderInspector(); },
    showTab(name) { places.tabs.find((button) => button.dataset.tab === name)?.click(); },
  };
}
