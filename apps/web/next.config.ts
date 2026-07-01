import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "");
const isStaticExport = process.env.STATIC_EXPORT === "true";
const turbopackRoot = process.env.VERCEL
  ? process.cwd()
  : path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
  trailingSlash: true,
  basePath: basePath || undefined,
  async redirects() {
    return [
      {
        destination: "/mypage/",
        permanent: false,
        source: "/history",
      },
    ];
  },
  images: {
    unoptimized: isStaticExport,
  },
  turbopack: {
    root: turbopackRoot,
  },
};

// GitHub Pages (static export) doesn't need Sentry's server tooling, so only
// wrap for the Vercel/server build. Source maps upload only runs when
// SENTRY_AUTH_TOKEN is present; otherwise errors are still captured (minified).
export default isStaticExport
  ? nextConfig
  : withSentryConfig(nextConfig, {
      org: "mj-insight",
      project: "javascript-nextjs",
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
    });
