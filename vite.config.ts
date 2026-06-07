/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Edge auth gate for the public Cloudflare tunnel.
//
// The tunnel terminates at THIS dev server (localhost:5173) and the backend is
// bound to 127.0.0.1, reachable only through the proxy below. So the only place
// a shared secret can actually restrict external callers is here, at the edge --
// a token injected further downstream (e.g. into proxied backend calls) would be
// added for tunnel visitors too, and protect nothing.
//
// Activated only when MALCARD_TUNNEL_TOKEN is set (start.bat sets a fresh random
// token per run and bakes it into the QR/printed URLs). A plain `pnpm dev` leaves
// it unset, so local development is never gated. The token rides in via the
// `?token=` query (from the QR), gets stored in an HttpOnly cookie, and the URL
// is cleaned so reloads work from the cookie alone. Requests without a valid
// token get 403 -- the static app shell and the proxied API are both gated.
function tunnelTokenGate(): PluginOption {
  const expected = process.env.MALCARD_TUNNEL_TOKEN;
  const tokenEq = (got: string | undefined): boolean => {
    if (!got || !expected) return false;
    const a = Buffer.from(got);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  };
  const cookieToken = (cookie: string | undefined): string | undefined =>
    cookie
      ?.split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('mc_token='))
      ?.slice('mc_token='.length);

  return {
    name: 'malcard-tunnel-token-gate',
    configureServer(server) {
      if (!expected) return; // no token configured -> no gating (local dev)
      // Registered inside configureServer (not the returned post hook) so it runs
      // BEFORE Vite's internal middlewares, including the proxy.
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const queryToken = url.searchParams.get('token') ?? undefined;

        if (tokenEq(cookieToken(req.headers.cookie))) return next();

        if (tokenEq(queryToken)) {
          url.searchParams.delete('token');
          res.statusCode = 302;
          res.setHeader('Set-Cookie', 'mc_token=' + queryToken + '; HttpOnly; SameSite=Lax; Path=/');
          res.setHeader('Location', url.pathname + url.search);
          res.end();
          return;
        }

        res.statusCode = 403;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('403 Forbidden - valid access link required.');
      });
    },
  };
}

// Persists cards authored in the local /admin tool to JSON files on disk, so a
// save becomes a PERMANENT part of the dataset -- committable, and served to
// every client (incl. phones over the tunnel) -- instead of living only in the
// author's browser localStorage.
//
// GET  /__admin/custom-cards  -> { phoneme, situations }  (open; clients merge these)
// POST /__admin/custom-cards  { kind, items[] }           -> overwrites that file
//
// Only wired up when the app talks to the SAME-ORIGIN dev server (VITE_API_BASE_URL
// unset) -- which is exactly how start.bat runs it. The Playwright suite sets
// VITE_API_BASE_URL=http://api.test, so the endpoints stay off there and the tests
// keep exercising the localStorage fallback (no disk writes polluting the repo).
function malcardAdminPersist(): PluginOption {
  if (process.env.VITE_API_BASE_URL) return { name: 'malcard-admin-persist' };

  const FILES = {
    phoneme: fileURLToPath(new URL('./src/data/custom-phoneme-cards.json', import.meta.url)),
    situation: fileURLToPath(new URL('./src/data/custom-situations.json', import.meta.url)),
  } as const;

  const readArr = async (file: string): Promise<unknown[]> => {
    try {
      const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return {
    name: 'malcard-admin-persist',
    configureServer(server) {
      server.middlewares.use('/__admin/custom-cards', (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(body));
        };
        void (async () => {
          try {
            if (req.method === 'GET') {
              const [phoneme, situations] = await Promise.all([
                readArr(FILES.phoneme),
                readArr(FILES.situation),
              ]);
              return send(200, { phoneme, situations });
            }
            if (req.method === 'POST') {
              // Authoring rewrites repo data files -> only from the dev machine
              // (localhost/LAN), never from the public Cloudflare tunnel.
              if ((req.headers.host ?? '').endsWith('.trycloudflare.com')) {
                return send(403, { error: 'authoring is disabled over the public tunnel' });
              }
              let raw = '';
              for await (const chunk of req) raw += chunk;
              let payload: { kind?: string; items?: unknown };
              try {
                payload = JSON.parse(raw);
              } catch {
                return send(400, { error: 'invalid JSON body' });
              }
              const target =
                payload.kind === 'phoneme'
                  ? FILES.phoneme
                  : payload.kind === 'situation'
                    ? FILES.situation
                    : null;
              if (!target || !Array.isArray(payload.items)) {
                return send(400, { error: "expected { kind: 'phoneme'|'situation', items: [] }" });
              }
              await fs.writeFile(target, JSON.stringify(payload.items, null, 2) + '\n', 'utf8');
              return send(200, { ok: true, count: payload.items.length });
            }
            send(405, { error: 'method not allowed' });
          } catch (e) {
            send(500, { error: (e as Error)?.message ?? String(e) });
          }
        })();
      });
    },
  };
}

export default defineConfig({
  plugins: [tunnelTokenGate(), malcardAdminPersist(), react()],
  server: {
    // Bind to 0.0.0.0 so other devices on the same Wi-Fi (phones, tablets) can
    // reach the dev server at http://<this-PC-LAN-IP>:5173. Vite prints the
    // reachable "Network:" URL on startup.
    host: true,
    port: 5173,
    // Fail fast if 5173 is already taken instead of silently moving to 5174 --
    // the launcher and the tunnel both assume the frontend is on 5173.
    strictPort: true,
    // Allow the random Cloudflare quick-tunnel subdomain. Vite still permits
    // localhost and IP-literal Host headers regardless (so LAN/phone access
    // keeps working), and the leading dot matches any *.trycloudflare.com --
    // so we avoid the wide-open `allowedHosts: true`.
    allowedHosts: ['.trycloudflare.com'],
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
