import { Suspense } from "react";
import { cookies } from "next/headers";
import HomePage from "../features/home/ui/Home";
import { adminUser } from "../constants/admin";
import { getSessionUserWithEmailFromCookie } from "../server/auth/session";
import RouteLoading from "./loading/RouteLoading";

async function HomeContent() {
  const cookieStore = await cookies();
  const sessionUser = await getSessionUserWithEmailFromCookie(
    cookieStore.toString(),
  );
  const showPeople =
    sessionUser?.email.trim().toLowerCase() === adminUser;

  return <HomePage showPeople={showPeople} />;
}

export default function HomeRoute() {
  return (
    <Suspense fallback={<RouteLoading label="Loading home page…" />}>
      <HomeContent />
    </Suspense>
  );
}
