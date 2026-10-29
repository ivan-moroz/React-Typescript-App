import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { ModalProvider } from "../../src/components/modal/ModalProvider";
import AssetsPage from "../features/assets/AssetsPage";
import { loadAssetsPage } from "../features/assets/server/loadAssetsPage";
import UsersPage from "../features/users/UsersPage";
import { loadUsersPage } from "../features/users/server/loadUsersPage";
import { getSessionUserFromCookie } from "../lib/session";
import prisma from "../lib/prisma";

vi.mock("../lib/prisma", () => ({ default: { user: { findMany: vi.fn(), findUnique: vi.fn() }, asset: { findMany: vi.fn() } } }));
vi.mock("../lib/session", () => ({ getSessionUserFromCookie: vi.fn() }));

const user = { id: 1, name: "Jane" };
const asset = { id: "a1", name: "Server photo", description: "", authorization: "INTERNAL" as const, type: "image/png", size: 100, createdAt: "2026-01-01T00:00:00.000Z", userId: 1 };

afterEach(() => vi.restoreAllMocks());
beforeEach(() => vi.clearAllMocks());

test("includes initial users and assets in server HTML without duplicate fetches", () => {
  const fetch = vi.spyOn(global, "fetch");
  const content = <ModalProvider><UsersPage initialUsers={[{ id: 1, name: "Server user" }]} /><AssetsPage initialAssets={[asset]} initialUser={user} /></ModalProvider>;
  const html = renderToString(content);
  expect(html).toContain("Server user");
  expect(html).toContain("Server photo");
  render(content);
  expect(screen.getByText("Server user")).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

test.each([true, false])("hydrates server-rendered pages without mismatches (populated: %s)", async (populated) => {
  const fetch = vi.spyOn(global, "fetch");
  const onRecoverableError = vi.fn();
  const content = <ModalProvider><UsersPage initialUsers={populated ? [{ id: 1, name: "Server user" }] : []} /><AssetsPage initialAssets={populated ? [asset] : []} initialUser={user} /></ModalProvider>;
  const container = document.createElement("div");
  container.innerHTML = renderToString(content);
  document.body.appendChild(container);
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => { root = hydrateRoot(container, content, { onRecoverableError }); });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(container.textContent).toContain(populated ? "Server user" : "No users found.");
    expect(container.textContent).toContain(populated ? "Server photo" : "No assets yet");
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});

test("returns a safe server error when users cannot be loaded", async () => {
  vi.mocked(prisma.user.findMany).mockRejectedValueOnce(new Error("Database unavailable"));
  expect(await loadUsersPage()).toEqual({ initialUsers: [], initialError: "Failed to load users from backend" });
});

test("loads ordered users on the server", async () => {
  vi.mocked(prisma.user.findMany).mockResolvedValue([]);
  expect(await loadUsersPage()).toEqual({ initialUsers: [] });
  expect(prisma.user.findMany).toHaveBeenCalledWith({ orderBy: [{ position: "asc" }, { id: "asc" }], take: 10, select: { id: true, name: true, email: true, age: true, city: true } });
});

test("returns a safe error when server asset loading fails", async () => {
  vi.mocked(getSessionUserFromCookie).mockResolvedValue(user);
  vi.mocked(prisma.asset.findMany).mockRejectedValueOnce(new Error("Database unavailable"));
  expect(await loadAssetsPage("app_session=valid")).toEqual({ initialUser: null, initialAssets: [], initialError: "Unable to load assets. Please try again." });
});

test("authenticates server asset loading and serializes metadata", async () => {
  vi.mocked(getSessionUserFromCookie).mockResolvedValue(user);
  vi.mocked(prisma.asset.findMany).mockResolvedValue([{ id: "a1", name: "Server photo", description: "", authorization: "INTERNAL", mimeType: "image/png", size: 100, createdAt: new Date(asset.createdAt), userId: 1 }] as never);
  expect(await loadAssetsPage("app_session=valid")).toEqual({ initialUser: user, initialAssets: [asset] });
  expect(prisma.asset.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { OR: [{ userId: 1 }, { authorization: "PUBLIC" }] } }));
});

test("does not query assets without a valid session", async () => {
  vi.mocked(getSessionUserFromCookie).mockResolvedValue(null);
  expect(await loadAssetsPage()).toMatchObject({ initialUser: null, initialAssets: [], initialError: "Log in to manage your assets." });
  expect(prisma.asset.findMany).not.toHaveBeenCalled();
});
