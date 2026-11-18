// docs/bridges/react/useFixedStep.js
// WHAT: The fixed-timestep idea as a React hook, for small games written in React itself
//       (a board game, a clicker, an idle game) where you want no engine at all.
// WHY:  Same rule as engine/core/loop.js: update in equal steps, never "a bit each frame".
//       The world lives in a ref (changes 60 times a second, no re-render); React only
//       re-renders when you call the returned `refresh`, or every N steps.
// DOC:  docs/bridges/react.md

import { useEffect, useRef, useState } from "react";

export function useFixedStep(update, { stepSeconds = 1 / 60, rendersPerSecond = 15 } = {}) {
  const updateRef = useRef(update);
  updateRef.current = update;   // always call the newest update without restarting the loop
  const [, setFrame] = useState(0);

  useEffect(() => {
    let accumulator = 0;
    let last = performance.now();
    let sinceRender = 0;
    let frameId = 0;
    function frame(now) {
      accumulator += Math.min((now - last) / 1000, 0.25);   // clamp long freezes
      sinceRender += (now - last) / 1000;
      last = now;
      while (accumulator >= stepSeconds) {
        updateRef.current(stepSeconds);
        accumulator -= stepSeconds;
      }
      if (sinceRender >= 1 / rendersPerSecond) {
        sinceRender = 0;
        setFrame((count) => count + 1);    // ask React to redraw, at most rendersPerSecond
      }
      frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [stepSeconds, rendersPerSecond]);
}
