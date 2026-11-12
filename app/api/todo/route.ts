import { runApiHandler } from "../../../server/api/runApiHandler";
import handler from "../../../server/api/todo";

export const GET = (request: Request) => runApiHandler(request, handler);
export const POST = (request: Request) => runApiHandler(request, handler);
export const DELETE = (request: Request) => runApiHandler(request, handler);
