# Kindling v1.1.0

**Make tools and the 13k path.** Everything on the after-1.0 roadmap: a level editor you can play-test in, a sprite packer with texture atlases in the engine, and a separate tiny engine for js13kGames-sized games. Still no dependencies and no build step.

The repository is now **video-game-kindling**: <https://github.com/Normansrule/video-game-kindling>. Old GitHub links redirect; the site moved to <https://normansrule.github.io/video-game-kindling/>.

## Highlights

- **Level editor** ([open it](https://normansrule.github.io/video-game-kindling/make/level-editor/)). Paint tiles with a mouse or finger, draw rectangles and fills, undo anything, and press **Play** to run the level with the platformer's physics straight away. It saves itself as you work and exports `level.js` in the same text format the engine reads.
- **Sprite packer** ([open it](https://normansrule.github.io/video-game-kindling/make/sprite-packer/)). Drop in PNGs of any size and download one `atlas.png` and `atlas.json`. Files never leave your browser.
- **Texture atlases in the engine.** `createAtlas()` draws named frames, and `atlas.sequence("hero-run")` turns numbered frames into an animation. The packer behind it, `packRects()`, is a readable skyline packer.
- **The 13k path** ([`tiny/`](https://github.com/Normansrule/video-game-kindling/tree/main/tiny)). A 2 KB engine, a complete one-screen game ([Spark Hop](https://normansrule.github.io/video-game-kindling/tiny/starter/), 3.4 KB zipped) and `tiny/pack.mjs`, which bundles your game into one page, zips it and tells you how many of your 13,312 bytes are left.

## Try it

- Online: <https://normansrule.github.io/video-game-kindling/make/>
- Locally: `git clone https://github.com/Normansrule/video-game-kindling.git kindling && cd kindling && python3 -m http.server 8000`, then open <http://localhost:8000/make/>
- A 13k game: `cd ~/projects/kindling && bash tiny/new-tiny-game.sh my-tiny-game && node tiny/pack.mjs ~/projects/my-tiny-game`

## Known limits

- The level editor's tiles match the platformer sample; for your own game, edit `LEGEND` at the top of `make/level-editor/main.js`.
- The sprite packer doesn't trim transparent edges yet.
- `tiny/pack.mjs` strips comments and indentation but doesn't rename variables; see `tiny/README.md` for using a real minifier.

Full list of changes: [CHANGELOG.md](../CHANGELOG.md).

Kindling was built with AI assistance (Claude) and reviewed and published by its maintainer.
