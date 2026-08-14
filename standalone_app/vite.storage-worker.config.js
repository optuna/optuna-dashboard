import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const wasmAsset = 'sqlite3.wasm';

// sqlite3.wasm is emitted because sqlite-wasm asks for it as
// `new URL('sqlite3.wasm', import.meta.url)`, which Vite recognizes as an asset
// reference. The extension hands the Webview this exact file name, so a version
// of sqlite-wasm that stopped asking that way would only show up as a 404 at
// runtime. Fail the build instead.
const assertWasmEmitted = () => ({
  name: 'assert-sqlite-wasm-emitted',
  writeBundle(options) {
    const wasmPath = path.join(options.dir, wasmAsset);
    if (!fs.existsSync(wasmPath)) {
      this.error(
        `Expected sqlite-wasm to emit ${wasmAsset}, found: ` +
        fs.readdirSync(options.dir).join(', ')
      );
    }
  },
});

// The storage Worker for the VS Code Webview, built separately from the UI
// bundle because it has to stand on its own.
export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: '../vscode/assets',
    // The UI build already cleared the directory.
    emptyOutDir: false,
    rollupOptions: {
      input: '../tslib/storage/src/storage_worker.ts',
      plugins: [assertWasmEmitted()],
      output: {
        // A Webview cannot point a Worker at an extension asset, so this is
        // started from a blob: URL, where nothing resolves relative to the
        // Worker: it has to be a single file with no import left in it.
        //
        // ES and not IIFE, even though this is one file: Rollup has to replace
        // import.meta.url when it emits IIFE, and what it replaces it with reads
        // document.currentScript, which a Worker does not have. sqlite-wasm
        // stores import.meta.url as it initializes, so an IIFE build throws on
        // load. In an ES module it stays a harmless string.
        format: 'es',
        inlineDynamicImports: true,
        entryFileNames: 'storage-worker.js',
        // The extension hands the Webview the wasm by name as well.
        assetFileNames: '[name][extname]',
      },
    },
  },
});
