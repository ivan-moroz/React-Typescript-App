import { createServer } from "node:http";
import next from "next";
import { WebSocket, WebSocketServer } from "ws";

const dev = process.argv.includes("--dev");
const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? "0.0.0.0";
const app = next({ dev, dir: "backend", hostname, port, turbopack: dev });
await app.prepare();

const handle = app.getRequestHandler();
const handleUpgrade = app.getUpgradeHandler();
const server = createServer((request, response) => void handle(request, response));
const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 1024 });
const userSockets = new Map();

globalThis.publishMessagingUpdate = (userIds, update) => {
  const payload = JSON.stringify(update);
  for (const userId of new Set(userIds)) {
    for (const client of userSockets.get(userId) ?? []) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }
};

function rejectUpgrade(socket, status = 400, message = "Bad Request") {
  socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

server.on("upgrade", async (request, socket, head) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname !== "/api/messaging/socket") {
    handleUpgrade(request, socket, head);
    return;
  }

  let originHost;
  try {
    originHost = new URL(request.headers.origin ?? "").host;
  } catch {
    rejectUpgrade(socket, 403, "Forbidden");
    return;
  }
  if (originHost !== request.headers.host) {
    rejectUpgrade(socket, 403, "Forbidden");
    return;
  }

  try {
    const session = await fetch(`http://127.0.0.1:${port}/api/auth/session`, {
      headers: request.headers.cookie
        ? { cookie: request.headers.cookie }
        : {},
    });
    if (!session.ok) {
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }
    const user = await session.json();
    if (!user || !Number.isSafeInteger(user.id) || user.id < 1) {
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }
    if (socket.destroyed) return;

    websocketServer.handleUpgrade(request, socket, head, (client) => {
      client.userId = user.id;
      const clients = userSockets.get(user.id) ?? new Set();
      clients.add(client);
      userSockets.set(user.id, clients);
      websocketServer.emit("connection", client, request);
    });
  } catch (error) {
    console.error("Could not authenticate messaging WebSocket.", error);
    rejectUpgrade(socket, 503, "Service Unavailable");
  }
});

websocketServer.on("connection", (client) => {
  client.isAlive = true;
  client.on("pong", () => {
    client.isAlive = true;
  });
  client.on("error", (error) => {
    console.error("Messaging WebSocket error.", error);
  });
  client.on("message", () => {
    client.close(1008, "Messaging WebSocket is read-only.");
  });
  client.on("close", () => {
    const clients = userSockets.get(client.userId);
    clients?.delete(client);
    if (clients?.size === 0) userSockets.delete(client.userId);
  });
});

const heartbeat = setInterval(() => {
  for (const client of websocketServer.clients) {
    if (!client.isAlive) {
      client.terminate();
      continue;
    }
    client.isAlive = false;
    client.ping();
  }
}, 30000);

server.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});

function shutdown() {
  clearInterval(heartbeat);
  for (const client of websocketServer.clients) client.close(1001, "Server shutting down.");
  websocketServer.close();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
