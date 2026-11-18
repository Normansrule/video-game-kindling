// tiny/pack.mjs
// WHAT: Pack a tiny game folder for js13kGames (or any size-limited jam):
//       bundle its modules into one index.html, zip it with maximum compression,
//       and tell you how many bytes you have left.
// WHY:  The limit is on the ZIP, so guessing from file sizes is useless.
//       Run this often during the jam, not just at the end.
// RUN:  cd ~/projects/kindling && node tiny/pack.mjs ~/projects/my-tiny-game
//       (Node 20 or newer; no npm install needed)
// MAKES: ~/projects/my-tiny-game-13k/index.html   the packed page, to test
//        ~/projects/my-tiny-game-13k.zip          the file you upload
// DOC:  tiny/README.md

import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";
import { join, resolve, relative, basename, dirname } from "node:path";
import { bundle, inlineScript, entryOf } from "./bundle.js";
import { makeZip } from "./zip.js";

// js13kGames has used 13,312 bytes (13 x 1024) for years. Check the current rules.
const LIMIT = Number(process.env.KINDLING_LIMIT || 13312);

const folder = process.argv[2] && resolve(process.argv[2]);
if (!folder) {
  console.error("Usage: node tiny/pack.mjs <game-folder>   (the folder with index.html)");
  process.exit(1);
}

async function listFiles(directory, found = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) await listFiles(full, found);
    else found.push(full);
  }
  return found;
}

const html = await readFile(join(folder, "index.html"), "utf8");
const entry = entryOf(html);
if (!entry) {
  console.error('index.html needs <script type="module" src="./main.js"></script>');
  process.exit(1);
}

// Read every .js file under the folder, plus anything the game imports from
// outside it (the in-repo starter imports ../kindling-tiny.js).
const sources = {};
const root = dirname(folder);
async function addScript(path) {
  const key = relative(root, path).split("\\").join("/");
  if (key in sources) return;
  sources[key] = await readFile(path, "utf8");
  for (const match of sources[key].matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g)) {
    await addScript(resolve(dirname(path), match[1]));
  }
}
await addScript(join(folder, entry));
const entryKey = relative(root, join(folder, entry)).split("\\").join("/");

let page;
try {
  page = inlineScript(html, bundle(sources, entryKey));
} catch (error) {
  console.error("Could not bundle: " + error.message);
  process.exit(1);
}

// Everything else in the folder (images, sounds) goes in the zip as it is.
const skip = (name) => name.endsWith(".js") || name.endsWith(".md") || name.endsWith(".zip") || name === "index.html";
const extras = (await listFiles(folder)).filter((path) => !skip(basename(path)));
const files = [{ name: "index.html", data: new TextEncoder().encode(page) }];
for (const path of extras) files.push({ name: relative(folder, path).split("\\").join("/"), data: await readFile(path) });

const zip = makeZip(files, (bytes) => deflateRawSync(bytes, { level: 9 }));
const name = basename(folder);
const outFolder = join(root, name + "-13k");
await mkdir(outFolder, { recursive: true });
await writeFile(join(outFolder, "index.html"), page);
for (const file of files.slice(1)) {
  await mkdir(dirname(join(outFolder, file.name)), { recursive: true });
  await writeFile(join(outFolder, file.name), file.data);
}
await writeFile(join(root, name + "-13k.zip"), zip);

const originalBytes = Object.values(sources).reduce((sum, text) => sum + Buffer.byteLength(text), 0) + Buffer.byteLength(html);
const left = LIMIT - zip.length;
console.log("Source files:   " + originalBytes.toLocaleString("en-US") + " bytes");
console.log("Packed page:    " + Buffer.byteLength(page).toLocaleString("en-US") + " bytes  (" + outFolder + "/index.html)");
console.log("Zip:            " + zip.length.toLocaleString("en-US") + " bytes  (" + join(root, name + "-13k.zip") + ")");
console.log(left >= 0
  ? "Under the limit: " + left.toLocaleString("en-US") + " bytes left of " + LIMIT.toLocaleString("en-US") + " (" + Math.round((zip.length / LIMIT) * 100) + "% used)."
  : "OVER the limit by " + (-left).toLocaleString("en-US") + " bytes. See tiny/README.md, \"When you run out of bytes\".");
console.log("Test the packed page: cd " + outFolder + " && python3 -m http.server 8000");
process.exit(left >= 0 ? 0 : 2);
