// tests/checks/tools.checks.js
// WHAT: Checks for texture atlases (engine/2d/atlas.js) and the level editor's
//       level logic (make/level-editor/grid.js).
// DOC:  docs/modules/2d.md, make/README.md

import { expect } from "./expect.js";
import { packRects, packSkyline, packEfficiency, createAtlas } from "../../engine/2d/atlas.js";
import {
  createLevel, levelFromText, levelFromPaste, levelToRows, levelToModule, paintLine, paintRect,
  floodFill, resizeLevel, checkLevel, createHistory, cellsOnLine,
} from "../../make/level-editor/grid.js";

// Do any two frames overlap, counting the padding gap?
function overlapping(frames, padding) {
  const list = Object.values(frames);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.x < b.x + b.width + padding && a.x + a.width + padding > b.x && a.y < b.y + b.height + padding && a.y + a.height + padding > b.y) return true;
    }
  }
  return false;
}

function someSprites(count) {
  let seed = 12345;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, (_, i) => ({ name: "s" + i, width: 3 + Math.floor(next() * 40), height: 3 + Math.floor(next() * 40) }));
}

export const toolsChecks = [
  { name: "atlas: 80 random sprites pack with no overlaps, inside the image", run() {
    const packed = packRects(someSprites(80), { maxWidth: 512, padding: 2 });
    expect(packed.fits && Object.keys(packed.frames).length === 80, "all placed");
    expect(!overlapping(packed.frames, 2), "frames overlap");
    for (const frame of Object.values(packed.frames)) {
      expect(frame.x + frame.width <= packed.width && frame.y + frame.height <= packed.height, "frame outside the image");
    }
    expect(packEfficiency(packed) > 0.7, "too much empty space: " + packEfficiency(packed));
  } },
  { name: "atlas: trying widths beats one long strip", run() {
    const sprites = someSprites(30);
    const strip = packSkyline(sprites, 4096, 1);
    const best = packRects(sprites, { maxWidth: 4096, padding: 1 });
    expect(best.width * best.height < strip.width * strip.height, "search should find a smaller area");
  } },
  { name: "atlas: power-of-two sizes, and too-wide pictures are reported", run() {
    const packed = packRects([{ name: "a", width: 30, height: 20 }, { name: "b", width: 10, height: 10 }], { powerOfTwo: true });
    expect([packed.width, packed.height].every((size) => (size & (size - 1)) === 0), packed.width + "x" + packed.height);
    expect(!packRects([{ name: "wide", width: 300, height: 4 }], { maxWidth: 256 }).fits, "should not fit");
  } },
  { name: "atlas: sequence() orders numbered frames for animation", run() {
    const atlas = createAtlas(null, { frames: { "run-10": {}, "run-2": {}, "run-1": {}, "runner": {}, "jump-0": {} } });
    expect(atlas.sequence("run").join() === "run-1,run-2,run-10", atlas.sequence("run").join());
    expect(atlas.has("jump-0") && !atlas.has("fly"), "has()");
  } },
  { name: "level: text round trip, ragged rows padded, pasted JS read", run() {
    const level = levelFromText("##\n#.#\n");
    expect(levelToRows(level).join("|") === "##.|#.#", levelToRows(level).join("|"));
    const pasted = levelFromPaste('export const LEVEL = [\n  "#P.#",\n  "####",\n];');
    expect(levelToRows(pasted).join("|") === "#P.#|####", levelToRows(pasted).join("|"));
    expect(levelToModule(pasted).includes('"#P.#",'), "module text");
  } },
  { name: "level: lines have no gaps, rectangles fill or outline", run() {
    expect(cellsOnLine(0, 0, 5, 2).length === 6, "a 6-wide line touches 6 cells");
    const level = createLevel(6, 4);
    paintLine(level, 0, 0, 5, 3, "#");
    expect(levelToRows(level).join("").split("#").length - 1 >= 6, "line painted");
    const box = createLevel(5, 4);
    paintRect(box, 4, 3, 0, 0, "#", true);
    expect(levelToRows(box).join("|") === "#####|#...#|#...#|#####", levelToRows(box).join("|"));
  } },
  { name: "level: flood fill stays inside walls", run() {
    const level = levelFromText(["#####", "#..##", "##..#", "#####"]);
    floodFill(level, 1, 1, "C");
    expect(levelToRows(level).join("|") === "#####|#CC##|##CC#|#####", levelToRows(level).join("|"));
    expect(!floodFill(level, 1, 1, "C"), "same character changes nothing");
  } },
  { name: "level: resizing keeps the floor at the bottom", run() {
    const level = levelFromText(["P.", "##"]);
    const taller = resizeLevel(level, 3, 4, ".", "bottom-left");
    expect(levelToRows(taller).join("|") === "...|...|P..|##.", levelToRows(taller).join("|"));
    const top = resizeLevel(level, 1, 1, ".", "top-left");
    expect(levelToRows(top).join("|") === "P", levelToRows(top).join("|"));
  } },
  { name: "level: warnings for missing or doubled start", run() {
    const legend = [{ char: ".", label: "Empty" }, { char: "#", label: "Ground" }, { char: "P", label: "Player start", required: true, unique: true }];
    expect(checkLevel(levelFromText(["..", "##"]), legend)[0].includes("No player start"), "missing P");
    expect(checkLevel(levelFromText(["PP", "##"]), legend)[0].includes("2 player start"), "two P");
    expect(checkLevel(levelFromText(["PX", "##"]), legend)[0].includes('"X"'), "unknown X");
  } },
  { name: "level: undo and redo", run() {
    const history = createHistory();
    let level = levelFromText(["..", "##"]);
    history.remember(level);
    paintRect(level, 0, 0, 1, 0, "C");
    level = history.undo(level);
    expect(levelToRows(level)[0] === "..", "undo");
    level = history.redo(level);
    expect(levelToRows(level)[0] === "CC", "redo");
    expect(!history.canRedo && history.canUndo, "flags");
  } },
];
