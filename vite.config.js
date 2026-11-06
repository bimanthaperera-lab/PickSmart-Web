import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" so the built site works from any folder or sub-path.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // The 3D scene (three.js + React) is one lazy chunk, loaded only when the full or lite
  // sequence runs; static mode never downloads it.
  build: { chunkSizeWarningLimit: 1300 },
});
