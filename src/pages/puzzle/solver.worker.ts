import { ERROR_MESSAGES } from "../../constants/errors";
import { longestSequence } from "./solver";

self.onmessage = (event: MessageEvent<string[]>) => {
  try {
    self.postMessage({ sequence: longestSequence(event.data) });
  } catch {
    self.postMessage({ error: ERROR_MESSAGES.PUZZLE_WORKER_FAILED });
  }
};
