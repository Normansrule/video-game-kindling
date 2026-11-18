// engine/input/keyboard.js
// WHAT: Tracks which keys are held, and which were pressed or released since the last update step.
// WHY:  Browser key events arrive whenever they like; games want to ASK each step:
//       "is Left held?" (moving) and "was Space just pressed?" (jumping once).
//       Keys use event.code ("KeyW", "ArrowLeft", "Space"), which is the physical key,
//       so WASD stays in the same place on AZERTY and other layouts.
// DOC:  docs/modules/input.md   Key names: https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values

// Keys that scroll the page; we stop the scroll while the game runs.
const scrollingKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];

export function createKeyboard(target = window) {
  const held = new Set();
  const pressed = new Set();    // went down since the last endStep()
  const released = new Set();   // went up since the last endStep()

  function onKeyDown(event) {
    if (scrollingKeys.includes(event.code)) event.preventDefault();
    if (event.repeat) return;   // ignore auto-repeat while a key is held
    held.add(event.code);
    pressed.add(event.code);
  }

  function onKeyUp(event) {
    held.delete(event.code);
    released.add(event.code);
  }

  // If the window loses focus, keyup never arrives; let go of everything.
  function onBlur() {
    for (const code of held) released.add(code);
    held.clear();
  }

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  function isDown(code) {
    return held.has(code);
  }

  function wasPressed(code) {
    return pressed.has(code);
  }

  function wasReleased(code) {
    return released.has(code);
  }

  // Any key at all pressed this step? ("Press any key to start")
  function anyPressed() {
    return pressed.size > 0;
  }

  // Called by the game after each update step.
  function endStep() {
    pressed.clear();
    released.clear();
  }

  function destroy() {
    target.removeEventListener("keydown", onKeyDown);
    target.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
  }

  return { isDown, wasPressed, wasReleased, anyPressed, endStep, destroy };
}
