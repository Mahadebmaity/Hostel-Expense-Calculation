import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_BACKEND_URL || `http://127.0.0.1:${process.env.VITE_DEV_BACKEND_PORT || '8000'}`,
        changeOrigin: true,
      }
    }
  }
});
