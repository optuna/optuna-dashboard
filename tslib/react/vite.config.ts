import react from "@vitejs/plugin-react-swc"
import { UserConfig, defineConfig } from "vite"
import { InlineConfig } from "vitest"

interface VitestConfig extends UserConfig {
  test: InlineConfig
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/vitest_setup.ts", "./test/setup_studies.ts"],
  },
  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
}) as VitestConfig
