# Make tools

Browser tools for making game content. They run on the [Pages site](https://normansrule.github.io/video-game-kindling/make/) or locally (`cd ~/projects/kindling && python3 -m http.server 8000`, then open <http://localhost:8000/make/>). Nothing is uploaded anywhere.

## Level editor ([open](https://normansrule.github.io/video-game-kindling/make/level-editor/))

Paint levels in the text format [`engine/2d/tilemap.js`](../engine/2d/tilemap.js) reads, then press **Play** to try them with the same physics as the [platformer sample](../samples/2d/04-platformer/).

- **Tools:** paint (drag draws solid lines), rectangle (hold Shift for an outline), fill, pick, and scroll for phones. Right-click erases.
- **Keys:** B, R, G, I, S for the tools; 1 to 9 for tiles; Ctrl+Z and Ctrl+Y for undo and redo.
- **Saves itself** in your browser as you work. Paste a level (rows, a JavaScript array or a whole `level.js`) to edit an existing one.
- **Warnings** tell you when the player start or flag is missing, doubled, or a character isn't in the legend.
- **Export:** copy or download `level.js`:

```js
import { LEVEL } from "./level.js";
import { createTilemap } from "kindling/2d/tilemap.js";

const map = createTilemap({ tileSize: 16, rows: LEVEL, solid: "#B", oneWay: "=" });
const start = map.replace("P", ".")[0];   // where the player begins
```

**Your own tiles:** the legend is the `LEGEND` list at the top of [`level-editor/main.js`](level-editor/main.js). Change it to match your game's characters and colors. The level logic (lines, flood fill, resize, undo) is in [`level-editor/grid.js`](level-editor/grid.js), with no DOM, so you can reuse it in a level generator or a build script. It's tested in [`tests/checks/tools.checks.js`](../tests/checks/tools.checks.js).

## Sprite packer ([open](https://normansrule.github.io/video-game-kindling/make/sprite-packer/))

Drop in PNGs of any size; download `atlas.png` and `atlas.json`. Name files like `hero-run-0.png`, `hero-run-1.png` and they become an animation:

```js
import { loadImages } from "kindling/core/assets.js";
import { createAtlas } from "kindling/2d/atlas.js";
import { createAnimation } from "kindling/2d/animation.js";

const images = await loadImages({ atlas: "./atlas.png" });
const atlas = createAtlas(images.atlas, await (await fetch("./atlas.json")).json());
const run = createAnimation(atlas.sequence("hero-run"), 12);

// in render:
atlas.draw(context, run.frame(), player.x, player.y, { flipX: facingLeft });
```

The packing itself is [`engine/2d/atlas.js`](../engine/2d/atlas.js): a **skyline** packer (each picture goes where its bottom edge would be lowest) that tries a range of widths and keeps the smallest image. Read it alongside the [2D module doc](../docs/modules/2d.md#texture-atlases).

## The 13k path

For js13kGames and other size-limited jams, see [`tiny/`](../tiny/): a 2 KB engine, a complete starter game and a packer that tells you your zipped size.
