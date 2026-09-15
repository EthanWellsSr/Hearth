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
};

export default nextConfig;
