// Import the bundler-friendly initializer directly. The package entrypoint
// also imports the optional Worker API, which is not used by this dashboard
// and would add an unnecessary nested Worker bundle.
//
// The dependency has no exports entry for this path, hence the deep import. It
// stays valid after `tsc` only because src/ and pkg/ sit at the same depth
// under the package root: changing outDir breaks the specifier at bundle time
// rather than at build time.
// @ts-expect-error the dependency ships no types for this path
import sqlite3InitModule from "../node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3-bundler-friendly.mjs"

export default sqlite3InitModule
