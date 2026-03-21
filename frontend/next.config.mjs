if (typeof global !== 'undefined' && typeof window === 'undefined') {
  global.localStorage = undefined;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@xyflow/react'],
};

export default nextConfig;
