import { ERROR_MESSAGES } from "../../src/constants/errors";
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { GetServerSideProps } from 'next';
import { getSessionUser } from '../lib/session';
import { renderServerNavigation } from '../lib/serverNavigation';

type Props = Record<string, never>;

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');
const STATIC_FILES = new Set(['favicon.ico', 'favicon.svg', 'logo192.png', 'logo512.png', 'manifest.json', 'robots.txt']);
const SPA_ROUTES = new Set(['', 'todo', 'select', 'calculator', 'puzzle', 'login']);

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

const resolveDistPath = (requestedPath: string) => {
  const normalizedPath = path.normalize(requestedPath).replace(/^([.][.][/\\])+/, '');
  const absolutePath = path.join(DIST_DIR, normalizedPath);

  if (!absolutePath.startsWith(DIST_DIR)) {
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

    if (isStaticFile) {
      const distFilePath = resolveDistPath(requestedPath);

      if (!distFilePath) {
        res.statusCode = 400;
        res.end(ERROR_MESSAGES.INVALID_PATH);
        return { props: {} };
      }

      await sendDistFile(res, distFilePath);
      return { props: {} };
    }

    const indexHtml = await readFile(INDEX_HTML_PATH, 'utf-8');
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
