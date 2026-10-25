import { createServer } from "node:http";

createServer((req, res) => {
	if (req.url !== "/") {
		res.writeHead(404).end();
		return;
	}
	// Return all incoming request headers as JSON
	res
		.writeHead(200, { "content-type": "application/json" })
		.end(JSON.stringify({ headers: req.headers }));
}).listen(3000);
