import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js blocks cross-origin requests to dev assets/HMR by default —
  // only `localhost` is allowed out of the box. Opening the app via the
  // printed "Network" URL (e.g. http://192.168.1.131:3000) instead of
  // localhost otherwise causes 403s on _next/*.js chunks and a broken
  // HMR websocket, which surfaces as a page that never finishes hydrating
  // (the loading spinner spins forever). Prefer localhost:3000; this
  // allowlist is a fallback for testing from another device on the LAN.
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.1.131"],
};

export default nextConfig;
