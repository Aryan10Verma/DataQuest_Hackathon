/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The public address, for link previews in index.html. On Vercel it is the project's production
// domain; elsewhere set VITE_SITE_URL, or it falls back to the Render address.
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
process.env.VITE_SITE_URL ||= vercel ? `https://${vercel}` : 'https://prismav.onrender.com';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    // In development the API runs separately on :8000; the proxy keeps requests same-origin.
    proxy: { '/api': 'http://localhost:8000' },
  },
  build: { chunkSizeWarningLimit: 900 },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
});
