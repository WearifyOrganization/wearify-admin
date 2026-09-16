import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Admin renders Convex Storage images through plain <img>, uses no service
// worker and no cross-origin-isolated WASM, so nothing beyond the defaults is
// needed here. Route protection lives in proxy.ts, not in headers.
const nextConfig: NextConfig = {};

// Without SENTRY_AUTH_TOKEN the plugin skips source-map upload and the build
// still succeeds; stack traces are just minified until the token is set.
// `project` is the Sentry project for this surface (Phase 4C configures it).
export default withSentryConfig(nextConfig, {
  org: "wearify-k2",
  project: "wearify-admin",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Maps are uploaded to Sentry, then deleted — never served from the CDN.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  webpack: {
    treeshake: { removeDebugLogging: true },
    // Convex runs our crons, not Vercel.
    automaticVercelMonitors: false,
  },
});
