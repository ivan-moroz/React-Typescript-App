import { ERROR_MESSAGES } from "../../../../src/constants/errors";
import prisma from "../../../lib/prisma";
import { getSessionUserFromCookie } from "../../../lib/session";
import type { Asset, AuthenticatedUser } from "../assetHelpers";

export type LoadedAssetsPage = {
  initialUser: AuthenticatedUser | null;
  initialAssets: Asset[];
  initialError?: string;
};

export async function loadAssetsPage(cookie?: string): Promise<LoadedAssetsPage> {
  try {
    const user = await getSessionUserFromCookie(cookie);
    if (!user) return { initialUser: null, initialAssets: [], initialError: ERROR_MESSAGES.LOGIN_REQUIRED };
    const assets = await prisma.asset.findMany({
      where: { OR: [{ userId: user.id }, { authorization: "PUBLIC" }] },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, description: true, authorization: true, mimeType: true, size: true, createdAt: true, userId: true },
    });
    return {
      initialUser: user,
      initialAssets: assets.map(({ mimeType, createdAt, authorization, ...asset }) => ({
        ...asset,
        type: mimeType,
        authorization: authorization === "PUBLIC" ? "PUBLIC" : "INTERNAL",
        createdAt: createdAt.toISOString(),
      })),
    };
  } catch {
    return { initialUser: null, initialAssets: [], initialError: ERROR_MESSAGES.ASSETS_PAGE_LOAD_FAILED };
  }
}
