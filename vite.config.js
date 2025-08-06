import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // ✅ Relative paths ensure Vercel can serve the SPA correctly
  build: {
    outDir: 'dist',        // ✅ Final output directory
    assetsDir: 'assets',   // ✅ Keep static assets organized
    sourcemap: false,      // ✅ Disable in production to reduce size
    emptyOutDir: true,     // ✅ Clear old builds
    reportCompressedSize: true,
    rollupOptions: {
      input: './index.html', // ✅ Correct entry point for React SPA
    },
  },
  server: {
    host: true,             // ✅ Allow external access (for preview)
    port: 5173,             // ✅ Local dev port
    open: true,             // ✅ Auto-open browser in dev
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': '/src', // ✅ Optional: simplifies imports
    },
  },
});
