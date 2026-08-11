import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const playgroundDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Hot-path IR reconcile (src → bundled into playground-app.js)
      "@pdl": resolve(playgroundDir, "../src"),
    },
  },
  build: {
    lib: {
      entry: resolve(playgroundDir, "src/main.js"),
      name: "PdlPlayground",
      fileName: () => "playground-app",
      formats: ["es"],
    },
    outDir: resolve(playgroundDir, "static"),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: "playground-app.js",
      },
    },
  },
});
