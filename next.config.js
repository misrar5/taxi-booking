/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Service worker off in dev so it doesn't cache stale code while building
  disable: process.env.NODE_ENV === 'development',
  // Cache the app shell (pages, JS, CSS, fonts) so the booking form loads offline
  runtimeCaching: require('next-pwa/cache'),
});

const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
