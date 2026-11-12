import { unreadCount } from "../messaging/server/messaging";
import { getSessionUserWithEmailFromCookie } from "../../server/auth/session";
import { canAccessPeople } from "../../server/access/userAccess";

export async function getServerNavigationProps(cookieHeader: string | undefined, asPath: string) {
  const pathname = asPath.split(/[?#]/, 1)[0] || "/";
  const from = asPath.startsWith("/") && !asPath.startsWith("//") ? asPath : "/";
  let user: { id: number; name: string } | null = null;
  let email: string | undefined;
  let canViewPeople = false;
  let count = 0;
  if (cookieHeader) {
    try {
      const sessionUser = await getSessionUserWithEmailFromCookie(cookieHeader);
      user = sessionUser ? { id: sessionUser.id, name: sessionUser.name } : null;
      email = sessionUser?.email;
    } catch {
      user = null;
    }
  }
  try {
    canViewPeople = await canAccessPeople(email);
  } catch {
    canViewPeople = false;
  }
  if (user) {
    try {
      count = await unreadCount(user.id);
    } catch {
      count = 0;
    }
  }
  return {
    pathname,
    from,
    user: user ? { id: user.id, name: user.name } : null,
    unreadCount: count,
    canViewPeople,
  };
}
