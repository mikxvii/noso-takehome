import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Ensure Firebase client SDK is not bundled during SSR
  serverExternalPackages: ['firebase', 'firebase-admin'],
};

export default nextConfig;
