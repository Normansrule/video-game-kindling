// engine/characters/character-spec.js
// WHAT: What a character IS, as plain data: body colors, hair style, clothes, hat,
//       face, something on the back, something in the hand, and proportions. Plus the
//       list of every choice, defaults, a random character, and a "fix it up" check.
// WHY:  One small JSON object describes a character completely. The character
//       designer edits it, the 3D model and the 2D sprites are both built from it,
//       and you can paste it straight into your game code.
// DOC:  docs/modules/characters.md   TOOL: make/character-designer/
//
// Example:
//   { name: "Robin", skin: "#f2c48d", hair: "#5a3a20", hairStyle: "spiky", shirt: "#3f8cf2",
//     shirtStyle: "tee", pants: "#383f59", shoes: "#27201a", hat: "cap", hatColor: "#e04050",
//     face: "none", back: "cape", backColor: "#a02030", held: "sword", height: 1, headSize: 1 }

import { createRandom } from "../math/random.js";

export const CHARACTER_OPTIONS = {
  hairStyle: ["short", "spiky", "long", "ponytail", "bob", "bald"],
  shirtStyle: ["tee", "stripes", "jacket", "robe", "armor"],
  hat: ["none", "cap", "crown", "wizard", "helmet", "bandana", "tophat"],
  face: ["none", "glasses", "mask", "beard"],
  back: ["none", "cape", "backpack", "wings"],
  held: ["none", "sword", "staff", "torch", "shield", "pickaxe"],
};

export const COLOR_FIELDS = ["skin", "hair", "eyes", "shirt", "pants", "shoes", "hatColor", "backColor"];

export const SWATCHES = {
  skin: ["#fde0c2", "#f2c48d", "#d9a066", "#b07a4a", "#8a5634", "#5e3a22", "#9fd8a0", "#a8c8ff"],
  hair: ["#1f1a17", "#5a3a20", "#a0662e", "#e2b65a", "#f2e6c8", "#c0392b", "#6a3fb5", "#2e86de"],
  cloth: ["#3f8cf2", "#e04050", "#4caf50", "#f0a030", "#8e44ad", "#2c3e50", "#ecf0f1", "#1abc9c", "#795548", "#ff7aa8"],
};

export function defaultCharacter() {
  return {
    name: "Hero",
    skin: "#f2c48d", hair: "#5a3a20", hairStyle: "short", eyes: "#1a1c22",
    shirt: "#3f8cf2", shirtStyle: "tee", pants: "#383f59", shoes: "#27201a",
    hat: "none", hatColor: "#e04050", face: "none", back: "none", backColor: "#a02030",
    held: "none", height: 1, headSize: 1,
  };
}

const isColor = (value) => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);

// Fill in anything missing or invalid with the default, so old or hand-written specs
// never crash the designer or the game. Returns a NEW object.
export function normalizeCharacter(spec = {}) {
  const base = defaultCharacter();
  const result = { ...base };
  if (typeof spec.name === "string" && spec.name.trim()) result.name = spec.name.trim().slice(0, 40);
  for (const field of COLOR_FIELDS) if (isColor(spec[field])) result[field] = spec[field].toLowerCase();
  for (const field in CHARACTER_OPTIONS) if (CHARACTER_OPTIONS[field].includes(spec[field])) result[field] = spec[field];
  const clamp = (value, low, high, fallback) => (typeof value === "number" && isFinite(value) ? Math.min(high, Math.max(low, value)) : fallback);
  result.height = clamp(spec.height, 0.8, 1.2, 1);
  result.headSize = clamp(spec.headSize, 0.85, 1.3, 1);
  return result;
}

// A random but sensible character. Same seed, same character.
export function randomCharacter(seed = Date.now()) {
  const random = createRandom(seed);
  const pick = (list) => list[random.int(0, list.length - 1)];
  const names = ["Ash", "Bea", "Kai", "Mo", "Rin", "Sol", "Tam", "Vee", "Zed", "Ivy", "Nox", "Pip"];
  return normalizeCharacter({
    name: pick(names),
    skin: pick(SWATCHES.skin.slice(0, 6)), hair: pick(SWATCHES.hair), hairStyle: pick(CHARACTER_OPTIONS.hairStyle),
    shirt: pick(SWATCHES.cloth), shirtStyle: pick(CHARACTER_OPTIONS.shirtStyle), pants: pick(SWATCHES.cloth), shoes: pick(["#27201a", "#5a3a20", "#2c3e50", "#ecf0f1"]),
    hat: random.next() < 0.5 ? "none" : pick(CHARACTER_OPTIONS.hat), hatColor: pick(SWATCHES.cloth),
    face: random.next() < 0.6 ? "none" : pick(CHARACTER_OPTIONS.face),
    back: random.next() < 0.5 ? "none" : pick(CHARACTER_OPTIONS.back), backColor: pick(SWATCHES.cloth),
    held: pick(CHARACTER_OPTIONS.held), height: 0.9 + random.next() * 0.2, headSize: 0.95 + random.next() * 0.25,
  });
}

// "#3f8cf2" -> [0.25, 0.55, 0.95] for the 3D model builder.
export function hexToUnit(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
