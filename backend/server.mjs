import { createServer } from "node:http";
import { EventEmitter } from "node:events";
import dotenv from "dotenv";
import nextEnv from "@next/env";
import next from "next";
import { Client } from "pg";
import { WebSocket, WebSocketServer } from "ws";

const envConfig = nextEnv.loadEnvConfig(process.cwd());
function hasDatabasePassword(connectionString) {
  if (typeof connectionString !== "string" || !connectionString) return false;
  try {
    return new URL(connectionString).password.length > 0;
  } catch {
    return false;
  }
}

if (!hasDatabasePassword(process.env.DATABASE_URL)) {
  const fileDatabaseUrl = envConfig.loadedEnvFiles
    .map((file) => dotenv.parse(file.contents).DATABASE_URL)
    .find(hasDatabasePassword);
  if (fileDatabaseUrl) {
    console.warn("[config] DATABASE_URL from the process environment has no password; using the valid project .env value.");
    process.env.DATABASE_URL = fileDatabaseUrl;
  } else {
    throw new Error("DATABASE_URL must be set to a PostgreSQL URL with a password. Check the project .env file or environment.");
  }
}
const databaseUrl = process.env.DATABASE_URL;

const dev = process.argv.includes("--dev");
const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? "0.0.0.0";
// Next attaches its own upgrade listener from getRequestHandler(). Keep that
// listener off the real server so it cannot race the authenticated messaging
// WebSocket handler below. Non-messaging upgrades are delegated explicitly.
const nextUpgradeEvents = new EventEmitter();
const app = next({ dev, dir: "backend", hostname, port, turbopack: dev, httpServer: nextUpgradeEvents });
await app.prepare();

const handle = app.getRequestHandler();
const handleUpgrade = app.getUpgradeHandler();
const server = createServer((request, response) => void handle(request, response));
const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 1024 });
const userSockets = new Map();
const pendingMessageUpdates = new Map();
const MAX_PENDING_MESSAGE_UPDATES = 200;
const WEBSOCKET_HEARTBEAT_INTERVAL_MS = 5000;

function queueMessageUpdate(userId, update) {
  if (update.kind !== "message-sent" || !update.message) return;
  const pending = pendingMessageUpdates.get(userId) ?? [];
  if (!pending.some((event) => event.message?.id === update.message.id)) {
    pending.push(update);
    if (pending.length > MAX_PENDING_MESSAGE_UPDATES) pending.shift();
    pendingMessageUpdates.set(userId, pending);
  }
}

function publishMessagingUpdate(userIds, update) {
  const payload = JSON.stringify(update);
  for (const userId of new Set(userIds)) {
    const clients = [...(userSockets.get(userId) ?? [])].filter(
      (client) => client.readyState === WebSocket.OPEN,
    );
    if (clients.length === 0) {
      queueMessageUpdate(userId, update);
      continue;
    }
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload, (error) => {
            if (error) {
              queueMessageUpdate(userId, update);
              console.error(`[messaging-ws] send failed user=${userId}; queued message`, error);
            }
          });
        } catch (error) {
          queueMessageUpdate(userId, update);
          console.error(`[messaging-ws] send threw user=${userId}; queued message`, error);
        }
      }
    }
  }
}

// Install after app.prepare(): Next.js dev preparation can replace globals.
// API routes in this Node process then publish directly without waiting for
// PostgreSQL LISTEN; separate workers still fall back to the PG notification.
globalThis.publishMessagingUpdate = (userIds, update) => {
  publishMessagingUpdate(userIds, update);
};

let notificationClient;
let notificationRetryTimer;
let notificationRetryAttempt = 0;
let stopping = false;
let notificationListenerConnected = false;

function scheduleNotificationReconnect() {
  if (stopping || notificationRetryTimer) return;
  const delay = Math.min(500 * 2 ** notificationRetryAttempt, 10000);
  notificationRetryAttempt += 1;
  console.warn(`[messaging-ws] PostgreSQL LISTEN reconnecting in ${delay}ms`);
  notificationRetryTimer = setTimeout(() => {
    notificationRetryTimer = undefined;
    void connectNotificationClient();
  }, delay);
}

async function connectNotificationClient() {
  const client = new Client({ connectionString: databaseUrl });
  notificationClient = client;
  client.on("notification", ({ channel, payload }) => {
    if (channel !== "messaging_updates" || !payload) return;
    try {
      const event = JSON.parse(payload);
      if (
        !Array.isArray(event.userIds) ||
        !event.userIds.every((userId) => Number.isSafeInteger(userId) && userId > 0) ||
        !event.update || event.update.type !== "update" ||
        typeof event.update.conversationId !== "string" ||
        typeof event.update.actorId !== "number" ||
        typeof event.update.kind !== "string"
      ) {
        console.error("[messaging-ws] ignored invalid PostgreSQL notification");
        return;
      }
      publishMessagingUpdate(event.userIds, event.update);
    } catch (error) {
      console.error("[messaging-ws] could not parse PostgreSQL notification", error);
    }
  });
  client.on("error", (error) => {
    console.error("[messaging-ws] PostgreSQL notification connection error", error);
    if (notificationClient === client) {
      notificationClient = undefined;
      scheduleNotificationReconnect();
    }
  });
  client.on("end", () => {
    if (!stopping && notificationClient === client) {
      notificationClient = undefined;
      scheduleNotificationReconnect();
    }
  });

  try {
    await client.connect();
    await client.query("LISTEN messaging_updates");
    if (stopping || notificationClient !== client) {
      await client.end().catch(() => {});
      return;
    }
    notificationRetryAttempt = 0;
    if (notificationListenerConnected) {
      const resync = JSON.stringify({ type: "resync" });
      for (const socket of websocketServer.clients) {
        if (socket.readyState === WebSocket.OPEN) socket.send(resync);
      }
    }
    notificationListenerConnected = true;
  } catch (error) {
    console.error("[messaging-ws] PostgreSQL LISTEN setup failed", error);
    if (notificationClient === client) notificationClient = undefined;
    await client.end().catch(() => {});
    scheduleNotificationReconnect();
  }
}

await connectNotificationClient();

function rejectUpgrade(socket, status = 400, message = "Bad Request") {
  console.warn(`[messaging-ws] upgrade rejected status=${status} reason=${message}`);
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
    console.warn(`[messaging-ws] origin mismatch originHost=${originHost} host=${request.headers.host ?? ""}`);
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
      console.warn(`[messaging-ws] rejected session status=${session.status}`);
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }
    const user = await session.json();
    if (!user || !Number.isSafeInteger(user.id) || user.id < 1) {
      console.warn("[messaging-ws] rejected invalid session user");
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }
    if (socket.destroyed) return;

    websocketServer.handleUpgrade(request, socket, head, (client) => {
      client.userId = user.id;
      client.sessionCookie = request.headers.cookie ?? "";
      const clients = userSockets.get(user.id) ?? new Set();
      clients.add(client);
      userSockets.set(user.id, clients);
      const pending = pendingMessageUpdates.get(user.id) ?? [];
      pendingMessageUpdates.delete(user.id);
      for (const update of pending) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(update), (error) => {
            if (error) queueMessageUpdate(user.id, update);
          });
        }
      }
      websocketServer.emit("connection", client, request);
      void syncSocketClient(client, "/api/messaging/conversations")
        .then((inbox) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "sync-inbox", ...inbox }));
          }
        })
        .catch((error) => {
          console.error(`[messaging-ws] inbox sync failed user=${user.id}`, error);
        });
    });
  } catch (error) {
    console.error("Could not authenticate messaging WebSocket.", error);
    rejectUpgrade(socket, 503, "Service Unavailable");
  }
});

async function syncSocketClient(client, request) {
  const headers = client.sessionCookie ? { cookie: client.sessionCookie } : {};
  const url = new URL(request, `http://127.0.0.1:${port}`);
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Messaging sync returned HTTP ${response.status}.`);
  return response.json();
}

websocketServer.on("connection", (client) => {
  client.isAlive = true;
  client.on("pong", () => {
    client.isAlive = true;
  });
  client.on("error", (error) => {
    console.error("Messaging WebSocket error.", error);
  });
  client.on("message", async (raw, isBinary) => {
    if (isBinary || typeof raw.toString !== "function") {
      client.close(1008, "Unsupported messaging WebSocket request.");
      return;
    }
    let request;
    try {
      request = JSON.parse(raw.toString());
    } catch {
      client.close(1008, "Invalid messaging WebSocket request.");
      return;
    }
    try {
      if (request?.type === "sync-unread") {
        const unread = await syncSocketClient(client, "/api/messaging/unread");
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "unread-count",
            unreadCount: unread.unreadCount,
            ...(Number.isSafeInteger(request.requestId) && request.requestId >= 0
              ? { requestId: request.requestId }
              : {}),
          }));
        }
        return;
      }
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (
        request?.type === "sync-messages" &&
        typeof request.conversationId === "string" && uuid.test(request.conversationId) &&
        (request.after === null || (typeof request.after === "string" && uuid.test(request.after))) &&
        (request.from === null || (typeof request.from === "string" && uuid.test(request.from)))
      ) {
        const query = new URLSearchParams();
        if (request.after) query.set("after", request.after);
        if (request.from) query.set("from", request.from);
        const suffix = query.size ? `?${query}` : "";
        const result = await syncSocketClient(
          client,
          `/api/messaging/conversations/${request.conversationId}/messages${suffix}`,
        );
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "sync-messages",
            conversationId: request.conversationId,
            messages: result.messages,
            deletedMessageIds: result.deletedMessageIds,
          }));
        }
        return;
      }
      client.close(1008, "Unsupported messaging WebSocket request.");
    } catch (error) {
      console.error(`[messaging-ws] sync failed user=${client.userId}`, error);
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "sync-error" }));
      }
    }
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
}, WEBSOCKET_HEARTBEAT_INTERVAL_MS);

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(
      `[server] Port ${port} is already in use. This npm run dev instance did not start; stop the existing server process before starting another one.`,
    );
  } else {
    console.error("[server] Could not start the HTTP/WebSocket server.", error);
  }
  stopping = true;
  clearTimeout(notificationRetryTimer);
  clearInterval(heartbeat);
  for (const client of websocketServer.clients) client.terminate();
  websocketServer.close();
  if (notificationClient) void notificationClient.end().finally(() => process.exit(1));
  else process.exit(1);
});

server.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});

function shutdown() {
  stopping = true;
  clearTimeout(notificationRetryTimer);
  clearInterval(heartbeat);
  for (const client of websocketServer.clients) client.close(1001, "Server shutting down.");
  websocketServer.close();
  if (notificationClient) void notificationClient.end();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
