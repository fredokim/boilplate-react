import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const alias = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    process.env.ANALYZE === 'true' &&
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': alias('./src'),
      '@app': alias('./src/app'),
      '@core': alias('./src/core'),
      '@features': alias('./src/features'),
      '@hoc': alias('./src/hoc'),
      '@hooks': alias('./src/hooks'),
      '@stores': alias('./src/stores'),
      '@ui': alias('./src/components/ui'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    /**
     * Forwards `/api` to the backend so server mode works in development.
     *
     * The api client uses a relative `baseURL: '/api'`, so without this the
     * browser asks Vite for those paths and gets the SPA fallback — which is not
     * an obvious failure, because the response is a 200 full of HTML that only
     * fails later at DTO validation.
     *
     * A proxy rather than an absolute URL plus CORS: same-origin means the
     * refresh cookie is sent without any cross-site cookie rules to satisfy, and
     * it matches how the app is served in production.
     *
     * `ws: true` covers the two gateways, `/api/topology` and `/api/live/chat`.
     * Mock mode never reaches any of this — nothing is proxied because nothing
     * is requested.
     */
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (
            id.includes('node_modules/react-grid-layout') ||
            id.includes('node_modules/react-draggable') ||
            id.includes('node_modules/react-resizable')
          ) {
            return 'dashboard-grid';
          }
          if (id.includes('node_modules/react') || id.includes('react-router-dom')) {
            return 'react';
          }
          if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
            return 'query';
          }
          if (id.includes('class-transformer') || id.includes('class-validator')) {
            return 'validation';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
