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
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
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
