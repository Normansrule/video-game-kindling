// engine/2d/tilemap.js
// WHAT: A level made of a grid of tiles, written as text:
//         "##########",
//         "#..C.....#",
//         "#P....==.#",
//         "##########",
// WHY:  You can draw levels in your code editor, see them at a glance, and change
//       them in seconds during a jam. Collision against a grid is fast: only check
//       the few tiles around the player.
// DOC:  docs/modules/tilemap.md   VIZ: viz/07-tilemap-camera/

// options.rows       array of equal-length strings, one character per tile
// options.tileSize   pixels per tile (default 16)
// options.solid      characters that block movement (default "#")
// options.oneWay     characters you can jump up through (default "")
export function createTilemap(options) {
  const tileSize = options.tileSize || 16;
  const solidChars = options.solid || "#";
  const oneWayChars = options.oneWay || "";
  // Store as an array of arrays so set() can change single tiles.
  const grid = options.rows.map((row) => row.split(""));
  const rowCount = grid.length;
  const columnCount = grid[0].length;

  const map = {
    tileSize,
    columns: columnCount,
    rows: rowCount,
    width: columnCount * tileSize,
    height: rowCount * tileSize,
  };

  // The character at a tile, or null outside the map.
  map.get = function get(column, row) {
    if (row < 0 || row >= rowCount || column < 0 || column >= columnCount) return null;
    return grid[row][column];
  };

  map.set = function set(column, row, character) {
    if (map.get(column, row) === null) return;
    grid[row][column] = character;
  };

  map.columnAt = (x) => Math.floor(x / tileSize);
  map.rowAt = (y) => Math.floor(y / tileSize);

  // Outside the map counts as solid so nothing can walk off the edge.
  map.isSolid = function isSolid(column, row) {
    const character = map.get(column, row);
    if (character === null) return true;
    return solidChars.includes(character);
  };

  map.isSolidAt = (x, y) => map.isSolid(map.columnAt(x), map.rowAt(y));

  // Solid tiles touching a rectangle, as rectangles. This makes a tilemap a
  // "world" for physics.moveAndCollide().
  map.solidsNear = function solidsNear(area) {
    const result = [];
    const firstColumn = map.columnAt(area.x);
    const lastColumn = map.columnAt(area.x + area.width - 0.001);
    const firstRow = map.rowAt(area.y);
    const lastRow = map.rowAt(area.y + area.height - 0.001);
    for (let row = firstRow; row <= lastRow; row++) {
      for (let column = firstColumn; column <= lastColumn; column++) {
        const character = map.get(column, row);
        const solid = map.isSolid(column, row);
        const oneWay = character !== null && oneWayChars.includes(character);
        if (solid || oneWay) {
          result.push({ x: column * tileSize, y: row * tileSize, width: tileSize, height: tileSize, oneWay: oneWay && !solid, character });
        }
      }
    }
    return result;
  };

  // Every tile with this character, e.g. find("C") for coins or find("P") for the player start.
  map.find = function find(character) {
    const found = [];
    for (let row = 0; row < rowCount; row++) {
      for (let column = 0; column < columnCount; column++) {
        if (grid[row][column] === character) {
          found.push({ column, row, x: column * tileSize, y: row * tileSize });
        }
      }
    }
    return found;
  };

  // Turn every `from` into `to` and return where they were (spawn markers -> floor).
  map.replace = function replace(from, to) {
    const found = map.find(from);
    for (const spot of found) grid[spot.row][spot.column] = to;
    return found;
  };

  // Draw only the tiles the camera can see. drawTile(context, character, x, y, column, row).
  // view = { x, y, width, height } in world pixels (camera.view() gives this).
  map.draw = function draw(context, drawTile, view) {
    const area = view || { x: 0, y: 0, width: map.width, height: map.height };
    const firstColumn = Math.max(0, map.columnAt(area.x));
    const lastColumn = Math.min(columnCount - 1, map.columnAt(area.x + area.width));
    const firstRow = Math.max(0, map.rowAt(area.y));
    const lastRow = Math.min(rowCount - 1, map.rowAt(area.y + area.height));
    for (let row = firstRow; row <= lastRow; row++) {
      for (let column = firstColumn; column <= lastColumn; column++) {
        drawTile(context, grid[row][column], column * tileSize, row * tileSize, column, row);
      }
    }
  };

  return map;
}
