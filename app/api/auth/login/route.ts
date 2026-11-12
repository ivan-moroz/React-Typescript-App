import { runApiHandler } from "../../../../server/api/runApiHandler";
import handler from "../../../../server/api/auth/login";

export const POST = (request: Request) => runApiHandler(request, handler);
export const OPTIONS = (request: Request) => runApiHandler(request, handler);
