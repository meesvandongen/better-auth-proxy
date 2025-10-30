import { auth } from "./better-auth-server";
import index from "./frontend/index.html";

Bun.serve({
	port: 3000,
	routes: {
		"/*": index,
		"/api/auth/*": auth.handler,
	},
});
