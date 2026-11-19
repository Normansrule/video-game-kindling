# Kindling v2.1.0: editors, a big art library, and eight genre templates

Kindling 2.1 makes it much easier to design characters and whole games, the way you would in Unity or Unreal, while keeping everything as plain JavaScript you can read and write by hand.

## Scene editor

[Open it](https://normansrule.github.io/video-game-kindling/make/scene-editor/). Tools on top, a palette on the left, your level in the middle, the hierarchy and inspector on the right.

- Paint with **95 tiles** in two layers (decoration behind, solid ground in front), with brush, eraser, flood fill and a right-click eyedropper. Search the palette by name or by what a tile does ("hurts", "climb", "one-way").
- Place **20 prefabs**: the player, slimes, frogs, skeletons, spiders, bats, ghosts, bees, coins, gems, keys, hearts, potions, springs, locked doors, chests, villagers and the goal flag.
- Click anything to edit it in the **inspector**: every setting of every component, plus add or remove components. A slime with `fly` flies; a coin with `hurt` bites.
- Undo and redo, autosave, export to `scene.json`, and **Play** runs your level with the real game runtime.

## Character designer

[Open it](https://normansrule.github.io/video-game-kindling/make/character-designer/). Six hair styles, five shirts, seven hats, glasses, masks and beards, capes, backpacks and wings, swords, staffs, torches, shields and pickaxes, all in any color, plus height and head size. You see the character in **3D** and as **2D sprites walking in four directions** at the same time. Save it, and it appears in the scene editor and in the templates. Export JavaScript, JSON, or a PNG sprite sheet.

## The art library

[Browse it](https://normansrule.github.io/video-game-kindling/library/). 95 tiles, 40 blocks (25 new, including lava, ice, glow stone, wool and marble), 31 sprites and as many random characters as you like. Everything is painted by code, so there are no files to load, and all of it is CC0. Click anything to get the line of code that uses it.

## Eight templates

[Play them](https://normansrule.github.io/video-game-kindling/templates/): a platformer and a top-down adventure made in the scene editor, an endless runner, a block-push puzzle, tower defense, match three, a turn-based battle and a 3D adventure. Each is one folder to copy, with its rules in small tables at the top of `main.js`.

## For coders

- `engine/scene/`: the scene format, 12 components, prefabs, behaviors and `runScene()`.
- `engine/characters/`: `normalizeCharacter`, `randomCharacter(seed)`, `characterParts` (3D) and `characterSheet` (2D).
- `engine/library/`: `tileCanvas`, `tileInfo`, `spriteCanvas`, `spriteFrames` and pixel helpers that work in Node.
- `createCharacter(renderer, spec)` and `createWorldView({ character: spec })` draw your designed character in 3D.
- New guides: [library](modules/library.md), [characters](modules/characters.md), [scene](modules/scene.md).
- 102 checks pass in Node, and all 102 pages load without errors in a headless browser at phone width.

Still zero dependencies and no build step.
