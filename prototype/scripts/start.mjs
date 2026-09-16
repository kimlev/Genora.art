import http from "node:http";
import https from "node:https";

function allowLongRequests(createServer) {
  return function patchedCreateServer(...args) {
    const server = createServer.apply(this, args);
    server.requestTimeout = 0;
    server.headersTimeout = 0;
    server.timeout = 0;
    return server;
  };
}

http.createServer = allowLongRequests(http.createServer);
https.createServer = allowLongRequests(https.createServer);

try {
  const { Agent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(new Agent({
    headersTimeout: 50 * 60_000,
    bodyTimeout: 50 * 60_000,
    connectTimeout: 30_000,
  }));
} catch {
  // В образе может не быть undici; серверные таймауты Node уже сняты.
}

await import("./migrate.mjs");
await import("../server.js");
