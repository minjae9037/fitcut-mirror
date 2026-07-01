import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://0a6cfd8236b16d6bd4415e6ca24d7d51@o4511651341336576.ingest.us.sentry.io/4511651361914880";

Sentry.init({
  dsn,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
});

// Instruments App Router client-side navigations for Sentry.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
