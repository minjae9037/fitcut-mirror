import { track } from "@vercel/analytics";

// Thin wrapper around Vercel Analytics custom events. No-ops safely if analytics
// is unavailable (e.g. blocked, or feature off) so it never breaks the flow.
export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean | null>,
) {
  try {
    track(name, props);
  } catch {
    // analytics is best-effort only
  }
}
