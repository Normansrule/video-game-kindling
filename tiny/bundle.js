// tiny/bundle.js
// WHAT: Join a game's ES modules into one inline <script> and strip comments and
//       indentation, so the whole game is a single index.html.
// WHY:  One file zips smaller than several, and size-limited jams want everything
//       inside the zip. This is deliberately simple (no parser, no renaming):
//       read it in five minutes, and use a real minifier (see tiny/README.md)
//       when you need the last few hundred bytes.
// LIMITS: relative imports only ("./x.js", "../x.js"); named imports and
//       `import * as`; no default exports; exported values are copied when the
//       importing module starts (fine for functions, objects and constants).
// DOC:  tiny/README.md

// Remove whole-line comments, blank lines and indentation. It never touches the
// inside of a line, so strings and regular expressions are safe. (A multi-line
// `template literal` would lose its indentation, so avoid those in tiny games.)
export function strip(source) {
  const out = [];
  let inBlock = false;
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes("*/")) inBlock = false;
      continue;
    }
    if (line === "" || line.startsWith("//")) continue;
    if (line.startsWith("/*")) {
      if (!line.includes("*/")) inBlock = true;
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

const IMPORT = /^import\s+(?:\{([^}]*)\}|\*\s+as\s+([A-Za-z_$][\w$]*))\s+from\s+["']([^"']+)["'];?\s*$/;
const EXPORT_DECLARATION = /^export\s+(?:async\s+)?(function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/;
const EXPORT_LIST = /^export\s*\{([^}]*)\};?\s*$/;

// Turn "./b.js" seen from "game/a.js" into "game/b.js".
export function resolvePath(from, relative) {
  const parts = from.split("/").slice(0, -1);
  for (const piece of relative.split("/")) {
    if (piece === "..") parts.pop();
    else if (piece !== "." && piece !== "") parts.push(piece);
  }
  return parts.join("/");
}

// files: { "path/main.js": "source", ... }  entry: "path/main.js"
// Returns the code for one <script type="module">.
export function bundle(files, entry) {
  const order = [];                 // dependencies first
  const ids = new Map();            // path -> short variable name
  const visiting = new Set();

  function visit(path) {
    if (ids.has(path)) return;
    if (visiting.has(path)) throw new Error("Import loop through " + path);
    if (!(path in files)) throw new Error("Missing file: " + path);
    visiting.add(path);
    for (const line of files[path].split("\n")) {
      const match = line.trim().match(IMPORT);
      if (match) visit(resolvePath(path, match[3]));
      else if (/^import\s/.test(line.trim())) throw new Error(path + ": unsupported import: " + line.trim());
    }
    visiting.delete(path);
    ids.set(path, "$" + ids.size);
    order.push(path);
  }
  visit(entry);

  const chunks = order.map((path) => {
    const exported = [];
    const body = files[path].split("\n").map((line) => {
      const trimmed = line.trim();
      const imported = trimmed.match(IMPORT);
      if (imported) {
        const source = ids.get(resolvePath(path, imported[3]));
        if (imported[2]) return "const " + imported[2] + " = " + source + ";";
        const names = imported[1].split(",").map((name) => name.trim()).filter(Boolean)
          .map((name) => name.replace(/\s+as\s+/, ": "));
        return "const { " + names.join(", ") + " } = " + source + ";";
      }
      const list = trimmed.match(EXPORT_LIST);
      if (list) {
        for (const name of list[1].split(",").map((part) => part.trim()).filter(Boolean)) {
          const [local, outside] = name.split(/\s+as\s+/);
          exported.push(outside ? outside + ": " + local : local);
        }
        return "";
      }
      if (/^export\s+default\b/.test(trimmed)) throw new Error(path + ": default exports are not supported; use a named export");
      const declaration = trimmed.match(EXPORT_DECLARATION);
      if (declaration) {
        exported.push(declaration[2]);
        return line.replace(/export\s+/, "");
      }
      return line;
    }).join("\n");
    // Each module gets its own scope, so two files can both have a variable called `state`.
    if (path === entry) return "{\n" + body + "\n}";
    return "const " + ids.get(path) + " = (() => {\n" + body + "\nreturn { " + exported.join(", ") + " };\n})();";
  });
  return strip(chunks.join("\n"));
}

// Put the bundled code into the page in place of <script type="module" src="...">.
export function inlineScript(html, code) {
  const tag = /<script\s+type=["']module["']\s+src=["'][^"']+["']\s*><\/script>/;
  if (!tag.test(html)) throw new Error('index.html needs <script type="module" src="./main.js"></script>');
  // A function replacement, so "$&" or "$1" inside the game code stays as written.
  const page = html.replace(tag, () => "<script type=\"module\">\n" + code + "\n</script>");
  // HTML comments and indentation in the page itself.
  return page.replace(/<!--[\s\S]*?-->/g, "").split("\n").map((line) => line.trim()).filter(Boolean).join("\n");
}

// The entry module named by <script type="module" src="...">.
export function entryOf(html) {
  const match = html.match(/<script\s+type=["']module["']\s+src=["']([^"']+)["']/);
  return match ? match[1].replace(/^\.\//, "") : null;
}
