export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "qwen2.5:3b";
const MAX_REPLY_LENGTH = 20_000;

export class LlmServiceUnavailableError extends Error {
  constructor() {
    super("The local AI service is unavailable.");
    this.name = "LlmServiceUnavailableError";
  }
}

function ollamaConfiguration() {
  const configuredBaseUrl = process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const model = process.env.OLLAMA_MODEL?.trim() || DEFAULT_MODEL;

  try {
    const url = new URL(configuredBaseUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Unsupported Ollama URL protocol");
    }
    return { baseUrl: url.toString().replace(/\/+$/, ""), model };
  } catch {
    throw new LlmServiceUnavailableError();
  }
}

export async function generateAssistantMessage(
  messages: ChatMessage[],
): Promise<string> {
  const { baseUrl, model } = ollamaConfiguration();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: { num_predict: 1024 },
      }),
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
    if (!response.ok) throw new LlmServiceUnavailableError();

    const payload: unknown = await response.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("message" in payload) ||
      typeof payload.message !== "object" ||
      payload.message === null ||
      !("content" in payload.message) ||
      typeof payload.message.content !== "string" ||
      !payload.message.content.trim() ||
      payload.message.content.length > MAX_REPLY_LENGTH
    ) {
      throw new LlmServiceUnavailableError();
    }
    return payload.message.content.trim();
  } catch {
    throw new LlmServiceUnavailableError();
  }
}
