import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    APP_BAR_TITLE: JSON.stringify('Optuna Dashboard'),
    API_ENDPOINT: JSON.stringify("http://localhost:8080"),
    URL_PREFIX: JSON.stringify("/dashboard"),
  }
})
