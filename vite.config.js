// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173, // You can change this port if needed
    allowedHosts: ['family-tree-18x8.onrender.com']
  }
});
