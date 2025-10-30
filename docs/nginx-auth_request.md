# NGINX auth_request module — concise guide

This module lets NGINX perform auth checks via a subrequest before proxying to your upstream. If the subrequest returns 2xx, access is allowed; if it returns 401/403, access is denied with that status. For 401, the `WWW-Authenticate` header from the subrequest is forwarded to the client.

Key facts

- Module: `ngx_http_auth_request_module` (requires compiling with `--with-http_auth_request_module` if not included by your distro build)
- Works by calling a subrequest (eg `/auth`) on every protected request
- Decision rules: 2xx = allow, 401/403 = deny, anything else = error
- Combine with other access modules via `satisfy` (e.g., basic auth or IP allowlists)
- Variables from subrequest response are exposed as `$upstream_http_*` and can be copied to upstream requests with `auth_request_set`
- Caching: pre-1.7.3 subrequest responses couldn’t be cached; modern NGINX supports normal proxy caching for the auth subrequest

Directives

- `auth_request uri|off;` — enable and point to an internal auth location
- `auth_request_set $var value;` — set variables after auth completes; `value` can reference `$upstream_http_*`

Typical flow

1. Client requests `/private/*`
2. NGINX sends a subrequest to `/auth` (no body) with headers like the original URI
3. If `/auth` returns 2xx, NGINX proxies to the upstream; if 401/403, NGINX denies

Minimal example

```
location /private/ {
  auth_request /auth;
  # … normal proxy_pass or upstream handling here …
}

location = /auth {
  proxy_pass http://auth-backend;         # your auth service
  proxy_pass_request_body off;            # subrequest has no body
  proxy_set_header Content-Length "";
  proxy_set_header X-Original-URI $request_uri;
}
```

Propagating identity to your upstream
Use `auth_request_set` to copy headers returned by the auth subrequest:

```
# Suppose /auth sets X-User and X-Email in its response
auth_request_set $user  $upstream_http_x_user;
auth_request_set $email $upstream_http_x_email;
proxy_set_header X-User  $user;
proxy_set_header X-Email $email;
```

Error handling tips

- 401 responses return `WWW-Authenticate` from the auth subrequest to the client
- You can map 401 to a 403 (and redirect) using `error_page` in the protected location

When to use

- Gateway/edge enforcing auth centrally
- Integrations with external authenticators (e.g., OAuth/OIDC sidecars like oauth2-proxy)

References

- Official docs: https://nginx.org/en/docs/http/ngx_http_auth_request_module.html
