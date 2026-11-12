import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import UsersPage from "../../features/users/ui/UsersPage";
import { loadUsersPage } from "../../features/users/server/loadUsersPage";
import RouteLoading from "../loading/RouteLoading";
import { getSessionUserWithEmailFromCookie } from "../../server/auth/session";
import { canAccessPeople } from "../../server/access/userAccess";
import "../../features/users/styles/users.scss";
import "../../features/users/styles/users.scss";

export const dynamic = "force-dynamic";

async function UsersContent() {
  const cookieStore = await cookies();
  const sessionUser = await getSessionUserWithEmailFromCookie(
    cookieStore.toString(),
  );
  if (!(await canAccessPeople(sessionUser?.email))) notFound();
  const props = await loadUsersPage();
  return <UsersPage {...props} />;
}

export default function UsersRoute() {
  return <Suspense fallback={<RouteLoading label="Loading people…" />}><UsersContent /></Suspense>;
}
