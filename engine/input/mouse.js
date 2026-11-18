// engine/input/mouse.js
// WHAT: Mouse (and pen) position in GAME pixels, buttons held/pressed/released, and the wheel.
// WHY:  Raw mouse events use page pixels; games want "where on my 320x180 canvas?".
//       Uses pointer events, filtered to mouse and pen (touch has its own module).
// DOC:  docs/modules/input.md
// Buttons: 0 = left, 1 = middle, 2 = right.

// screen is the object from core/canvas.js (it knows how to convert positions).
export function createMouse(screen) {
  const canvas = screen.canvas;
  const position = { x: 0, y: 0 };
  const held = new Set();
  const pressed = new Set();
  const released = new Set();
  let wheel = 0;          // scroll amount since the last step (+ = down)
  const movement = { x: 0, y: 0 };   // raw pixels moved since the last step (for mouse look)
  let inside = false;

  function updatePosition(event) {
    const gamePosition = screen.toGamePosition(event.clientX, event.clientY);
    position.x = gamePosition.x;
    position.y = gamePosition.y;
  }

  function isMouse(event) {
    return event.pointerType === "mouse" || event.pointerType === "pen";
  }

  function onPointerMove(event) {
    if (!isMouse(event)) return;
    updatePosition(event);
    movement.x += event.movementX || 0;
    movement.y += event.movementY || 0;
  }

  function onPointerDown(event) {
    if (!isMouse(event)) return;
    updatePosition(event);
    canvas.focus();   // so the keyboard works after clicking the game
    held.add(event.button);
    pressed.add(event.button);
  }

  function onPointerUp(event) {
    if (!isMouse(event)) return;
    held.delete(event.button);
    released.add(event.button);
  }

  function onWheel(event) {
    event.preventDefault();
    wheel = wheel + Math.sign(event.deltaY);
  }

  // While the pointer is locked, events go to the document, not the canvas.
  function onLockedMove(event) {
    if (document.pointerLockElement === canvas) onPointerMove(event);
  }
  function onCanvasMove(event) {
    if (document.pointerLockElement !== canvas) onPointerMove(event);
  }
  function onEnter() {
    inside = true;
  }
  function onLeave() {
    inside = false;
  }
  function onContextMenu(event) {
    event.preventDefault();   // right-click is a game button, not a menu
  }

  // [target, event name, handler]: kept in one list so destroy() can remove them all.
  const listeners = [
    [document, "pointermove", onLockedMove],
    [canvas, "pointermove", onCanvasMove],
    [canvas, "pointerdown", onPointerDown],
    [window, "pointerup", onPointerUp],
    [canvas, "wheel", onWheel],
    [canvas, "pointerenter", onEnter],
    [canvas, "pointerleave", onLeave],
    [canvas, "contextmenu", onContextMenu],
  ];
  for (const [target, name, handler] of listeners) target.addEventListener(name, handler, { passive: name !== "wheel" && name !== "contextmenu" });

  return {
    position,
    isDown: (button = 0) => held.has(button),
    wasPressed: (button = 0) => pressed.has(button),
    wasReleased: (button = 0) => released.has(button),
    wheel: () => wheel,
    isInside: () => inside,
    // Mouse look: how far the mouse moved this step, in screen pixels.
    movement: () => ({ x: movement.x, y: movement.y }),
    // Hide the cursor and keep it in the canvas (first-person games). Must be called
    // from a click or key press. Escape always unlocks (the browser enforces this).
    lock() {
      if (canvas.requestPointerLock) canvas.requestPointerLock();
    },
    isLocked: () => document.pointerLockElement === canvas,
    endStep() {
      pressed.clear();
      released.clear();
      wheel = 0;
      movement.x = 0;
      movement.y = 0;
    },
    // Stop listening (when a page removes the game, for example a React component unmounting).
    destroy() {
      for (const [target, name, handler] of listeners) target.removeEventListener(name, handler);
    },
  };
}
