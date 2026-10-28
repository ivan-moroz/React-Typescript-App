import type { NextApiRequest, NextApiResponse } from "next";
import handler from "../pages/api/todo";
import { getSessionUser } from "../lib/session";

const db = vi.hoisted(() => ({
  todo: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock("../lib/prisma", () => ({ default: db }));
vi.mock("../lib/session", () => ({ getSessionUser: vi.fn() }));

async function request(method = "GET", body?: unknown, query: Record<string, unknown> = {}) {
  const req = {
    method,
    body,
    query,
    headers: { host: "localhost:3001", origin: "http://localhost:3001" },
  } as unknown as NextApiRequest;
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  };
  res.status.mockReturnValue(res);
  await handler(req, res as unknown as NextApiResponse);
  return res;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSessionUser).mockResolvedValue({ id: 7, name: "Jane" });
});

test("lists only the authenticated user's todos", async () => {
  db.todo.findMany.mockResolvedValue([
    { id: 3, text: "Persisted task", completed: false },
  ]);
  const res = await request();
  expect(db.todo.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { userId: 7 } }),
  );
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith([
    { id: 3, text: "Persisted task", completed: false },
  ]);
});

test("saves a new todo for the authenticated user", async () => {
  db.todo.create.mockResolvedValue({
    id: 4,
    text: "New task",
    completed: false,
  });
  const res = await request("POST", { text: " New task " });
  expect(db.todo.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: { text: "New task", userId: 7 },
    }),
  );
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith({
    id: 4,
    text: "New task",
    completed: false,
  });
});

test("rejects anonymous todo access", async () => {
  vi.mocked(getSessionUser).mockResolvedValue(null);
  const res = await request("POST", { text: "Task" });
  expect(res.status).toHaveBeenCalledWith(401);
  expect(db.todo.create).not.toHaveBeenCalled();
});

test("deletes only a todo owned by the authenticated user", async () => {
  db.todo.deleteMany.mockResolvedValue({ count: 1 });
  const res = await request("DELETE", undefined, { id: "4" });
  expect(db.todo.deleteMany).toHaveBeenCalledWith({
    where: { id: 4, userId: 7 },
  });
  expect(res.status).toHaveBeenCalledWith(204);
  expect(res.end).toHaveBeenCalled();
});

test("returns not found when the todo does not belong to the user", async () => {
  db.todo.deleteMany.mockResolvedValue({ count: 0 });
  const res = await request("DELETE", undefined, { id: "4" });
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.end).not.toHaveBeenCalled();
});

test("rejects invalid todo ids", async () => {
  const res = await request("DELETE", undefined, { id: "0" });
  expect(res.status).toHaveBeenCalledWith(400);
  expect(db.todo.deleteMany).not.toHaveBeenCalled();
});

test.each(["", "  ", "x".repeat(501), 123])(
  "rejects invalid todo text",
  async (text) => {
    const res = await request("POST", { text });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.todo.create).not.toHaveBeenCalled();
  },
);
