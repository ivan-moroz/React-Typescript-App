import { ERROR_MESSAGES } from "../../src/constants/errors";
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { GetServerSideProps } from 'next';
import { getSessionUser } from '../lib/session';
import { renderServerNavigation } from '../lib/serverNavigation';

type Props = Record<string, never>;

const DIST_DIR_CANDIDATES = [
  path.resolve(process.cwd(), 'dist'),
  path.resolve(process.cwd(), '../dist'),
  path.resolve(__dirname, '../../../../dist'),
  path.resolve(__dirname, '../../../dist'),
];
const STATIC_FILES = new Set(['favicon.ico', 'logo192.png', 'logo512.png', 'manifest.json', 'robots.txt']);
const SPA_ROUTES = new Set(['', 'todo', 'select', 'calculator', 'puzzle', 'login']);

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

const resolveDistDir = async () => {
  for (const candidate of DIST_DIR_CANDIDATES) {
    try {
      await access(path.join(candidate, 'index.html'));
      return candidate;
    } catch {
      // Next.js and Vercel may run this page with different working directories.
    }
  }
  throw new Error('Frontend build index.html was not found in the deployment.');
};

const resolveDistPath = (distDir: string, requestedPath: string) => {
  const normalizedPath = path.normalize(requestedPath).replace(/^([.][.][/\\])+/, '');
  const absolutePath = path.resolve(distDir, normalizedPath);
  const relativePath = path.relative(distDir, absolutePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return absolutePath;
};

const sendDistFile = async (res: Parameters<GetServerSideProps<Props>>[0]['res'], filePath: string) => {
  const fileContents = await readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[extension] ?? 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.statusCode = 200;
  res.end(fileContents);
};

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, req, res, resolvedUrl }) => {
  const routeParts = Array.isArray(params?.route) ? params.route : [];
  const requestedPath = routeParts.join('/');

  // Missing Next.js chunks and hot-update manifests must never receive SPA HTML.
  if (routeParts[0] === '_next') {
    return { notFound: true };
  }

  const isStaticFile = requestedPath.startsWith('assets/') || STATIC_FILES.has(requestedPath);
  if (!isStaticFile && !SPA_ROUTES.has(requestedPath)) {
    return { notFound: true };
  }

  try {
    if (requestedPath === 'login') {
      res.setHeader('Cache-Control', 'private, no-store');
      if (await getSessionUser(req)) {
        return { redirect: { destination: '/', permanent: false } };
      }
    }

    const distDir = await resolveDistDir();

    if (isStaticFile) {
      const distFilePath = resolveDistPath(distDir, requestedPath);

      if (!distFilePath) {
        res.statusCode = 400;
        res.end(ERROR_MESSAGES.INVALID_PATH);
        return { props: {} };
      }

      await sendDistFile(res, distFilePath);
      return { props: {} };
    }

    const indexHtml = await readFile(path.join(distDir, 'index.html'), 'utf-8');
    const root = '<div id="root"></div>';
    if (!indexHtml.includes(root)) {
      res.statusCode = 500;
      res.end(ERROR_MESSAGES.FRONTEND_BUILD_UNAVAILABLE);
      return { props: {} };
    }
    const navigation = await renderServerNavigation(req, resolvedUrl ?? '/');
    const html = indexHtml.replace(root, `${navigation}${root}`);

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.statusCode = 200;
    res.end(html);
    return { props: {} };
  } catch (error) {
    if (isStaticFile && error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return { notFound: true };
    }
    res.statusCode = 500;
    res.end(ERROR_MESSAGES.FRONTEND_BUILD_UNAVAILABLE);
    return { props: {} };
  }
};

export default function FrontendRouteProxyPage() {
  return null;
}
