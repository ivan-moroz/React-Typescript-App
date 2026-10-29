import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { externalDir: true },
  outputFileTracingRoot: path.resolve(backendDir, '..'),
  outputFileTracingIncludes: {
    '/[[...route]]': ['../dist/**/*'],
  },
};

export default function config(phase: string): NextConfig {
  return {
    ...nextConfig,
    // Production builds must not overwrite a running dev server's HMR files.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-turbo-dev' : '.next',
  };
}
