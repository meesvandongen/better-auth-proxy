## Server-Side Authentication
To authenticate a user on the server, you can use the auth.api methods.

server.ts

import { auth } from "./auth"; // path to your Better Auth server instance
const response = await auth.api.signInEmail({
    body: {
        email,
        password
    },
    asResponse: true // returns a response object instead of data
});
If the server cannot return a response object, you'll need to manually parse and set cookies. But for frameworks like Next.js we provide a plugin to handle this automatically


automatic redirect instead of login page.


## force JSON errors

flag: --force-json-errors
toml: force_json_errors	bool	force JSON errors instead of HTTP error pages or redirects	false

