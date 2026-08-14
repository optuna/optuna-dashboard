// Deep import for the same reason as sqlite_init.ts: the dependency exports
// only ".", and the specifier assumes src/ and pkg/ are at the same depth.
// Resolved by the bundler, so this entrypoint is only usable from a build that
// understands `?url` (Vite). The VS Code build emits the asset explicitly.
import sqliteWasmUrl from "../node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3.wasm?url"

export default sqliteWasmUrl
