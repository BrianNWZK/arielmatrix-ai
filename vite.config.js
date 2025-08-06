import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import checker from 'vite-plugin-checker';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic', // Optimize JSX compilation
      fastRefresh: true, // Enable HMR for React
    }),
    checker({
      typescript: false, // Disable if not using TypeScript
      eslint: {
        lintCommand: 'eslint "./src/**/*.{js,jsx}"', // Ensure code quality
      },
    }),
    visualizer({
      filename: 'dist/stats.html', // Visualize bundle for optimization
      open: false,
    }),
  ],
  base: './', // Relative paths for Vercel compatibility
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable in production
    emptyOutDir: true,
    reportCompressedSize: true,
    minify: 'esbuild', // Faster minification
    rollupOptions: {
      input: './index.html',
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'axios', '@tanstack/react-query'], // Split vendor code
          components: ['./src/components/Dashboard.jsx', './src/components/RevenueTracker.js', './src/components/TrafficBot.js'], // Split components
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    // Ensure build fails if index.html is missing
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'FILE_NOT_FOUND' && warning.message.includes('index.html')) {
          throw new Error('Build failed: index.html not found. Check entry point.');
        }
        warn(warning);
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    open: true,
    hmr: {
      overlay: true, // Show error overlay in browser
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Consistent imports
    },
  },
  envPrefix: 'VITE_', // Restrict to VITE_ variables
  // Validate environment variables
  define: {
    'process.env.VITE_BSC_PRIVATE_KEY': JSON.stringify(process.env.VITE_BSC_PRIVATE_KEY || ''),
    'process.env.VITE_TRUST_WALLET_API_KEY': JSON.stringify(process.env.VITE_TRUST_WALLET_API_KEY || ''),
    'process.env.VITE_BSCSCAN_API_KEY': JSON.stringify(process.env.VITE_BSCSCAN_API_KEY || ''),
    'process.env.VITE_GROQ_API_KEY': JSON.stringify(process.env.VITE_GROQ_API_KEY || ''),
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios', '@tanstack/react-query'], // Pre-bundle dependencies
  },
  esbuild: {
    logOverride: {
      'this-is-undefined-in-esm': 'silent', // Suppress common warnings
    },
  },
});
