# OAuth2 Proxy + NGINX auth_request — integration notes

This pattern authenticates requests at NGINX using `auth_request` by delegating to oauth2-proxy. oauth2-proxy’s `/oauth2/auth` endpoint returns only `202 Accepted` (authenticated) or `401 Unauthorized` (unauthenticated) so NGINX can gate access without proxying the full request to oauth2-proxy.

Prerequisites (oauth2-proxy flags)

- `--reverse-proxy=true` — trust `X-Forwarded-*` headers
- `--set-xauthrequest` — emit identity headers for NGINX to forward (`X-Auth-Request-*`)
- Optional: `--pass-access-token` to expose an access token header; `--cookie-refresh` for periodic refresh; `--session-store-type=redis` recommended for large OIDC tokens

Canonical NGINX layout

```
# Expose oauth2-proxy under /oauth2/
location /oauth2/ {
  proxy_pass       http://127.0.0.1:4180;
  proxy_set_header Host              $host;
  proxy_set_header X-Real-IP         $remote_addr;
  proxy_set_header X-Auth-Request-Redirect $request_uri;
  # For multiple domains: X-Auth-Request-Redirect $scheme://$host$request_uri;
}

# Subrequest endpoint for auth_request
location = /oauth2/auth {
  proxy_pass       http://127.0.0.1:4180;
  proxy_set_header Host             $host;
  proxy_set_header X-Real-IP        $remote_addr;
  proxy_set_header X-Forwarded-Uri  $request_uri;
  proxy_set_header Content-Length   "";   # auth subrequest has no body
  proxy_pass_request_body           off;
}

# Protect your app
location / {
  auth_request /oauth2/auth;

  # Redirect unauthenticated users to sign-in
  error_page 401 =403 /oauth2/sign_in;

  # Forward identity to your app (requires --set-xauthrequest)
  auth_request_set $user   $upstream_http_x_auth_request_user;
  auth_request_set $email  $upstream_http_x_auth_request_email;
  proxy_set_header  X-User   $user;
  proxy_set_header  X-Email  $email;

  # Optional: pass an access token (requires --pass-access-token)
  auth_request_set $token  $upstream_http_x_auth_request_access_token;
  proxy_set_header X-Access-Token $token;

  # Optional: cookie-refresh support (capture Set-Cookie from subrequest)
  auth_request_set $auth_cookie $upstream_http_set_cookie;
  add_header Set-Cookie $auth_cookie;

  proxy_pass http://backend;
}
```

Handling large cookies (multi-part Set-Cookie)
Some providers set cookies >4KB when `--set-authorization-header` is enabled; oauth2-proxy splits them into multiple parts. NGINX typically propagates only the first `Set-Cookie` from an auth_request, so you may need to copy additional parts manually:

```
# name is your configured --cookie-name; default is _oauth2_proxy
set $auth_cookie_name_upstream_1 $upstream_cookie__oauth2_proxy_1;

if ($auth_cookie ~* "(; .*)") {
  set $auth_cookie_name_0 $auth_cookie;
  set $auth_cookie_name_1 "_oauth2_proxy_1=$auth_cookie_name_upstream_1$1";
}

if ($auth_cookie_name_upstream_1) {
  add_header Set-Cookie $auth_cookie_name_0;
  add_header Set-Cookie $auth_cookie_name_1;
}
```

Adapt variable names if you changed `--cookie-name`.

Kubernetes (ingress-nginx) annotations

- `nginx.ingress.kubernetes.io/auth-url: "https://<oauth2-proxy-fqdn>/oauth2/auth"`
- `nginx.ingress.kubernetes.io/auth-signin: "https://<oauth2-proxy-fqdn>/oauth2/start?rd=$escaped_request_uri"`

Tips & pitfalls

- Always set `--reverse-proxy` so redirects and host generation are correct
- Use Redis session store when tokens are large (e.g., Azure AD) to avoid bloated cookies
- Ensure the auth subrequest is body-less: `proxy_pass_request_body off; Content-Length ""`
- Forward only the headers your app actually needs (principle of least privilege)

References

- Integration doc: https://oauth2-proxy.github.io/oauth2-proxy/configuration/integration/?_highlight=nginx#configuring-for-use-with-the-nginx-auth_request-directive
- NGINX auth_request: https://nginx.org/en/docs/http/ngx_http_auth_request_module.html
