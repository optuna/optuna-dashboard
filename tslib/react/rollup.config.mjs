import typescript from "@rollup/plugin-typescript"
import packageJson from "./package.json" assert { type: "json" }

export default {
  input: "src/index.ts",
  output: {
    dir: "pkg",
    format: "es",
    exports: "named",
    sourcemap: true,
  },
  external: [
    ...Object.keys(packageJson.dependencies || {}),
    "react/jsx-runtime",
  ],
  plugins: [
    typescript(),
  ],
}
