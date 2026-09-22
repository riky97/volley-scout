/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const resolvePath = (relative: string): string =>
  fileURLToPath(new URL(relative, import.meta.url));

// Tauri drives the dev server on a fixed port and needs a predictable build output.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@domain': resolvePath('./src/domain'),
      '@application': resolvePath('./src/application'),
      '@infrastructure': resolvePath('./src/infrastructure'),
      '@presentation': resolvePath('./src/presentation'),
      '@shared': resolvePath('./src/shared'),
      '@test': resolvePath('./src/test'),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
});
