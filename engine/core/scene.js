// engine/core/scene.js
// WHAT: A scene manager. A scene is one "screen" of the game: title, play, game over.
// WHY:  Splitting the game into scenes keeps each one small, and switching is one call.
//       A stack lets you "push" a pause menu over the game and "pop" back to it.
// DOC:  docs/modules/core.md
//
// A scene is a plain object; every method is optional:
//   {
//     enter(game, data)        - called when the scene starts (data comes from switchTo)
//     exit(game)               - called when the scene ends
//     update(game, stepSeconds)
//     render(game, context, alpha)
//   }

export function createSceneManager(game) {
  const scenesByName = new Map();
  const stack = [];   // the last entry is the active scene

  function add(name, scene) {
    scenesByName.set(name, scene);
  }

  function get(name) {
    const scene = scenesByName.get(name);
    if (!scene) throw new Error("No scene called '" + name + "'. Did you add() it?");
    return scene;
  }

  // Replace everything with one scene.
  function switchTo(name, data) {
    while (stack.length > 0) {
      const leaving = stack.pop();
      if (leaving.scene.exit) leaving.scene.exit(game);
    }
    push(name, data);
  }

  // Put a scene on top. Scenes below stop updating but still draw (good for pause menus).
  function push(name, data) {
    const scene = get(name);
    stack.push({ name: name, scene: scene });
    if (scene.enter) scene.enter(game, data);
  }

  // Remove the top scene and go back to the one below.
  function pop() {
    const leaving = stack.pop();
    if (leaving && leaving.scene.exit) leaving.scene.exit(game);
  }

  function currentName() {
    if (stack.length === 0) return null;
    return stack[stack.length - 1].name;
  }

  // Only the top scene updates.
  function update(stepSeconds) {
    if (stack.length === 0) return;
    const top = stack[stack.length - 1].scene;
    if (top.update) top.update(game, stepSeconds);
  }

  // Every scene on the stack draws, bottom first, so overlays sit on top.
  function render(context, alpha) {
    for (const entry of stack) {
      if (entry.scene.render) entry.scene.render(game, context, alpha);
    }
  }

  return { add, switchTo, push, pop, currentName, update, render };
}
