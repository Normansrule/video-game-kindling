// references/react/src/main.jsx
// WHAT: Mounts the app. StrictMode runs effects twice in development on purpose, to catch
//       game loops and listeners that don't clean up. Every hook here survives it.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
