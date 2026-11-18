# Decisions

Short records of choices that shape the whole repo. Each one says what we chose and why, so future-you does not have to rediscover it.

## D1. Pages find the engine through an import map (S0)

Each HTML page maps `"kindling/"` to a relative engine path. No absolute `/engine/...` paths, because they break on GitHub Pages (site at `/video-game-kindling/`) and on itch.io. See [RUNNING.md](RUNNING.md).

## D2. One way to run: a local server (S0)

ES (ECMAScript) modules do not load from `file://`. The documented way is `python3 -m http.server 8000` from the repo root, or the GitHub Pages site. The landing page shows a warning if opened from disk.

## D3. Jam games carry their own engine copy (S0, built in S7)

itch.io needs `index.html` at the root of the zip, so a game cannot reach `../../engine`. A new jam game is made by copying `jam/starter/` AND `engine/` into one folder; its import map points at `"./engine/"`. Zip the *contents* of that folder. The exact commands live in `jam/SUBMIT-TO-ITCH.md` (S7) and get tested with a real upload before v1.0.0.

## D4. js13kGames (S0)

Approved (2026-11-12, when the full build was requested with the recommended defaults). Drop js13kGames from the main jam list (its 13 kB zip cap cannot fit the full engine) and revisit a "13k path" after v1.0.0. **Done in v1.1.0:** see D10.

## D5. Dev-only Playwright smoke check (S0)

Approved (2026-11-12). Allowed under `tools/smoke/` with its own `package.json`, never imported by the engine or samples, never needed to play or build a game.

## D6. Jam rules and AI disclosure (S0)

Every jam has its own rules on pre-made code and AI-assisted tools. `jam/JAM-CHECKLIST.md` and `jam/SUBMIT-TO-ITCH.md` (S7) will say: read the jam's rules first, keep this engine public before the jam starts, and disclose that the engine was built with AI help if asked.

## D7. Language bridges (S6)

The docs include [bridges](bridges/) that show Kindling's core ideas (fixed timestep, vectors, AABB collision, input "pressed since last step", scenes) in Python, React and Rust, because the owner also writes those languages. Bridge code is checked by running it (Python and Rust) where possible. The engine itself stays JavaScript only.

## D8. 3D collision is boxes only (S5)

`engine/3d/collision3d.js` handles axis-aligned boxes and rays, which covers jam-sized 3D platformers and walking games. Rotated 3D shapes, slopes and a real physics engine are out of scope for v1.0.0; see the roadmap.

## D9. Reference games in Python, Rust and React (after S8)

**Decision:** Add `references/` with complete games in Python (pygame-ce), Rust (macroquad) and React (React, react-three-fiber, Vite). Each folder has its own dependencies and run steps. Approved by Alek on 2026-11-14 ("add references before publishing").

**Why:** Kindling is meant to help write games in Python, Rust and React too. The bridges in `docs/bridges/` teach the ideas with the standard library only; the references show full games built with each language's popular game library.

**Rules kept:** The engine, samples, visualizations and lessons stay zero-dependency with no build step. Nothing outside `references/` imports from it. GitHub Pages builds the React demo in a separate step that can fail without blocking the rest of the site.

## D10. The 13k path is a separate tiny engine (v1.1.0)

**Decision:** `tiny/kindling-tiny.js` is its own small file (loop, input, tile collision, random, beeps, saving), not a build of the main engine. `tiny/pack.mjs` bundles a game into one `index.html`, zips it with Node's built-in deflate and reports the zipped size.

**Why:** Even a tree-shaken subset of the main engine carries its readable names and comments; a hand-written tiny file starts at about 2 KB packed and is easy to read whole. Each tiny function names its bigger twin in `engine/`, so learning still leads back to the main engine. The packer measures the zip because the limit is on the zip.

**Rules kept:** No npm packages. The packer only strips comments and indentation; a real minifier is optional advice, not a dependency.

## D11. Make tools are pages, with logic in tested modules (v1.1.0)

**Decision:** The level editor and sprite packer are static pages under `make/`, published on GitHub Pages like the samples. Their logic lives in DOM-free modules (`engine/2d/atlas.js`, `make/level-editor/grid.js`) that `tests/checks/tools.checks.js` checks in Node and in the browser.

**Why:** Nothing to install, works on a phone, and the same code a game uses (the atlas reader) is the code the tool uses (the packer). Files are never uploaded; downloads are made in the page.
