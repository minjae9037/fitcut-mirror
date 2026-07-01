import { schedules, task } from "@trigger.dev/sdk/v3";
import {
  MirilookNotificationDispatchTaskId,
  MirilookScheduledNotificationDispatchTaskId,
} from "@/lib/mirilook-notifications";
import { dispatchQueuedNotifications } from "@/lib/server/notifications";

type MirilookNotificationTaskPayload = {
  limit?: number;
};

export const MirilookDispatchNotificationsTask = task({
  id: MirilookNotificationDispatchTaskId,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 1,
    name: "mirilook-notifications",
  },
  run: async (payload: MirilookNotificationTaskPayload) => {
    return dispatchQueuedNotifications(payload.limit ?? 20);
  },
});

export const MirilookScheduledDispatchNotificationsTask = schedules.task({
  id: MirilookScheduledNotificationDispatchTaskId,
  cron: {
    environments: ["PRODUCTION"],
    pattern: "*/5 * * * *",
    timezone: "Asia/Seoul",
  },
  maxDuration: 120,
  queue: {
    concurrencyLimit: 1,
    name: "mirilook-notifications",
  },
  run: async () => {
    return dispatchQueuedNotifications(20);
  },
});
