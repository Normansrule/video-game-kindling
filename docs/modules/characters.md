# Module: characters

**Files:** [`engine/characters/`](../../engine/characters/) (`character-spec.js`, `character-model.js`, `character-sprite.js`) and [`engine/3d/character.js`](../../engine/3d/character.js) · **Tool:** [character designer](https://normansrule.github.io/video-game-kindling/make/character-designer/)

A character is **one small JSON object**. The same object becomes a 3D model and a 2D sprite sheet:

```js
const robin = {
  name: "Robin", skin: "#f2c48d", hair: "#5a3a20", hairStyle: "spiky", eyes: "#1a1c22",
  shirt: "#3f8cf2", shirtStyle: "jacket", pants: "#383f59", shoes: "#27201a",
  hat: "cap", hatColor: "#e04050", face: "glasses", back: "cape", backColor: "#a02030",
  held: "sword", height: 1, headSize: 1.1,
};
```

| Field | Choices |
|---|---|
| `hairStyle` | short, spiky, long, ponytail, bob, bald |
| `shirtStyle` | tee, stripes, jacket, robe, armor |
| `hat` | none, cap, crown, wizard, helmet, bandana, tophat |
| `face` | none, glasses, mask, beard |
| `back` | none, cape, backpack, wings |
| `held` | none, sword, staff, torch, shield, pickaxe |
| colors | `skin`, `hair`, `eyes`, `shirt`, `pants`, `shoes`, `hatColor`, `backColor` as `"#rrggbb"` |
| sizes | `height` 0.8 to 1.2, `headSize` 0.85 to 1.3 |

The lists live in `CHARACTER_OPTIONS`, so the designer and the tests always agree with the engine.

## Making one

- **The designer** ([make/character-designer/](../../make/character-designer/)): click through the options, then **Save** (it goes into this browser's list, which the scene editor and the templates read), **Copy** the code, or **Download .json**.
- **By hand:** write the object. `normalizeCharacter(spec)` fills in anything missing and fixes anything invalid, so a half-written spec still works.
- **Random:** `randomCharacter(seed)`. Same seed, same character, on every computer. Good for crowds of villagers.

## Using one

```js
// 3D: an animated model for the stylized renderer
import { createCharacter } from "kindling/3d/character.js";
const hero = createCharacter(renderer, robin);
hero.queue({ x, y, z }, yaw, walkCycle);       // every frame; walkCycle grows while walking

// 3D, the easy way: the world view draws your character in every 3D mode
createWorldView({ container: "#stage", world, mode: "3d", character: robin });

// 2D: a sprite sheet with walk cycles in four directions
import { characterSheet } from "kindling/characters/character-sprite.js";
const sheet = characterSheet(robin);            // 16 × 20 frames
const frames = sheet.frames.walkRight;          // [step, stand, step, stand]
const frame = frames[Math.floor(time * 8) % frames.length];
context.drawImage(sheet.canvas, frame.x, frame.y, frame.width, frame.height, x, y, frame.width, frame.height);
```

## How it works

**3D** (`character-model.js`): every part is a few boxes (and the odd cone, for crowns and wizard hats) from the low-poly model builder. The torso, head, two arms and two legs are separate meshes, each with a **pivot** (shoulder or hip), so `character.js` can swing them: `body × pivot × rotation`. Hats and hair are added to the head mesh; capes, backpacks and wings to the torso; the held item to the right arm, so it swings with the arm.

**2D** (`character-sprite.js`): each frame is painted pixel by pixel from the same spec, back to front like layers: what is behind the body (cape, wings, long hair), legs, body, arms, head, hair, face, hat. The side view draws the face on one side only, and **left is right mirrored** (`flipPixels`), which halves the work. In a walking frame the side view moves one leg a pixel forward and the other a pixel back, the front view lifts one leg, and the body dips one pixel on each step. Last, `outlinePixels` adds a dark 1-pixel outline so the character reads clearly on any background.
