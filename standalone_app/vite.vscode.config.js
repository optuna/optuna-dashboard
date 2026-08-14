import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite';

// The UI bundle for the VS Code Webview. Paths are relative to standalone_app,
// where the build:vscode script runs. The storage Worker is a second build, see
// vite.storage-worker.config.js.
export default defineConfig({
  plugins: [react()],
  // The extension serves these assets from a deep path under the Webview
  // resource authority, so every URL the bundle builds for an asset of its own
  // has to be relative to the bundle. With the default base they would resolve
  // against the authority root instead, where nothing is.
  base: './',
  define: {
    'IS_VSCODE': JSON.stringify(true),
  },
  // Nothing in public/ is referenced by the Webview HTML.
  publicDir: false,
  build: {
    outDir: '../vscode/assets',
    // This build runs first, so it is the one that clears the directory.
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/vscode_entry.tsx',
      output: {
        // The extension points the Webview at this file by name.
        entryFileNames: 'bundle.js',
      },
    },
  },
});
