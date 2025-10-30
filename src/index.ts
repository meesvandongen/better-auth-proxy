import { auth } from "./better-auth-server";
import index from "./login/index.html";

function _text(content: string, status = 200, headers: HeadersInit = {}) {
	return new Response(content, {
		status,
		headers: {
			"content-type": "text/plain; charset=utf-8",
			...headers,
		},
	});
}

function copySetCookie(from: Response, toHeaders: Headers) {
	// Bun's Headers has getSetCookie(); fall back to single header if needed
	const anyHeaders = from.headers as Headers & {
		getSetCookie?: () => string[];
	};
	const setCookies: string[] | undefined =
		typeof anyHeaders.getSetCookie === "function"
			? anyHeaders.getSetCookie()
			: undefined;
	if (setCookies?.length) {
		for (const c of setCookies) toHeaders.append("set-cookie", c);
		return;
	}
	const sc = from.headers.get("set-cookie");
	if (sc) toHeaders.append("set-cookie", sc);
}

function redirect(
	location: string,
	status: 302,
	headers: Headers = new Headers(),
) {
	headers.set("location", location);
	return new Response(null, { status, headers });
}

Bun.serve({
	port: 8080,
	routes: {
		"/login/*": index,
		"/api/auth/*": auth.handler,
		"/oauth2/auth": {
			GET: async (req) => {
				const session = await auth.api.getSession(req);

				const outHeaders = new Headers();

				if (!session) {
					// If Better Auth errored, treat as unauthenticated
					outHeaders.set("www-authenticate", "Redirect");
					return new Response(null, { status: 401, headers: outHeaders });
				}

				if (!session.session.token) {
					outHeaders.set("www-authenticate", "Redirect");
					return new Response(null, { status: 401, headers: outHeaders });
				}

				outHeaders.set("x-auth-request-access-token", session.session.token);

				return new Response(null, { status: 202, headers: outHeaders });
			},
		},

		// Move former fetch()-based routes into explicit route handlers
		"/oauth2/sign_in": {
			GET: (req) => {
				const url = new URL(req.url);
				const rd = url.searchParams.get("rd") || "/";
				const to = `/login?rd=${encodeURIComponent(rd)}`;
				return redirect(to, 302);
			},
		},
		"/oauth2/start": {
			GET: (req) => {
				const url = new URL(req.url);
				const rd = url.searchParams.get("rd") || "/";
				const to = `/login?rd=${encodeURIComponent(rd)}`;
				return redirect(to, 302);
			},
		},
		"/oauth2/logout": {
			POST: async (req) => {
				// Proxy to Better Auth sign-out to clear cookies/server session
				const url = new URL(req.url);
				const signOutReq = new Request(
					new URL("/api/auth/sign-out", url.origin).toString(),
					{
						method: "POST",
						headers: req.headers,
					},
				);
				const signOutRes = await auth.handler(signOutReq);
				const outHeaders = new Headers();
				copySetCookie(signOutRes, outHeaders);
				return new Response(null, { status: 204, headers: outHeaders });
			},
		},
	},
});
