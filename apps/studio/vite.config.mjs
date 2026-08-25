import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const studioDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@pdl": resolve(studioDir, "../../src"),
      "@playground": resolve(studioDir, "../../playground/src"),
    },
  },
  build: {
    lib: {
      entry: resolve(studioDir, "src/main.js"),
      name: "PdlStudio",
      fileName: () => "studio-app",
      formats: ["es"],
    },
    outDir: resolve(studioDir, "static"),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: "studio-app.js",
      },
    },
  },
});
