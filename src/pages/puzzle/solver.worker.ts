import { longestSequence } from "./solver";

self.onmessage = (event: MessageEvent<string[]>) => {
  try {
    self.postMessage({ sequence: longestSequence(event.data) });
  } catch {
    self.postMessage({ error: "Could not solve this file. Try a smaller file." });
  }
};
