import type { IncomingMessage } from "node:http";
import prisma from "../db/prisma";
import { adminUser } from "../../constants/admin";
import { getSessionUserWithEmail } from "../auth/session";

export async function canAccessPeople(email?: string | null): Promise<boolean> {
  if (email?.trim().toLowerCase() === adminUser) return true;
  return (await prisma.user.count()) === 0;
}

export async function canRequestPeopleAccess(
  request: IncomingMessage,
): Promise<boolean> {
  const user = await getSessionUserWithEmail(request);
  return canAccessPeople(user?.email);
}
