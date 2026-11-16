import type { NextApiRequest, NextApiResponse } from "next";
import handler from "./chat";
import { getSessionUser } from "../../auth/session";
import { generateAssistantMessage } from "../../ai/llmProvider";

vi.mock("../../auth/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("../../ai/llmProvider", async () => {
  const actual = await vi.importActual<typeof import("../../ai/llmProvider")>(
    "../../ai/llmProvider",
  );
  return {
    ...actual,
    generateAssistantMessage: vi.fn(),
  };
});

async function request(
  body: unknown,
  options: { user?: { id: number; name: string } | null; origin?: string } = {},
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
  if ("user" in options) {
    vi.mocked(getSessionUser).mockResolvedValue(options.user ?? null);
  } else {
    vi.mocked(getSessionUser).mockResolvedValue({ id: 7, name: "Ada" });
  }
  await handler(req, res as unknown as NextApiResponse<{ message: string }>);
  return res;
}

beforeEach(() => {
  vi.resetAllMocks();
});

test("requires a validated session before processing a chat", async () => {
  const res = await request(
    { messages: [{ role: "user", content: "Hi" }] },
    { user: null },
  );
  expect(res.status).toHaveBeenCalledWith(401);
  expect(generateAssistantMessage).not.toHaveBeenCalled();
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

test("passes validated messages to Ollama and returns the assistant response", async () => {
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

test("returns a clear service unavailable response when Ollama is offline", async () => {
  const { LlmServiceUnavailableError } = await import("../../ai/llmProvider");
  vi.mocked(generateAssistantMessage).mockRejectedValue(
    new LlmServiceUnavailableError(),
  );
  const res = await request({ messages: [{ role: "user", content: "Hi" }] });

  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith({
    message:
      "Local AI service is unavailable. Make sure Ollama is running and try again.",
  });
});
