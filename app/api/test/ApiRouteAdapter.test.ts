import type { NextApiHandler } from "next";
import { ERROR_MESSAGES } from "../../../constants/errors";
import { runApiHandler } from "../../../server/api/runApiHandler";

test("adapts App Router requests and dynamic parameters for API logic", async () => {
  const handler: NextApiHandler = (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.status(201).json({
      id: req.query.id,
      limit: req.query.limit,
      body: req.body,
      cookie: req.headers.cookie,
    });
  };
  const request = new Request("http://localhost/api/users/7?limit=2", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "app_session=token",
    },
    body: JSON.stringify({ name: "Ada" }),
  });

  const response = await runApiHandler(request, handler, { id: "7" });

  expect(response.status).toBe(201);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  await expect(response.json()).resolves.toEqual({
    id: "7",
    limit: "2",
    body: { name: "Ada" },
    cookie: "app_session=token",
  });
});

test("returns a client error for malformed JSON", async () => {
  const handler: NextApiHandler = () => {
    throw new Error("The handler should not run");
  };

  const response = await runApiHandler(
    new Request("http://localhost/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    }),
    handler,
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({
    message: ERROR_MESSAGES.REQUEST_BODY_INVALID,
  });
});

test("enforces route-specific JSON body size limits", async () => {
  const handler: NextApiHandler = () => {
    throw new Error("The handler should not run");
  };
  const response = await runApiHandler(
    new Request("http://localhost/api/messaging", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "x".repeat(100) }),
    }),
    handler,
    {},
    32,
  );

  expect(response.status).toBe(413);
  await expect(response.json()).resolves.toEqual({
    message: ERROR_MESSAGES.REQUEST_BODY_TOO_LARGE,
  });
});

test("passes raw request bodies through as an async byte stream", async () => {
  const handler: NextApiHandler = async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    res.status(200).send(Buffer.concat(chunks));
  };

  const response = await runApiHandler(
    new Request("http://localhost/api/assets/7/file", {
      method: "PUT",
      headers: { "content-type": "application/octet-stream" },
      body: "binary data",
    }),
    handler,
  );

  expect(await response.text()).toBe("binary data");
});
