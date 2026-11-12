import { adminUser } from "../constants/admin";
import prisma from "../server/db/prisma";
import { canAccessPeople } from "../server/access/userAccess";

vi.mock("../server/db/prisma", () => ({
  default: { user: { count: vi.fn() } },
}));

beforeEach(() => vi.clearAllMocks());

test("allows the configured admin email regardless of user count", async () => {
  expect(await canAccessPeople(adminUser)).toBe(true);
  expect(await canAccessPeople(` ${adminUser.toUpperCase()} `)).toBe(true);
  expect(prisma.user.count).not.toHaveBeenCalled();
});

test("allows People when the database has no users", async () => {
  vi.mocked(prisma.user.count).mockResolvedValue(0);

  expect(await canAccessPeople(null)).toBe(true);
  expect(prisma.user.count).toHaveBeenCalledOnce();
});

test("denies non-admin users after the first account exists", async () => {
  vi.mocked(prisma.user.count).mockResolvedValue(1);

  expect(await canAccessPeople("ordinary@example.com")).toBe(false);
});
