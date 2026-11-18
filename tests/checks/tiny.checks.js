// tests/checks/tiny.checks.js
// WHAT: Checks for the 13k path: tiny/kindling-tiny.js, tiny/bundle.js and tiny/zip.js.
// DOC:  tiny/README.md

import { expect, expectClose } from "./expect.js";
import { grid, move, overlap, random, clamp } from "../../tiny/kindling-tiny.js";
import { strip, bundle, resolvePath, inlineScript, entryOf } from "../../tiny/bundle.js";
import { crc32, makeZip } from "../../tiny/zip.js";

const bytes = (text) => new TextEncoder().encode(text);
const LEVEL = [
  "#####",
  "#...#",
  "#...#",
  "#####",
];

export const tinyChecks = [
  { name: "tiny: boxes overlap, touching edges do not", run() {
    expect(overlap({ x: 0, y: 0, w: 4, h: 4 }, { x: 3, y: 3, w: 4, h: 4 }), "should overlap");
    expect(!overlap({ x: 0, y: 0, w: 4, h: 4 }, { x: 4, y: 0, w: 4, h: 4 }), "touching should not overlap");
  } },
  { name: "tiny: falling body lands exactly on the floor and is on the ground", run() {
    const map = grid(LEVEL, 8);
    const body = { x: 10, y: 9, w: 6, h: 6, vx: 0, vy: 0 };
    for (let i = 0; i < 60; i++) {
      body.vy += 500 / 60;
      move(body, 1 / 60, map);
    }
    expectClose(body.y + body.h, 24);
    expect(body.ground, "should be on the ground");
  } },
  { name: "tiny: walking into a wall stops flush against it", run() {
    const map = grid(LEVEL, 8);
    const body = { x: 10, y: 17, w: 6, h: 6, vx: 120, vy: 0 };
    for (let i = 0; i < 30; i++) move(body, 1 / 60, map);
    expectClose(body.x + body.w, 32);
    body.vx = -120;
    for (let i = 0; i < 30; i++) move(body, 1 / 60, map);
    expectClose(body.x, 8);
  } },
  { name: "tiny: grid finds markers and treats outside as solid", run() {
    const map = grid(["#P.#", "####"], 8);
    expect(JSON.stringify(map.find("P")) === '[{"x":8,"y":0}]', JSON.stringify(map.find("P")));
    expect(map.solid(-1, 0) && map.solid(100, 100), "outside should be solid");
    expect(!map.solid(17, 4), "the dot tile is empty");
  } },
  { name: "tiny: same seed, same numbers; clamp", run() {
    const a = random(42);
    const b = random(42);
    for (let i = 0; i < 5; i++) expect(a() === b(), "seeded sequences should match");
    expect(clamp(5, 0, 3) === 3 && clamp(-1, 0, 3) === 0, "clamp");
  } },
  { name: "zip: CRC-32 of \"123456789\" is cbf43926", run() {
    expect(crc32(bytes("123456789")) === 0xcbf43926, crc32(bytes("123456789")).toString(16));
  } },
  { name: "zip: stored zip has the right signatures and sizes", run() {
    const zip = makeZip([{ name: "index.html", data: bytes("<p>hi</p>") }]);
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true) === 0x04034b50, "local header first");
    expect(view.getUint32(zip.length - 22, true) === 0x06054b50, "end record last");
    expect(view.getUint16(zip.length - 12, true) === 1, "one file");
    expect(zip.length === 30 + 10 + 9 + 46 + 10 + 22, "size " + zip.length);
  } },
  { name: "bundle: strip drops comments and indentation, keeps code lines", run() {
    const out = strip("// note\n  const a = 1; // keep\n/* block\n still */\n\n  const url = \"http://x\";\n");
    expect(out === "const a = 1; // keep\nconst url = \"http://x\";", JSON.stringify(out));
  } },
  { name: "bundle: modules get their own scope and imports resolve", run() {
    const code = bundle({
      "g/main.js": 'import { add, NAME as label } from "../lib/math.js";\nconst state = 1;\nresult = add(2, 3) + label + state;',
      "lib/math.js": 'const state = 99;\nexport function add(a, b) { return a + b + state - 99; }\nexport const NAME = "x";',
    }, "g/main.js");
    const scope = {};
    new Function("scope", "let result;\n" + code + "\nscope.result = result;")(scope);
    expect(scope.result === "5x1", "got " + scope.result);
    expect(resolvePath("a/b/c.js", "../d.js") === "a/d.js", "resolvePath");
  } },
  { name: "bundle: default exports are refused with a clear message", run() {
    let message = "";
    try { bundle({ "m.js": 'import { a } from "./x.js";', "x.js": "export default 1;" }, "m.js"); } catch (error) { message = error.message; }
    expect(message.includes("default exports"), message);
  } },
  { name: "bundle: script tag is replaced and $ signs survive", run() {
    const html = '<body>\n  <!-- hi -->\n  <script type="module" src="./main.js"></script>\n</body>';
    expect(entryOf(html) === "main.js", "entry");
    const page = inlineScript(html, 'const s = "$&$1";');
    expect(page === '<body>\n<script type="module">\nconst s = "$&$1";\n</script>\n</body>', JSON.stringify(page));
  } },
];
