import type { NextApiRequest, NextApiResponse } from "next";
import handler from "../pages/api/users";

const db = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../lib/prisma", () => ({ default: db }));

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

beforeEach(() => {
  vi.resetAllMocks();
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
