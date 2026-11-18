// references/react/src/logic/actions.js
// WHAT: The input bookkeeping behind useActions, with no React and no DOM, so it can be tested.
export function createActions(bindings) {
  const held = new Set();
  const pressed = new Set();
  const released = new Set();
  const namesFor = (code) => Object.keys(bindings).filter((name) => bindings[name].includes(code));
  return {
    handlesKey: (code) => namesFor(code).length > 0,
    keyDown(code) {
      for (const name of namesFor(code)) {
        if (!held.has(name)) pressed.add(name);
        held.add(name);
      }
    },
    keyUp(code) {
      for (const name of namesFor(code)) {
        if (held.delete(name)) released.add(name);
      }
    },
    releaseAll() {
      for (const name of held) released.add(name);
      held.clear();
    },
    isDown: (name) => held.has(name),
    wasPressed: (name) => pressed.has(name),
    wasReleased: (name) => released.has(name),
    axis: (negative, positive) => (held.has(positive) ? 1 : 0) - (held.has(negative) ? 1 : 0),
    endStep() {
      pressed.clear();
      released.clear();
    },
  };
}
