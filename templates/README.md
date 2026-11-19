# Game templates

Eight small, finished games in different genres. Each one is a folder you can copy to start your own game. Play them on the [Pages site](https://normansrule.github.io/video-game-kindling/templates/) or locally (`cd ~/projects/kindling && python3 -m http.server 8000`, then <http://localhost:8000/templates/>).

| Template | Genre | What it teaches | Main file |
|---|---|---|---|
| [platformer](platformer/) | Side-scrolling platformer | Scenes as data: the whole level is `scene.json`, played by `runScene` | 10 lines + [scene.json](platformer/scene.json) |
| [topdown](topdown/) | Top-down adventure | The same runtime in top-down mode: villagers with dialog, keys and doors | 10 lines + [scene.json](topdown/scene.json) |
| [runner](runner/) | Endless runner | Moving the world instead of the player, spawning by distance, difficulty over time | [main.js](runner/main.js) |
| [puzzle](puzzle/) | Block-push puzzle | Grid state, undo by snapshots, levels drawn as text, flood fill | [main.js](puzzle/main.js) |
| [tower-defense](tower-defense/) | Tower defense | Following a path of waypoints, picking targets in range, waves, spending coins | [main.js](tower-defense/main.js) |
| [match-3](match-3/) | Match three | Finding runs in a grid, gravity and refill, cascades, eased animation | [main.js](match-3/main.js) |
| [battle](battle/) | Turn-based battle | A state machine with timed messages, menus for keyboard and mouse | [main.js](battle/main.js) |
| [3d-adventure](3d-adventure/) | 3D exploration | A voxel island, the walker, props, the world view with your own character | [main.js](3d-adventure/main.js) |

## Your character in every template

The runner, puzzle, battle and 3D adventure use the **first character you saved** in the [character designer](../make/character-designer/) (it reads `localStorage["kindling:characters"]`). Save a character, reload a template, and it's you. The scene templates use looks you pick per entity in the [scene editor](../make/scene-editor/).

## Start your own game from one

```bash
cd ~/projects/kindling && cp -r templates/runner templates/my-game
```

Open <http://localhost:8000/templates/my-game/> and start changing `main.js`. The rules are in small tables near the top of each file (`OBSTACLES`, `LEVELS`, `WAVES`, `MONSTERS`, `ACTIONS`), so changing the balance needs no other code. If you move the folder to a different depth, fix the `../../engine/` path in its `index.html` import map.

For the two scene templates, open **Edit this level** on the page: it loads the scene into the scene editor. When you are happy, **Export → Download scene.json** and replace the one in the folder.
