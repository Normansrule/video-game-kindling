// engine/core/storage.js
// WHAT: Save and load small things (high scores, settings) in the browser.
// WHY:  localStorage can be missing or blocked (private windows, some itch.io
//       embeds). These helpers never crash your game; they just return the fallback.
// DOC:  docs/modules/core.md

// Use a prefix so two games on the same site (like itch.io) don't overwrite each other.
export function createStorage(prefix) {
  function save(key, value) {
    try {
      localStorage.setItem(prefix + ":" + key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function load(key, fallback) {
    try {
      const text = localStorage.getItem(prefix + ":" + key);
      if (text === null) return fallback;
      return JSON.parse(text);
    } catch (error) {
      return fallback;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(prefix + ":" + key);
    } catch (error) {
      // Nothing to do: storage is unavailable.
    }
  }

  return { save, load, remove };
}
