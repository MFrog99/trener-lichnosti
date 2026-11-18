import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — одинаково работает на GitHub Pages (подпапка), в Electron (file://) и в Android (Capacitor)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
  server: { port: 5173, host: '127.0.0.1', strictPort: true },
});
