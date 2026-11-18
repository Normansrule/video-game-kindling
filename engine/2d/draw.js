// engine/2d/draw.js
// WHAT: Short helpers for Canvas 2D drawing: rectangles, circles, lines, text.
// WHY:  The raw canvas API needs 3-5 lines for a filled circle. Games draw hundreds
//       of shapes, especially in a jam where art is "colored rectangles".
// DOC:  docs/modules/2d.md

export function fillRect(context, x, y, width, height, color) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

export function strokeRect(context, x, y, width, height, color, lineWidth = 1) {
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.strokeRect(x, y, width, height);
}

export function fillCircle(context, x, y, radius, color) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

export function strokeCircle(context, x, y, radius, color, lineWidth = 1) {
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();
}

export function line(context, x1, y1, x2, y2, color, lineWidth = 1) {
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

// A filled polygon from [{ x, y }, ...].
export function fillPolygon(context, points, color) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) context.lineTo(points[i].x, points[i].y);
  context.closePath();
  context.fill();
}

// Text. options: size (px), color, align ("left" | "center" | "right"), font, baseline.
export function text(context, message, x, y, options = {}) {
  const size = options.size || 8;
  context.font = (options.bold ? "bold " : "") + size + "px " + (options.font || "monospace");
  context.textAlign = options.align || "left";
  context.textBaseline = options.baseline || "top";
  if (options.shadow) {
    context.fillStyle = options.shadow;
    context.fillText(message, x + 1, y + 1);
  }
  context.fillStyle = options.color || "#ffffff";
  context.fillText(message, x, y);
}

// Darken the whole screen, e.g. behind a pause menu. amount 0..1.
export function dim(context, width, height, amount = 0.5) {
  context.fillStyle = "rgba(0, 0, 0, " + amount + ")";
  context.fillRect(0, 0, width, height);
}
