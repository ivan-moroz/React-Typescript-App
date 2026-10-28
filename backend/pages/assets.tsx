import { ERROR_MESSAGES } from "../../src/constants/errors";
import type { GetServerSideProps } from 'next';
import AssetsPage, { type AssetsPageProps } from '../features/Assets';
import prisma from '../lib/prisma';
import { getSessionUser } from '../lib/session';

export const getServerSideProps: GetServerSideProps<AssetsPageProps> = async ({ req, res }) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    const user = await getSessionUser(req);
    if (!user) return { props: { initialUser: null, initialAssets: [], initialError: ERROR_MESSAGES.LOGIN_REQUIRED } };
    const assets = await prisma.asset.findMany({
      where: { OR: [{ userId: user.id }, { authorization: 'PUBLIC' }] },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, description: true, authorization: true, mimeType: true, size: true, createdAt: true, userId: true },
    });
    return { props: { initialUser: user, initialAssets: assets.map(({ mimeType, createdAt, authorization, ...asset }) => ({ ...asset, type: mimeType, authorization: authorization === 'PUBLIC' ? 'PUBLIC' : 'INTERNAL', createdAt: createdAt.toISOString() })) } };
  } catch {
    res.statusCode = 503;
    return { props: { initialUser: null, initialAssets: [], initialError: ERROR_MESSAGES.ASSETS_PAGE_LOAD_FAILED } };
  }
};

export default AssetsPage;
