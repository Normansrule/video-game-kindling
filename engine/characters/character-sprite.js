// engine/characters/character-sprite.js
// WHAT: Paints 2D pixel-art sprites for a character spec: facing down, up, right and
//       left, each standing and in two walking steps. 16 x 20 pixels per frame.
// WHY:  The same character you design for 3D also works in a top-down RPG or a
//       platformer. Everything is drawn from rectangles, in layers, back to front:
//       things behind the body (cape, back hair), legs, body, arms, head, hair, hat.
// DOC:  docs/modules/characters.md
//
// Usage (browser):
//   const sheet = characterSheet(spec);                   // { canvas, frameWidth, frameHeight, frames }
//   const frame = sheet.frames.walkRight[1];              // { x, y, width, height } on sheet.canvas
//   context.drawImage(sheet.canvas, frame.x, frame.y, 16, 20, screenX, screenY, 16, 20);
// Or one frame as raw pixels (works in Node): characterFrame(spec, "down", 0)

import { createPixels, fillPixels, setPixel, flipPixels, stampPixels, pixelsToCanvas, outlinePixels } from "../library/pixels.js";
import { normalizeCharacter } from "./character-spec.js";

export const FRAME_WIDTH = 16;
export const FRAME_HEIGHT = 20;
export const DIRECTIONS = ["down", "up", "right", "left"];

const darker = (hex, amount = 0.72) => {
  const value = parseInt(hex.slice(1), 16);
  return [Math.round(((value >> 16) & 255) * amount), Math.round(((value >> 8) & 255) * amount), Math.round((value & 255) * amount)];
};
const OUTLINE = "#1a1c22";

// Paint one frame. direction: "down" | "up" | "right" | "left". step: 0 stand, 1 and 2 walk.
export function characterFrame(input, direction = "down", step = 0) {
  if (direction === "left") return flipPixels(characterFrame(input, "right", step));
  const spec = normalizeCharacter(input);
  const image = createPixels(FRAME_WIDTH, FRAME_HEIGHT);
  const box = (x, y, w, h, color) => fillPixels(image, x, y, w, h, color);
  const side = direction === "right";
  const front = direction === "down";
  const bob = step === 0 ? 0 : 1;                     // the body dips on each step
  const swing = step === 1 ? 1 : step === 2 ? -1 : 0;
  const top = 1 + bob;                                // top of the head
  const shirt = spec.shirtStyle === "armor" ? "#c8ccd6" : spec.shirt;

  // 1. Behind the body: cape, wings, long hair seen from the front.
  if (spec.back === "cape") box(side ? 3 : 3, top + 8, side ? 4 : 10, 9 - bob, darker(spec.backColor, front ? 0.6 : 1));
  if (spec.back === "wings") { box(side ? 2 : 0, top + 8, side ? 4 : 3, 5, "#f2f4ff"); if (!side) box(13, top + 8, 3, 5, "#f2f4ff"); }
  if ((spec.hairStyle === "long") && front) box(3, top + 3, 10, 9, darker(spec.hair, 0.8));

  // 2. Legs: in a stride one leg reaches forward (side view) or lifts (front view).
  if (side) {
    box(6 + swing, top + 13, 3, 4, spec.pants); box(6 + swing, top + 17 - bob, 4, 1, spec.shoes);
    box(8 - swing, top + 13, 3, 4, darker(spec.pants)); box(8 - swing, top + 17 - bob, 4, 1, spec.shoes);
  } else {
    const leftLift = swing > 0 ? 1 : 0;
    const rightLift = swing < 0 ? 1 : 0;
    box(5, top + 13, 3, 4 - leftLift, spec.pants); box(5, top + 17 - leftLift - bob, 3, 1, spec.shoes);
    box(8, top + 13, 3, 4 - rightLift, spec.pants); box(8, top + 17 - rightLift - bob, 3, 1, spec.shoes);
  }

  // 3. Body.
  const bodyX = side ? 5 : 4;
  const bodyWidth = side ? 6 : 8;
  box(bodyX, top + 8, bodyWidth, 5, shirt);
  if (spec.shirtStyle === "stripes") { box(bodyX, top + 9, bodyWidth, 1, "#f4f4f4"); box(bodyX, top + 11, bodyWidth, 1, "#f4f4f4"); }
  if (spec.shirtStyle === "jacket" && !side) { box(4, top + 8, 3, 5, darker(spec.shirt, 0.6)); box(9, top + 8, 3, 5, darker(spec.shirt, 0.6)); }
  if (spec.shirtStyle === "robe") box(bodyX, top + 12, bodyWidth, 4, shirt);
  if (spec.shirtStyle === "armor" && !side) box(6, top + 9, 4, 2, spec.backColor);
  box(bodyX, top + 12, bodyWidth, 1, darker(spec.pants, 0.6));          // belt
  if (spec.back === "backpack" && direction !== "down") box(side ? 3 : 5, top + 8, side ? 3 : 6, 5, spec.backColor);

  // 4. Arms (and whatever is in the hand).
  const hand = (x, y) => box(x, y, 2, 1, spec.skin);
  if (side) {
    box(7 - swing, top + 8, 2, 4, darker(shirt, 0.85)); hand(7 - swing, top + 12);
    drawHeld(image, spec.held, 9 - swing, top + 12, true);
  } else {
    box(2, top + 8 + Math.max(0, swing), 2, 4, shirt); hand(2, top + 12 + Math.max(0, swing));
    box(12, top + 8 + Math.max(0, -swing), 2, 4, shirt); hand(12, top + 12 + Math.max(0, -swing));
    if (front) drawHeld(image, spec.held, 13, top + 12 + Math.max(0, -swing), false);
  }

  // 5. Head, face, hair, hat.
  const headX = side ? 4 : 4;
  box(headX, top, 8, 8, spec.skin);
  if (front) {
    setPixel(image, 6, top + 4, spec.eyes); setPixel(image, 9, top + 4, spec.eyes);
    if (spec.face === "glasses") { box(5, top + 3, 6, 1, OUTLINE); setPixel(image, 6, top + 4, "#9fd8ff"); setPixel(image, 9, top + 4, "#9fd8ff"); }
    if (spec.face === "mask") box(4, top + 5, 8, 3, spec.hatColor);
    if (spec.face === "beard") box(4, top + 5, 8, 3, spec.hair);
    if (spec.face === "none" || spec.face === "glasses") box(7, top + 6, 2, 1, "#a0523c");
  } else if (side) {
    setPixel(image, 10, top + 4, spec.eyes);
    if (spec.face === "beard") box(8, top + 5, 4, 3, spec.hair);
    if (spec.face === "mask") box(8, top + 5, 4, 2, spec.hatColor);
    if (spec.face === "glasses") box(9, top + 3, 3, 1, OUTLINE);
  }
  drawHair(image, spec, direction, top);
  drawHat(image, spec, top, side);
  return outlinePixels(image, OUTLINE);
}

function drawHair(image, spec, direction, top) {
  const box = (x, y, w, h) => fillPixels(image, x, y, w, h, spec.hair);
  const style = spec.hairStyle;
  if (style === "bald") return;
  box(4, top, 8, 2);
  if (direction === "up") box(4, top, 8, style === "long" ? 10 : style === "bob" ? 7 : 5);
  if (direction === "right") { box(4, top, 4, style === "long" ? 9 : style === "bob" ? 7 : 5); if (style === "ponytail") box(2, top + 3, 2, 4); }
  if (direction === "down" && (style === "long" || style === "bob")) { box(4, top, 1, style === "long" ? 9 : 6); box(11, top, 1, style === "long" ? 9 : 6); }
  if (style === "spiky") for (let x = 4; x < 12; x += 2) setPixel(image, x, top - 1, spec.hair);
}

function drawHat(image, spec, top, side) {
  const box = (x, y, w, h, color) => fillPixels(image, x, y, w, h, color);
  const color = spec.hatColor;
  if (spec.hat === "cap") { box(4, top - 1, 8, 2, color); box(side ? 10 : 4, top + 1, side ? 3 : 8, 1, darker(color)); }
  if (spec.hat === "crown") { box(4, top - 1, 8, 2, "#ffd34d"); for (const x of [4, 7, 11]) setPixel(image, x, top - 2, "#ffd34d"); setPixel(image, 8, top - 1, "#e04050"); }
  if (spec.hat === "wizard") { box(3, top, 10, 1, color); box(5, top - 2, 6, 2, color); box(6, top - 4 < 0 ? 0 : top - 4, 4, 2, color); }
  if (spec.hat === "helmet") { box(4, top - 1, 8, 4, "#c8ccd6"); box(7, top - 1, 2, 1, color); }
  if (spec.hat === "bandana") box(4, top + 1, 8, 1, color);
  if (spec.hat === "tophat") { box(3, top, 10, 1, "#22222a"); box(5, Math.max(0, top - 4), 6, 4, "#22222a"); box(5, top - 1, 6, 1, color); }
}

function drawHeld(image, held, x, y, side) {
  const box = (bx, by, w, h, color) => fillPixels(image, bx, by, w, h, color);
  if (held === "sword") { box(x, y - 5, 1, 5, "#dfe4ee"); box(x - 1, y, 3, 1, "#d99a1e"); }
  if (held === "staff") { box(x, y - 8, 1, 10, "#7a4a24"); box(x - 1, y - 10, 3, 2, "#a070f0"); }
  if (held === "torch") { box(x, y - 3, 1, 4, "#7a4a24"); box(x, y - 5, 1, 2, "#ffb030"); }
  if (held === "shield") box(side ? x : x - 1, y - 3, 3, 4, "#4a8af0");
  if (held === "pickaxe") { box(x, y - 5, 1, 6, "#7a4a24"); box(x - 2, y - 5, 5, 1, "#c8ccd6"); }
}

// Every frame on one sheet: rows = down, up, right, left; columns = stand, step 1, step 2.
export function characterSheetPixels(spec) {
  const sheet = createPixels(FRAME_WIDTH * 3, FRAME_HEIGHT * 4);
  DIRECTIONS.forEach((direction, row) => {
    for (let step = 0; step < 3; step++) stampPixels(sheet, characterFrame(spec, direction, step), step * FRAME_WIDTH, row * FRAME_HEIGHT);
  });
  return sheet;
}

// Browser only: the sheet as a canvas, with named frame lists for animation:
// frames.idleDown = [frame], frames.walkDown = [step1, stand, step2, stand], and so on.
export function characterSheet(spec, scale = 1) {
  const canvas = pixelsToCanvas(characterSheetPixels(spec), scale);
  const frames = {};
  const frame = (row, column) => ({ x: column * FRAME_WIDTH * scale, y: row * FRAME_HEIGHT * scale, width: FRAME_WIDTH * scale, height: FRAME_HEIGHT * scale });
  DIRECTIONS.forEach((direction, row) => {
    const name = direction[0].toUpperCase() + direction.slice(1);
    frames["idle" + name] = [frame(row, 0)];
    frames["walk" + name] = [frame(row, 1), frame(row, 0), frame(row, 2), frame(row, 0)];
  });
  return { canvas, frameWidth: FRAME_WIDTH * scale, frameHeight: FRAME_HEIGHT * scale, frames };
}
