import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 9547,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:9548',
        changeOrigin: true,
      },
      '/docs': {
        target: 'http://localhost:9548',
        changeOrigin: true,
      },
    },
  },
});
