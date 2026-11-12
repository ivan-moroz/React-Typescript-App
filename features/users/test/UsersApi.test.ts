import type { NextApiRequest, NextApiResponse } from "next";
import handler from "../../../server/api/users";
import { getSessionUserWithEmail } from "../../../server/auth/session";
import { adminUser } from "../../../constants/admin";
import listUserHandler from "../../../server/api/users/[id]";
import reorderUsersHandler from "../../../server/api/users/reorder";

const db = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../../../server/db/prisma", () => ({ default: db }));
vi.mock("../../../server/auth/session", () => ({ getSessionUserWithEmail: vi.fn() }));

async function request(method: string, body?: unknown) {
  const req = {
    method,
    body,
    query: {},
    headers: {},
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

async function requestIdRoute(method: string, id: string, body?: unknown) {
  const req = {
    method,
    body,
    query: { id },
    headers: {},
  } as unknown as NextApiRequest;
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  };
  res.status.mockReturnValue(res);
  await listUserHandler(req, res as unknown as NextApiResponse);
  return res;
}

async function requestReorder(body: unknown) {
  const req = {
    method: "PUT",
    body,
    query: {},
    headers: {},
  } as unknown as NextApiRequest;
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  };
  res.status.mockReturnValue(res);
  await reorderUsersHandler(req, res as unknown as NextApiResponse);
  return res;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSessionUserWithEmail).mockResolvedValue(null);
});

test("hides user listing from non-admin accounts after setup", async () => {
  db.user.count.mockResolvedValue(1);
  const res = await request("GET");

  expect(res.status).toHaveBeenCalledWith(404);
  expect(db.user.findMany).not.toHaveBeenCalled();
});

test("allows listing users before the first account is registered", async () => {
  db.user.count.mockResolvedValue(0);
  db.user.findMany.mockResolvedValue([]);
  const res = await request("GET");

  expect(res.status).toHaveBeenCalledWith(200);
  expect(db.user.findMany).toHaveBeenCalledOnce();
});

test("allows the configured admin to manage users after setup", async () => {
  vi.mocked(getSessionUserWithEmail).mockResolvedValue({
    id: 1,
    name: "Admin",
    email: adminUser,
  });
  db.user.findMany.mockResolvedValue([]);

  const res = await request("GET");

  expect(res.status).toHaveBeenCalledWith(200);
  expect(db.user.count).not.toHaveBeenCalled();
});

test.each([
  () => requestIdRoute("GET", "1"),
  () => requestIdRoute("DELETE", "1"),
  () => requestIdRoute("PUT", "1", {
    name: "Changed",
    email: "changed@example.com",
    age: 30,
    city: "Kyiv",
  }),
  () => requestReorder({ userIds: [1] }),
])("hides user management API from non-admin accounts", async (makeRequest) => {
  db.user.count.mockResolvedValue(2);
  const res = await makeRequest();

  expect(res.status).toHaveBeenCalledWith(404);
  expect(db.user.findMany).not.toHaveBeenCalled();
  expect(db.user.findFirst).not.toHaveBeenCalled();
  expect(db.user.create).not.toHaveBeenCalled();
});

test("creates a user with a hashed password and never returns the hash", async () => {
  db.user.findFirst.mockResolvedValue({ position: 2 });
  db.user.create.mockImplementation(async ({ data }) => ({
    id: 8,
    name: data.name,
    email: data.email,
    age: data.age,
    city: data.city,
  }));
  const res = await request("POST", {
    name: "Alex",
    email: "alex@example.com",
    age: 30,
    city: "Kyiv",
    password: "safe password",
  });

  expect(db.user.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        name: "Alex",
        email: "alex@example.com",
        age: 30,
        city: "Kyiv",
        position: 3,
      }),
      select: { id: true, name: true, email: true, age: true, city: true },
    }),
  );
  const createData = db.user.create.mock.calls[0][0].data;
  expect(createData.passwordHash).not.toBe("safe password");
  expect(createData.passwordHash).toBeTruthy();
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith([
    { id: 8, name: "Alex", email: "alex@example.com", age: 30, city: "Kyiv" },
  ]);
});

test.each([
  { name: "Alex", email: "alex@example.com", age: 30, city: "Kyiv" },
  { name: "Alex", email: "alex@example.com", age: 30, city: "Kyiv", password: "" },
])("rejects incomplete registration payloads", async (body) => {
  const res = await request("POST", body);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(db.user.create).not.toHaveBeenCalled();
});
