import type { GetServerSidePropsContext } from 'next';
import { getServerSideProps } from '../pages/[[...route]]';
import { readFile } from 'node:fs/promises';
import { getSessionUser } from '../lib/session';

vi.mock('../lib/session', () => ({ getSessionUser: vi.fn(async () => null) }));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  const readFile = vi.fn();
  return { ...actual, readFile, default: { ...actual, readFile } };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSessionUser).mockResolvedValue(null);
});

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

test('serves SPA routes with the server navigation outside the frontend root', async () => {
  vi.mocked(readFile).mockResolvedValue('<html><body><div id="root"></div></body></html>');
  const res = { setHeader: vi.fn(), end: vi.fn() };
  const context = { params: { route: ['todo'] }, resolvedUrl: '/todo', req: { headers: {} }, res } as unknown as GetServerSidePropsContext;

  expect(await getServerSideProps(context)).toEqual({ props: {} });
  const html = vi.mocked(res.end).mock.calls[0][0] as string;
  expect(html.indexOf('class="app-navigation"')).toBeLessThan(html.indexOf('<div id="root"></div>'));
  expect(html).toContain('href="/messaging"');
  expect(html).toContain('data-open-messaging-panel');
});

test.each(['unknown', 'table', 'users/unknown', 'todo/unknown'])('returns a 404 for an unknown route: %s', async (url) => {
  const context = { params: { route: url.split('/') }, res: { setHeader: vi.fn(), end: vi.fn() } } as unknown as GetServerSidePropsContext;
  expect(await getServerSideProps(context)).toEqual({ notFound: true });
  expect(readFile).not.toHaveBeenCalled();
});

test('returns a 404 for a missing static file', async () => {
  vi.mocked(readFile).mockRejectedValue(Object.assign(new Error('Missing file'), { code: 'ENOENT' }));
  const context = { params: { route: ['assets', 'missing.js'] }, res: { setHeader: vi.fn(), end: vi.fn() } } as unknown as GetServerSidePropsContext;
  expect(await getServerSideProps(context)).toEqual({ notFound: true });
});

test('redirects authenticated login requests to Home without serving the login page', async () => {
  vi.mocked(getSessionUser).mockResolvedValue({ id: 1, name: 'Jane' });
  const req = { headers: { cookie: 'app_session=valid-session' } };
  const res = { setHeader: vi.fn(), end: vi.fn() };
  const context = { params: { route: ['login'] }, req, res } as unknown as GetServerSidePropsContext;
  expect(await getServerSideProps(context)).toEqual({ redirect: { destination: '/', permanent: false } });
  expect(getSessionUser).toHaveBeenCalledWith(req);
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  expect(readFile).not.toHaveBeenCalled();
});
