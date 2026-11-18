# Kindling v1.0.0

**Build games from scratch.** Kindling is a zero-dependency 2D and 3D JavaScript game engine, a game jam template, and a set of interactive visual lessons. No install, no build step: clone it, start a local server, and every page runs.

## Highlights

- **A whole engine you can read in an afternoon.** About 45 small files, each one concept and under 300 lines, each with a doc page.
- **See every idea move.** 13 visualizations: the game loop, easing, sprites, collision, SAT, physics, tilemaps and cameras, particles, 3D transforms, Phong lighting, the raycaster, input and sound.
- **11 complete samples:** Pong, Snake, Breakout, a platformer, a top-down shooter, a Zelda-like tilemap world, a spinning cube, a lit scene, a raycaster maze, a 3D coin collector and a first-person walk.
- **13 lessons** with exercises and hidden solutions (every solution was run).
- **A jam kit** that turns into a working game in one command, and zips it the way itch.io wants.
- **Bridges to Python, React and Rust** that show the same core ideas in each language, with tested code.
- **Reference games in Python, Rust and React** (`references/`): neon platformers, arena shooters, raycasters, fireworks and two 3D crystal-collecting games, built with pygame-ce, macroquad and react-three-fiber. The React demos are playable on the Pages site.

## Try it

- Online: <https://normansrule.github.io/kindling/>
- Locally: `git clone https://github.com/Normansrule/kindling.git && cd kindling && python3 -m http.server 8000`

## Known limits

- 3D collision is axis-aligned boxes only; no slopes or rotated 3D shapes.
- No built-in text input, networking or level editor (levels are text).
- The full engine is too large for js13kGames; a "13k path" is planned.

Full list of changes: [CHANGELOG.md](../CHANGELOG.md).

Kindling was built with AI assistance (Claude) and reviewed and published by its maintainer.
