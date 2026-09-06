# Deployment

## The browser must see one origin

The backend lives in [boilplate-server](https://github.com/fredokim/boilplate-server)
and is shared with the Vue and Next.js boilerplates.

Its refresh token is an HttpOnly cookie with `sameSite: 'lax'`. Serve this app
from a different origin than the API and the browser never sends it: sign-in
appears to work, and then the session ends without explanation the moment the
access token expires. The two WebSocket gateways fail the same way.

So this app does not call the backend across origins. **It proxies `/api` to
it**, and the browser sees one origin.

### Development

`vite.config.ts` already proxies `/api`, WebSocket upgrades included.
`VITE_API_TARGET` points it somewhere other than `http://127.0.0.1:3001`.

```bash
npm run dev:server-mode              # against a backend on 127.0.0.1:3001
VITE_API_TARGET=https://api.example.com npm run dev:server-mode
```

### Production

The build is static files. Deploy them to a host that can rewrite `/api/*` to
the backend — Vercel, Netlify, and Cloudflare Pages all express this as a
rewrite rule, and a plain reverse proxy does it in a few lines. What matters is
that the rewrite happens on the server side, so the browser only ever sees one
origin. A client-side redirect or an absolute API URL does not work: both put
the cookie back in cross-site territory.

`VITE_DATA_MODE=server` is required for a production build that talks to the
backend. Mock mode is refused in a production build.

---

## What has not been verified

- **Nothing has been deployed.** The app has run against a hosted PostgreSQL
  from a developer machine, through the Vite proxy. No rewrite rule on a real
  host has been exercised, so TLS termination, `TRUST_PROXY` on the backend, and
  a platform's idle timeout on a WebSocket are all untested.
- **There is no image here.** This repository used to carry a Dockerfile that
  built the API and the client into one image. That image moved to the backend
  repository as an API-only build when the backend was extracted, and nothing
  replaced it here — static hosting needs no image.
