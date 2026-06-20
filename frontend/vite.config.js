import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/suggest': 'http://backend:3001',
      '/search': 'http://backend:3001',
      '/cache': 'http://backend:3001'
    }
  }
});
