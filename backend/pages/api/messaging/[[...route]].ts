import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "../../../lib/session";
import {
  createConversation,
  deleteConversation,
  deleteMessage,
  listConversations,
  listMessages,
  markRead,
  searchUsers,
  sendMessage,
  unreadCount,
} from "../../../lib/messaging";
import { ERROR_MESSAGES, HttpError } from "../../../../src/constants/errors";

export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cursor(value: unknown): string | undefined {
  if (value === undefined) return;
  if (typeof value !== "string" || !uuid.test(value))
    throw new HttpError(400, ERROR_MESSAGES.MESSAGING_CURSOR_INVALID);
  return value;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    const user = await getSessionUser(req);
    if (!user) throw new HttpError(401, ERROR_MESSAGES.UNAUTHORIZED);
    if (!["GET", "POST", "DELETE"].includes(req.method ?? '')) {
      res.setHeader("Allow", "GET, POST, DELETE");
      throw new HttpError(405, ERROR_MESSAGES.METHOD_NOT_ALLOWED);
    }
    if (req.method !== "GET" && req.headers.origin) {
      let valid = false;
      try {
        valid = new URL(req.headers.origin).host === req.headers.host;
      } catch {
        /* Reject invalid origins. */
      }
      if (!valid)
        throw new HttpError(403, ERROR_MESSAGES.MESSAGING_ORIGIN_INVALID);
    }
    const route = Array.isArray(req.query.route) ? req.query.route : [];
    if (route.length === 1 && route[0] === "conversations") {
      if (req.method === "GET")
        res
          .status(200)
          .json(await listConversations(user.id, cursor(req.query.cursor)));
      else if (req.method === "POST")
        res
          .status(200)
          .json(await createConversation(user.id, req.body?.userId));
      else throw new HttpError(405, ERROR_MESSAGES.METHOD_NOT_ALLOWED);
      return;
    }
    if (route.length === 1 && route[0] === "unread" && req.method === "GET") {
      res.status(200).json({ unreadCount: await unreadCount(user.id) });
      return;
    }
    if (route.length === 1 && route[0] === "users" && req.method === "GET") {
      const query = req.query.q;
      if (
        typeof query !== "string" ||
        query.trim().length < 2 ||
        query.trim().length > 100
      ) {
        throw new HttpError(400, ERROR_MESSAGES.MESSAGING_SEARCH_INVALID);
      }
      res.status(200).json(await searchUsers(user.id, query.trim()));
      return;
    }
    if (req.method === 'DELETE' && route[0] === 'conversations' && uuid.test(route[1] ?? '')) {
      if (route.length === 2) {
        await deleteConversation(user.id, route[1]);
        res.status(204).end();
        return;
      }
      if (route.length === 4 && route[2] === 'messages' && uuid.test(route[3])) {
        await deleteMessage(user.id, route[1], route[3]);
        res.status(204).end();
        return;
      }
    }
    if (
      route.length === 3 &&
      route[0] === "conversations" &&
      uuid.test(route[1])
    ) {
      if (route[2] === "messages") {
        if (req.method === "POST")
          res
            .status(201)
            .json(await sendMessage(user.id, route[1], req.body?.content));
        else if (req.method === 'GET') {
          const before = cursor(req.query.before),
            after = cursor(req.query.after);
          if (before && after)
            throw new HttpError(400, ERROR_MESSAGES.MESSAGING_CURSOR_INVALID);
          const from = cursor(req.query.from);
          if (from && !after) throw new HttpError(400, ERROR_MESSAGES.MESSAGING_CURSOR_INVALID);
          res
            .status(200)
            .json(await listMessages(user.id, route[1], before, after, from));
        }
        else throw new HttpError(405, ERROR_MESSAGES.METHOD_NOT_ALLOWED);
        return;
      }
      if (route[2] === "read" && req.method === "POST") {
        const messageId = cursor(req.body?.messageId);
        if (!messageId)
          throw new HttpError(400, ERROR_MESSAGES.MESSAGING_CURSOR_INVALID);
        await markRead(user.id, route[1], messageId);
        res.status(204).end();
        return;
      }
    }
    throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
  } catch (error) {
    res.status(error instanceof HttpError ? error.status : 500).json({
      message:
        error instanceof HttpError
          ? error.message
          : ERROR_MESSAGES.MESSAGING_LOAD_FAILED,
    });
  }
}
