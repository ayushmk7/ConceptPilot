if (typeof global !== 'undefined' && typeof window === 'undefined') {
  global.localStorage = undefined;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@xyflow/react'],
  serverExternalPackages: ['d3'],
  async redirects() {
    return [
      { source: '/graph/edit', destination: '/graph-structure', permanent: false },
      { source: '/student/graph/edit', destination: '/student/graph-structure', permanent: false },
    ];
  },
};

export default nextConfig;
