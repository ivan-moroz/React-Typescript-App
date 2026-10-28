import type { GetServerSidePropsContext } from 'next';
import { getServerSideProps } from '../pages/[[...route]]';
import { readFile } from 'node:fs/promises';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  const readFile = vi.fn();
  return { ...actual, readFile, default: { ...actual, readFile } };
});

beforeEach(() => vi.clearAllMocks());

test.each([
  '_next/static/webpack/stale.webpack.hot-update.json',
  '_next/static/webpack/stale.webpack.hot-update.js',
  '_next/static/chunks/missing.js',
])('does not serve SPA HTML for a missing Next.js runtime file: %s', async (url) => {
  vi.mocked(readFile).mockResolvedValue('<html>SPA</html>');
  const res = { setHeader: vi.fn(), end: vi.fn() };
  const context = { params: { route: url.split('/') }, res } as unknown as GetServerSidePropsContext;

  expect(await getServerSideProps(context)).toEqual({ notFound: true });
  expect(readFile).not.toHaveBeenCalled();
  expect(res.end).not.toHaveBeenCalled();
});

test('continues serving SPA routes from the frontend build', async () => {
  vi.mocked(readFile).mockResolvedValue('<html>SPA</html>');
  const res = { setHeader: vi.fn(), end: vi.fn() };
  const context = { params: { route: ['login'] }, res } as unknown as GetServerSidePropsContext;

  expect(await getServerSideProps(context)).toEqual({ props: {} });
  expect(res.end).toHaveBeenCalledWith('<html>SPA</html>');
});
