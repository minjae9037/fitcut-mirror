export const MirilookNotificationDispatchTaskId = "mirilook-dispatch-notifications";
export const MirilookScheduledNotificationDispatchTaskId =
  "mirilook-scheduled-dispatch-notifications";

export type MirilookNotificationEventType =
  | "salon_application"
  | "salon_booking_request"
  | "salon_review"
  | "community_vote_request"
  | "community_vote"
  | "community_comment"
  | "community_dm"
  | "social_post_created"
  | "social_share"
  | "social_dm"
  | "moderation_report"
  | "payment_verified"
  | "support_case"
  | "consultation_ready"
  | "manual";

export type MirilookNotificationPayload = {
  body: string;
  broadcastAll?: boolean;
  eventType?: MirilookNotificationEventType;
  payload?: Record<string, unknown>;
  subscriptionId?: string;
  targetProfileId?: string;
  title: string;
  url?: string;
};
