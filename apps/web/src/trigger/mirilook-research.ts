import { schedules, task } from "@trigger.dev/sdk/v3";
import { MirilookResearchQueueTaskId } from "@/lib/mirilook-research-agent";
import { runMonthlyResearchAutomation } from "@/lib/server/mirilook-research-automation";
import type { MirilookRegionId } from "@/lib/mirilook-regions";

type MirilookResearchQueuePayload = {
  region?: MirilookRegionId;
  researchMonth?: string;
};

export const MirilookCreateResearchQueueTask = task({
  id: MirilookResearchQueueTaskId,
  maxDuration: 900,
  queue: {
    concurrencyLimit: 1,
    name: "mirilook-research",
  },
  run: async (payload: MirilookResearchQueuePayload) => {
    return runMonthlyResearchAutomation(payload);
  },
});

export const MirilookScheduledResearchQueueTask = schedules.task({
  id: `${MirilookResearchQueueTaskId}-scheduled`,
  cron: {
    environments: ["PRODUCTION"],
    pattern: "15 4 1 * *",
    timezone: "Asia/Seoul",
  },
  maxDuration: 900,
  queue: {
    concurrencyLimit: 1,
    name: "mirilook-research",
  },
  run: async () => {
    return runMonthlyResearchAutomation();
  },
});
