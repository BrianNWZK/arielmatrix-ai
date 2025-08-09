// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';

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
    })
  ],

  base: './',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
    minify: 'terser',
    reportCompressedSize: false,
    rollupOptions: {
      input: './index.html',
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'axios', '@tanstack/react-query'],
          components: [
            './src/components/Dashboard.jsx',
            './src/components/RevenueTracker.js',
            './src/components/TrafficBot.js',
          ]
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },

  server: {
    host: true,
    port: 5173,
    open: true,
    hmr: {
      overlay: true
    }
  },

  preview: {
    port: 4173,
    strictPort: true
  },

  envPrefix: 'VITE_',

  optimizeDeps: {
    include: ['react', 'react-dom', 'axios', '@tanstack/react-query']
  },

  esbuild: {
    logOverride: {
      'this-is-undefined-in-esm': 'silent'
    }
  }
});
