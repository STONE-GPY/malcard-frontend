/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to 0.0.0.0 so other devices on the same Wi-Fi (phones, tablets) can
    // reach the dev server at http://<this-PC-LAN-IP>:5173. Vite prints the
    // reachable "Network:" URL on startup.
    host: true,
    port: 5173,
    // Accept any Host header so a Cloudflare quick tunnel (random
    // *.trycloudflare.com host) isn't rejected with "Blocked request".
    allowedHosts: true,
    // Proxy the backend's route namespaces to the local FastAPI server. This
    // lets the frontend call the backend same-origin (see api/client.ts), so
    // local, LAN, and tunnel access all work through one origin without
    // exposing port 8000. These prefixes are the backend's routers
    // (app/main.py): health, cards, analysis, puzzle, tts.
    // Target MUST be 127.0.0.1, not localhost: Node 17+ resolves "localhost" to
    // IPv6 ::1 first, but uvicorn --host 0.0.0.0 only listens on IPv4, so a
    // "localhost" target fails with ECONNREFUSED ::1:8000.
    proxy: Object.fromEntries(
      ['/analysis', '/tts', '/cards', '/puzzle', '/health'].map((p) => [
        p,
        { target: 'http://127.0.0.1:8000', changeOrigin: true },
      ]),
    ),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules/**', 'tests/**'],
  },
});
