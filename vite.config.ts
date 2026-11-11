import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// The story engine wires itself onto the rendered DOM once and has no teardown,
// so a hot-swapped component would lose its charts and widgets. Reload instead.
const fullReload = (): Plugin => ({
  name: "story-full-reload",
  handleHotUpdate({ server }) {
    server.ws.send({ type: "full-reload" });
    return [];
  },
});

export default defineConfig({
  // Relative asset URLs, so the build works from any folder and as a claude.ai artifact.
  base: "./",
  plugins: [react(), fullReload()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
