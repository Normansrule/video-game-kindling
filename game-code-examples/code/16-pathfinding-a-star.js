// Game Code Example 16: Pathfinding with A* (A-star)
// WHAT: Click a tile to send the walker there. It finds the shortest way around walls.
//       Right-click (or tap while holding Shift) to add or remove walls.
// WHY:  A* is a graph search: tiles are nodes, neighbors are edges. It explores the
//       most promising tile first, using cost so far + a guess of the cost left
//       (the "heuristic"). The open list here is a plain array kept sorted; a
//       priority queue (binary heap) does the same job faster for big maps.
// TRY:  Allow diagonal moves (8 neighbors), or make water tiles cost 5.

import { createGame } from "kindling/game.js";
import { fillRect, text } from "kindling/2d/draw.js";

const TILE = 16, COLUMNS = 20, ROWS = 11;
const game = createGame({ width: COLUMNS * TILE, height: ROWS * TILE, pixelArt: true, background: "#141821" });
const walls = new Set(["6,1", "6,2", "6,3", "6,4", "6,5", "6,6", "12,4", "12,5", "12,6", "12,7", "12,8", "12,9", "9,3", "10,3", "11,3"]);
const walker = { column: 2, row: 5, x: 2 * TILE, y: 5 * TILE };
let path = [];
let explored = new Set();

function findPath(start, goal) {
  const key = (column, row) => column + "," + row;
  const guess = (column, row) => Math.abs(column - goal.column) + Math.abs(row - goal.row);  // Manhattan distance
  const open = [{ column: start.column, row: start.row, cost: 0, score: guess(start.column, start.row) }];
  const cameFrom = new Map();
  const bestCost = new Map([[key(start.column, start.row), 0]]);
  explored = new Set();
  while (open.length > 0) {
    open.sort((a, b) => a.score - b.score);        // most promising first
    const current = open.shift();
    const currentKey = key(current.column, current.row);
    explored.add(currentKey);
    if (current.column === goal.column && current.row === goal.row) {
      // Walk back through cameFrom to build the path.
      const result = [];
      let step = currentKey;
      while (step) { const [column, row] = step.split(",").map(Number); result.unshift({ column, row }); step = cameFrom.get(step); }
      return result;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const column = current.column + dx, row = current.row + dy;
      const neighborKey = key(column, row);
      if (column < 0 || row < 0 || column >= COLUMNS || row >= ROWS || walls.has(neighborKey)) continue;
      const cost = current.cost + 1;
      if (cost < (bestCost.get(neighborKey) ?? Infinity)) {
        bestCost.set(neighborKey, cost);
        cameFrom.set(neighborKey, currentKey);
        open.push({ column, row, cost, score: cost + guess(column, row) });
      }
    }
  }
  return [];   // no way through
}

game.scenes.add("play", {
  update(game, stepSeconds) {
    const mouse = game.input.mouse;
    const column = Math.floor(mouse.position.x / TILE), row = Math.floor(mouse.position.y / TILE);
    if (mouse.wasPressed(0) && !walls.has(column + "," + row)) path = findPath(walker, { column, row }).slice(1);
    if (mouse.wasPressed(2)) { const tile = column + "," + row; walls.has(tile) ? walls.delete(tile) : walls.add(tile); }
    // Walk along the path, one tile at a time.
    if (path.length > 0) {
      const next = path[0];
      const dx = next.column * TILE - walker.x, dy = next.row * TILE - walker.y;
      const distance = Math.hypot(dx, dy);
      const step = 80 * stepSeconds;
      if (distance <= step) { walker.x = next.column * TILE; walker.y = next.row * TILE; walker.column = next.column; walker.row = next.row; path.shift(); }
      else { walker.x += (dx / distance) * step; walker.y += (dy / distance) * step; }
    }
  },
  render(game, context) {
    for (const tile of explored) { const [column, row] = tile.split(",").map(Number); fillRect(context, column * TILE, row * TILE, TILE, TILE, "#1d2a3a"); }
    for (const step of path) fillRect(context, step.column * TILE + 6, step.row * TILE + 6, 4, 4, "#ffd166");
    for (const tile of walls) { const [column, row] = tile.split(",").map(Number); fillRect(context, column * TILE, row * TILE, TILE, TILE, "#3a4458"); }
    fillRect(context, walker.x + 2, walker.y + 2, TILE - 4, TILE - 4, "#5ac8fa");
    text(context, "click: go · right-click: wall · blue tiles were explored", 4, 4, { size: 7, color: "#9aa4b6" });
  },
});

game.start("play");
