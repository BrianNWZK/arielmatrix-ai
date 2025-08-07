import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import checker from 'vite-plugin-checker';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      fastRefresh: true,
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
    minify: 'esbuild',
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
        if (
          warning.code === 'FILE_NOT_FOUND' &&
          warning.message.includes('index.html')
        ) {
          throw new Error(
            'Build failed: index.html not found. Check your input path in rollupOptions.'
          );
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
  envPrefix: 'VITE_',
  define: {
    'process.env': {
      VITE_BSC_PRIVATE_KEY: JSON.stringify(process.env.VITE_BSC_PRIVATE_KEY || ''),
      VITE_TRUST_WALLET_API_KEY: JSON.stringify(process.env.VITE_TRUST_WALLET_API_KEY || ''),
      VITE_BSCSCAN_API_KEY: JSON.stringify(process.env.VITE_BSCSCAN_API_KEY || ''),
      VITE_GROQ_API_KEY: JSON.stringify(process.env.VITE_GROQ_API_KEY || ''),
      VITE_TRAFFIC_BOT_URL: JSON.stringify(process.env.VITE_TRAFFIC_BOT_URL || '/api/trafficbot'),
      VITE_COSMO_WEB3DB_URL: JSON.stringify(process.env.VITE_COSMO_WEB3DB_URL || '/api/cosmoweb3db'),
      VITE_ORCHESTRATOR_URL: JSON.stringify(process.env.VITE_ORCHESTRATOR_URL || '/api/orchestrator'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios', '@tanstack/react-query'],
  },
  esbuild: {
    logOverride: {
      'this-is-undefined-in-esm': 'silent',
    },
  },
});
