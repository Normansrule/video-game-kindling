# Module: input

**Files:** [`engine/input/`](../../engine/input/) · **Visualization:** [12 input](https://normansrule.github.io/kindling/viz/12-input/) · **Lesson:** [2D-2 Drawing and input](../../lessons/2d-2-drawing-input.html)

Keyboard, mouse, touch and gamepad, plus **actions**: named controls such as `jump` that any device can trigger.

## The idea: held, pressed, released

Every device answers three questions, per game step:

| Question | True when | Use it for |
|---|---|---|
| `isDown(x)` | it is held right now | running, aiming, charging |
| `wasPressed(x)` | it went down since the last step | jumping, shooting, menu choices |
| `wasReleased(x)` | it went up since the last step | variable-height jumps, releasing a charged shot |

Browser key events arrive whenever they like, between steps. Each device remembers what happened and the game clears those memories after each step with `endStep()` (`createGame` does this for you). That is why a very quick tap is never lost: even if the key is already up again when the step runs, `wasPressed` is still true. The [input visualization](https://normansrule.github.io/kindling/viz/12-input/) shows this.

## Actions

Game code should not say "Space or W or gamepad A". It should say "jump".

```js
const game = createGame({
  actions: {
    left:  ["ArrowLeft", "KeyA", "pad:Left", "pad:LeftX-", "touch:left"],
    right: ["ArrowRight", "KeyD", "pad:Right", "pad:LeftX+", "touch:right"],
    jump:  ["Space", "KeyW", "pad:A", "touch:jump"],
  },
});
// in update():
const direction = game.actions.axis("left", "right");   // -1, 0 or +1
if (game.actions.wasPressed("jump")) jump();
```

| Binding string | Meaning |
|---|---|
| `"Space"`, `"KeyW"`, `"ArrowLeft"`, `"Digit1"` | Keyboard, by [`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) (the physical key, so WASD works on AZERTY keyboards too). |
| `"mouse:0"` | Mouse button: 0 left, 1 middle, 2 right. |
| `"pad:A"`, `"pad:Start"`, `"pad:Up"` | Gamepad button by name: A B X Y, LB RB LT RT, Back Start, LeftStick RightStick, Up Down Left Right, Home (standard layout). |
| `"pad:LeftX-"`, `"pad:RightY+"` | A stick pushed more than halfway in that direction. |
| `"touch:jump"` | An on-screen button added with `game.input.touch.addButton("jump", x, y, width, height, label)`. |

## Devices

| File | Highlights |
|---|---|
| `keyboard.js` | `isDown(code)`, `wasPressed`, `wasReleased`, `anyPressed()`. Stops arrows and Space from scrolling the page. Ignores the keyboard's auto-repeat. |
| `mouse.js` | `position` in **game pixels**, `isDown(button)`, `wasPressed`, `wheel()`, `isInside()`, and for first-person games: `lock()`, `isLocked()`, `movement()` (raw pixels moved this step). |
| `touch.js` | `touches()` (each `{ x, y, startX, startY }` in game pixels), `wasTapped()` (the `{ x, y }` of a new touch, or `null`), on-screen buttons with `addButton` / `isButtonDown`. Buttons appear after the first touch, so desktop players never see them. |
| `gamepad.js` | `update()` once per step (the game does it), `isDown(name)`, `wasPressed`, `axis("LeftX")` from -1 to 1 with a dead zone of 0.2, `isConnected()`. |
| `actions.js` | `createActions(bindings, devices)`: `isDown`, `wasPressed`, `axis(negative, positive)`, `endStep`. |

## Gotchas

- **Browsers only show gamepads after a button press.** Tell players "press any button".
- **Pointer lock needs a click.** Call `mouse.lock()` from a step where `mouse.wasPressed(0)` is true. Escape always unlocks; the browser enforces it.
- **Keys are read from the whole page** (`window`). If your page also has text boxes, create the keyboard with the canvas as its target: `createKeyboard(canvas)`, and give the canvas `tabindex="0"`.
- **Audio also waits for input.** See [audio](audio.md).

## Go further

- MDN (Mozilla Developer Network), [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API) and [Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API).
