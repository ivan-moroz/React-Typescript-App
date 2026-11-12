import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ModalProvider } from "../shared/ui/modal/ModalProvider";
import { adminUser } from "../constants/admin";
import prisma from "../server/db/prisma";
import { getSessionUserWithEmailFromCookie } from "../server/auth/session";
import { unreadCount } from "../features/messaging/server/messaging";
import ServerNavigation from "../features/navigation/ui/ServerNavigation";
import { getServerNavigationProps } from "../features/navigation/server";

const db = vi.hoisted(() => ({ user: { count: vi.fn() } }));

vi.mock("../server/db/prisma", () => ({ default: db }));
vi.mock("../server/auth/session", () => ({ getSessionUserWithEmailFromCookie: vi.fn() }));
vi.mock("../features/messaging/server/messaging", () => ({
  unreadCount: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSessionUserWithEmailFromCookie).mockResolvedValue(null);
  vi.mocked(unreadCount).mockResolvedValue(0);
});

afterEach(cleanup);

test("shows People navigation when no users exist", async () => {
  vi.mocked(prisma.user.count).mockResolvedValue(0);
  const props = await getServerNavigationProps(undefined, "/users");

  render(
    <ModalProvider>
      <ServerNavigation {...props} />
    </ModalProvider>,
  );

  expect(screen.getByRole("link", { name: "People" })).toBeInTheDocument();
});

test("hides People navigation from non-admin users", async () => {
  vi.mocked(getSessionUserWithEmailFromCookie).mockResolvedValue({
    id: 2,
    name: "User",
    email: "ordinary@example.com",
  });
  vi.mocked(prisma.user.count).mockResolvedValue(1);
  const props = await getServerNavigationProps(
    "app_session=test",
    "/users",
  );

  render(
    <ModalProvider>
      <ServerNavigation {...props} />
    </ModalProvider>,
  );

  expect(screen.queryByRole("link", { name: "People" })).not.toBeInTheDocument();
});

test("shows People navigation to the configured admin", async () => {
  vi.mocked(getSessionUserWithEmailFromCookie).mockResolvedValue({
    id: 1,
    name: "Admin",
    email: adminUser,
  });
  const props = await getServerNavigationProps(
    "app_session=test",
    "/users",
  );

  render(
    <ModalProvider>
      <ServerNavigation {...props} />
    </ModalProvider>,
  );

  expect(screen.getByRole("link", { name: "People" })).toBeInTheDocument();
  expect(prisma.user.count).not.toHaveBeenCalled();
});
