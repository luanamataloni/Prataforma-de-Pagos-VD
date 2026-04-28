import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 1 - CONFIGURO VITE CON REACT Y EL PROXY AL BACKEND:
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 2 - TODAS LAS LLAMADAS A /api SE REDIRIGEN AL BACKEND (puerto 3001):
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});

