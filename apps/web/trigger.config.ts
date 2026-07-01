import { defineConfig } from "@trigger.dev/sdk/v3";
import { syncEnvVars } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  build: {
    // Push the Supabase + app-url values the consultation task needs into the
    // deployed Trigger environment. Values are read from the deploy shell's
    // process.env (sourced from apps/web/.env.local at deploy time). Undefined
    // values are skipped, so this is safe when run without them.
    extensions: [
      syncEnvVars(() => {
        const candidates: Record<string, string | undefined> = {
          NEXT_PUBLIC_APP_URL:
            process.env.NEXT_PUBLIC_APP_URL ?? "https://mirilook.com",
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_CONSULTATION_BUCKET: process.env.SUPABASE_CONSULTATION_BUCKET,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        };

        return Object.entries(candidates)
          .filter((entry): entry is [string, string] => Boolean(entry[1]))
          .map(([name, value]) => ({ name, value }));
      }),
    ],
  },
  dirs: ["./src/trigger"],
  enableConsoleLogging: true,
  maxDuration: 900,
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_uaogqiqwxlflqgmwqpok",
  retries: {
    default: {
      factor: 2,
      maxAttempts: 3,
      maxTimeoutInMs: 120_000,
      minTimeoutInMs: 10_000,
      randomize: true,
    },
  },
  runtime: "node",
});
