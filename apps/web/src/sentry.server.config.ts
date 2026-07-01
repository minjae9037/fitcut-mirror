import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://0a6cfd8236b16d6bd4415e6ca24d7d51@o4511651341336576.ingest.us.sentry.io/4511651361914880";

Sentry.init({
  dsn,
  // Capture 10% of transactions for performance; errors are always captured.
  tracesSampleRate: 0.1,
  // Only report from real deployments, not local dev noise.
  enabled: process.env.NODE_ENV === "production",
});
