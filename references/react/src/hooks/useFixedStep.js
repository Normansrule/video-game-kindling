// references/react/src/hooks/useFixedStep.js   (JavaScript twin: engine/core/loop.js)
// WHAT: Runs update(stepSeconds) at a fixed rate and render(alpha) once per screen frame,
//       on requestAnimationFrame, for as long as the component is mounted and `running`.
// WHY:  Game state that changes 60 times a second must NOT live in useState: every change
//       would re-render React. Keep it in a ref, step it here, draw it to a canvas, and only
//       push the few numbers the HUD shows into state.
// The latest update/render are read through refs, so the loop never restarts when the
// component re-renders, and StrictMode's double effect cleans up properly.
import { useEffect, useRef } from "react";

export function useFixedStep(update, render, { stepSeconds = 1 / 60, running = true } = {}) {
  const updateRef = useRef(update);
  const renderRef = useRef(render);
  updateRef.current = update;
  renderRef.current = render;

  useEffect(() => {
    if (!running) return undefined;
    let frame = 0;
    let last = performance.now();
    let accumulator = 0;
    function tick(now) {
      // Clamp: after a hidden tab, don't run thousands of catch-up steps.
      accumulator += Math.min((now - last) / 1000, 0.25);
      last = now;
      while (accumulator >= stepSeconds) {
        updateRef.current(stepSeconds);
        accumulator -= stepSeconds;
      }
      if (renderRef.current) renderRef.current(accumulator / stepSeconds);
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [stepSeconds, running]);
}
