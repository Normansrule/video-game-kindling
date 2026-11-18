// engine/core/debug.js
// WHAT: A debug overlay: frames per second, update steps, and any values you "watch".
//       Press the backquote key (`) to show or hide it.
// WHY:  Seeing numbers live (player speed, enemy count) finds bugs in seconds.
//       Games can also ask debug.enabled to draw hitboxes only while it's on.
// DOC:  docs/modules/core.md

export function createDebugOverlay(options = {}) {
  const toggleKey = options.toggleKey || "Backquote";
  const watched = new Map();   // label -> latest value
  const boxes = [];            // rectangles to outline this frame

  const debug = {
    enabled: options.enabled === true,
  };

  // Show a value on the overlay. Call it every update: debug.watch("speed", speed).
  debug.watch = function watch(label, value) {
    watched.set(label, value);
  };

  // Outline a rectangle (in game pixels) on the next draw, only while enabled.
  debug.box = function box(x, y, width, height, color) {
    if (!debug.enabled) return;
    boxes.push({ x, y, width, height, color: color || "#00e5ff" });
  };

  function onKeyDown(event) {
    if (event.code === toggleKey) debug.enabled = !debug.enabled;
  }
  if (typeof window !== "undefined") window.addEventListener("keydown", onKeyDown);

  // Draw the overlay on top of everything. `time` comes from core/time.js.
  debug.render = function render(context, time) {
    if (!debug.enabled) {
      boxes.length = 0;
      return;
    }
    context.save();
    context.lineWidth = 1;
    for (const item of boxes) {
      context.strokeStyle = item.color;
      context.strokeRect(item.x + 0.5, item.y + 0.5, item.width - 1, item.height - 1);
    }
    boxes.length = 0;

    const lines = [
      "fps " + time.fps + "   steps/frame " + time.stepsThisFrame,
      "time " + time.elapsed.toFixed(2) + " s",
    ];
    for (const [label, value] of watched) {
      const shown = typeof value === "number" ? value.toFixed(2) : String(value);
      lines.push(label + ": " + shown);
    }

    context.font = "8px monospace";
    context.textBaseline = "top";
    const lineHeight = 10;
    context.fillStyle = "rgba(0, 0, 0, 0.7)";
    context.fillRect(2, 2, 150, lines.length * lineHeight + 4);
    context.fillStyle = "#7CFC00";
    for (let i = 0; i < lines.length; i++) {
      context.fillText(lines[i], 5, 4 + i * lineHeight);
    }
    context.restore();
  };

  debug.destroy = function destroy() {
    window.removeEventListener("keydown", onKeyDown);
  };

  return debug;
}
