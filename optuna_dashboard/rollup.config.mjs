import typescript from "@rollup/plugin-typescript"
import packageJson from "./package.json" assert { type: "json" }

export default {
    input: "ts/pkg_index.tsx",
    output: {
        dir: "pkg",
        format: "es",
        exports: "named",
        sourcemap: true,
    },
    external: [
        ...Object.keys(packageJson.dependencies || {}),
    ],
    plugins: [typescript({
        declaration: true,
        declarationDir: "pkg",
        outDir: "pkg",
    })],
}