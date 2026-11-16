import {
  generateAssistantMessage,
  LlmServiceUnavailableError,
  type ChatMessage,
} from "./llmProvider";

const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("sends a non-streaming chat to the configured Ollama endpoint and model", async () => {
  vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.local:11434/");
  vi.stubEnv("OLLAMA_MODEL", "test-model");
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({ message: { content: "  Hello there.  " } }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await expect(generateAssistantMessage(messages)).resolves.toBe("Hello there.");
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock.mock.calls[0][0]).toBe("http://ollama.local:11434/api/chat");
  const options = fetchMock.mock.calls[0][1] as RequestInit;
  expect(options.method).toBe("POST");
  expect(options.cache).toBe("no-store");
  expect(JSON.parse(String(options.body))).toEqual({
    model: "test-model",
    messages,
    stream: false,
    options: { num_predict: 1024 },
  });
});

test("uses the default local Ollama URL and model", async () => {
  vi.stubEnv("OLLAMA_BASE_URL", "");
  vi.stubEnv("OLLAMA_MODEL", "");
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({ message: { content: "Answer" } }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await generateAssistantMessage(messages);
  expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:11434/api/chat");
  expect(JSON.parse(String(fetchMock.mock.calls[0][1].body)).model).toBe(
    "qwen2.5:3b",
  );
});

test.each([
  () => Promise.reject(new TypeError("fetch failed")),
  () => Promise.resolve(new Response(null, { status: 503 })),
  () => Promise.resolve(Response.json({ response: "Unexpected format" })),
  () => Promise.resolve(Response.json({ message: { content: " " } })),
])("normalizes Ollama failures as service unavailable", async (fetchResult) => {
  vi.stubGlobal("fetch", vi.fn(fetchResult));
  await expect(generateAssistantMessage(messages)).rejects.toBeInstanceOf(
    LlmServiceUnavailableError,
  );
});
