import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship builds must not fail on lint noise; lint still runs in CI/dev.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  // Edge neural TTS uses `ws` at runtime — keep out of the serverless bundle graph.
  serverExternalPackages: ["node-edge-tts", "ws", "https-proxy-agent"],
};

export default nextConfig;
