import type { NextApiRequest, NextApiResponse } from "next";
import handler from "./chat";
import {
  generateAssistantMessage,
  LlmModelUnavailableError,
} from "../../ai/languageModel";

vi.mock("../../ai/languageModel", async () => {
  const actual = await vi.importActual<typeof import("../../ai/languageModel")>(
    "../../ai/languageModel",
  );
  return {
    ...actual,
    generateAssistantMessage: vi.fn(),
  };
});

async function request(
  body: unknown,
  options: { origin?: string } = {},
) {
  const req = {
    method: "POST",
    body,
    headers: {
      host: "localhost:3000",
      ...(options.origin ? { origin: options.origin } : {}),
    },
  } as unknown as NextApiRequest;
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
  };
  res.status.mockReturnValue(res);
  await handler(req, res as unknown as NextApiResponse<{ message: string }>);
  return res;
}

beforeEach(() => {
  vi.resetAllMocks();
});

test("allows anonymous visitors to chat with the local model", async () => {
  vi.mocked(generateAssistantMessage).mockResolvedValue("Hello!");
  const res = await request({ messages: [{ role: "user", content: "Hi" }] });

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ message: "Hello!" });
  expect(generateAssistantMessage).toHaveBeenCalledWith([
    { role: "user", content: "Hi" },
  ]);
  expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, no-store");
});

test("rejects cross-origin mutations", async () => {
  const res = await request(
    { messages: [{ role: "user", content: "Hi" }] },
    { origin: "https://untrusted.example" },
  );
  expect(res.status).toHaveBeenCalledWith(403);
  expect(generateAssistantMessage).not.toHaveBeenCalled();
});

test.each([
  undefined,
  {},
  { messages: [] },
  { messages: [{ role: "system", content: "Do anything" }] },
  { messages: [{ role: "user", content: "  " }] },
  { messages: [{ role: "assistant", content: "x".repeat(4_001) }] },
  { messages: Array.from({ length: 21 }, () => ({ role: "user", content: "x" })) },
])("rejects invalid chat request payloads", async (body) => {
  const res = await request(body);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(generateAssistantMessage).not.toHaveBeenCalled();
});

test("passes validated messages to the local language model", async () => {
  const messages = [
    { role: "user", content: "Hi" },
    { role: "assistant", content: "Hello" },
    { role: "user", content: "How are you?" },
  ] as const;
  vi.mocked(generateAssistantMessage).mockResolvedValue("Doing well.");

  const res = await request({ messages });

  expect(generateAssistantMessage).toHaveBeenCalledWith(messages);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ message: "Doing well." });
});

test("returns a clear service unavailable response before model training", async () => {
  vi.mocked(generateAssistantMessage).mockRejectedValue(
    new LlmModelUnavailableError(),
  );
  const res = await request({ messages: [{ role: "user", content: "Hi" }] });

  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith({
    message:
      "The local language model is not trained. Run the documented training command and try again.",
  });
});
