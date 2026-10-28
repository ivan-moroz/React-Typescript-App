import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { externalDir: true },
};

export default function config(phase: string): NextConfig {
  return {
    ...nextConfig,
    // Production builds must not overwrite a running dev server's HMR files.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  };
}
