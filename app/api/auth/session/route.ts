import { runApiHandler } from "../../../../server/api/runApiHandler";
import handler from "../../../../server/api/auth/session";

export const GET = (request: Request) => runApiHandler(request, handler);
