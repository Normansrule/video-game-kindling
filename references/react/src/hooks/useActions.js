// references/react/src/hooks/useActions.js   (JavaScript twin: engine/input/actions.js)
// WHAT: Named actions from the keyboard ("jump", "left"), with presses remembered until
//       the game calls endStep(), so a tap shorter than one step is never lost.
// WHY:  Returns a stable object in a ref, not state: reading input must not re-render.
import { useEffect, useRef } from "react";
import { createActions } from "../logic/actions.js";

export function useActions(bindings) {
  const actionsRef = useRef(null);
  if (actionsRef.current === null) actionsRef.current = createActions(bindings);

  useEffect(() => {
    const actions = actionsRef.current;
    const onDown = (event) => {
      if (actions.handlesKey(event.code)) event.preventDefault();   // no page scrolling on Space
      if (!event.repeat) actions.keyDown(event.code);
    };
    const onUp = (event) => actions.keyUp(event.code);
    const onBlur = () => actions.releaseAll();   // alt-tab must not leave keys "stuck"
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return actionsRef.current;
}
