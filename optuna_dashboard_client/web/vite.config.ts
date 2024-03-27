import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tsconfigPaths from "vite-tsconfig-paths"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    proxy: {
      "/artifacts": {
        target: "http://127.0.0.1:8080",
      },
    },
  },
  build: {
    outDir: "../../optuna_dashboard/",
    assetsDir: "static",
    emptyOutDir: false,
  },
})
