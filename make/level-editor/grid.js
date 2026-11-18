// make/level-editor/grid.js
// WHAT: Everything the level editor does to a level, with no drawing and no DOM:
//       read and write the text format, paint lines and rectangles, flood fill,
//       resize, undo/redo, and warn about mistakes (no player start, ragged rows).
// WHY:  Kept apart from the page so the tests can check it in Node, and so you can
//       reuse it (a level generator, a build script) without a browser.
// FORMAT: the same as engine/2d/tilemap.js: an array of equal-length strings,
//       one character per tile.
// DOC:  make/README.md

// A level is { columns, rows, cells } where cells is an array of row arrays.
export function createLevel(columns, rows, fill = ".") {
  return { columns, rows, cells: Array.from({ length: rows }, () => Array(columns).fill(fill)) };
}

// From text lines (or one string with newlines). Short rows are padded with `fill`
// so a hand-typed level with ragged rows still opens.
export function levelFromText(input, fill = ".") {
  const lines = (Array.isArray(input) ? input : String(input).split(/\r?\n/)).map((line) => line.replace(/\s+$/, ""));
  while (lines.length && lines[0] === "") lines.shift();
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  if (lines.length === 0) throw new Error("No rows found");
  const columns = Math.max(...lines.map((line) => [...line].length));
  return { columns, rows: lines.length, cells: lines.map((line) => [...line.padEnd(columns, fill)]) };
}

// Pull the rows out of pasted JavaScript like `["####", "#..#"]` or a level.js file.
// Plain text (no quotes) is read line by line.
export function levelFromPaste(text, fill = ".") {
  const quoted = [...String(text).matchAll(/"([^"\n]*)"|'([^'\n]*)'/g)].map((match) => match[1] ?? match[2]);
  if (quoted.length >= 2) return levelFromText(quoted, fill);
  return levelFromText(text, fill);
}

export const levelToRows = (level) => level.cells.map((row) => row.join(""));

// A ready-to-paste JavaScript module, the same shape as samples/2d/04-platformer/level.js.
export function levelToModule(level, name = "LEVEL", legend = []) {
  const key = legend.length
    ? legend.map((entry) => "//   " + entry.char + "  " + entry.label).join("\n") + "\n"
    : "";
  return "// level.js, made with the Kindling level editor (make/level-editor/).\n" + key +
    "export const " + name + " = [\n" + levelToRows(level).map((row) => "  " + JSON.stringify(row) + ",").join("\n") + "\n];\n";
}

export function getCell(level, column, row) {
  if (row < 0 || row >= level.rows || column < 0 || column >= level.columns) return null;
  return level.cells[row][column];
}

// Returns true if the cell changed.
export function setCell(level, column, row, char) {
  const current = getCell(level, column, row);
  if (current === null || current === char) return false;
  level.cells[row][column] = char;
  return true;
}

// Every cell on a straight line between two cells (Bresenham's algorithm), so a
// fast mouse drag paints a solid stroke instead of dotted gaps.
export function cellsOnLine(column0, row0, column1, row1) {
  const cells = [];
  const dx = Math.abs(column1 - column0);
  const dy = -Math.abs(row1 - row0);
  const sx = column0 < column1 ? 1 : -1;
  const sy = row0 < row1 ? 1 : -1;
  let error = dx + dy;
  let column = column0;
  let row = row0;
  for (;;) {
    cells.push([column, row]);
    if (column === column1 && row === row1) return cells;
    const twice = 2 * error;
    if (twice >= dy) { error += dy; column += sx; }
    if (twice <= dx) { error += dx; row += sy; }
  }
}

export function paintLine(level, column0, row0, column1, row1, char) {
  let changed = false;
  for (const [column, row] of cellsOnLine(column0, row0, column1, row1)) changed = setCell(level, column, row, char) || changed;
  return changed;
}

// Fill (or outline) the rectangle between two corners, in any order.
export function paintRect(level, column0, row0, column1, row1, char, outline = false) {
  let changed = false;
  const [left, right] = [Math.min(column0, column1), Math.max(column0, column1)];
  const [top, bottom] = [Math.min(row0, row1), Math.max(row0, row1)];
  for (let row = top; row <= bottom; row++) {
    for (let column = left; column <= right; column++) {
      const edge = row === top || row === bottom || column === left || column === right;
      if (!outline || edge) changed = setCell(level, column, row, char) || changed;
    }
  }
  return changed;
}

// Paint-bucket fill: change the touching area of the same character (4 directions).
// Uses a list instead of recursion, so a huge empty level can't overflow the stack.
export function floodFill(level, column, row, char) {
  const target = getCell(level, column, row);
  if (target === null || target === char) return false;
  const todo = [[column, row]];
  while (todo.length) {
    const [c, r] = todo.pop();
    if (getCell(level, c, r) !== target) continue;
    level.cells[r][c] = char;
    todo.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }
  return true;
}

// New size. anchor "top-left" keeps the top-left corner still; "bottom-left" keeps
// the ground (handy for platformers, where the floor is the bottom rows).
export function resizeLevel(level, columns, rows, fill = ".", anchor = "bottom-left") {
  const resized = createLevel(columns, rows, fill);
  const rowShift = anchor === "bottom-left" ? rows - level.rows : 0;
  for (let row = 0; row < level.rows; row++) {
    for (let column = 0; column < level.columns; column++) {
      const newRow = row + rowShift;
      if (newRow >= 0 && newRow < rows && column < columns) resized.cells[newRow][column] = level.cells[row][column];
    }
  }
  return resized;
}

export function countChars(level) {
  const counts = {};
  for (const row of level.cells) for (const char of row) counts[char] = (counts[char] || 0) + 1;
  return counts;
}

// Friendly warnings. legend entries can say { char, label, required: true, unique: true }.
export function checkLevel(level, legend = []) {
  const counts = countChars(level);
  const warnings = [];
  for (const entry of legend) {
    const count = counts[entry.char] || 0;
    if (entry.required && count === 0) warnings.push("No " + entry.label.toLowerCase() + " (" + entry.char + ") yet.");
    if (entry.unique && count > 1) warnings.push(count + " " + entry.label.toLowerCase() + " tiles (" + entry.char + "); the game uses the first one.");
  }
  const known = new Set(legend.map((entry) => entry.char));
  const unknown = Object.keys(counts).filter((char) => legend.length && !known.has(char));
  if (unknown.length) warnings.push("Characters the legend doesn't know: " + unknown.map((char) => JSON.stringify(char)).join(", ") + ".");
  return warnings;
}

// Undo and redo by keeping snapshots of the rows (levels are small, so this is
// simpler and safer than recording every change).
export function createHistory(limit = 200) {
  const past = [];
  const future = [];
  return {
    // Call BEFORE changing the level.
    remember(level) {
      past.push(levelToRows(level));
      if (past.length > limit) past.shift();
      future.length = 0;
    },
    undo(level) {
      if (!past.length) return null;
      future.push(levelToRows(level));
      return levelFromText(past.pop());
    },
    redo(level) {
      if (!future.length) return null;
      past.push(levelToRows(level));
      return levelFromText(future.pop());
    },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
  };
}
