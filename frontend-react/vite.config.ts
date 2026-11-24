import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const backend = `http://localhost:${process.env['BACKEND_PORT'] ?? '8080'}`;

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: backend, secure: false },
      '/ws': { target: backend, secure: false, ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}'],
  },
});
