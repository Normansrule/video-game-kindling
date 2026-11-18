// Game Code Example 25: An inventory grid
// WHAT: A 6 x 3 bag of items. Click an item to pick it up, click a slot to drop it
//       (or swap). Items with the same name stack up to 10.
// WHY:  An inventory is an array of slots; each slot is empty (null) or { name, count }.
//       The mouse "holds" at most one stack. Every action is a small, testable rule:
//       pick up, put down, merge, swap.
// TRY:  Right-click to split a stack in half.

import { createGame } from "kindling/game.js";
import { fillRect, strokeRect, text } from "kindling/2d/draw.js";
import { textureCanvases } from "kindling/world/textures.js";

const COLUMNS = 6, ROWS = 3, SLOT = 34, LEFT = 58, TOP = 40, STACK_LIMIT = 10;
const game = createGame({ width: 320, height: 180, background: "#141821" });
const icons = textureCanvases();   // the block textures double as item icons
const slots = new Array(COLUMNS * ROWS).fill(null);
slots[0] = { name: "planks", count: 7 };
slots[1] = { name: "stone", count: 10 };
slots[2] = { name: "planks", count: 5 };
slots[7] = { name: "lantern", count: 1 };
slots[9] = { name: "leaves", count: 3 };
let held = null;

function slotAt(x, y) {
  const column = Math.floor((x - LEFT) / SLOT), row = Math.floor((y - TOP) / SLOT);
  if (column < 0 || row < 0 || column >= COLUMNS || row >= ROWS) return -1;
  return row * COLUMNS + column;
}

function clickSlot(index) {
  const item = slots[index];
  if (!held) { held = item; slots[index] = null; return; }                 // pick up
  if (!item) { slots[index] = held; held = null; return; }                  // put down
  if (item.name === held.name) {                                            // merge
    const moved = Math.min(STACK_LIMIT - item.count, held.count);
    item.count += moved;
    held.count -= moved;
    if (held.count === 0) held = null;
    return;
  }
  slots[index] = held;                                                      // swap
  held = item;
}

game.scenes.add("bag", {
  update(game) {
    const point = game.input.mouse.wasPressed(0) ? game.input.mouse.position : game.input.touch.wasTapped();
    if (!point) return;
    const index = slotAt(point.x, point.y);
    if (index >= 0) clickSlot(index);
  },
  render(game, context) {
    text(context, "Inventory · click to pick up, drop, merge or swap", 160, 16, { align: "center", color: "#9aa4b6" });
    slots.forEach((item, index) => {
      const x = LEFT + (index % COLUMNS) * SLOT, y = TOP + Math.floor(index / COLUMNS) * SLOT;
      fillRect(context, x, y, SLOT - 4, SLOT - 4, "#1d2430");
      strokeRect(context, x + 0.5, y + 0.5, SLOT - 5, SLOT - 5, "#2f3a4f");
      if (item) {
        context.drawImage(icons[item.name], x + 5, y + 5, 20, 20);
        text(context, String(item.count), x + SLOT - 7, y + SLOT - 14, { align: "right", size: 8, shadow: "#000" });
      }
    });
    if (held) {
      const mouse = game.input.mouse.position;
      context.drawImage(icons[held.name], mouse.x - 10, mouse.y - 10, 20, 20);
      text(context, String(held.count), mouse.x + 12, mouse.y + 4, { size: 8, shadow: "#000" });
    }
  },
});

game.start("bag");
