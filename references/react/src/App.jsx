// references/react/src/App.jsx
// WHAT: A menu and three demos, switched with the URL hash (#arena, #islands, #easing),
//       so the back button works without a router library.
import { lazy, Suspense, useEffect, useState } from "react";
import EasingPlayground from "./demos/EasingPlayground.jsx";
import NeonArena from "./demos/NeonArena.jsx";

// The 3D demo pulls in three.js (about 600 KB), so load it only when someone opens it.
const CrystalIslands = lazy(() => import("./demos/CrystalIslands.jsx"));

const DEMOS = [
  { id: "arena", title: "Neon arena", blurb: "A 2D canvas shooter. Pure game logic in plain JS, a fixed-step hook, and a React HUD.", component: NeonArena },
  { id: "islands", title: "Crystal islands", blurb: "A 3D platformer in react-three-fiber: shadows, fog, glowing crystals, a follow camera.", component: CrystalIslands },
  { id: "easing", title: "Easing playground", blurb: "React state drives an animation: pick a curve, change the time, watch it move.", component: EasingPlayground },
];

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash.slice(1));
  useEffect(() => {
    const onChange = () => setHash(window.location.hash.slice(1));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHash();
  const demo = DEMOS.find((item) => item.id === hash);
  if (demo) {
    const Demo = demo.component;
    return (
      <div className="demo-page">
        <nav className="top-bar">
          <a href="#">← Kindling in React</a>
          <span>{demo.title}</span>
        </nav>
        <Suspense fallback={<p className="loading">Loading 3D…</p>}>
          <Demo />
        </Suspense>
      </div>
    );
  }
  return (
    <main className="menu">
      <h1>Kindling <span>in React</span></h1>
      <p className="lead">The same game-engine ideas as the JavaScript engine, written the React way.</p>
      <ul className="demo-list">
        {DEMOS.map((item) => (
          <li key={item.id}>
            <a href={"#" + item.id}>
              <strong>{item.title}</strong>
              <span>{item.blurb}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="foot">Source: <code>references/react/src</code>. Read <code>references/react/README.md</code> for what to look at.</p>
    </main>
  );
}
