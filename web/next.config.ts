import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const localNetworkOrigins = Object.values(networkInterfaces())
  .flatMap((addresses) => addresses ?? [])
  .filter((address) => address.family === "IPv4" && !address.internal)
  .map((address) => address.address);

const nextConfig: NextConfig = {
  agentRules: false,
  // Permit client-side hydration when testing the development server from
  // another device on Ethan's local network.
  allowedDevOrigins: localNetworkOrigins,
  experimental: {
    // Reuse recently visited pages in the browser instead of re-rendering them on
    // every click. Server Actions still revalidate, so a Member's own changes show
    // immediately; the other Member's changes appear within this window.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
