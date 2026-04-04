import { imageHosts } from './image-hosts.config.mjs';
import withPWA from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  distDir: process.env.DIST_DIR || '.next',

  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 60,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'usb=*, bluetooth=*, serial=*',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.(jsx|tsx)$/,
      exclude: [/node_modules/],
      use: [{ loader: '@dhiwise/component-tagger/nextLoader' }],
    });
    return config;
  }
};

export default withPWA({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // Cache the critical app routes (shell)
      {
        urlPattern: /^https?:\/\/.*\/(login|pos-punto-de-venta|cocina|mesero)(\/.*)?$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'aldente-pages',
          expiration: { maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 },
          networkTimeoutSeconds: 10,
        },
      },
      // Cache Next.js static JS/CSS chunks
      {
        urlPattern: /^\/_next\/static\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // Cache images
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'aldente-images',
          expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      // Network-only for Supabase API (never cache auth/data)
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
        handler: 'NetworkOnly',
      },
    ],
  },
})(nextConfig);
