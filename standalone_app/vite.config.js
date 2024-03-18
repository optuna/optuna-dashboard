import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'IS_VSCODE': JSON.stringify(false),
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  server: {
    fs: {
        // Allow serving wasm files in node_modules
        allow: ['..'],
    },
  },
});
