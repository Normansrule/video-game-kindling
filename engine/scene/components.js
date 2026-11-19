// engine/scene/components.js
// WHAT: Every component an entity can have, with its settings, their types and defaults.
//       The scene editor's inspector is drawn from this list, and the runtime reads it.
// WHY:  "Entity + components" is how Unity and Unreal build things: an entity is just a
//       name and a position; what it DOES comes from the parts you add. A coin is
//       sprite + collectible. A slime is sprite + body + patrol + hurt. Mix them freely.
// DOC:  docs/modules/scene.md (section "Components")
//
// Field types: number (min, max, step), boolean, text, select (options), sprite.
// An entity whose sprite is "character" also has entity.look: a character spec or { seed }.

import { spriteNames } from "../library/sprites.js";

export const COMPONENTS = {
  sprite: {
    label: "Sprite", description: "What it looks like: a library sprite, a tile, or a designed character.",
    fields: {
      image: { type: "sprite", default: "coin" },
      scale: { type: "number", default: 1, min: 0.5, max: 4, step: 0.5 },
      animate: { type: "boolean", default: true },
    },
  },
  body: {
    label: "Body", description: "A box that moves, falls and stops at walls.",
    fields: {
      width: { type: "number", default: 12, min: 2, max: 64 },
      height: { type: "number", default: 12, min: 2, max: 64 },
      gravity: { type: "boolean", default: true },
    },
  },
  player: {
    label: "Player", description: "Moves with the arrow keys or WASD. Jump with Space in a platformer.",
    fields: {
      speed: { type: "number", default: 90, min: 20, max: 300 },
      jump: { type: "number", default: 300, min: 0, max: 600 },
      lives: { type: "number", default: 3, min: 1, max: 9 },
    },
  },
  patrol: {
    label: "Patrol", description: "Walks back and forth, turning at walls and ledges.",
    fields: { speed: { type: "number", default: 30, min: 5, max: 200 }, turnAtLedges: { type: "boolean", default: true } },
  },
  chase: {
    label: "Chase", description: "Moves toward the player when they come close.",
    fields: { speed: { type: "number", default: 40, min: 5, max: 200 }, range: { type: "number", default: 80, min: 16, max: 400 } },
  },
  fly: {
    label: "Fly", description: "Floats and bobs up and down, ignoring gravity.",
    fields: { amplitude: { type: "number", default: 10, min: 0, max: 64 }, speed: { type: "number", default: 2, min: 0.2, max: 8, step: 0.1 } },
  },
  collectible: {
    label: "Collectible", description: "Touch it to pick it up.",
    fields: { kind: { type: "select", default: "coin", options: ["coin", "gem", "key", "heart", "star"] }, value: { type: "number", default: 1, min: 1, max: 100 } },
  },
  hurt: {
    label: "Hurts player", description: "Touching it costs the player a heart. Jump on it to defeat it if stompable.",
    fields: { damage: { type: "number", default: 1, min: 1, max: 9 }, stompable: { type: "boolean", default: true } },
  },
  dialog: {
    label: "Dialog", description: "Shows a message when the player stands close and presses E.",
    fields: { text: { type: "text", default: "Hello, traveler!" } },
  },
  door: {
    label: "Locked door", description: "Blocks the way until the player brings a key.",
    fields: { keys: { type: "number", default: 1, min: 1, max: 9 } },
  },
  spring: {
    label: "Spring", description: "Launches the player upward.",
    fields: { power: { type: "number", default: 480, min: 100, max: 900 } },
  },
  goal: {
    label: "Goal", description: "Touch it to win the level.",
    fields: { message: { type: "text", default: "You win!" } },
  },
};

export const COMPONENT_NAMES = Object.keys(COMPONENTS);

// The default settings for one component: { speed: 30, turnAtLedges: true }
export function componentDefaults(name) {
  const component = COMPONENTS[name];
  if (!component) throw new Error("Unknown component '" + name + "'");
  const values = {};
  for (const field in component.fields) values[field] = component.fields[field].default;
  return values;
}

// Clean up settings from a file: unknown fields dropped, numbers clamped, wrong types reset.
export function normalizeComponent(name, values = {}) {
  const component = COMPONENTS[name];
  const result = componentDefaults(name);
  for (const field in component.fields) {
    const rule = component.fields[field];
    const value = values[field];
    if (value === undefined) continue;
    if (rule.type === "number" && typeof value === "number" && isFinite(value)) result[field] = Math.min(rule.max ?? Infinity, Math.max(rule.min ?? -Infinity, value));
    else if (rule.type === "boolean" && typeof value === "boolean") result[field] = value;
    else if (rule.type === "select" && rule.options.includes(value)) result[field] = value;
    else if ((rule.type === "text" || rule.type === "sprite") && typeof value === "string") result[field] = value.slice(0, 400);
  }
  return result;
}

// Choices for a "sprite" field: library sprites, plus "character" (a designed character).
// A tile works too, written "tile:door_locked".
export function spriteChoices() {
  return ["character", ...spriteNames];
}
