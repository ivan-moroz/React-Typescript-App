import { runApiHandler } from "../../../../../server/api/runApiHandler";
import handler from "../../../../../server/api/assets/[id]/file";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  return runApiHandler(request, handler, await context.params);
}

export async function OPTIONS(request: Request, context: RouteContext) {
  return runApiHandler(request, handler, await context.params);
}
