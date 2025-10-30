import { authClient } from "./better-auth-client";

export function Login() {
	return (
		<div className="app">
			<h1>Bun + React</h1>
			<button
				type="button"
				onClick={async () => {
					authClient.signIn.social({ provider: "github" });
				}}
			>
				Sign in with GitHub
			</button>
		</div>
	);
}
