/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Handle all routes and prevent 404 errors on refresh
  async rewrites() {
    return [
      {
        source: "/:path*",
        destination: "/",
      },
    ];
  },
};

export default nextConfig;
