// references/react/src/demos/EasingPlayground.jsx   (JavaScript twin: viz/02-easing)
// WHAT: Pick an easing curve and a duration; a ball moves along a track and the curve is drawn.
// WHY:  The opposite case to the games: here React state (the controls) drives the animation,
//       and the animation writes straight to the DOM through a ref (style.left), not state.
import { useMemo, useRef, useState } from "react";
import { useFixedStep } from "../hooks/useFixedStep.js";

const EASINGS = {
  linear: (t) => t,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  easeOutElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
  easeOutBounce: (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

export default function EasingPlayground() {
  const [name, setName] = useState("easeOutBack");
  const [duration, setDuration] = useState(1.2);
  const [playing, setPlaying] = useState(true);
  const ballRef = useRef(null);
  const dotRef = useRef(null);
  const timeRef = useRef(0);

  const ease = EASINGS[name];
  const path = useMemo(() => {
    let d = "";
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      d += (i === 0 ? "M" : "L") + (10 + t * 180).toFixed(1) + " " + (170 - ease(t) * 120).toFixed(1);
    }
    return d;
  }, [ease]);

  useFixedStep(
    (seconds) => { timeRef.current = (timeRef.current + seconds) % (duration + 0.6); },
    () => {
      const t = Math.min(timeRef.current / duration, 1);
      const value = ease(t);
      if (ballRef.current) ballRef.current.style.left = `calc(10% + ${value} * 80%)`;   // room on both sides for overshoot
      if (dotRef.current) {
        dotRef.current.setAttribute("cx", 10 + t * 180);
        dotRef.current.setAttribute("cy", 170 - value * 120);
      }
    },
    { running: playing && !window.matchMedia("(prefers-reduced-motion: reduce)").matches },
  );

  return (
    <div className="controls">
      <div className="track"><div className="ball" ref={ballRef} /></div>
      <svg className="curve" viewBox="0 0 200 200" role="img" aria-label={`Graph of ${name}`}>
        <line x1="10" y1="170" x2="190" y2="170" stroke="#2c2852" />
        <line x1="10" y1="50" x2="190" y2="50" stroke="#2c2852" strokeDasharray="4 4" />
        <path d={path} fill="none" stroke="#46dcff" strokeWidth="2.5" />
        <circle ref={dotRef} r="5" fill="#ffc850" cx="10" cy="170" />
      </svg>
      <label>Easing curve
        <select value={name} onChange={(event) => setName(event.target.value)}>
          {Object.keys(EASINGS).map((key) => <option key={key}>{key}</option>)}
        </select>
      </label>
      <label>Duration: {duration.toFixed(1)} s
        <input type="range" min="0.3" max="3" step="0.1" value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
      </label>
      <div><button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</button></div>
      <p className="help">Source: <code>src/demos/EasingPlayground.jsx</code>. The same curves live in <code>engine/math/easing.js</code>.</p>
    </div>
  );
}
