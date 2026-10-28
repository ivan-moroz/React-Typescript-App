import { ERROR_MESSAGES } from "../../src/constants/errors";
import type { GetServerSideProps } from 'next';
import UsersPage from '../features/Users';
import type { UsersTableProps } from '../features/users/Users';
import prisma from '../lib/prisma';
import { getSessionUser } from '../lib/session';
import type { AuthenticatedUser } from '../features/assets/assetHelpers';

export const getServerSideProps: GetServerSideProps<UsersTableProps & { initialUser: AuthenticatedUser | null }> = async ({ req, res }) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ position: 'asc' }, { id: 'asc' }], take: 10,
      select: { id: true, name: true, email: true, age: true, city: true },
    });
    return { props: { initialUsers: users, initialUser: await getSessionUser(req) } };
  } catch {
    res.statusCode = 503;
    return { props: { initialUsers: [], initialUser: null, initialError: ERROR_MESSAGES.USERS_LOAD_FAILED } };
  }
};

export default UsersPage;
