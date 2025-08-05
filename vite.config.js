import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // ✅ Use relative paths for Vercel to serve correctly
  build: {
    outDir: 'dist',       // ✅ Vercel expects final build in /dist
    assetsDir: 'assets',  // ✅ Keep assets organized
    sourcemap: false,     // ✅ Speeds up build & reduces size
    emptyOutDir: true     // ✅ Clears old builds to prevent cache issues
  },
  publicDir: 'public',     // ✅ Copies static assets (favicon, robots.txt)
  server: {
    port: 5173,            // ✅ Dev server port (optional)
    open: true
  }
});
