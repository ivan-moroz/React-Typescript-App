import { runApiHandler } from "../../../../server/api/runApiHandler";
import handler from "../../../../server/api/messaging/[[...route]]";

type RouteContext = { params: Promise<{ route?: string[] }> };

async function dispatch(request: Request, context: RouteContext) {
  return runApiHandler(request, handler, await context.params, 16 * 1024);
}

export const GET = dispatch;
export const POST = dispatch;
export const DELETE = dispatch;
