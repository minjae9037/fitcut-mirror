import {
  dispatchQueuedNotifications,
  queueNotificationEvent,
} from "@/lib/server/notifications";
import { protectMutationRequest } from "@/lib/server/request-security";
import {
  getSocialPostStorageBucket,
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";
import { resolveProfileAvatarUrl } from "@/lib/server/profile-avatar";
import { after } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

type SocialMessagePayload = {
  body?: string;
  contact?: string;
  conversationKey?: string;
  postId?: string;
  recipientDisplayName?: string;
  recipientHandle?: string;
  recipientProfileId?: string;
  senderName?: string;
};

type SocialMessageRow = {
  body: string | null;
  contact?: string | null;
  conversation_key?: string | null;
  created_at: string | null;
  id: string;
  post_id: string | null;
  read_at?: string | null;
  recipient_profile_id?: string | null;
  sender_name: string | null;
  sender_profile_id: string | null;
  status: string | null;
};

type SocialPostRow = {
  body: string | null;
  display_name: string | null;
  dm_policy: string | null;
  handle: string | null;
  id: string;
  profile_id: string | null;
  status: string | null;
};

type ProfileRow = {
  avatar_url: string | null;
  bio: string | null;
  display_name: string | null;
  email: string | null;
  handle: string | null;
  id: string;
};

type NotificationDmRow = {
  body: string | null;
  created_at: string | null;
  id: string;
  payload: Record<string, unknown> | null;
  target_profile_id?: string | null;
};

type SocialMessageSelectResult = {
  data: unknown[] | null;
  error: { code?: string; message?: string } | null;
};

type ParsedMessagePayload = SocialMessagePayload & {
  attachments: File[];
};

const maxDmAttachmentCount = 3;
const messageMetadataPrefix = "miri-dm-meta:";

export async function GET(request: Request) {
  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json({ accepted: false, reason: "auth_required" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({ accepted: false, reason: "supabase_not_configured" });
  }

  const currentProfile = await getOrCreateProfile(supabase, user);

  if (!currentProfile) {
    return Response.json(
      { accepted: false, reason: "profile_lookup_failed" },
      { status: 500 },
    );
  }

  const threadedRows = await loadThreadedMessages(supabase, currentProfile.id);
  const rows = threadedRows.rows.length
    ? threadedRows.rows
    : await loadLegacyMessages(supabase, currentProfile.id);
  const notificationRows = await loadNotificationDmMessages(supabase, currentProfile.id);
  const allRows = dedupeRows([...rows, ...notificationRows]);
  const postIds = Array.from(
    new Set(allRows.map((row) => row.post_id).filter(Boolean) as string[]),
  );
  const postsById = await loadPostsById(supabase, postIds);
  const partnerIds = Array.from(
    new Set(
      allRows
        .map((row) => getPartnerProfileId(row, currentProfile.id, postsById))
        .filter(Boolean) as string[],
    ),
  );
  const profilesById = await loadProfilesById(supabase, partnerIds);
  const attachmentUrlsByPath = await createSignedAttachmentUrlMap(
    collectAttachmentPaths(allRows),
  );
  const threads = await buildThreads(
    supabase,
    allRows,
    currentProfile,
    profilesById,
    postsById,
    attachmentUrlsByPath,
  );

  return Response.json({
    accepted: true,
    threads,
    upgradedSchema: threadedRows.upgradedSchema,
  });
}

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 24 * 1024 * 1024,
    rateLimit: {
      key: "community:social-messages:create",
      limit: 40,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: ParsedMessagePayload;

  try {
    payload = await parseMessagePayload(request);
  } catch {
    return Response.json({ accepted: false, reason: "invalid_message" }, { status: 400 });
  }

  const bodyText = sanitizeText(payload.body, 1200);
  const postId = sanitizeUuid(payload.postId);
  const requestedRecipientId = sanitizeUuid(payload.recipientProfileId);

  if (payload.attachments.length > maxDmAttachmentCount) {
    return Response.json(
      { accepted: false, reason: "too_many_attachments" },
      { status: 400 },
    );
  }

  if (payload.attachments.some((image) => !/^image\/(jpeg|png|webp)$/.test(image.type))) {
    return Response.json(
      { accepted: false, reason: "unsupported_image_type" },
      { status: 400 },
    );
  }

  if (!bodyText && !payload.attachments.length) {
    return Response.json(
      { accepted: false, reason: "invalid_message" },
      { status: 400 },
    );
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json({ accepted: false, reason: "auth_required" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({ accepted: false, reason: "supabase_not_configured" });
  }

  const senderProfile = await getOrCreateProfile(supabase, user);

  if (!senderProfile) {
    return Response.json(
      { accepted: false, reason: "profile_lookup_failed" },
      { status: 500 },
    );
  }

  const body = bodyText || "사진을 보냈습니다.";

  const post = postId ? await loadPostById(supabase, postId) : null;

  if (postId && !post) {
    return Response.json(
      { accepted: false, reason: "post_not_available" },
      { status: 404 },
    );
  }

  if (
    post &&
    post.profile_id !== senderProfile.id &&
    (post.status !== "published" || post.dm_policy === "deny")
  ) {
    return Response.json(
      {
        accepted: false,
        reason: post.dm_policy === "deny" ? "dm_not_allowed" : "post_not_available",
      },
      { status: post.dm_policy === "deny" ? 403 : 404 },
    );
  }

  const recipientProfile = await resolveRecipientProfile(supabase, {
    postProfileId: post?.profile_id ?? null,
    recipientDisplayName: payload.recipientDisplayName,
    recipientHandle: payload.recipientHandle,
    recipientProfileId: payload.recipientProfileId,
    requestedRecipientId,
  });
  const recipientProfileId = recipientProfile?.id ?? "";

  if (!recipientProfileId || recipientProfileId === senderProfile.id) {
    return Response.json(
      { accepted: false, reason: recipientProfileId ? "self_dm_not_allowed" : "recipient_not_found" },
      { status: 400 },
    );
  }

  if (!recipientProfile) {
    return Response.json(
      { accepted: false, reason: "recipient_not_found" },
      { status: 404 },
    );
  }

  const attachmentPaths = await uploadMessageAttachments(
    supabase,
    senderProfile.id,
    payload.attachments,
  );

  if (!attachmentPaths) {
    return Response.json(
      { accepted: false, reason: "storage_upload_failed" },
      { status: 500 },
    );
  }

  const conversationKey =
    sanitizeConversationKey(payload.conversationKey) ||
    createConversationKey(senderProfile.id, recipientProfile.id, post?.id ?? null);
  const senderName =
    sanitizeText(payload.senderName, 60) ||
    senderProfile.display_name ||
    senderProfile.handle ||
    user.email?.split("@")[0] ||
    "미리룩 회원";

  const upgradedInsert = await supabase
    .from("social_messages")
    .insert({
      body,
      contact: encodeMessageMetadata(sanitizeText(payload.contact, 120), attachmentPaths),
      conversation_key: conversationKey,
      post_id: post?.id ?? null,
      recipient_profile_id: recipientProfile.id,
      sender_name: senderName,
      sender_profile_id: senderProfile.id,
      status: "pending",
    })
    .select(
      "id, post_id, sender_profile_id, recipient_profile_id, sender_name, contact, body, status, conversation_key, read_at, created_at",
    )
    .single();

  let insertedRow = (upgradedInsert.data ?? null) as SocialMessageRow | null;
  let degraded = false;

  if (upgradedInsert.error) {
    if (!isSchemaMissingError(upgradedInsert.error)) {
      console.error("social message insert failed", upgradedInsert.error);
      await removeMessageAttachments(supabase, attachmentPaths);

      return Response.json(
        {
          accepted: false,
          reason: "supabase_insert_failed",
        },
        { status: 500 },
      );
    }

    degraded = true;
    const notificationMessage = await insertNotificationDmMessage(supabase, {
      body,
      contact: encodeMessageMetadata(sanitizeText(payload.contact, 120), attachmentPaths),
      conversationKey,
      postId: post?.id ?? null,
      recipientProfileId: recipientProfile.id,
      senderName,
      senderProfileId: senderProfile.id,
    });

    if (!notificationMessage) {
      await removeMessageAttachments(supabase, attachmentPaths);

      return Response.json(
        { accepted: false, reason: "supabase_insert_failed" },
        { status: 500 },
      );
    }

    insertedRow = notificationMessage;
  }

  if (process.env.MIRILOOK_ENABLE_LEGACY_DM_PUSH === "1" && !degraded) {
    await queueNotificationEvent({
      body: `${senderName}님이 커뮤니티 DM을 보냈습니다.`,
      eventType: "social_dm",
      payload: {
        conversationKey,
        messageId: insertedRow?.id,
        postId: post?.id,
        senderName,
      },
      targetProfileId: recipientProfile.id,
      title: "미리룩 커뮤니티 DM",
      url: "/community",
    });
  }

  await queueAndDispatchDmNotification({
    attachmentCount: attachmentPaths.length,
    conversationKey,
    messageId: insertedRow?.id,
    postId: post?.id ?? null,
    recipientProfileId: recipientProfile.id,
    senderName,
  });

  const attachmentUrlsByPath = await createSignedAttachmentUrlMap(attachmentPaths);
  const mappedMessage = insertedRow
    ? mapMessage(insertedRow, senderProfile.id, senderProfile, attachmentUrlsByPath)
    : undefined;

  return Response.json({
    accepted: true,
    conversationKey,
    degraded,
    message: mappedMessage,
    thread: {
      conversationKey,
      lastMessageAt: insertedRow?.created_at ?? new Date().toISOString(),
      messages: mappedMessage ? [mappedMessage] : [],
      partner: await mapProfile(supabase, recipientProfile),
      postId: post?.id ?? null,
      postSummary: post ? summarizePost(post) : "회원 직접 메시지",
    },
  });
}

export async function PATCH(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 16 * 1024,
    rateLimit: {
      key: "community:social-messages:update",
      limit: 120,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  const payload = (await request.json().catch(() => null)) as {
    conversationKey?: unknown;
  } | null;
  const conversationKey = sanitizeConversationKey(payload?.conversationKey);

  if (!conversationKey) {
    return Response.json(
      { accepted: false, reason: "conversation_required" },
      { status: 400 },
    );
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json({ accepted: false, reason: "auth_required" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({ accepted: false, reason: "supabase_not_configured" });
  }

  const currentProfile = await getOrCreateProfile(supabase, user);

  if (!currentProfile) {
    return Response.json(
      { accepted: false, reason: "profile_lookup_failed" },
      { status: 500 },
    );
  }

  const readAt = new Date().toISOString();
  let update = await supabase
    .from("social_messages")
    .update({
      read_at: readAt,
      status: "read",
    })
    .eq("conversation_key", conversationKey)
    .eq("recipient_profile_id", currentProfile.id)
    .is("read_at", null)
    .select("id");

  if (update.error && isReadAtMissingError(update.error)) {
    update = await supabase
      .from("social_messages")
      .update({
        status: "read",
      })
      .eq("conversation_key", conversationKey)
      .eq("recipient_profile_id", currentProfile.id)
      .select("id");
  }

  if (update.error) {
    if (isSchemaMissingError(update.error)) {
      const fallbackReadCount = await markNotificationDmMessagesRead(
        supabase,
        currentProfile.id,
        conversationKey,
        readAt,
      );

      return Response.json({
        accepted: true,
        readAt,
        readCount: fallbackReadCount,
        upgradedSchema: false,
      });
    }

    console.error("social message read update failed", update.error);

    return Response.json(
      { accepted: false, reason: "supabase_update_failed" },
      { status: 500 },
    );
  }

  const fallbackReadCount = await markNotificationDmMessagesRead(
    supabase,
    currentProfile.id,
    conversationKey,
    readAt,
  );

  return Response.json({
    accepted: true,
    readAt,
    readCount: (update.data?.length ?? 0) + fallbackReadCount,
    upgradedSchema: true,
  });
}

async function parseMessagePayload(request: Request): Promise<ParsedMessagePayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.toLowerCase().includes("multipart/form-data")) {
    const formData = await request.formData();

    return {
      attachments: getAttachmentFiles(formData),
      body: String(formData.get("body") ?? ""),
      contact: String(formData.get("contact") ?? ""),
      conversationKey: String(formData.get("conversationKey") ?? ""),
      postId: String(formData.get("postId") ?? ""),
      recipientDisplayName: String(formData.get("recipientDisplayName") ?? ""),
      recipientHandle: String(formData.get("recipientHandle") ?? ""),
      recipientProfileId: String(formData.get("recipientProfileId") ?? ""),
      senderName: String(formData.get("senderName") ?? ""),
    };
  }

  const payload = (await request.json()) as SocialMessagePayload;

  return {
    ...payload,
    attachments: [],
  };
}

function getAttachmentFiles(formData: FormData) {
  return [...formData.getAll("attachments"), ...formData.getAll("images")].filter(
    (item): item is File => item instanceof File && item.size > 0,
  );
}

async function uploadMessageAttachments(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  senderProfileId: string,
  attachments: File[],
) {
  const storagePaths: string[] = [];

  try {
    for (const [index, attachment] of attachments.entries()) {
      const storagePath = `${senderProfileId}/dm-${Date.now()}-${index + 1}-${randomId()}.${extensionFor(attachment.type)}`;
      const upload = await supabase.storage
        .from(getSocialPostStorageBucket())
        .upload(storagePath, attachment, {
          contentType: attachment.type,
          upsert: false,
        });

      if (upload.error) {
        console.error("social dm attachment upload failed", upload.error);
        await removeMessageAttachments(supabase, storagePaths);
        return null;
      }

      storagePaths.push(storagePath);
    }
  } catch (error) {
    console.error("social dm attachment upload failed", error);
    await removeMessageAttachments(supabase, storagePaths);
    return null;
  }

  return storagePaths;
}

async function removeMessageAttachments(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  storagePaths: string[],
) {
  if (!storagePaths.length) {
    return;
  }

  await supabase.storage.from(getSocialPostStorageBucket()).remove(storagePaths);
}

async function createSignedAttachmentUrlMap(storagePaths: string[]) {
  const supabase = getSupabaseAdminClient();
  const uniquePaths = Array.from(new Set(storagePaths.filter(isSafeStoragePath)));
  const urlsByPath = new Map<string, string>();

  if (!supabase || !uniquePaths.length) {
    return urlsByPath;
  }

  const signed = await Promise.all(
    uniquePaths.map((path) =>
      supabase.storage
        .from(getSocialPostStorageBucket())
        .createSignedUrl(path, 60 * 60),
    ),
  );

  uniquePaths.forEach((path, index) => {
    const signedUrl = signed[index]?.data?.signedUrl;

    if (signedUrl) {
      urlsByPath.set(path, signedUrl);
    }
  });

  return urlsByPath;
}

function collectAttachmentPaths(rows: SocialMessageRow[]) {
  return Array.from(
    new Set(
      rows
        .flatMap((row) => decodeMessageMetadata(row.contact).attachmentPaths)
        .filter(isSafeStoragePath),
    ),
  );
}

function encodeMessageMetadata(contact: string, attachmentPaths: string[]) {
  const safeAttachmentPaths = attachmentPaths.filter(isSafeStoragePath);

  if (!safeAttachmentPaths.length) {
    return contact;
  }

  return `${messageMetadataPrefix}${JSON.stringify({
    attachmentPaths: safeAttachmentPaths,
    contact,
  })}`;
}

function decodeMessageMetadata(contact: string | null | undefined) {
  const rawContact = contact ?? "";

  if (!rawContact.startsWith(messageMetadataPrefix)) {
    return {
      attachmentPaths: [] as string[],
      contact: rawContact,
    };
  }

  try {
    const metadata = JSON.parse(rawContact.slice(messageMetadataPrefix.length)) as {
      attachmentPaths?: unknown;
      contact?: unknown;
    };

    return {
      attachmentPaths: Array.isArray(metadata.attachmentPaths)
        ? metadata.attachmentPaths.filter(
            (path): path is string => typeof path === "string" && isSafeStoragePath(path),
          )
        : [],
      contact: sanitizeText(metadata.contact, 120),
    };
  } catch {
    return {
      attachmentPaths: [] as string[],
      contact: "",
    };
  }
}

function isSafeStoragePath(path: string) {
  return Boolean(
    path &&
      !path.startsWith("http") &&
      !path.startsWith("/") &&
      !path.includes("..") &&
      /^[a-z0-9/_.,@-]+$/i.test(path),
  );
}

async function queueAndDispatchDmNotification({
  attachmentCount,
  conversationKey,
  messageId,
  postId,
  recipientProfileId,
  senderName,
}: {
  attachmentCount: number;
  conversationKey: string;
  messageId?: string;
  postId: string | null;
  recipientProfileId: string;
  senderName: string;
}) {
  const queued = await queueNotificationEvent({
    body: attachmentCount
      ? `${senderName}님이 사진 ${attachmentCount}장과 함께 DM을 보냈습니다.`
      : `${senderName}님이 커뮤니티 DM을 보냈습니다.`,
    eventType: "social_dm",
    payload: {
      attachmentCount,
      conversationKey,
      messageId,
      postId,
      senderName,
    },
    targetProfileId: recipientProfileId,
    title: "미리룩 커뮤니티 DM",
    url: "/community",
  });

  if (!queued.queued) {
    return;
  }

  after(async () => {
    const dispatch = await dispatchQueuedNotifications(10);

    if (dispatch.reason) {
      console.warn("social dm push dispatch skipped", dispatch.reason);
    }
  });
}

async function loadThreadedMessages(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  profileId: string,
) {
  const selectColumns =
    "id, post_id, sender_profile_id, recipient_profile_id, sender_name, contact, body, status, conversation_key, read_at, created_at";
  const fallbackSelectColumns =
    "id, post_id, sender_profile_id, recipient_profile_id, sender_name, contact, body, status, conversation_key, created_at";
  let [sent, received] = (await Promise.all([
    supabase
      .from("social_messages")
      .select(selectColumns)
      .eq("sender_profile_id", profileId)
      .order("created_at", { ascending: true })
      .limit(300),
    supabase
      .from("social_messages")
      .select(selectColumns)
      .eq("recipient_profile_id", profileId)
      .order("created_at", { ascending: true })
      .limit(300),
  ])) as [SocialMessageSelectResult, SocialMessageSelectResult];

  if (isReadAtMissingError(sent.error) || isReadAtMissingError(received.error)) {
    [sent, received] = (await Promise.all([
      supabase
        .from("social_messages")
        .select(fallbackSelectColumns)
        .eq("sender_profile_id", profileId)
        .order("created_at", { ascending: true })
        .limit(300),
      supabase
        .from("social_messages")
        .select(fallbackSelectColumns)
        .eq("recipient_profile_id", profileId)
        .order("created_at", { ascending: true })
        .limit(300),
    ])) as [SocialMessageSelectResult, SocialMessageSelectResult];
  }

  if (isSchemaMissingError(sent.error) || isSchemaMissingError(received.error)) {
    return {
      rows: [],
      upgradedSchema: false,
    };
  }

  if (sent.error || received.error) {
    console.error("social messages select failed", sent.error ?? received.error);

    return {
      rows: [],
      upgradedSchema: true,
    };
  }

  return {
    rows: dedupeRows([
      ...((sent.data ?? []) as SocialMessageRow[]),
      ...((received.data ?? []) as SocialMessageRow[]),
    ]),
    upgradedSchema: true,
  };
}

async function loadLegacyMessages(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  profileId: string,
) {
  const ownedPostIdsResult = await supabase
    .from("social_posts")
    .select("id")
    .eq("profile_id", profileId)
    .limit(200);
  const ownedPostIds = ((ownedPostIdsResult.data ?? []) as { id: string }[]).map(
    (row) => row.id,
  );
  const sent = await supabase
    .from("social_messages")
    .select("id, post_id, sender_profile_id, sender_name, contact, body, status, created_at")
    .eq("sender_profile_id", profileId)
    .order("created_at", { ascending: true })
    .limit(300);
  const received = ownedPostIds.length
    ? await supabase
        .from("social_messages")
        .select("id, post_id, sender_profile_id, sender_name, contact, body, status, created_at")
        .in("post_id", ownedPostIds)
        .order("created_at", { ascending: true })
        .limit(300)
    : { data: [], error: null };

  if (sent.error || received.error) {
    console.error("legacy social messages select failed", sent.error ?? received.error);
    return [];
  }

  return dedupeRows([
    ...((sent.data ?? []) as SocialMessageRow[]),
    ...((received.data ?? []) as SocialMessageRow[]),
  ]);
}

async function loadNotificationDmMessages(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  profileId: string,
) {
  const selectColumns = "id, target_profile_id, body, payload, created_at";
  const received = await supabase
    .from("notification_events")
    .select(selectColumns)
    .eq("event_type", "social_dm_message")
    .eq("target_profile_id", profileId)
    .order("created_at", { ascending: true })
    .limit(300);
  const sent = await supabase
    .from("notification_events")
    .select(selectColumns)
    .eq("event_type", "social_dm_message")
    .contains("payload", { senderProfileId: profileId })
    .order("created_at", { ascending: true })
    .limit(300);

  if (received.error || sent.error) {
    console.error("notification dm messages select failed", received.error ?? sent.error);
    return [];
  }

  return dedupeRows([
    ...((received.data ?? []) as NotificationDmRow[]).map(mapNotificationDmRow),
    ...((sent.data ?? []) as NotificationDmRow[]).map(mapNotificationDmRow),
  ]);
}

async function markNotificationDmMessagesRead(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  recipientProfileId: string,
  conversationKey: string,
  readAt: string,
) {
  const result = await supabase
    .from("notification_events")
    .select("id, payload")
    .eq("event_type", "social_dm_message")
    .eq("target_profile_id", recipientProfileId)
    .contains("payload", { conversationKey })
    .limit(100);

  if (result.error) {
    console.error("notification dm read select failed", result.error);
    return 0;
  }

  const unreadRows = ((result.data ?? []) as NotificationDmRow[]).filter((row) => {
    const payload = row.payload ?? {};

    return !getPayloadText(payload.readAt);
  });

  await Promise.all(
    unreadRows.map((row) =>
      supabase
        .from("notification_events")
        .update({
          payload: {
            ...(row.payload ?? {}),
            readAt,
            readByProfileId: recipientProfileId,
          },
        })
        .eq("id", row.id),
    ),
  );

  return unreadRows.length;
}

async function insertNotificationDmMessage(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  message: {
    body: string;
    contact: string;
    conversationKey: string;
    postId: string | null;
    recipientProfileId: string;
    senderName: string;
    senderProfileId: string;
  },
) {
  const insert = await supabase
    .from("notification_events")
    .insert({
      body: message.body,
      event_type: "social_dm_message",
      payload: {
        contact: message.contact,
        conversationKey: message.conversationKey,
        messageKind: "social_dm",
        postId: message.postId,
        recipientProfileId: message.recipientProfileId,
        senderName: message.senderName,
        senderProfileId: message.senderProfileId,
      },
      status: "cancelled",
      target_profile_id: message.recipientProfileId,
      title: "미리룩 커뮤니티 DM",
      url: "/community",
    })
    .select("id, target_profile_id, body, payload, created_at")
    .single();

  if (insert.error) {
    console.error("notification dm message insert failed", insert.error);
    return null;
  }

  return mapNotificationDmRow(insert.data as NotificationDmRow);
}

function mapNotificationDmRow(row: NotificationDmRow): SocialMessageRow {
  const payload = row.payload ?? {};
  const readAt = getPayloadText(payload.readAt);

  return {
    body: row.body ?? "",
    contact: getPayloadText(payload.contact),
    conversation_key: getPayloadText(payload.conversationKey),
    created_at: row.created_at,
    id: row.id,
    post_id: sanitizeUuid(payload.postId) || null,
    read_at: readAt || null,
    recipient_profile_id: sanitizeUuid(payload.recipientProfileId) || row.target_profile_id || null,
    sender_name: getPayloadText(payload.senderName),
    sender_profile_id: sanitizeUuid(payload.senderProfileId) || null,
    status: readAt ? "read" : "pending",
  };
}

async function loadPostById(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  postId: string,
) {
  const result = await supabase
    .from("social_posts")
    .select("id, dm_policy, status, display_name, handle, profile_id, body")
    .eq("id", postId)
    .maybeSingle();

  if (result.error) {
    console.error("social message post lookup failed", result.error);
    return null;
  }

  return (result.data ?? null) as SocialPostRow | null;
}

async function loadPostsById(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  postIds: string[],
) {
  const postsById = new Map<string, SocialPostRow>();

  if (!postIds.length) {
    return postsById;
  }

  const result = await supabase
    .from("social_posts")
    .select("id, dm_policy, status, display_name, handle, profile_id, body")
    .in("id", postIds);

  if (result.error) {
    console.error("social message posts lookup failed", result.error);
    return postsById;
  }

  ((result.data ?? []) as SocialPostRow[]).forEach((post) => postsById.set(post.id, post));

  return postsById;
}

async function loadProfileById(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  profileId: string,
) {
  const result = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url, bio, handle")
    .eq("id", profileId)
    .maybeSingle();

  if (result.error) {
    console.error("profile lookup failed", result.error);
    return null;
  }

  return (result.data ?? null) as ProfileRow | null;
}

async function resolveRecipientProfile(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  {
    postProfileId,
    recipientDisplayName,
    recipientHandle,
    recipientProfileId,
    requestedRecipientId,
  }: {
    postProfileId: string | null;
    recipientDisplayName?: string;
    recipientHandle?: string;
    recipientProfileId?: string;
    requestedRecipientId: string;
  },
) {
  const directId = requestedRecipientId || sanitizeUuid(postProfileId);

  if (directId) {
    const profile = await loadProfileById(supabase, directId);

    if (profile) {
      return profile;
    }
  }

  const lookupValues = [
    recipientProfileId,
    recipientHandle,
    recipientDisplayName,
  ]
    .map((value) => sanitizeLookupText(value))
    .filter(Boolean);

  if (!lookupValues.length) {
    return null;
  }

  const idPrefix = lookupValues
    .map(extractUuidPrefixFromLookup)
    .find(Boolean);

  const result = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url, bio, handle")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (result.error) {
    console.error("recipient profile lookup failed", result.error);
    return null;
  }

  const normalizedLookups = lookupValues.map(normalizeLookupText);
  const rows = (result.data ?? []) as ProfileRow[];

  return (
    rows.find((profile) => {
      if (idPrefix && profile.id.toLowerCase().startsWith(idPrefix)) {
        return true;
      }

      const displayName = profile.display_name || profile.email?.split("@")[0] || "";
      const generatedHandle = createHandle(displayName, profile.id);
      const profileTexts = [
        profile.id,
        profile.handle,
        generatedHandle,
        displayName,
        profile.email,
      ]
        .filter((value): value is string => Boolean(value))
        .map(normalizeLookupText);

      return normalizedLookups.some((lookup) =>
        profileTexts.some((text) => text === lookup || text.includes(lookup)),
      );
    }) ?? null
  );
}

async function loadProfilesById(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  profileIds: string[],
) {
  const profilesById = new Map<string, ProfileRow>();

  if (!profileIds.length) {
    return profilesById;
  }

  const result = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url, bio, handle")
    .in("id", profileIds);

  if (result.error) {
    console.error("profiles lookup failed", result.error);
    return profilesById;
  }

  ((result.data ?? []) as ProfileRow[]).forEach((profile) =>
    profilesById.set(profile.id, profile),
  );

  return profilesById;
}

async function getOrCreateProfile(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  user: { email?: string; id: string },
) {
  const existing = await loadProfileById(supabase, user.id);

  if (existing) {
    return existing;
  }

  const displayName = user.email?.split("@")[0] || "미리룩 회원";
  const insert = await supabase
    .from("profiles")
    .upsert(
      {
        display_name: displayName,
        email: user.email ?? null,
        handle: `member_${user.id.slice(0, 8)}`,
        id: user.id,
      },
      { onConflict: "id" },
    )
    .select("id, display_name, email, avatar_url, bio, handle")
    .single();

  if (insert.error) {
    console.error("profile upsert failed", insert.error);
    return null;
  }

  return insert.data as ProfileRow;
}

async function buildThreads(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  rows: SocialMessageRow[],
  currentProfile: ProfileRow,
  profilesById: Map<string, ProfileRow>,
  postsById: Map<string, SocialPostRow>,
  attachmentUrlsByPath: Map<string, string>,
) {
  const grouped = new Map<
    string,
    {
      conversationKey: string;
      lastMessageAt: string;
      messages: ReturnType<typeof mapMessage>[];
      partner: Awaited<ReturnType<typeof mapProfile>>;
      postId: string | null;
      postSummary: string;
      unreadCount: number;
    }
  >();

  for (const row of rows.sort(
    (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime(),
  )) {
      const post = row.post_id ? postsById.get(row.post_id) ?? null : null;
      const partnerId = getPartnerProfileId(row, currentProfile.id, postsById);

      if (!partnerId) {
        continue;
      }

      const conversationKey =
        row.conversation_key || createConversationKey(currentProfile.id, partnerId, row.post_id);
      const partnerProfile = profilesById.get(partnerId) ?? createFallbackProfile(partnerId);
      const current = grouped.get(conversationKey) ?? {
        conversationKey,
        lastMessageAt: row.created_at ?? new Date().toISOString(),
        messages: [],
        partner: await mapProfile(supabase, partnerProfile),
        postId: row.post_id,
        unreadCount: 0,
        postSummary: post ? summarizePost(post) : "회원 직접 메시지",
      };

      current.lastMessageAt = row.created_at ?? current.lastMessageAt;
      current.messages.push(
        mapMessage(row, currentProfile.id, currentProfile, attachmentUrlsByPath),
      );
      if (isIncomingUnreadMessage(row, currentProfile.id, postsById)) {
        current.unreadCount += 1;
      }
      grouped.set(conversationKey, current);
    }

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

function mapMessage(
  row: SocialMessageRow,
  currentProfileId: string,
  currentProfile: ProfileRow,
  attachmentUrlsByPath: Map<string, string>,
) {
  const senderName =
    row.sender_profile_id === currentProfileId
      ? currentProfile.display_name || currentProfile.handle || "나"
      : row.sender_name || "미리룩 회원";

  const metadata = decodeMessageMetadata(row.contact);

  return {
    attachmentUrls: metadata.attachmentPaths
      .map((path) => attachmentUrlsByPath.get(path))
      .filter((url): url is string => Boolean(url)),
    body: row.body ?? "",
    contact: metadata.contact,
    createdAt: row.created_at ?? new Date().toISOString(),
    hasUnreadReceipt: row.sender_profile_id === currentProfileId && !isMessageRead(row),
    id: row.id,
    isMine: row.sender_profile_id === currentProfileId,
    readAt: row.read_at ?? null,
    senderDisplayName: senderName,
    senderProfileId: row.sender_profile_id,
  };
}

async function mapProfile(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  profile: ProfileRow,
) {
  const displayName = profile.display_name || profile.email?.split("@")[0] || "미리룩 회원";

  return {
    avatarUrl: await resolveProfileAvatarUrl(supabase, profile.avatar_url),
    bio: profile.bio || "미리룩에서 스타일을 찾고 있습니다.",
    displayName,
    handle: profile.handle || createHandle(displayName, profile.id),
    id: profile.id,
  };
}

function createFallbackProfile(profileId: string): ProfileRow {
  return {
    avatar_url: "/brand/mirilook-icon-192.png",
    bio: "",
    display_name: "미리룩 회원",
    email: null,
    handle: `member_${profileId.slice(0, 8)}`,
    id: profileId,
  };
}

function getPartnerProfileId(
  row: SocialMessageRow,
  currentProfileId: string,
  postsById: Map<string, SocialPostRow>,
) {
  if (row.sender_profile_id === currentProfileId) {
    return (
      row.recipient_profile_id ||
      (row.post_id ? postsById.get(row.post_id)?.profile_id ?? "" : "")
    );
  }

  return row.sender_profile_id || "";
}

function isIncomingUnreadMessage(
  row: SocialMessageRow,
  currentProfileId: string,
  postsById: Map<string, SocialPostRow>,
) {
  if (isMessageRead(row) || row.sender_profile_id === currentProfileId) {
    return false;
  }

  if (row.recipient_profile_id) {
    return row.recipient_profile_id === currentProfileId;
  }

  return Boolean(row.post_id && postsById.get(row.post_id)?.profile_id === currentProfileId);
}

function isMessageRead(row: SocialMessageRow) {
  return Boolean(row.read_at) || row.status === "read";
}

function createConversationKey(profileA: string, profileB: string, postId: string | null) {
  const [left, right] = [profileA, profileB].sort();

  return postId ? `post:${postId}:${left}:${right}` : `direct:${left}:${right}`;
}

function summarizePost(post: SocialPostRow) {
  const text = sanitizeText(post.body, 80);

  if (text) {
    return text;
  }

  return post.display_name ? `${post.display_name}님의 커뮤니티 게시물` : "커뮤니티 게시물";
}

function dedupeRows(rows: SocialMessageRow[]) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    if (seen.has(row.id)) {
      return false;
    }

    seen.add(row.id);
    return true;
  });
}

function createHandle(displayName: string, id: string) {
  const seed = `${displayName}-${id.slice(0, 6)}`
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return seed || `member_${id.slice(0, 6)}`;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.replace(/[<>]/g, "").trim();

  return trimmed.slice(0, maxLength);
}

function getPayloadText(value: unknown) {
  return typeof value === "string" ? sanitizeText(value, 240) : "";
}

function sanitizeLookupText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[<>]/g, "")
    .replace(/^@+/, "")
    .trim()
    .slice(0, 120);
}

function normalizeLookupText(value: string) {
  return value
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[\s_-]+/g, "");
}

function extractUuidPrefixFromLookup(value: string) {
  const match = value.toLowerCase().match(/([0-9a-f]{6,8})$/);

  return match?.[1] ?? "";
}

function sanitizeConversationKey(value: unknown) {
  const key = sanitizeText(value, 240);

  return /^[a-z0-9:_-]{20,240}$/i.test(key) ? key : "";
}

function sanitizeUuid(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    trimmed,
  )
    ? trimmed
    : "";
}

function extensionFor(contentType: string) {
  if (contentType === "image/png") {
    return "png";
  }

  if (contentType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function isReadAtMissingError(error: { code?: string; message?: string } | null) {
  return error?.code === "42703" || (error?.message ?? "").toLowerCase().includes("read_at");
}

function isSchemaMissingError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    error?.code === "42703" ||
    error?.code === "23502" ||
    message.includes("recipient_profile_id") ||
    message.includes("conversation_key") ||
    message.includes("read_at") ||
    message.includes("null value in column")
  );
}
