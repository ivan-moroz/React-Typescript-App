import { runApiHandler } from "../../../../server/api/runApiHandler";
import handler from "../../../../server/api/auth/register";

export const POST = (request: Request) => runApiHandler(request, handler);
