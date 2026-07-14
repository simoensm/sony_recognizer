import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Our internal packages ship raw TypeScript (no build step);
  // this tells Next.js to compile them alongside the app.
  transpilePackages: ["@sr/db", "@sr/queue", "@sr/config", "@sr/core"],
};

export default nextConfig;
