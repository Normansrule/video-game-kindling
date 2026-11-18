# Module: camera (2D)

**File:** [`engine/2d/camera.js`](../../engine/2d/camera.js) · **Visualization:** [07 tilemap and camera](https://normansrule.github.io/kindling/viz/07-tilemap-camera/) · **For 3D cameras** see [3d](3d.md).

The camera is which part of a big world is on screen. Instead of moving the whole world, we move the camera and draw everything shifted by its position.

```js
const camera = createCamera({
  width: 320, height: 180,                          // the screen, in game pixels
  bounds: { x: 0, y: 0, width: level.width, height: level.height },
  smoothing: 8,                                     // bigger = snappier, 0 = instant
  deadZone: { width: 40, height: 30 },              // the player can move here without the camera moving
});

// update():
camera.follow(player, stepSeconds);
camera.update(stepSeconds);                         // shake countdown
if (playerGotHit) camera.shake(4, 0.25);           // strength in pixels, seconds

// render():
camera.begin(context);
level.draw(context, drawTile, camera.view());
drawPlayer(context);
camera.end(context);
drawHud(context);                                   // after end(): fixed on screen
```

| Member | Notes |
|---|---|
| `x`, `y` | World position of the screen's top-left corner. |
| `centerOn(x, y)` | Jump straight there (level start, teleports). |
| `follow(target, stepSeconds)` | Ease toward the center of `target` (anything with `x`, `y`, and optionally `width`, `height`). |
| `shake(strength, seconds)`, `update(stepSeconds)` | Screen shake that fades out. |
| `begin(context)`, `end(context)` | Everything drawn between them is in world space. |
| `view()` | `{ x, y, width, height }` of what is visible. Pass it to `tilemap.draw`. |
| `worldToScreen(x, y)`, `screenToWorld(x, y)` | Convert positions, for example a mouse click into the world. |
| `sees(rect)` | Is this rectangle on screen? Skip drawing things that are not. |
| `zoom` | 2 = everything twice as big. |

## Gotchas

- **Draw the HUD after `camera.end()`**, or the score scrolls away with the level.
- **Round the camera for pixel art.** `begin` already rounds, so tiles do not get seams.
