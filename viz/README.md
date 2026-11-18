# viz/

Interactive visualizations, one per engine idea. Each is a single page with play/pause, labelled sliders, dark and light themes, reduced-motion support, and a layout that works at 390 px wide. Browse them with screenshots at [`viz/index.html`](https://normansrule.github.io/video-game-kindling/viz/).

| Folder | Shows | Engine module |
|---|---|---|
| [01-game-loop](01-game-loop/) | Fixed timestep, accumulator, render interpolation | `core/loop.js` |
| [02-easing](02-easing/) | Easing curves side by side | `math/easing.js` |
| [03-sprites](03-sprites/) | Sprite sheets and frame animation | `2d/sprite.js`, `2d/animation.js` |
| [04-collision](04-collision/) | AABB overlap and resolution | `2d/collision.js` |
| [05-sat](05-sat/) | SAT (Separating Axis Theorem) for rotated shapes | `2d/sat.js` |
| [06-physics](06-physics/) | Gravity, coyote time, jump buffering | `2d/physics.js` |
| [07-tilemap-camera](07-tilemap-camera/) | Tile collision and a dead-zone camera | `2d/tilemap.js`, `2d/camera.js` |
| [08-particles](08-particles/) | Emitters, lifetimes, gravity | `2d/particles.js` |
| [09-transforms](09-transforms/) | Model, view and projection matrices | `math/mat4.js`, `3d/camera3d.js` |
| [10-phong-lighting](10-phong-lighting/) | Ambient, diffuse and specular light | `3d/lighting.js` |
| [11-raycaster](11-raycaster/) | DDA rays and the view they draw | `3d/raycaster.js` |
| [12-input](12-input/) | Held, pressed and released on a timeline | `input/` |
| [13-sound](13-sound/) | Pitch and volume envelopes, oscilloscope | `audio/sfx.js` |

`kit.js` and `viz.css` hold the shared controls (play/pause, sliders, toggles).
