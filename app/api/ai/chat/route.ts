import { runApiHandler } from "../../../../server/api/runApiHandler";
import handler from "../../../../server/api/ai/chat";

export async function POST(request: Request) {
  const response = await runApiHandler(request, handler, {}, 32 * 1024);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
