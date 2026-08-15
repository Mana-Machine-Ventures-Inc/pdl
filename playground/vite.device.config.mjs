import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const playgroundDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@pdl": resolve(playgroundDir, "../src"),
    },
  },
  build: {
    lib: {
      entry: resolve(playgroundDir, "src/device.js"),
      name: "PdlDevice",
      fileName: () => "device-app",
      formats: ["es"],
    },
    outDir: resolve(playgroundDir, "static"),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: "device-app.js",
      },
    },
  },
});
