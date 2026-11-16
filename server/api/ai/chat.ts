import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "../../auth/session";
import {
  generateAssistantMessage,
  LlmServiceUnavailableError,
  type ChatMessage,
} from "../../ai/llmProvider";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_TOTAL_LENGTH = 24_000;
const SERVICE_UNAVAILABLE =
  "Local AI service is unavailable. Make sure Ollama is running and try again.";

function validMessages(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
    return false;
  }

  let totalLength = 0;
  for (const message of value) {
    if (
      typeof message !== "object" ||
      message === null ||
      Object.keys(message).length !== 2 ||
      !("role" in message) ||
      !("content" in message) ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" ||
      !message.content.trim() ||
      message.content.length > MAX_MESSAGE_LENGTH
    ) {
      return false;
    }
    totalLength += message.content.length;
    if (totalLength > MAX_TOTAL_LENGTH) return false;
  }
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ message: string }>,
) {
  res.setHeader("Cache-Control", "private, no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const user = await getSessionUser(req);
    if (!user) {
      res.status(401).json({ message: "Please log in to continue." });
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
        res.status(403).json({ message: "This request origin is not allowed." });
        return;
      }
    }

    if (
      typeof req.body !== "object" ||
      req.body === null ||
      Object.keys(req.body).length !== 1 ||
      !("messages" in req.body) ||
      !validMessages(req.body.messages)
    ) {
      res.status(400).json({ message: "Invalid chat messages." });
      return;
    }

    const message = await generateAssistantMessage(req.body.messages);
    res.status(200).json({ message });
  } catch (error) {
    if (error instanceof LlmServiceUnavailableError) {
      res.status(503).json({ message: SERVICE_UNAVAILABLE });
      return;
    }
    res.status(500).json({ message: "Unable to complete the AI chat request." });
  }
}
