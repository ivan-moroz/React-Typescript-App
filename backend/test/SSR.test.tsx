import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import type { GetServerSidePropsContext } from 'next';
import { ModalProvider } from '../../src/components/modal/ModalProvider';
import AssetsPage from '../features/Assets';
import UsersPage from '../features/Users';
import { getServerSideProps as loadAssets } from '../pages/assets';
import { getServerSideProps as loadUsers } from '../pages/users';
import { getSessionUser, sessionCookie } from '../lib/session';
import prisma from '../lib/prisma';

vi.mock('../lib/prisma', () => ({ default: {
  user: { findMany: vi.fn(), findUnique: vi.fn() },
  asset: { findMany: vi.fn() },
} }));

const user = { id: 1, name: 'Jane', passwordHash: 'private-password-hash' };
const asset = { id: 'a1', name: 'Server photo', description: '', authorization: 'INTERNAL' as const,
  type: 'image/png', size: 100, createdAt: '2026-01-01T00:00:00.000Z', userId: 1 };
const context = (cookie?: string) => ({ req: { headers: { cookie } }, res: { setHeader: vi.fn() } }) as unknown as GetServerSidePropsContext;

afterEach(() => vi.restoreAllMocks());
beforeEach(() => vi.clearAllMocks());

test('includes initial users and assets in server HTML and does not fetch them again on mount', () => {
  const fetch = vi.spyOn(global, 'fetch');
  const content = <ModalProvider>
    <UsersPage initialUsers={[{ id: 1, name: 'Server user' }]} />
    <AssetsPage initialAssets={[asset]} initialUser={user} />
  </ModalProvider>;
  const html = renderToString(content);
  expect(html).toContain('Server user');
  expect(html).toContain('Server photo');
  expect(html).not.toContain('Loading table data');
  expect(html).not.toContain('Loading assets');
  render(content);
  expect(screen.getByText('Server user')).toBeInTheDocument();
  expect(screen.getByText('Server photo')).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

test.each([true, false])('hydrates server-rendered users and assets without mismatches or duplicate requests (populated: %s)', async (populated) => {
  const fetch = vi.spyOn(global, 'fetch');
  const onRecoverableError = vi.fn();
  const content = <ModalProvider>
    <UsersPage initialUsers={populated ? [{ id: 1, name: 'Server user' }] : []} />
    <AssetsPage initialAssets={populated ? [asset] : []} initialUser={{ id: user.id, name: user.name }} />
  </ModalProvider>;
  const container = document.createElement('div');
  container.innerHTML = renderToString(content);
  document.body.appendChild(container);
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(container, content, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(container.textContent).toContain(populated ? 'Server user' : 'No users found.');
    expect(container.textContent).toContain(populated ? 'Server photo' : 'No assets yet');
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});

test('returns a server error state when users cannot be loaded', async () => {
  vi.mocked(prisma.user.findMany).mockRejectedValueOnce(new Error('Database unavailable'));
  const ctx = context();
  const result = await loadUsers(ctx);
  expect(ctx.res.statusCode).toBe(503);
  expect(result).toEqual({ props: { initialUsers: [], initialUser: null, initialError: 'Failed to load users from backend' } });
});

test('returns a server error state when authenticated assets cannot be loaded', async () => {
  vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as never);
  vi.mocked(prisma.asset.findMany).mockRejectedValueOnce(new Error('Database unavailable'));
  const ctx = context(sessionCookie(user, false).split(';')[0]);
  const result = await loadAssets(ctx);
  expect(ctx.res.statusCode).toBe(503);
  expect(result).toEqual({ props: { initialAssets: [], initialUser: null, initialError: 'Unable to load assets. Please try again.' } });
});

test('loads the ordered first page of users on the server without exposing password hashes', async () => {
  vi.mocked(prisma.user.findMany).mockResolvedValue([]);
  const ctx = context();
  expect(await loadUsers(ctx)).toEqual({ props: { initialUsers: [], initialUser: null } });
  expect(prisma.user.findMany).toHaveBeenCalledWith({ orderBy: [{ position: 'asc' }, { id: 'asc' }], take: 10,
    select: { id: true, name: true, email: true, age: true, city: true } });
  expect(ctx.res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
});

test('authenticates the SSR asset request and serializes visible asset metadata', async () => {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
  const { type, createdAt, ...metadata } = asset;
  vi.mocked(prisma.asset.findMany).mockResolvedValue([{ ...metadata, mimeType: type, createdAt: new Date(createdAt) }] as never);
  const result = await loadAssets(context(sessionCookie(user, false).split(';')[0]));
  expect(result).toEqual({ props: { initialUser: { id: 1, name: 'Jane' }, initialAssets: [asset] } });
  expect(prisma.asset.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { OR: [{ userId: 1 }, { authorization: 'PUBLIC' }] } }));
});

test('does not load assets without a valid session', async () => {
  expect(await loadAssets(context())).toEqual({ props: { initialUser: null, initialAssets: [], initialError: 'Log in to manage your assets.' } });
  expect(prisma.asset.findMany).not.toHaveBeenCalled();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
  const token = sessionCookie(user, false).split(';')[0];
  expect(await getSessionUser(context(`${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`).req)).toBeNull();
  const expired = sessionCookie(user, false).split(';')[0].replace(/\.\d+\./, '.1.');
  expect(await getSessionUser(context(expired).req)).toBeNull();
});
