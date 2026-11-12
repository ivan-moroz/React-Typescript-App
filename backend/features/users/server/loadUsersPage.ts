import { ERROR_MESSAGES } from "../../../constants/errors";
import prisma from "../../../server/db/prisma";
import type { User } from "../model/types";

export async function loadUsersPage(): Promise<{ initialUsers: User[]; initialError?: string }> {
  try {
    const initialUsers = await prisma.user.findMany({
      orderBy: [{ position: "asc" }, { id: "asc" }],
      take: 10,
      select: { id: true, name: true, email: true, age: true, city: true },
    });
    return { initialUsers };
  } catch {
    return { initialUsers: [], initialError: ERROR_MESSAGES.USERS_LOAD_FAILED };
  }
}
