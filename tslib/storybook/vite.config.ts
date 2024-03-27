import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  // Necessary to load the SQLite3 WASM file.
  // See: https://github.com/sqlite/sqlite-wasm?tab=readme-ov-file#usage-with-vite
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
  },
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/components/index.ts"),
      name: "@optuna/storybook",
      fileName: "index",
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
    outDir: "pkg",
    emptyOutDir: false,
  }
});
