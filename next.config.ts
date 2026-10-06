import type { NextConfig } from "next";
import path from "path";

const phaserBuild = path.join(process.cwd(), "node_modules/phaser/dist/phaser.js");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      phaser: phaserBuild,
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      phaser: "./node_modules/phaser/dist/phaser.js",
    },
  },
};

export default nextConfig;
