import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@weopen/ui", "@weopen/plugin-sdk"]
};

export default nextConfig;
