import { ERROR_MESSAGES } from "../../../src/constants/errors";
import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "../../lib/session";
import prisma from "../../lib/prisma";

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

type ErrorResponse = { message: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Todo[] | Todo | ErrorResponse>,
) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET" && req.method !== "POST" && req.method !== "DELETE") {
    res.setHeader("Allow", "GET, POST, DELETE");
    res.status(405).json({ message: ERROR_MESSAGES.METHOD_NOT_ALLOWED });
    return;
  }

  try {
    const user = await getSessionUser(req);
    if (!user) {
      res.status(401).json({ message: ERROR_MESSAGES.UNAUTHORIZED });
      return;
    }

    if (req.method === "GET") {
      const todos = await prisma.todo.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, text: true, completed: true },
      });
      res.status(200).json(todos);
      return;
    }

    if (req.headers.origin) {
      let validOrigin = false;
      try {
        validOrigin = new URL(req.headers.origin).host === req.headers.host;
      } catch {
        validOrigin = false;
      }
      if (!validOrigin) {
        res.status(403).json({ message: ERROR_MESSAGES.FORBIDDEN });
        return;
      }
    }

    if (req.method === "DELETE") {
      const idValue = req.query.id;
      const id = typeof idValue === "string" ? Number(idValue) : NaN;
      if (!Number.isSafeInteger(id) || id < 1) {
        res.status(400).json({ message: ERROR_MESSAGES.INVALID_PAYLOAD });
        return;
      }

      const result = await prisma.todo.deleteMany({
        where: { id, userId: user.id },
      });
      if (result.count === 0) {
        res.status(404).json({ message: ERROR_MESSAGES.NOT_FOUND });
        return;
      }
      res.status(204).end();
      return;
    }

    const text = req.body?.text;
    if (typeof text !== "string" || !text.trim() || text.trim().length > 500) {
      res.status(400).json({ message: ERROR_MESSAGES.TODO_TEXT_INVALID });
      return;
    }

    const todo = await prisma.todo.create({
      data: { text: text.trim(), userId: user.id },
      select: { id: true, text: true, completed: true },
    });
    res.status(201).json(todo);
  } catch {
    res.status(500).json({ message: ERROR_MESSAGES.TODO_REQUEST_FAILED });
  }
}
