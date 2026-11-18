// docs/bridges/react/IdleCounter.jsx
// WHAT: A tiny idle game in plain React using useFixedStep: gold grows by itself,
//       buy miners to grow it faster. Shows "world in a ref, React renders a snapshot".
// DOC:  docs/bridges/react.md

import { useRef } from "react";
import { useFixedStep } from "./useFixedStep.js";

export function IdleCounter() {
  const world = useRef({ gold: 0, miners: 1 });   // the game state: not React state

  useFixedStep((stepSeconds) => {
    world.current.gold += world.current.miners * stepSeconds;   // 1 gold per miner per second
  });

  const minerPrice = 10 * world.current.miners;
  function buyMiner() {
    if (world.current.gold < minerPrice) return;
    world.current.gold -= minerPrice;
    world.current.miners += 1;
  }

  return (
    <section>
      <p>Gold: <strong data-testid="gold">{Math.floor(world.current.gold)}</strong> · Miners: {world.current.miners}</p>
      <button type="button" onClick={buyMiner} disabled={world.current.gold < minerPrice}>
        Buy a miner ({minerPrice} gold)
      </button>
    </section>
  );
}
