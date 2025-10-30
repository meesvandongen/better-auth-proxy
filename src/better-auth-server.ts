import { betterAuth } from "better-auth";

export const auth = betterAuth({
	socialProviders: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID as string,
			clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
		},
	},

	session: {
		expiresIn: 60 * 60 * 24 * 7,
		cookieCache: {
			enabled: true,
			maxAge: 30 * 24 * 60 * 60,
			strategy: "jwe",
			refreshCache: true,
		},
	},
});
