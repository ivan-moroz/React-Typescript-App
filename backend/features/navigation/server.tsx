import type { IncomingMessage } from "node:http";
import ServerNavigation from "./ServerNavigation";
import { unreadCount } from "../messaging/server/messaging";
import { getSessionUser } from "../../lib/session";

export async function getServerNavigationProps(req: IncomingMessage | undefined, asPath: string) {
  const pathname = asPath.split(/[?#]/, 1)[0] || "/";
  const from = asPath.startsWith("/") && !asPath.startsWith("//") ? asPath : "/";
  let user: { id: number; name: string } | null = null;
  let count = 0;
  if (req) {
    try {
      user = await getSessionUser(req);
    } catch {
      user = null;
    }
    if (user) {
      try {
        count = await unreadCount(user.id);
      } catch {
        count = 0;
      }
    }
  }
  return { pathname, from, user: user ? { id: user.id, name: user.name } : null, unreadCount: count };
}
