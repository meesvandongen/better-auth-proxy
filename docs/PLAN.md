# Better Auth OAuth2-Proxy (Bun) — concise plan

## Goals

- Expose NGINX-compatible auth endpoints (auth_request mode only) using Better Auth in stateless cookie-cache mode.
- Emit identity headers on successful auth so NGINX can forward them upstream.
- Provide a tiny Bun demo app that prints received headers.
- Ship everything via Docker Compose with NGINX in front of both services.

## Endpoints to implement (service: auth-proxy)

- GET /oauth2/auth

  - Purpose: NGINX `auth_request` subrequest.
  - Behavior: Validate Better Auth session from cookies.
    - If valid: return 202 Accepted; include identity headers and any refreshed `Set-Cookie`.
    - If invalid/absent/expired: return 401 Unauthorized; include `WWW-Authenticate: Redirect` and/or a Location hint.
  - Response headers on success (names mirror oauth2-proxy for easy NGINX wiring):
    - X-Auth-Request-User: preferred display name or email
    - X-Auth-Request-Email: primary email (if available)
    - X-Auth-Request-UID: stable user id
    - X-Auth-Request-Groups: comma-separated groups/roles (optional)
    - X-Auth-Request-Access-Token: short-lived access token (optional; only if minted)
  - Also surface any refreshed cookie(s): `Set-Cookie` from Better Auth; NGINX will forward to client.

- GET /oauth2/sign_in (or /start)

  - Purpose: UI entrypoint when unauthenticated. Redirect to your existing SPA login (`src/login/*`).
  - Behavior: 302 to the SPA login route with `rd=$request_uri` preservation.

- POST /oauth2/logout
  - Purpose: clear session cookie and revoke if applicable.
  - Behavior: 204 No Content; `Set-Cookie` to expire session cookies.

Implementation notes

- Use Better Auth stateless cookie cache (already configured in `src/better-auth-server.ts`).
- For `/oauth2/auth`, prefer `getSession()` with cache enabled; on success map fields to headers; on miss return 401.
- If Better Auth refreshes the cookie cache, forward the new `Set-Cookie` in the subresponse.

## NGINX (front proxy) configuration sketch

- Expose auth service under `/oauth2/` and subrequest endpoint at `/oauth2/auth`.
- Protect app location with `auth_request /oauth2/auth`.
- On 401, redirect users to `/oauth2/sign_in`.
- Forward identity headers to the upstream app and propagate refreshed cookies:
  - auth_request_set $user $upstream_http_x_auth_request_user
  - auth_request_set $email $upstream_http_x_auth_request_email
  - auth_request_set $uid $upstream_http_x_auth_request_uid
  - auth_request_set $token $upstream_http_x_auth_request_access_token
  - auth_request_set $auth_cookie $upstream_http_set_cookie
  - proxy_set_header X-User $user; X-Email $email; X-UID $uid; X-Access-Token $token
  - add_header Set-Cookie $auth_cookie;
- Handle large/multi-part cookies if needed (copy additional Set-Cookie parts as per docs).

## Demo upstream app (service: demo-app, Bun)

- Minimal Bun HTTP server on port 3000.
- For GET /, respond with a plain page dumping selected request headers:
  - X-User, X-Email, X-UID, X-Access-Token, and all `X-Auth-Request-*` if present.
- No auth logic; relies entirely on NGINX + auth-proxy.

## Docker Compose

- Services
  - auth-proxy: Bun + TypeScript service from this repo (Better Auth). Expose 8080.
  - demo-app: Bun echo app. Expose 3000 (internal only).
  - nginx: Front proxy. Mount an `nginx.conf` that wires `auth_request` to `auth-proxy` and proxies `/` to `demo-app`.
- Networks: single shared network for the three services.
- Secrets/env
  - Provide Better Auth secret(s) via env (cookie encryption/signing). Use `.env` with sane defaults for local.
  - Set `PUBLIC_URL` / `BASE_URL` as needed for redirects.

## Test flow (local)

1. docker compose up -d
2. Visit http://localhost/ → expect redirect to `/oauth2/sign_in` (SPA login).
3. Complete login via Better Auth UI → redirected back to `/`.
4. Page displays identity headers; refresh page to see cookies refresh propagated.
5. Call `/oauth2/logout` → subsequent `/` becomes unauthenticated (redirects again).

## Edge cases & acceptance criteria

- Unauthenticated request returns 401 from `/oauth2/auth`, NGINX serves 403 redirect to `/oauth2/sign_in`.
- Valid session returns 202 with identity headers; NGINX forwards them as `X-*` to upstream.
- Cookie cache refresh produces `Set-Cookie` in subresponse and is added to client response by NGINX.
- Large cookies (multi-part) are handled per documented NGINX snippet when encountered.
- No database required; stateless sessions function across restarts (keys stable).

## Next steps (post-MVP)

- Optional: Redis secondary storage to centralize revocation and cache control.
- Add OIDC providers and access token minting for `X-Auth-Request-Access-Token`.
- Health/readiness endpoints for k8s.
