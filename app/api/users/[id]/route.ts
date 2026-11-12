import { runApiHandler } from "../../../../server/api/runApiHandler";
import handler from "../../../../server/api/users/[id]";

type RouteContext = { params: Promise<{ id: string }> };

async function dispatch(request: Request, context: RouteContext) {
  return runApiHandler(request, handler, await context.params);
}

export const GET = dispatch;
export const PUT = dispatch;
export const DELETE = dispatch;
export const OPTIONS = dispatch;
