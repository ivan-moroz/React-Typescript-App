import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { GetServerSideProps } from 'next';

type Props = Record<string, never>;

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');
const STATIC_FILES = new Set(['favicon.ico', 'logo192.png', 'logo512.png', 'manifest.json', 'robots.txt']);

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
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

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, res }) => {
  const routeParts = Array.isArray(params?.route) ? params.route : [];
  const requestedPath = routeParts.join('/');

  try {
    if (requestedPath.startsWith('assets/') || STATIC_FILES.has(requestedPath)) {
      const distFilePath = resolveDistPath(requestedPath);

      if (!distFilePath) {
        res.statusCode = 400;
        res.end('Invalid path');
        return { props: {} };
      }

      await sendDistFile(res, distFilePath);
      return { props: {} };
    }

    const indexHtml = await readFile(INDEX_HTML_PATH, 'utf-8');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.statusCode = 200;
    res.end(indexHtml);
    return { props: {} };
  } catch {
    res.statusCode = 500;
    res.end('Unable to serve frontend build from dist folder.');
    return { props: {} };
  }
};

export default function FrontendRouteProxyPage() {
  return null;
}
