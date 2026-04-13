import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const playgroundDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
