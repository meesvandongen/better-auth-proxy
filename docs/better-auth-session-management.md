# Better Auth — session management essentials

Better Auth uses cookie-based sessions. The client sends the session cookie on each request; the server validates it and returns user/session data. This document distills the core options and patterns relevant to this project.

Expiration & refresh

- `expiresIn`: absolute session lifetime (default 7 days)
- `updateAge`: sliding refresh window; when a request arrives and the last update is older than `updateAge`, the server updates the session expiration
- `disableSessionRefresh: true`: disables sliding refresh entirely

Freshness checks

- Some endpoints require a “fresh” session (recently created)
- `freshAge` (default 1 day): if `createdAt` is within this window, the session is fresh
- Set `freshAge: 0` to disable freshness checks

Client/server helpers (overview)

- `getSession` / `useSession` — read current session
- `listSessions` — enumerate active device sessions
- `revokeSession`, `revokeOtherSessions`, `revokeSessions` — programmatic revocation
- Password change can revoke other sessions via `revokeOtherSessions: true`

Cookie cache (performance)

- Goal: avoid hitting the DB on every session read by caching signed (or encrypted) session payloads in a short-lived cookie
- If the underlying DB session expires/revokes, the cookie cache becomes invalid and refresh logic will reject/refresh accordingly

Strategies for the cookie cache

- `compact` (default): smallest; base64url + HMAC-SHA256; signed, not encrypted; best performance and size; not JWT-spec
- `jwt`: HS256-signed standard JWT; readable, tamper-proof; interoperable with JWT tooling
- `jwe`: fully encrypted (A256CBC-HS512 + HKDF); not readable by the client; largest but most secure

Example (cookie cache on)

```ts
export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // seconds (5 minutes)
      strategy: "compact", // or "jwt" or "jwe"
    },
  },
});
```

Stateless mode via cookie cache + refresh

- Set `cookieCache.enabled = true` and `refreshCache = true` to run statelessly (no DB reads)
- The server validates the cookie signature/encryption and checks expiry; it refreshes proactively before expiry
- `refreshCache` semantics:
  - `false` (default): no proactive refresh; on expiry, server may fetch DB
  - `true`: refresh when ~80% of `maxAge` elapsed (20% remaining)
  - `{ updateAge: number }`: custom threshold (seconds remaining)

Example (stateless)

```ts
export const auth = betterAuth({
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookieCache: {
      enabled: true,
      maxAge: 30 * 24 * 60 * 60, // 30 days
      strategy: "jwe", // encrypted for privacy
      refreshCache: true, // proactive stateless refresh
    },
  },
});
```

Trade-offs: stateless vs DB-backed

- Stateless: zero DB reads, great scalability; revocation isn’t immediate (until cookie refresh/expiry)
- DB-backed: queries on cache expiry; immediate revocation; best control
- Hybrid: optional `secondaryStorage` (e.g., Redis) to drive refresh and centralized revocation

Hybrid example (optional)

```ts
export const auth = betterAuth({
  secondaryStorage: {
    get: async (key) => await redis.get(key),
    set: async (key, value, ttl) => await redis.set(key, value, "EX", ttl),
    delete: async (key) => await redis.del(key),
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60,
      strategy: "jwe",
      refreshCache: false,
    },
  },
});
```

Forcing DB fetch on demand

- Pass `disableCookieCache: true` to `getSession` to bypass cache and refresh it

Project‑specific note (this repo)

- Your `src/better-auth-server.ts` uses:
  ```ts
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    cookieCache: {
      enabled: true,
      maxAge: 30 * 24 * 60 * 60,
      strategy: "jwe",
      refreshCache: true,
    },
  }
  ```
- This config enables stateless sessions with encrypted cookie cache and proactive refresh. Expect no DB reads for session validation, excellent edge/serverless fit, and strong privacy. Revocation will take effect on refresh/expiry.

References

- Better Auth doc (session management): https://github.com/better-auth/better-auth/blob/cd567659b8b6c78bf90843fd7218446a4ca6aa9b/docs/content/docs/concepts/session-management.mdx
