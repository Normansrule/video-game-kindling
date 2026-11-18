// references/react/vite.config.js
// WHAT: Vite (a dev server and bundler) settings. base "./" makes the built site work from
//       any folder: GitHub Pages, itch.io, or a USB stick.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  // three.js alone is about 600 KB; it loads only when the 3D demo opens.
  build: { chunkSizeWarningLimit: 1000 },
});
