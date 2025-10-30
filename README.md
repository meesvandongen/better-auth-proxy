# better-auth-proxy

OAuth2-Proxy-like auth_request service using Better Auth, plus a tiny demo app and NGINX front proxy.

## Services

- auth-proxy (Bun, port 8080): Implements `/oauth2/*` endpoints and Better Auth API under `/api/auth/*`.
- demo-app (Bun, port 3000): Simple echo app that prints forwarded identity headers.
- nginx (port 80): Front proxy wiring `auth_request` to `auth-proxy` and proxying `/` to `demo-app`.

## Local development

Install dependencies:

```powershell
bun install
```

Run everything via Docker Compose (recommended):

```powershell
docker compose up -d --build
```

Then open:

- NGINX entry: http://localhost/
- Demo app (behind NGINX): http://localhost/
- Auth sign-in helper: http://localhost/oauth2/sign_in

If you want to run one service locally with Bun:

```powershell
# auth-proxy (listens on 8080)
bun --watch ./src/index.ts

# demo-app (listens on 3000)
bun --watch ./src/demo-app.ts
```

## Config

Set Better Auth secrets/providers via environment variables (Docker Compose already wires them):

- `BETTER_AUTH_SECRET` (required in production)
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (optional)

See `nginx/nginx.conf` for the `auth_request` integration pattern.
