// webpack loader for @sqlite.org/sqlite-wasm's sqlite3-bundler-friendly.mjs.
//
// The two `new URL(..., import.meta.url)` expressions below are asset references
// for webpack, so it would emit sqlite3.wasm and the OPFS proxy into the storage
// Worker bundle even though neither is fetched relatively: the wasm is passed in
// as a URL or as bytes (see SQLiteWasmOptions), and the OPFS VFS is not used.
// Replacing them with plain strings keeps the Worker bundle self-contained.
//
// This is tied to the exact version pinned in ../package.json. The occurrence
// check below fails the build when an update moves the code, so review both
// sites in the new release before bumping the dependency.
const replacements = [
  // Only reachable when locateFile is unset, which SQLite3Storage never does.
  ["new URL('sqlite3.wasm', import.meta.url).href", "'sqlite3.wasm'"],
  // Only reachable when the OPFS APIs are available; storage_worker.ts also
  // removes globalThis.Worker so the nested Worker is never constructed.
  [
    "new URL('sqlite3-opfs-async-proxy.js', import.meta.url)",
    "'sqlite3-opfs-async-proxy.js'",
  ],
]

module.exports = function sqliteWasmBundlerLoader(source) {
  this.cacheable()
  let transformed = source
  for (const [from, to] of replacements) {
    const occurrences = transformed.split(from).length - 1
    if (occurrences !== 1) {
      throw new Error(
        `Expected exactly one ${JSON.stringify(from)} in sqlite-wasm, found ${occurrences}`
      )
    }
    transformed = transformed.replaceAll(from, to)
  }
  return transformed
}
