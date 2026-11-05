import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship builds must not fail on lint noise; lint still runs in CI/dev.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
