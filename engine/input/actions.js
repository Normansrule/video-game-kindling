// engine/input/actions.js
// WHAT: Name your controls ("jump", "left") and bind each to keys, buttons and touches.
// WHY:  Game code says actions.wasPressed("jump"), never "Space or W or gamepad A".
//       Rebinding, adding a gamepad, or adding touch buttons changes one table.
// DOC:  docs/modules/input.md
//
// Binding strings:
//   "Space", "KeyW", "ArrowLeft"   keyboard (event.code names)
//   "mouse:0"                      mouse button 0 = left, 2 = right
//   "pad:A", "pad:Left"            gamepad button by name (see gamepad.js)
//   "pad:LeftX-", "pad:LeftY+"     gamepad stick pushed past halfway in that direction
//   "touch:jump"                   an on-screen touch button added with touch.addButton
//
// Example:
//   const actions = createActions({
//     left:  ["ArrowLeft", "KeyA", "pad:Left", "pad:LeftX-", "touch:left"],
//     jump:  ["Space", "KeyW", "pad:A", "touch:jump"],
//   }, { keyboard, mouse, gamepad, touch });

export function createActions(bindings, devices) {
  const keyboard = devices.keyboard;
  const mouse = devices.mouse;
  const gamepad = devices.gamepad;
  const touch = devices.touch;
  const wasDownLastStep = {};

  // Is one binding string held right now?
  function bindingIsDown(binding) {
    if (binding.startsWith("mouse:")) {
      return mouse ? mouse.isDown(Number(binding.slice(6))) : false;
    }
    if (binding.startsWith("touch:")) {
      return touch ? touch.isButtonDown(binding.slice(6)) : false;
    }
    if (binding.startsWith("pad:")) {
      if (!gamepad) return false;
      const name = binding.slice(4);
      const lastCharacter = name[name.length - 1];
      if (lastCharacter === "+" || lastCharacter === "-") {
        const value = gamepad.axis(name.slice(0, -1));
        return lastCharacter === "+" ? value > 0.5 : value < -0.5;
      }
      return gamepad.isDown(name);
    }
    return keyboard ? keyboard.isDown(binding) : false;
  }

  // Did a keyboard key or mouse button for this binding go down since the last step?
  // (Catches very quick taps that start and end between two steps.)
  function bindingWasPressedByEvent(binding) {
    if (binding.startsWith("mouse:")) return mouse ? mouse.wasPressed(Number(binding.slice(6))) : false;
    if (binding.startsWith("pad:") || binding.startsWith("touch:")) return false;
    return keyboard ? keyboard.wasPressed(binding) : false;
  }

  function bindingsFor(action) {
    const list = bindings[action];
    if (!list) throw new Error("No action called '" + action + "' in your bindings.");
    return list;
  }

  function isDown(action) {
    for (const binding of bindingsFor(action)) {
      if (bindingIsDown(binding)) return true;
    }
    return false;
  }

  function wasPressed(action) {
    for (const binding of bindingsFor(action)) {
      if (bindingWasPressedByEvent(binding)) return true;
    }
    // Polled devices (gamepad, touch): down now, but not last step.
    return isDown(action) && !wasDownLastStep[action];
  }

  // -1, 0 or +1 from two actions. Example: axis("left", "right") for walking.
// For smooth analog movement, read gamepad.axis("LeftX") directly.
  function axis(negativeAction, positiveAction) {
    let value = 0;
    if (isDown(negativeAction)) value = value - 1;
    if (isDown(positiveAction)) value = value + 1;
    return value;
  }

  // Called by the game after each update step.
  function endStep() {
    for (const action in bindings) wasDownLastStep[action] = isDown(action);
  }

  return { isDown, wasPressed, axis, endStep, bindings };
}
