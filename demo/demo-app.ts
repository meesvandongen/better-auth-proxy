Bun.serve({
	port: 3000,
	routes: {
		"/": (req) => {
			const headers: Record<string, string> = {};
			req.headers.forEach((value, key) => {
				headers[key] = value;
			});
			// Return all incoming request headers as JSON
			return Response.json({ headers });
		},
	},
});
