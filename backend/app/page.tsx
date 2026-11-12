import { cookies } from "next/headers";
import HomePage from "../features/home/ui/Home";
import { adminUser } from "../constants/admin";
import { getSessionUserWithEmailFromCookie } from "../server/auth/session";

export default async function HomeRoute() {
  const cookieStore = await cookies();
  const sessionUser = await getSessionUserWithEmailFromCookie(
    cookieStore.toString(),
  );
  const showPeople =
    sessionUser?.email.trim().toLowerCase() === adminUser;

  return <HomePage showPeople={showPeople} />;
}
