import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 7819,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:7818',
        changeOrigin: true,
      },
      '/docs': {
        target: 'http://localhost:7818',
        changeOrigin: true,
      },
    },
  },
});
