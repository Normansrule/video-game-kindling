// engine/characters/character-model.js
// WHAT: Builds the 3D blocky model for a character spec: torso, head, two arms and two
//       legs (each a separate mesh so it can swing), with hair, hats, faces, capes,
//       backpacks, wings and held items attached to the right part.
// WHY:  Accessories ride on the part they belong to: a hat on the head, a sword in the
//       right hand, a cape on the torso. Then the walk animation in 3d/character.js
//       moves them for free, with no extra code.
// DOC:  docs/modules/characters.md

import { createModelBuilder } from "../3d/lowpoly.js";
import { normalizeCharacter, hexToUnit } from "./character-spec.js";

const METAL = [0.78, 0.8, 0.86];
const WOOD = [0.5, 0.33, 0.18];
const GOLD = [0.98, 0.78, 0.25];
const darker = (color, amount = 0.7) => color.map((channel) => channel * amount);

function build(draw) {
  const builder = createModelBuilder();
  draw(builder);
  return builder.data();
}

// Hair and hats sit on a 0.5 head whose bottom is at y = 0 (the neck pivot).
function addHair(b, style, hair, size) {
  const s = size;
  if (style === "bald") return;
  b.box(0, 0.52 * s, 0, 0.54 * s, 0.08 * s, 0.54 * s, hair);                       // the top
  if (style === "short" || style === "spiky" || style === "ponytail") b.box(0, 0.38 * s, -0.25 * s, 0.54 * s, 0.24 * s, 0.06 * s, hair);
  if (style === "spiky") for (let i = -1; i <= 1; i++) b.cone(i * 0.16 * s, 0.56 * s, 0, 0.1 * s, 0.18 * s, 4, hair);
  if (style === "long" || style === "bob") {
    const drop = style === "long" ? 0.55 : 0.32;
    b.box(0, (0.52 - drop / 2) * s, -0.26 * s, 0.56 * s, drop * s, 0.06 * s, hair);
    b.box(-0.27 * s, (0.52 - drop / 2) * s, -0.04 * s, 0.05 * s, drop * s, 0.42 * s, hair);
    b.box(0.27 * s, (0.52 - drop / 2) * s, -0.04 * s, 0.05 * s, drop * s, 0.42 * s, hair);
  }
  if (style === "ponytail") b.box(0, 0.25 * s, -0.33 * s, 0.14 * s, 0.4 * s, 0.1 * s, hair);
}

function addHat(b, hat, color, s) {
  if (hat === "cap") { b.box(0, 0.58 * s, -0.02 * s, 0.56 * s, 0.14 * s, 0.56 * s, color); b.box(0, 0.53 * s, 0.32 * s, 0.5 * s, 0.04 * s, 0.2 * s, darker(color)); }
  if (hat === "crown") { b.box(0, 0.6 * s, 0, 0.5 * s, 0.12 * s, 0.5 * s, GOLD); for (const x of [-0.18, 0, 0.18]) b.cone(x * s, 0.66 * s, 0.2 * s, 0.06 * s, 0.14 * s, 4, GOLD); }
  if (hat === "wizard") { b.box(0, 0.56 * s, 0, 0.72 * s, 0.05 * s, 0.72 * s, color); b.cone(0, 0.58 * s, 0, 0.3 * s, 0.6 * s, 6, color); }
  if (hat === "helmet") { b.box(0, 0.42 * s, 0, 0.58 * s, 0.34 * s, 0.58 * s, METAL); b.box(0, 0.62 * s, 0, 0.08 * s, 0.1 * s, 0.5 * s, color); }
  if (hat === "bandana") { b.box(0, 0.47 * s, 0, 0.55 * s, 0.09 * s, 0.55 * s, color); b.box(0.1 * s, 0.4 * s, -0.32 * s, 0.08 * s, 0.16 * s, 0.08 * s, color); }
  if (hat === "tophat") { b.box(0, 0.55 * s, 0, 0.7 * s, 0.04 * s, 0.7 * s, darker(color, 0.4)); b.box(0, 0.75 * s, 0, 0.42 * s, 0.38 * s, 0.42 * s, darker(color, 0.4)); b.box(0, 0.6 * s, 0, 0.43 * s, 0.06 * s, 0.43 * s, color); }
}

function addFace(b, face, spec, s) {
  const eyes = hexToUnit(spec.eyes);
  b.box(-0.12 * s, 0.28 * s, 0.255 * s, 0.08 * s, 0.1 * s, 0.02 * s, eyes);
  b.box(0.12 * s, 0.28 * s, 0.255 * s, 0.08 * s, 0.1 * s, 0.02 * s, eyes);
  if (face !== "beard" && face !== "mask") b.box(0, 0.12 * s, 0.255 * s, 0.2 * s, 0.05 * s, 0.02 * s, [0.55, 0.3, 0.25]);
  if (face === "glasses") { b.box(0, 0.29 * s, 0.27 * s, 0.46 * s, 0.03 * s, 0.02 * s, [0.1, 0.1, 0.1]); for (const x of [-0.12, 0.12]) b.box(x * s, 0.28 * s, 0.27 * s, 0.16 * s, 0.14 * s, 0.02 * s, [0.6, 0.85, 1]); }
  if (face === "mask") b.box(0, 0.12 * s, 0.26 * s, 0.5 * s, 0.18 * s, 0.03 * s, hexToUnit(spec.hatColor));
  if (face === "beard") b.box(0, 0.08 * s, 0.24 * s, 0.46 * s, 0.2 * s, 0.06 * s, hexToUnit(spec.hair));
}

function addHeld(b, held) {
  // The hand is at y -0.6 below the shoulder; items point forward (+z) and up.
  if (held === "sword") { b.box(0, -0.62, 0.12, 0.08, 0.08, 0.24, [0.4, 0.25, 0.1]); b.box(0, -0.62, 0.26, 0.28, 0.06, 0.06, GOLD); b.box(0, -0.62, 0.62, 0.08, 0.04, 0.66, METAL); }
  if (held === "staff") { b.box(0, -0.4, 0.14, 0.07, 1.2, 0.07, WOOD); b.box(0, 0.24, 0.14, 0.16, 0.16, 0.16, [0.6, 0.4, 1], 0.6); }
  if (held === "torch") { b.box(0, -0.5, 0.14, 0.07, 0.5, 0.07, WOOD); b.box(0, -0.2, 0.14, 0.14, 0.16, 0.14, [1, 0.6, 0.2], 1); }
  if (held === "shield") b.box(0.14, -0.45, 0.06, 0.06, 0.5, 0.42, [0.25, 0.4, 0.85]);
  if (held === "pickaxe") { b.box(0, -0.45, 0.14, 0.07, 0.6, 0.07, WOOD); b.box(0, -0.15, 0.14, 0.06, 0.08, 0.5, METAL); }
}

function addBack(b, back, color) {
  if (back === "cape") b.box(0, 0.25, -0.2, 0.62, 0.95, 0.04, color);
  if (back === "backpack") { b.box(0, 0.35, -0.26, 0.46, 0.5, 0.2, color); b.box(0, 0.22, -0.37, 0.34, 0.18, 0.04, darker(color)); }
  if (back === "wings") for (const side of [-1, 1]) b.box(side * 0.36, 0.5, -0.25, 0.5, 0.36, 0.04, [0.95, 0.95, 1], 0.1);
}

// Returns { torso, head, leftArm, rightArm, leftLeg, rightLeg }, each { pivot, data },
// the same shape as lowpoly.blockyCharacter(), so 3d/character.js can animate it.
export function characterParts(input) {
  const spec = normalizeCharacter(input);
  const skin = hexToUnit(spec.skin);
  const shirt = hexToUnit(spec.shirt);
  const pants = hexToUnit(spec.pants);
  const shoes = hexToUnit(spec.shoes);
  const accent = hexToUnit(spec.backColor);
  const s = spec.headSize;
  const sleeve = spec.shirtStyle === "armor" ? METAL : shirt;

  const torso = build((b) => {
    b.box(0, 0.35, 0, 0.6, 0.7, 0.32, spec.shirtStyle === "armor" ? METAL : shirt);
    if (spec.shirtStyle === "stripes") for (const y of [0.15, 0.35, 0.55]) b.box(0, y, 0, 0.62, 0.06, 0.34, [0.95, 0.95, 0.95]);
    if (spec.shirtStyle === "jacket") { b.box(-0.17, 0.35, 0.02, 0.26, 0.72, 0.32, darker(shirt, 0.6)); b.box(0.17, 0.35, 0.02, 0.26, 0.72, 0.32, darker(shirt, 0.6)); }
    if (spec.shirtStyle === "robe") b.box(0, -0.25, 0, 0.64, 0.6, 0.36, shirt);
    if (spec.shirtStyle === "armor") b.box(0, 0.4, 0.02, 0.4, 0.3, 0.32, accent);
    b.box(0, 0.02, 0, 0.62, 0.06, 0.34, darker(pants, 0.6));                 // belt
    addBack(b, spec.back, accent);
  });
  const head = build((b) => {
    b.box(0, 0.25 * s, 0, 0.5 * s, 0.5 * s, 0.5 * s, skin);
    addFace(b, spec.face, spec, s);
    addHair(b, spec.hairStyle, hexToUnit(spec.hair), s);
    addHat(b, spec.hat, hexToUnit(spec.hatColor), s);
  });
  const arm = (withItem) => build((b) => {
    b.box(0, -0.25, 0, 0.2, 0.5, 0.24, sleeve);
    b.box(0, -0.6, 0, 0.18, 0.2, 0.22, skin);
    if (withItem) addHeld(b, spec.held);
  });
  const leg = build((b) => { b.box(0, -0.3, 0, 0.26, 0.6, 0.28, pants); b.box(0, -0.68, 0.03, 0.26, 0.14, 0.34, shoes); });
  return {
    torso: { pivot: [0, 0.75, 0], data: torso },
    head: { pivot: [0, 1.45, 0], data: head },
    leftArm: { pivot: [-0.4, 1.4, 0], data: arm(false) },
    rightArm: { pivot: [0.4, 1.4, 0], data: arm(true) },
    leftLeg: { pivot: [-0.15, 0.75, 0], data: leg },
    rightLeg: { pivot: [0.15, 0.75, 0], data: leg },
  };
}
