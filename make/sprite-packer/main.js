// make/sprite-packer/main.js
// WHAT: The sprite packer page: read pictures, pack them with packRects(), draw the
//       atlas, and let you download atlas.png and atlas.json.
// WHY:  Packing by hand in a paint program is slow and easy to get wrong.
// DOC:  make/README.md

import { packRects, packEfficiency } from "kindling/2d/atlas.js";

const pictures = [];          // { name, image (canvas or ImageBitmap), width, height }
let packed = null;

const $ = (id) => document.getElementById(id);
const canvas = $("atlas");
const context = canvas.getContext("2d");

// "Hero Run 0.png" -> "hero-run-0"; duplicates get -2, -3 ...
function frameName(fileName) {
  const base = fileName.replace(/\.[^.]+$/, "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "sprite";
  let name = base;
  for (let n = 2; pictures.some((picture) => picture.name === name); n++) name = base + "-" + n;
  return name;
}

async function addFiles(fileList) {
  const files = [...fileList].filter((file) => /^image\/(png|gif|webp)$/.test(file.type));
  for (const file of files) {
    try {
      const image = await createImageBitmap(file);
      pictures.push({ name: frameName(file.name), image, width: image.width, height: image.height });
    } catch {
      $("readout").textContent = "Couldn't read " + file.name + ". Is it a real PNG?";
    }
  }
  repack();
}

// Demo sprites drawn in code, so the tool works without any files.
function addDemo() {
  const make = (name, width, height, paint) => {
    const sprite = document.createElement("canvas");
    sprite.width = width;
    sprite.height = height;
    paint(sprite.getContext("2d"), width, height);
    pictures.push({ name: frameName(name), image: sprite, width, height });
  };
  for (let i = 0; i < 4; i++) {
    make("hero-run-" + i, 12, 16, (c) => {
      c.fillStyle = "#6cb6ff"; c.fillRect(2, 2, 8, 8);
      c.fillStyle = "#ffd447"; c.fillRect(4, 4, 2, 2);
      c.fillStyle = "#1f5fa8"; c.fillRect(2 + (i % 2) * 2, 10, 3, 6); c.fillRect(7 - (i % 2) * 2, 10, 3, 6);
    });
  }
  for (let i = 0; i < 4; i++) {
    make("coin-" + i, 10, 10, (c) => {
      const w = [8, 5, 2, 5][i];
      c.fillStyle = "#ffb347"; c.beginPath(); c.ellipse(5, 5, w / 2 + 0.5, 4.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#fff3c4"; c.fillRect(4, 2, 1, 3);
    });
  }
  make("tree", 24, 36, (c) => {
    c.fillStyle = "#7a4b2a"; c.fillRect(10, 24, 4, 12);
    c.fillStyle = "#2e8b57"; c.beginPath(); c.moveTo(12, 0); c.lineTo(24, 26); c.lineTo(0, 26); c.fill();
  });
  make("cloud", 40, 16, (c) => {
    c.fillStyle = "#e8eef7";
    for (const [x, y, r] of [[10, 10, 6], [20, 7, 7], [30, 10, 6]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  });
  make("gem", 12, 12, (c) => {
    c.fillStyle = "#c86bff"; c.beginPath(); c.moveTo(6, 0); c.lineTo(12, 5); c.lineTo(6, 12); c.lineTo(0, 5); c.fill();
  });
  make("heart", 9, 8, (c) => {
    c.fillStyle = "#ff5a7a"; c.fillRect(1, 0, 3, 2); c.fillRect(5, 0, 3, 2); c.fillRect(0, 1, 9, 3); c.fillRect(1, 4, 7, 2); c.fillRect(3, 6, 3, 2);
  });
  make("door", 16, 24, (c) => {
    c.fillStyle = "#8b5a2b"; c.fillRect(0, 0, 16, 24);
    c.fillStyle = "#ffd447"; c.fillRect(11, 12, 2, 2);
  });
  repack();
}

function repack() {
  const padding = Number($("padding").value);
  $("padding-out").textContent = padding + " px";
  const options = { padding, maxWidth: Number($("max-width").value), powerOfTwo: $("pot").checked };
  packed = pictures.length ? packRects(pictures, options) : null;
  draw();
}

// Draw the pictures only. Outlines go on top in the preview, never in the download.
function paintAtlas(target, withOutlines) {
  const ctx = target.getContext("2d");
  target.width = Math.max(1, packed.width);
  target.height = Math.max(1, packed.height);
  ctx.clearRect(0, 0, target.width, target.height);
  for (const picture of pictures) {
    const frame = packed.frames[picture.name];
    if (frame) ctx.drawImage(picture.image, frame.x, frame.y);
  }
  if (withOutlines) {
    ctx.strokeStyle = "rgba(255, 90, 60, 0.9)";
    ctx.lineWidth = 1;
    for (const frame of Object.values(packed.frames)) ctx.strokeRect(frame.x + 0.5, frame.y + 0.5, frame.width - 1, frame.height - 1);
  }
}

function draw() {
  const ready = Boolean(packed && Object.keys(packed.frames).length);
  $("save-png").disabled = !ready;
  $("save-json").disabled = !ready;
  if (!ready) {
    canvas.width = canvas.height = 1;
    context.clearRect(0, 0, 1, 1);
    $("readout").textContent = "No pictures yet. Try the demo sprites.";
    return;
  }
  paintAtlas(canvas, $("outlines").checked);
  // Show small atlases bigger, with crisp pixels.
  const zoom = Math.max(1, Math.min(4, Math.floor(600 / Math.max(packed.width, packed.height))));
  canvas.style.width = packed.width * zoom + "px";
  canvas.style.height = packed.height * zoom + "px";
  const placed = Object.keys(packed.frames).length;
  const missing = pictures.length - placed;
  $("readout").textContent = placed + " pictures in " + packed.width + " × " + packed.height + " px, " +
    Math.round(packEfficiency(packed) * 100) + "% filled" +
    (missing ? ". " + missing + " too wide for the maximum width: raise it." : ".");
}

function atlasJson() {
  return JSON.stringify({
    meta: { image: "atlas.png", width: packed.width, height: packed.height, padding: Number($("padding").value), app: "Kindling sprite packer" },
    frames: packed.frames,
  }, null, 2);
}

function download(blob, fileName) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

$("files").addEventListener("change", (event) => addFiles(event.target.files));
const drop = $("drop");
drop.addEventListener("dragover", (event) => { event.preventDefault(); drop.classList.add("over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (event) => {
  event.preventDefault();
  drop.classList.remove("over");
  addFiles(event.dataTransfer.files);
});
$("demo").addEventListener("click", addDemo);
$("clear").addEventListener("click", () => { pictures.length = 0; $("files").value = ""; repack(); });
for (const id of ["padding", "max-width", "pot"]) $(id).addEventListener("input", repack);
$("outlines").addEventListener("input", draw);
$("save-png").addEventListener("click", () => {
  const clean = document.createElement("canvas");
  paintAtlas(clean, false);
  clean.toBlob((blob) => download(blob, "atlas.png"), "image/png");
});
$("save-json").addEventListener("click", () => download(new Blob([atlasJson()], { type: "application/json" }), "atlas.json"));

// For the smoke test and for curious readers: ?demo fills the page straight away.
if (new URLSearchParams(location.search).has("demo")) addDemo();
