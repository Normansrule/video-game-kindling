// engine/core/events.js
// WHAT: A tiny event emitter: on, once, off, emit.
// WHY:  Lets parts of a game talk without knowing about each other.
//       The coin doesn't need to know about the score display; it just
//       emits "coin-collected" and whoever cares listens.
// DOC:  docs/modules/core.md

export function createEvents() {
  // name -> array of listener functions
  const listenersByName = new Map();

  // Call `listener` every time `name` is emitted. Returns a function that unsubscribes.
  function on(name, listener) {
    if (!listenersByName.has(name)) listenersByName.set(name, []);
    listenersByName.get(name).push(listener);
    return function unsubscribe() {
      off(name, listener);
    };
  }

  // Like on(), but only for the next emit.
  function once(name, listener) {
    const unsubscribe = on(name, function onceWrapper(data) {
      unsubscribe();
      listener(data);
    });
    return unsubscribe;
  }

  function off(name, listener) {
    const listeners = listenersByName.get(name);
    if (!listeners) return;
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  }

  // Call every listener for `name` with `data`.
  function emit(name, data) {
    const listeners = listenersByName.get(name);
    if (!listeners) return;
    // Copy first, so a listener that unsubscribes doesn't skip the next one.
    const snapshot = listeners.slice();
    for (const listener of snapshot) {
      listener(data);
    }
  }

  // Remove all listeners (for one name, or for everything).
  function clear(name) {
    if (name === undefined) listenersByName.clear();
    else listenersByName.delete(name);
  }

  return { on, once, off, emit, clear };
}
