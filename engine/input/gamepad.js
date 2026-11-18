// engine/input/gamepad.js
// WHAT: Reads the first connected gamepad: buttons by name and sticks with a dead zone.
// WHY:  The Gamepad API has no events for buttons; you must ask ("poll") every step.
//       This module polls once per step and remembers last step's buttons, so it can
//       tell you "A was just pressed". Names follow the "standard" layout (Xbox style).
// DOC:  docs/modules/input.md   API: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API
// NOTE: Browsers hide gamepads until a button is pressed while the page has focus.

export const buttonIndexByName = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  Back: 8, Start: 9, LeftStick: 10, RightStick: 11,
  Up: 12, Down: 13, Left: 14, Right: 15, Home: 16,
};

export const axisIndexByName = { LeftX: 0, LeftY: 1, RightX: 2, RightY: 3 };

export function createGamepad(options = {}) {
  const deadZone = options.deadZone || 0.2;   // ignore tiny stick drift
  let current = [];    // button down states this step
  let previous = [];   // button down states last step
  let axes = [0, 0, 0, 0];
  let connected = false;

  // Call at the START of each update step.
  function update() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (const candidate of pads) {
      if (candidate && candidate.connected) {
        pad = candidate;
        break;
      }
    }
    previous = current;
    if (!pad) {
      connected = false;
      current = [];
      axes = [0, 0, 0, 0];
      return;
    }
    connected = true;
    current = pad.buttons.map((button) => button.pressed);
    axes = [];
    for (let i = 0; i < pad.axes.length; i++) {
      const value = pad.axes[i];
      axes.push(Math.abs(value) < deadZone ? 0 : value);
    }
  }

  function indexOf(name) {
    const index = buttonIndexByName[name];
    if (index === undefined) throw new Error("Unknown gamepad button '" + name + "'");
    return index;
  }

  function isDown(name) {
    return current[indexOf(name)] === true;
  }

  function wasPressed(name) {
    const index = indexOf(name);
    return current[index] === true && previous[index] !== true;
  }

  function wasReleased(name) {
    const index = indexOf(name);
    return current[index] !== true && previous[index] === true;
  }

  // -1..1 for a stick axis by name ("LeftX", "LeftY", "RightX", "RightY").
  function axis(name) {
    return axes[axisIndexByName[name]] || 0;
  }

  return {
    update,
    isDown,
    wasPressed,
    wasReleased,
    axis,
    isConnected: () => connected,
    endStep() {},   // nothing to clear: pressed is computed from previous/current
  };
}
