// tools/smoke/smoke.mjs
// WHAT: Dev-only smoke check. Opens every page of the site in a headless browser,
//       at phone width (390 px), and reports console errors, failed downloads,
//       sideways scrolling and failing unit checks.
// WHY:  With 40+ pages, clicking through each one by hand after every change is slow.
//       Nothing in the engine or the samples depends on this folder.
// RUN:  cd ~/projects/kindling/tools/smoke && npm install && npx playwright install chromium && npm run smoke
// DOC:  docs/RUNNING.md (section "Smoke check")

import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const repoRoot = resolve(import.meta.dirname, "../..");
const sitePrefix = "/kindling/";   // the same path GitHub Pages uses, to catch absolute-path bugs
const port = 8123;

const contentTypes = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".svg": "image/svg+xml", ".obj": "text/plain", ".md": "text/plain",
  ".gif": "image/gif", ".wav": "audio/wav", ".ico": "image/x-icon",
};

// A tiny static file server (like python3 -m http.server, but under /kindling/).
const server = createServer(async (request, response) => {
  let path = decodeURIComponent(new URL(request.url, "http://x").pathname);
  if (!path.startsWith(sitePrefix)) {
    response.writeHead(404).end();
    return;
  }
  path = join(repoRoot, path.slice(sitePrefix.length));
  try {
    if ((await stat(path)).isDirectory()) path = join(path, "index.html");
    const body = await readFile(path);
    response.writeHead(200, { "content-type": contentTypes[extname(path)] || "application/octet-stream" }).end(body);
  } catch {
    response.writeHead(404).end();
  }
});

// Find every index.html we publish (skip tools/, node_modules and .git).
async function findPages(folder, found = []) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "tools") continue;
    const full = join(folder, entry.name);
    // jam/starter needs its own engine/ copy (made by jam/new-game.sh); jam/preview/ checks it instead.
    if (full.endsWith(join("jam", "starter"))) continue;
    // references/react is a Vite project: only its built copy (dist/, after npm run build) runs as-is.
    if (full.endsWith(join("references", "react"))) {
      if (existsSync(join(full, "dist", "index.html"))) found.push(join("references", "react", "dist", "index.html"));
      continue;
    }
    if (entry.isDirectory()) await findPages(full, found);
    else if (entry.name.endsWith(".html")) found.push(full.slice(repoRoot.length + 1));
  }
  return found;
}

await new Promise((done) => server.listen(port, done));
const pages = (await findPages(repoRoot)).sort();
const browser = await chromium.launch();
let problems = 0;

for (const page of pages) {
  const tab = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  tab.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  tab.on("pageerror", (error) => errors.push(error.message));
  tab.on("response", (reply) => { if (reply.status() >= 400) errors.push(reply.status() + " " + reply.url()); });
  await tab.goto("http://localhost:" + port + sitePrefix + page.replace(/index\.html$/, ""));
  await tab.waitForTimeout(700);
  const sideways = await tab.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (sideways) errors.push("page scrolls sideways at 390 px");
  if (page === "tests/index.html") {
    const summary = await tab.textContent("#summary");
    const [passed, total] = summary.match(/\d+/g).map(Number);
    if (passed !== total) errors.push("unit checks: " + summary);
  }
  if (errors.length) problems = problems + 1;
  console.log((errors.length ? "FAIL " : "ok   ") + page + (errors.length ? "\n       " + errors.join("\n       ") : ""));
  await tab.close();
}

await browser.close();
server.close();
console.log("\n" + (pages.length - problems) + " of " + pages.length + " pages clean.");
process.exit(problems ? 1 : 0);
