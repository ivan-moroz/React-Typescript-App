import { renderToStaticMarkup } from "react-dom/server";
import type { IncomingMessage } from "node:http";
import ServerNavigation from "../features/navigation/ServerNavigation";
import { unreadCount } from "./messaging";
import { getSessionUser } from "./session";

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
  return { pathname, from, user: user ? { name: user.name } : null, unreadCount: count };
}

export async function renderServerNavigation(req: IncomingMessage, asPath: string) {
  const props = await getServerNavigationProps(req, asPath);
  return renderToStaticMarkup(<ServerNavigation {...props} />);
}
