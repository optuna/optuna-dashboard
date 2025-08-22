import react from "@vitejs/plugin-react-swc"
import { UserConfig, defineConfig } from "vite"
import { InlineConfig } from "vitest/node"

interface VitestConfig extends UserConfig {
  test: InlineConfig
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        test: {
          environment: "jsdom",
          setupFiles: ["./test/vitest_setup.ts", "./test/setup_studies.ts"],
          globals: true,
          deps: {
            optimizer: {
              web: {
                include: ["react", "react-dom"],
              },
            },
          },
          pool: "forks",
          include: ["./test/*.test.tsx"],
        },
      },
      {
        test: {
          browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            // https://vitest.dev/guide/browser/playwright
            instances: [
              { browser: "chromium" },
              { browser: "firefox" },
              { browser: "webkit" },
            ],
          },
          include: ["./test/browser/*.test.tsx"],
        },
      },
    ],
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
