import { Suspense } from "react";
import UsersPage from "../../features/users/UsersPage";
import { loadUsersPage } from "../../features/users/server/loadUsersPage";
import { RouteLoading } from "../loading/route-loading";

export const dynamic = "force-dynamic";

async function UsersContent() {
  const props = await loadUsersPage();
  return <UsersPage {...props} />;
}

export default function UsersRoute() {
  return <Suspense fallback={<RouteLoading label="Loading people…" />}><UsersContent /></Suspense>;
}
