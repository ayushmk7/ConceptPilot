import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (typeof global !== 'undefined' && typeof window === 'undefined') {
  global.localStorage = undefined;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: parent repo has its own lockfile; trace from repo root for correct server output.
  outputFileTracingRoot: path.join(__dirname, '..'),
  transpilePackages: ['@xyflow/react'],
  serverExternalPackages: ['d3'],
  // Avoid Vercel build failures from local ESLint flat-config quirks (circular JSON in plugin graph).
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      { source: '/graph/edit', destination: '/graph-structure', permanent: false },
      { source: '/student/graph/edit', destination: '/student/graph-structure', permanent: false },
    ];
  },
};

export default nextConfig;
