# Make tools

Browser tools for making game content. Kindling 2.1 adds two editors that work like the ones in Unity or Unreal, built on the engine's own [scene](../docs/modules/scene.md) and [character](../docs/modules/characters.md) modules.

## Scene editor ([open](https://normansrule.github.io/video-game-kindling/make/scene-editor/))

Paint levels from the [tile library](../docs/modules/library.md) (95 tiles, with search), place prefabs (player, enemies, pickups, doors, springs, villagers, flags), select anything to change its components in the inspector, and press **Play** to test it with the real runtime. Undo and redo, two layers, flood fill, eyedropper (right-click), zoom and pan. It saves itself in your browser; **Export** gives you `scene.json` and the code to play it:

```js
import { runScene } from "kindling/scene/runtime.js";
const scene = await (await fetch("./scene.json")).json();
runScene(scene, { canvas: "#game" });
```

All the shortcuts are in [docs/modules/scene.md](../docs/modules/scene.md#the-scene-editor). Start from a template with `?template=platformer` or `?template=topdown`.

## Character designer ([open](https://normansrule.github.io/video-game-kindling/make/character-designer/))

Pick hair, clothes, hats, faces, capes, wings, backpacks and held items, each in any color, plus height and head size. The 3D model turns on a little island while the four 2D walk cycles animate underneath. **Save** keeps it in this browser for the scene editor and the [templates](../templates/); **Copy** gives you JavaScript; **Download** gives you the JSON and a PNG sprite sheet. See [docs/modules/characters.md](../docs/modules/characters.md).

Both editors share [`editor.css`](editor.css) (the panel layout) and [`shared.js`](shared.js) (storage, copy, download, swatches).

## The other tools

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
