# Bridge: Kindling and React

**Code:** [`docs/bridges/react/`](react/) · **Checked:** bundled with React 19 and run in a browser under `StrictMode` with no console errors.

React and a game loop think about time differently:

| | React | A game |
|---|---|---|
| Changes happen | when the user does something | 60 times a second, always |
| State lives in | `useState`, and each change re-renders | plain objects, changed in place every step |
| Drawing | React compares a virtual DOM (Document Object Model) and updates the page | the game clears a canvas and redraws everything |

So the one rule of this page: **game state must not be React state.** If the player's position were `useState`, React would re-render your component 60 times a second, and you would fight it forever. Keep the world in the game (or in a `useRef`), and give React only the handful of values the page shows: score, health, "game over".

## Pattern 1: host a Kindling game in a component

[`KindlingGame.jsx`](react/KindlingGame.jsx) is the whole pattern in about 100 lines. The important part:

```jsx
export function KindlingGame() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const game = startCatchGame(canvasRef.current);   // plain JavaScript, no React inside
    gameRef.current = game;
    game.events.on("score", setScore);                 // the game tells React about the score
    return () => game.destroy();                       // stop the loop, remove every listener
  }, []);

  return (
    <>
      <p>Stars caught: {score}</p>
      <canvas ref={canvasRef} tabIndex={0} />
    </>
  );
}
```

Why each piece is there:

- **`useRef` for the canvas:** `createGame({ canvas })` needs the real element, which exists after the first render, inside `useEffect`.
- **`useRef` for the game:** buttons (pause, restart) need to reach the game, but changing the ref must not re-render.
- **`game.events` → `setState`:** the game emits only when something the page shows changes. React re-renders a few times a minute, not 60 times a second.
- **`game.destroy()` in the cleanup:** in development, `StrictMode` mounts, unmounts and mounts every component to catch missing cleanups. Without `destroy()` you would have two games running, both reading the keyboard. `destroy()` stops the loop and removes every event listener the engine added.

### Making `kindling/` imports work in a React project

Kindling has no package to install; copy the `engine/` folder into your app (for example `src/engine/`). Then point `kindling/` at it:

- **Vite:** in `vite.config.js`, add `resolve: { alias: { "kindling/": "/src/engine/" } }`. Note the trailing slashes on both sides.
- **Any bundler:** or just import with relative paths, `import { createGame } from "./engine/game.js"`.

## Pattern 2: a game written in React itself

For games where the page *is* the game (cards, clickers, idle games, puzzles), you may not want a canvas at all. You still want a fixed timestep. [`useFixedStep.js`](react/useFixedStep.js) is `engine/core/loop.js` as a hook:

```jsx
const world = useRef({ gold: 0, miners: 1 });          // changed every step, never re-renders
useFixedStep((stepSeconds) => {
  world.current.gold += world.current.miners * stepSeconds;
}, { rendersPerSecond: 15 });                          // React redraws 15 times a second
return <p>Gold: {Math.floor(world.current.gold)}</p>;
```

The simulation runs at 60 steps per second; React takes a snapshot 15 times a second, which is plenty for numbers on a page. [`IdleCounter.jsx`](react/IdleCounter.jsx) is a complete example.

## Kindling ideas in React words

| Kindling | Closest React idea |
|---|---|
| Scenes (`switchTo("play")`) | Routes or a `screen` state at the top of your app |
| Actions table (`jump: ["Space", "pad:A"]`) | A reducer: many events, one meaning |
| `game.events` | A callback prop or a context, but fired from outside React |
| `render(context)` every frame | A component render, except it happens 60 times a second and draws pixels instead of returning elements |
| `game.state` (lives across scenes) | State lifted to the app root |

## When to use what

- **Canvas game with menus around it:** Kindling in a component (Pattern 1). React does the menus, settings and leaderboards; Kindling does the game.
- **Turn-based or UI-heavy game:** plain React, plus `useFixedStep` if anything moves on its own.
- **3D in React:** the same pattern works with `createGame({ webgl: true })`. (Libraries such as react-three-fiber take a different approach, with the scene as React components; Kindling's samples teach the raw WebGL underneath them.)

## Go further

- React docs: [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) (why cleanups matter) and [Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs).
