import { betterAuth } from "better-auth";
import index from "./frontend/index.html";

export const auth = betterAuth({
	socialProviders: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID as string,
			clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
		},
	},

	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		cookieCache: {
			enabled: true,
			maxAge: 30 * 24 * 60 * 60, // 30 days cache duration
			strategy: "jwe", // Use encrypted tokens for better security
			refreshCache: true, // Enable stateless refresh
		},
	},
});

Bun.serve({
	port: 3000,
	routes: {
		"/*": index,
		"/api/auth/*": auth.handler,
	},
});
