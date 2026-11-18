# Module: tilemap

**File:** [`engine/2d/tilemap.js`](../../engine/2d/tilemap.js) · **Visualization:** [07 tilemap and camera](https://normansrule.github.io/kindling/viz/07-tilemap-camera/) · **Lesson:** [2D-5 Tilemaps and the camera](../../lessons/2d-5-tilemaps-camera.html) · **Samples:** [2D-04 platformer](../../samples/2d/04-platformer/), [2D-06 tilemap rooms](../../samples/2d/06-tilemap-room/)

A level as a grid of characters. You draw it in your code editor, see it at a glance, and change it in seconds, which is exactly what you want during a game jam.

```js
const LEVEL = [
  "##############################",
  "#............................#",
  "#..P.......C......C..........#",
  "#.......=====.......=====....#",
  "#..........................F.#",
  "##############################",
];
const level = createTilemap({ rows: LEVEL, tileSize: 16, solid: "#", oneWay: "=" });
const start = level.replace("P", ".")[0];          // where P was, now floor
const coins = level.replace("C", ".");             // list of { column, row, x, y }
```

## API

| Member | Notes |
|---|---|
| `createTilemap({ rows, tileSize, solid, oneWay })` | `solid` and `oneWay` are strings of characters, for example `"#B"`. |
| `get(column, row)`, `set(column, row, character)` | `get` returns `null` outside the map. `set` lets you break blocks or open doors. |
| `columnAt(x)`, `rowAt(y)` | World pixels to tile numbers. |
| `isSolid(column, row)`, `isSolidAt(x, y)` | Outside the map counts as solid, so nothing walks off the edge. |
| `solidsNear(rect)` | The solid tiles touching a rectangle, as rectangles. This is what makes a tilemap a world for [physics](physics.md). |
| `find(character)`, `replace(from, to)` | Every tile with that character as `{ column, row, x, y }`. `replace` also changes them, which turns spawn markers into floor. |
| `draw(context, drawTile, view)` | Calls `drawTile(context, character, x, y, column, row)` for each tile **inside the view only**. Pass `camera.view()`. |
| `width`, `height`, `columns`, `rows`, `tileSize` | Sizes in pixels and in tiles. |

```js
level.draw(context, (context, character, x, y) => {
  if (character === "#") tiles.draw(context, 2, x, y);   // brick frame from the tile sheet
  if (character === "=") tiles.draw(context, 3, x, y);
}, camera.view());
```

## Gotchas

- **All rows must be the same length.** A short row shifts everything after it. The sample [world.js](../../samples/2d/06-tilemap-room/world.js) builds rows from fixed-size pieces to avoid this.
- **Big levels are fine:** drawing and collision only look at tiles near the camera and the player.
