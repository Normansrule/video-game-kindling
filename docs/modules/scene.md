# Module: scene (entities, components, prefabs, scene files)

**Files:** [`engine/scene/`](../../engine/scene/) (`scene.js`, `components.js`, `prefabs.js`, `behaviors.js`, `runtime.js`) · **Tool:** [scene editor](https://normansrule.github.io/video-game-kindling/make/scene-editor/) · **Templates:** [platformer](../../templates/platformer/), [top-down adventure](../../templates/topdown/)

Big engines like Unity and Unreal are built on three ideas, and this module has all three in about 700 lines:

1. **Entities and components.** An entity is just a name and a position. What it *does* comes from components you add: a coin is `sprite + collectible`; a slime is `sprite + body + patrol + hurt`. Add `fly` to the slime and it flies.
2. **Prefabs.** Ready-made entities you stamp into a level: `slime`, `key`, `villager`, `locked_door`, `goal_flag` and 15 more.
3. **Scene files.** The level is data (JSON), not code. The editor writes it, the game reads it, and you can open it in any text editor.

## Playing a scene

```js
import { runScene } from "kindling/scene/runtime.js";

const scene = await (await fetch("./scene.json")).json();
const play = runScene(scene, { canvas: "#game", onWin: (message) => console.log(message) });
// play.restart(), play.destroy(), play.world.coins, play.game (the normal game object)
```

That is the whole of [`templates/platformer/main.js`](../../templates/platformer/main.js). The scene's `template` decides how the player moves: `"platformer"` (side view, gravity, jumping, ladders) or `"topdown"` (walk in four directions).

## The scene file

```json
{
  "format": "kindling-scene", "version": 1, "name": "Level 1", "template": "platformer",
  "tileSize": 16, "width": 64, "height": 15, "background": "#8fd3ff", "fill": "",
  "legend": { "#": "grass_block", "D": "dirt", "=": "wood_platform", "^": "spikes" },
  "layers": {
    "back": [ "...T....", "..." ],
    "main": [ "........", "...==...", "########", "DDD^^DDD" ]
  },
  "entities": [
    { "id": 1, "name": "Player", "prefab": "player", "x": 32, "y": 160,
      "components": { "sprite": { "image": "character" }, "body": { "width": 10, "height": 18 }, "player": { "speed": 90, "jump": 300, "lives": 3 } } }
  ]
}
```

- **Two tile layers.** `main` is what you collide with (ground, walls, ladders, spikes). `back` is decoration drawn behind (trees, fences, flowers). Each layer is rows of letters, and the `legend` says which [library tile](library.md) each letter is. `.` is empty.
- **`fill`** is a tile drawn under everything, like grass for a top-down map.
- **Entities** keep their components' settings, so you can tune one slime to be fast without changing the others.
- `parseScene(json)` repairs broken files (unknown tiles become empty, numbers are clamped, unknown components dropped) so a hand-edited file never crashes the editor. `stringifyScene(scene)` writes one row per line, so Git diffs show exactly which tiles changed.

## Components

Defined in [`components.js`](../../engine/scene/components.js) as data: a label, a description and fields with types and limits. The editor's inspector is **generated** from this list, so a new component shows up there by itself.

| Component | Does | Settings |
|---|---|---|
| `sprite` | What it looks like | `image` (a library sprite, `"character"`, or `"tile:NAME"`), `scale`, `animate` |
| `body` | A box that falls and stops at walls | `width`, `height`, `gravity` |
| `player` | Arrow keys or WASD; Space jumps in platformers | `speed`, `jump`, `lives` |
| `patrol` | Walks back and forth, turns at walls and ledges | `speed`, `turnAtLedges` |
| `chase` | Moves toward the player when close | `speed`, `range` |
| `fly` | Bobs up and down, no gravity | `amplitude`, `speed` |
| `collectible` | Picked up on touch | `kind` (coin, gem, key, heart, star), `value` |
| `hurt` | Costs the player a heart; jump on it to defeat it | `damage`, `stompable` |
| `dialog` | Press E nearby to read | `text` |
| `door` | Solid until the player has the keys | `keys` |
| `spring` | Launches the player | `power` |
| `goal` | Touch to win | `message` |

Entities whose sprite is `"character"` also have a `look`: a [character spec](characters.md), or `{ "seed": 12 }` for a random one.

## Behaviors: how components act

[`behaviors.js`](../../engine/scene/behaviors.js) has one small function per moving component (`updatePlayer`, `updatePatrol`, `updateChase`, `updateFly`, `updateBody`) and `touchPlayer`, which decides what happens when the player touches something. The runtime calls them every fixed step for each entity that has the component. To add a component of your own:

1. Add it to `COMPONENTS` with its fields (it appears in the inspector).
2. Write `updateMyThing(world, thing, step)` in `behaviors.js`.
3. Call it in the runtime's update loop: `if (c.myThing) updateMyThing(world, thing, step);`

## The scene editor

[make/scene-editor/](../../make/scene-editor/) is laid out like Unity: tools on top, the palette on the left, the scene in the middle, the hierarchy and inspector on the right.

| Do | How |
|---|---|
| Paint tiles | Pick a tile, **Brush** (B), drag. **Erase** (E), **Fill** (G). Right-click picks up the tile under the pointer |
| Choose the layer | **Back** (1) for decoration, **Main** (2) for ground and walls |
| Place things | **Things** tab, pick a prefab, click the scene |
| Edit a thing | **Select** (V), click it or pick it in the hierarchy. Drag to move (snaps to 4 px; hold Shift for 1 px). Change, add or remove components in the inspector |
| Undo | Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y to redo. Delete removes the selected thing, Ctrl+D duplicates it |
| Move around | Wheel scrolls, Ctrl+wheel or pinch zooms, Space+drag or **Pan** (H) pans, **Fit** (F) shows everything |
| Test | **Play** (P) runs the real `runScene` on a copy. Esc stops |
| Save | It saves itself in this browser. **Export** copies or downloads `scene.json` |

**Undo** keeps a JSON copy of the whole scene after every edit (up to 100). A scene is a few kilobytes, so this is cheap, and "undo" is just "load the previous copy". Simple beats clever until it is too slow.
