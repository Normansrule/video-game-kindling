// engine/input/touch.js
// WHAT: Touches on the canvas in game pixels, taps, and optional on-screen buttons.
// WHY:  itch.io players open games on phones. A few virtual buttons
//       (left, right, jump) make a keyboard game playable by thumb.
// DOC:  docs/modules/input.md

export function createTouch(screen) {
  const canvas = screen.canvas;
  const touches = new Map();   // pointerId -> { x, y, startX, startY }
  const buttons = [];          // { name, x, y, width, height, label }
  let tapped = null;           // position of a tap that started this step

  function onPointerDown(event) {
    if (event.pointerType !== "touch") return;
    const point = screen.toGamePosition(event.clientX, event.clientY);
    touches.set(event.pointerId, { x: point.x, y: point.y, startX: point.x, startY: point.y });
    tapped = { x: point.x, y: point.y };
  }

  function onPointerMove(event) {
    const touch = touches.get(event.pointerId);
    if (!touch) return;
    const point = screen.toGamePosition(event.clientX, event.clientY);
    touch.x = point.x;
    touch.y = point.y;
  }

  function onPointerEnd(event) {
    touches.delete(event.pointerId);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerEnd);
  window.addEventListener("pointercancel", onPointerEnd);

  // Add an on-screen button. Bind it in actions as "touch:<name>".
  function addButton(name, x, y, width, height, label) {
    buttons.push({ name, x, y, width, height, label: label || name });
  }

  // Is any finger inside the named button right now?
  function isButtonDown(name) {
    const button = buttons.find((item) => item.name === name);
    if (!button) return false;
    for (const touch of touches.values()) {
      if (touch.x >= button.x && touch.x < button.x + button.width &&
          touch.y >= button.y && touch.y < button.y + button.height) {
        return true;
      }
    }
    return false;
  }

  // Draw the buttons (only once the player has touched the screen, so desktop stays clean).
  let everTouched = false;
  function render(context) {
    if (touches.size > 0) everTouched = true;
    if (!everTouched) return;
    context.save();
    context.font = "10px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (const button of buttons) {
      context.fillStyle = isButtonDown(button.name) ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)";
      context.fillRect(button.x, button.y, button.width, button.height);
      context.fillStyle = "rgba(255,255,255,0.8)";
      context.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2);
    }
    context.restore();
  }

  return {
    touches: () => Array.from(touches.values()),
    isTouching: () => touches.size > 0,
    wasTapped: () => tapped,          // null, or the { x, y } of a new touch
    addButton,
    isButtonDown,
    render,
    endStep() {
      tapped = null;
    },
    destroy() {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
    },
  };
}
