import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@botflow/engine", "@botflow/channels"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
