// playground/playground.js
// WHAT: Runs the playground page: loads an example's code into the editor, colors it,
//       and runs it in an <iframe> built from a string (srcdoc) every time you press Run.
// WHY:  A fresh iframe per run is the simplest "sandbox": the old game, its timers,
//       its key listeners and its WebGL context all vanish with the old page.
//       The iframe's import map points "kindling/" at the engine by FULL URL, so the
//       same page also works when you open it in its own tab.
// DOC:  playground/index.html (layout), assets/highlight.js (colors)

import { categories, examples } from "../game-code-examples/catalog.js";
import { highlight } from "../assets/highlight.js";

const picker = document.getElementById("picker");
const source = document.getElementById("source");
const highlighted = document.getElementById("highlight");
const gutter = document.getElementById("gutter");
const frame = document.getElementById("frame");
const log = document.getElementById("log");
const status = document.getElementById("status");
const auto = document.getElementById("auto");

const engineURL = new URL("../engine/", location.href).href;
const examplesURL = new URL("../game-code-examples/", location.href).href;
let current = new URLSearchParams(location.search).get("ex") || examples[0].id;
if (!examples.some((example) => example.id === current)) current = examples[0].id;
let original = "";      // the example's code as shipped, for Reset
let runTimer = 0;

// ---------- Saving drafts (per example, in this browser only) ----------
const draftKey = (id) => "kindling:playground:" + id;
function readDraft(id) {
  try { return localStorage.getItem(draftKey(id)); } catch { return null; }
}
function writeDraft(id, code) {
  try {
    if (code === original) localStorage.removeItem(draftKey(id));
    else localStorage.setItem(draftKey(id), code);
  } catch { /* storage blocked: edits last until the tab closes */ }
}

// ---------- The editor ----------
function paint() {
  // A trailing newline needs one extra space or the <pre> is one line shorter than the textarea.
  highlighted.innerHTML = highlight(source.value) + "\n ";
  const lines = source.value.split("\n").length;
  let numbers = "";
  for (let line = 1; line <= lines; line++) numbers += line + "\n";
  gutter.textContent = numbers;
  syncScroll();
}
function syncScroll() {
  highlighted.parentElement.scrollTop = source.scrollTop;
  highlighted.parentElement.scrollLeft = source.scrollLeft;
  gutter.scrollTop = source.scrollTop;
}
source.addEventListener("scroll", syncScroll);
source.addEventListener("input", () => {
  paint();
  writeDraft(current, source.value);
  showEdited();
  if (auto.checked) {
    clearTimeout(runTimer);
    runTimer = setTimeout(run, 900);
  }
});

// Tab indents (two spaces), Shift+Tab outdents. Esc releases Tab so keyboard users can leave.
let tabTraps = true;
source.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); run(); return; }
  if (event.key === "Escape") { tabTraps = false; return; }
  if (event.key !== "Tab" || !tabTraps) return;
  event.preventDefault();
  const { selectionStart: start, selectionEnd: end, value } = source;
  if (event.shiftKey) {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    if (value.startsWith("  ", lineStart)) {
      source.setRangeText("", lineStart, lineStart + 2, "preserve");
    }
  } else {
    source.setRangeText("  ", start, end, "end");
  }
  source.dispatchEvent(new Event("input"));
});
source.addEventListener("focus", () => { tabTraps = true; });

// ---------- Running ----------
// The page the iframe shows. Console calls and errors are posted back to us.
function buildPage(code) {
  const safeCode = code.replace(/<\/script/gi, "<\\/script");
  const head = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${examplesURL}">
<title>Kindling playground run</title>
<style>html,body{margin:0;min-height:100%;background:#0d1117;color:#e9edf4;font:14px/1.4 system-ui,sans-serif}canvas{display:block;margin:0 auto;outline:none;max-width:100%}</style>
<script type="importmap">{ "imports": { "kindling/": "${engineURL}" } }<\/script>
<script>
(function () {
  function send(level, parts) {
    const text = parts.map(function (part) {
      if (part instanceof Error) return part.stack || part.message;
      if (typeof part === "object") { try { return JSON.stringify(part); } catch (e) { return String(part); } }
      return String(part);
    }).join(" ");
    try { parent.postMessage({ kindling: "console", level: level, text: text }, "*"); } catch (e) {}
  }
  ["log", "info", "warn", "error"].forEach(function (level) {
    const original = console[level].bind(console);
    console[level] = function () { send(level, Array.prototype.slice.call(arguments)); original.apply(null, arguments); };
  });
  window.addEventListener("error", function (event) { send("error", [event.message + (event.lineno ? " (line " + (event.lineno - OFFSET) + ")" : "")]); });
  window.addEventListener("unhandledrejection", function (event) { send("error", [event.reason]); });
})();
<\/script></head>
<body><canvas id="game" aria-label="Game"></canvas>
<script type="module">
`;
  // Errors report the line in the whole page; subtract the lines above your code.
  const offset = head.split("\n").length - 1;
  return head.replace("OFFSET", String(offset)) + safeCode + "\n<\/script></body></html>";
}

function run() {
  clearTimeout(runTimer);
  log.innerHTML = "";
  frame.srcdoc = buildPage(source.value);
  status.textContent = "Ran at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

window.addEventListener("message", (event) => {
  if (event.source !== frame.contentWindow || !event.data || event.data.kindling !== "console") return;
  const item = document.createElement("li");
  item.className = event.data.level;
  item.textContent = event.data.text;
  log.appendChild(item);
  while (log.children.length > 200) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
});

// ---------- Loading examples ----------
function showEdited() {
  const edited = source.value !== original;
  document.getElementById("reset").disabled = !edited;
  document.title = (edited ? "• " : "") + titleOf(current) + " | Kindling Playground";
}
const titleOf = (id) => (examples.find((example) => example.id === id) || {}).title || id;

async function load(id) {
  current = id;
  picker.value = id;
  const response = await fetch(examplesURL + "code/" + id + ".js");
  original = response.ok ? await response.text() : "// Could not load " + id + ".js (" + response.status + ")";
  source.value = readDraft(id) ?? original;
  source.scrollTop = 0;
  paint();
  showEdited();
  run();
}

picker.innerHTML = categories.map((category) =>
  '<optgroup label="' + category.title + '">' +
  examples.filter((example) => example.category === category.id)
    .map((example) => '<option value="' + example.id + '">' + example.id.slice(0, 2) + " · " + example.title + "</option>").join("") +
  "</optgroup>").join("");
picker.addEventListener("change", () => {
  history.replaceState(null, "", "?ex=" + picker.value);
  load(picker.value);
});

document.getElementById("run").addEventListener("click", run);
document.getElementById("clear").addEventListener("click", () => { log.innerHTML = ""; });
document.getElementById("reset").addEventListener("click", () => {
  source.value = original;
  writeDraft(current, original);
  paint();
  showEdited();
  run();
});
document.getElementById("copy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(source.value); status.textContent = "Copied"; }
  catch { source.select(); status.textContent = "Press Ctrl + C to copy"; }
});
document.getElementById("newtab").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([buildPage(source.value)], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});

load(current);
