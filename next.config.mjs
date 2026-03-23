/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use 'standalone' only in production Docker builds
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'node-cron'],
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark these as external on the server side (don't bundle them)
      const externals = ['better-sqlite3', 'node-cron'];
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        ({ request }, callback) => {
          if (externals.some(e => request === e || request.startsWith(e + '/'))) {
            return callback(null, 'commonjs ' + request);
          }
          callback();
        },
      ];
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
