import { runApiHandler } from "../../../../server/api/runApiHandler";
import handler from "../../../../server/api/users/reorder";

export const PUT = (request: Request) => runApiHandler(request, handler);
export const OPTIONS = (request: Request) => runApiHandler(request, handler);
