# samples/

Each sample is one folder with an `index.html`, a `main.js` and a `README.md`. A sample imports only from the engine, through the import map (`kindling/...`). Browse them all with screenshots at [`samples/index.html`](https://normansrule.github.io/video-game-kindling/samples/).

| Folder | Sample | What it teaches |
|---|---|---|
| [00-hello](00-hello/) | Hello | The import map works and the engine loads |
| [2d/01-pong](2d/01-pong/) | Pong | Game loop, input, AABB (axis-aligned bounding box) collision |
| [2d/02-snake](2d/02-snake/) | Snake | Grid movement on a timer, input buffering |
| [2d/03-breakout](2d/03-breakout/) | Breakout | Ball bounces, brick grids, particles and screen shake |
| [2d/04-platformer](2d/04-platformer/) | Platformer | Gravity, coyote time, jump buffering, tilemaps, camera |
| [2d/05-top-down-shooter](2d/05-top-down-shooter/) | Top-down shooter | Mouse aim, bullets, enemy waves |
| [2d/06-tilemap-room](2d/06-tilemap-room/) | Tilemap room | Text-based maps, doors, room transitions |
| [3d/01-spinning-cube](3d/01-spinning-cube/) | Spinning cube | WebGL 2, shaders, model-view-projection matrices |
| [3d/02-lit-scene](3d/02-lit-scene/) | Lit scene | Phong lighting, OBJ meshes, orbit camera |
| [3d/03-raycaster-maze](3d/03-raycaster-maze/) | Raycaster maze | DDA (Digital Differential Analysis) raycasting on a 2D canvas |
| [3d/04-coin-collector](3d/04-coin-collector/) | Coin collector | Third-person movement, 3D box collision, follow camera |
| [3d/05-first-person-walk](3d/05-first-person-walk/) | First-person walk | Pointer lock, mouse look, textures, fog |

Run any sample: `cd ~/projects/kindling && python3 -m http.server 8000`, then open `http://localhost:8000/samples/<folder>/`.
