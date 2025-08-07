import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import checker from 'vite-plugin-checker';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    checker({
      typescript: false,
      eslint: {
        lintCommand: 'eslint "./src/**/*.{js,jsx}"',
      },
    }),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  base: './',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
    minify: 'terser', // ✅ REQUIRED when using terserOptions
    reportCompressedSize: true,
    rollupOptions: {
      input: './index.html',
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'axios', '@tanstack/react-query'],
          components: [
            './src/components/Dashboard.jsx',
            './src/components/RevenueTracker.js',
            './src/components/TrafficBot.js',
          ],
        },
      },
      onwarn(warning, warn) {
        if (warning.code === 'FILE_NOT_FOUND' && warning.message.includes('index.html')) {
          throw new Error('Build failed: index.html not found. Check rollupOptions.input path.');
        }
        warn(warning);
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },

  server: {
    host: true,
    port: 5173,
    open: true,
    hmr: {
      overlay: true,
    },
  },

  preview: {
    port: 4173,
    strictPort: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  envPrefix: 'VITE_', // ✅ Standard practice for frontend envs

  optimizeDeps: {
    include: ['react', 'react-dom', 'axios', '@tanstack/react-query'],
  },

  esbuild: {
    logOverride: {
      'this-is-undefined-in-esm': 'silent',
    },
  },
});
