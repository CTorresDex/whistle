import type { NextConfig } from "next";

// The browser talks same-origin to /api/*; app/api/[...path]/route.ts proxies
// those requests to the audio-station server (API_URL, read per request).
const nextConfig: NextConfig = {};

export default nextConfig;
