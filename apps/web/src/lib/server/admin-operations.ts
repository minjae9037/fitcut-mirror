import {
  getConsultationStorageBucket,
  getSupabaseAdminClient,
} from "@/lib/server/supabase-admin";

type SupabaseAdminClient = NonNullable<
  ReturnType<typeof getSupabaseAdminClient>
>;

export type AdminOperationMetric = {
  description: string;
  label: string;
  value: string;
};

export type AdminOperationItem = {
  detail?: AdminOperationItemDetail;
  id: string;
  meta?: string;
  status?: string;
  subtitle?: string;
  title: string;
};

export type AdminOperationImage = {
  assetType?: "final_angle" | "recommendation_preview" | "source_photo";
  displayOrder?: number;
  imageUrl: string;
  label: string;
};

export type AdminOperationItemDetail = {
  audienceName?: string;
  consultationImages: AdminOperationImage[];
  createdAt?: string;
  customerDisplayName?: string;
  customerEmail?: string;
  customerId?: string;
  hairColorName?: string;
  memo?: string;
  recommendationImages: AdminOperationImage[];
  regionName?: string;
  sessionId: string;
  sourcePhotos: AdminOperationImage[];
  styleName?: string;
  type: "consultation_history";
};

export type AdminOperationCategory =
  | "community"
  | "customers"
  | "revenue"
  | "salons"
  | "system";

export type AdminOperationSection = {
  action?: {
    statuses: Array<{
      label: string;
      status: string;
      tone: "approve" | "neutral" | "danger";
    }>;
    table: string;
  };
  categories: AdminOperationCategory[];
  description: string;
  emptyText: string;
  items: AdminOperationItem[];
  title: string;
};

export type AdminOperationsSummary = {
  connected: boolean;
  error?: string;
  metrics: AdminOperationMetric[];
  sections: AdminOperationSection[];
};

type CountResult = {
  count: number;
  error?: string;
};

type RecentRow = Record<string, unknown>;

type AdminConsultationAssetType =
  | "final_angle"
  | "recommendation_preview"
  | "source_photo";

type AdminConsultationSessionRow = {
  audience_name: string | null;
  created_at: string;
  hair_color_name: string | null;
  id: string;
  profile_id: string | null;
  region_name: string | null;
  source_photo_count: number | null;
  status: string | null;
  style_memo: string | null;
  style_name: string | null;
};

type AdminConsultationAssetRow = {
  angle_label: string | null;
  asset_type: string | null;
  display_order: number | null;
  original_url: string | null;
  session_id: string;
  storage_path: string | null;
};

type AdminProfileLookupRow = {
  display_name: string | null;
  email: string | null;
  id: string;
};

const adminRecentConsultationLimit = 50;
const adminConsultationAssetTypes: AdminConsultationAssetType[] = [
  "final_angle",
  "source_photo",
  "recommendation_preview",
];

export async function loadAdminOperationsSummary(): Promise<AdminOperationsSummary> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      connected: false,
      metrics: [],
      sections: [],
    };
  }

  try {
    await syncAuthUsersToProfiles(supabase);

    const [
      sessionCount,
      profileCount,
      bookingCount,
      reviewCount,
      voteCount,
      paymentCount,
      hairMoneyAccountCount,
      hairMoneyLedgerCount,
      shareCount,
      emailEventCount,
      trendSourceCount,
      trendPriorityCount,
      commentCount,
      messageCount,
      applicationCount,
      pushSubscriptionCount,
      notificationEventCount,
      moderationEventCount,
      supportCaseCount,
      recentSessions,
      recentBookings,
      recentReviews,
      recentVotes,
      recentPayments,
      recentHairMoneyLedger,
      recentShares,
      recentEmailEvents,
      recentTrendSources,
      recentComments,
      recentMessages,
      recentApplications,
      recentPushSubscriptions,
      recentNotificationEvents,
      recentModerationEvents,
      recentSupportCases,
      recentProfiles,
    ] = await Promise.all([
      countRows("generation_sessions"),
      countRows("profiles"),
      countRows("booking_requests"),
      countRows("reviews"),
      countRows("community_posts"),
      countRows("payment_events"),
      countRows("hair_money_accounts"),
      countRows("hair_money_ledger"),
      countRows("consultation_shares"),
      countRows("consultation_email_events"),
      countRows("regional_trend_sources"),
      countRows("regional_style_priorities"),
      countRows("community_comments"),
      countRows("community_messages"),
      countRows("salon_applications"),
      countRows("push_subscriptions"),
      countRows("notification_events"),
      countRows("moderation_events"),
      countRows("support_cases"),
      selectRecentConsultationSessions(),
      selectRecent(
        "booking_requests",
        "id, name, contact, service_type, preferred_date, status, created_at",
      ),
      selectRecent(
        "reviews",
        "id, salon_id, designer_id, visitor_name, rating, body, status, created_at",
      ),
      selectRecent(
        "community_posts",
        "id, title, body, post_type, purpose, requester_gender, target_gender, dm_policy, status, created_at",
      ),
      selectRecent(
        "payment_events",
        "id, payment_id, product_id, status, amount, verified, created_at",
      ),
      selectRecent(
        "hair_money_ledger",
        "id, profile_id, direction, amount, balance_after, source_type, source_id, reason, created_at",
      ),
      selectRecent(
        "consultation_shares",
        "token, session_id, expires_at, revoked_at, created_at",
      ),
      selectRecent(
        "consultation_email_events",
        "id, session_id, recipient_email, resend_email_id, share_token, status, error_message, created_at, updated_at",
      ),
      selectRecent(
        "regional_trend_sources",
        "id, region_id, audience, platform, title, status, researched_at, created_at",
      ),
      selectRecent(
        "community_comments",
        "id, post_id, anonymous_name, body, status, created_at",
      ),
      selectRecent(
        "community_messages",
        "id, post_id, sender_name, contact, body, status, created_at",
      ),
      selectRecent(
        "salon_applications",
        "id, applicant_type, salon_name, designer_name, contact_name, contact, specialties, status, created_at",
      ),
      selectRecent(
        "push_subscriptions",
        "id, contact, consent_context, status, created_at, updated_at",
      ),
      selectRecent(
        "notification_events",
        "id, event_type, title, body, status, created_at, sent_at",
      ),
      selectRecent(
        "moderation_events",
        "id, target_type, target_id, reason, body, status, action, reporter_contact, created_at, updated_at",
      ),
      selectRecent(
        "support_cases",
        "id, case_type, status, priority, contact_email, contact_phone, subject, body, request_id, payment_id, refund_amount_hm, created_at, updated_at",
      ),
      selectCustomerProfiles(),
    ]);

    const [
      socialPostCount,
      socialReactionCount,
      socialShareCount,
      socialMessageCount,
      recentSocialPosts,
      recentSocialShares,
      recentSocialMessages,
    ] = await Promise.all([
      countRows("social_posts"),
      countRows("social_reactions"),
      countRows("social_shares"),
      countRows("social_messages"),
      selectRecent(
        "social_posts",
        "id, display_name, handle, body, hashtags, dm_policy, status, recommendation_score, created_at, updated_at",
      ),
      selectRecent(
        "social_shares",
        "id, post_id, sharer_profile_id, session_key, channel, created_at",
      ),
      selectRecent(
        "social_messages",
        "id, post_id, sender_name, contact, body, status, created_at",
      ),
    ]);

    const countErrors = [
      sessionCount,
      profileCount,
      bookingCount,
      reviewCount,
      voteCount,
      paymentCount,
      hairMoneyAccountCount,
      hairMoneyLedgerCount,
      shareCount,
      emailEventCount,
      trendSourceCount,
      trendPriorityCount,
      commentCount,
      messageCount,
      applicationCount,
      pushSubscriptionCount,
      notificationEventCount,
      moderationEventCount,
      supportCaseCount,
      socialPostCount,
      socialReactionCount,
      socialShareCount,
      socialMessageCount,
    ].filter((result) => result.error);

    return {
      connected: true,
      error: countErrors[0]?.error,
      metrics: [
        {
          description: "저장된 AI 상담 결과",
          label: "상담 세션",
          value: formatCount(sessionCount),
        },
        {
          description: "로그인 회원 프로필",
          label: "회원",
          value: formatCount(profileCount),
        },
        {
          description: "미용실/디자이너 예약 문의",
          label: "예약 문의",
          value: formatCount(bookingCount),
        },
        {
          description: "미용실/디자이너 입점 신청",
          label: "입점 신청",
          value: formatCount(applicationCount),
        },
        {
          description: "미용실/디자이너 파일럿 리뷰",
          label: "리뷰",
          value: formatCount(reviewCount),
        },
        {
          description: "커뮤니티/스타일 투표 요청",
          label: "투표 글",
          value: formatCount(voteCount),
        },
        {
          description: "PortOne 결제 이벤트",
          label: "결제 이벤트",
          value: formatCount(paymentCount),
        },
        {
          description: "H머니 계정과 충전/차감/환불 원장 거래",
          label: "H머니 원장",
          value: `${formatCount(hairMoneyAccountCount)} / ${formatCount(
            hairMoneyLedgerCount,
          )}`,
        },
        {
          description: "생성 실패, 환불 요청, 결제 오류, 일반 고객문의",
          label: "고객지원",
          value: formatCount(supportCaseCount),
        },
        {
          description: "외부 공유용 상담 보드 링크",
          label: "공유 링크",
          value: formatCount(shareCount),
        },
        {
          description: "미용사/고객에게 보낸 상담 결과 이메일 발송 기록",
          label: "이메일 공유",
          value: formatCount(emailEventCount),
        },
        {
          description: "리서치 agent가 저장한 국가별 트렌드 근거와 추천 우선순위",
          label: "트렌드 리서치",
          value: `${formatCount(trendSourceCount)} / ${formatCount(
            trendPriorityCount,
          )}`,
        },
        {
          description: "커뮤니티 댓글과 DM 전달 요청",
          label: "댓글 / DM",
          value: `${formatCount(commentCount)} / ${formatCount(messageCount)}`,
        },
        {
          description: "인스타형 사진 커뮤니티 게시물, 반응, 공유, DM",
          label: "사진 피드",
          value: `${formatCount(socialPostCount)} / ${formatCount(
            socialReactionCount,
          )} / ${formatCount(socialShareCount)} / ${formatCount(
            socialMessageCount,
          )}`,
        },
        {
          description: "브라우저 Web Push 수신 동의",
          label: "Push 구독",
          value: formatCount(pushSubscriptionCount),
        },
        {
          description: "투표, DM, 결제 후 발송되는 알림 큐",
          label: "알림 이벤트",
          value: formatCount(notificationEventCount),
        },
        {
          description: "커뮤니티, 리뷰, 공유 링크에 대한 신고와 삭제 요청",
          label: "신고/삭제",
          value: formatCount(moderationEventCount),
        },
      ],
      sections: [
        {
          categories: ["customers"],
          description:
            "이메일 로그인, SNS 로그인, 커뮤니티 활동과 상담 히스토리에 연결되는 회원 프로필입니다.",
          emptyText: "아직 회원 프로필이 없습니다.",
          items: recentProfiles.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.id) ? `ID ${text(row.id).slice(0, 8)}` : "",
              text(row.provider),
              text(row.email),
              formatDate(row.created_at),
            ]),
            status: `H머니 ${number(row.hair_money_balance)}개`,
            subtitle: text(row.email),
            title: text(row.display_name) || text(row.email) || "미리룩 회원",
          })),
          title: "최근 회원",
        },
        {
          action: {
            statuses: [
              { label: "검토중", status: "reviewing", tone: "neutral" },
              { label: "고객확인", status: "waiting_customer", tone: "neutral" },
              { label: "처리 완료", status: "resolved", tone: "approve" },
              { label: "H머니 환급", status: "refunded", tone: "approve" },
              { label: "기각", status: "dismissed", tone: "danger" },
            ],
            table: "support_cases",
          },
          categories: ["customers", "revenue"],
          description:
            "생성 실패, 환불 요청, 결제 오류, 일반 고객문의 접수 내역입니다. H머니 환급은 추천 요청 ID가 확인된 건만 원장에 반영됩니다.",
          emptyText: "아직 고객지원 문의가 없습니다.",
          items: recentSupportCases.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              supportCaseTypeLabel(text(row.case_type)),
              supportPriorityLabel(text(row.priority)),
              text(row.contact_email) || text(row.contact_phone),
              row.refund_amount_hm ? `${number(row.refund_amount_hm)} HM` : "",
              text(row.request_id) ? `요청 ${text(row.request_id).slice(0, 18)}` : "",
              text(row.payment_id) ? `결제 ${text(row.payment_id).slice(0, 18)}` : "",
              formatDate(row.updated_at || row.created_at),
            ]),
            status: text(row.status),
            // 문의 전문을 그대로 노출해 관리자가 읽고 처리할 수 있게 한다.
            subtitle: text(row.body),
            title: text(row.subject) || "고객지원 문의",
          })),
          title: "최근 고객지원 문의",
        },
        {
          categories: ["system"],
          description:
            "웹 검색, Instagram, YouTube, 지역 살롱 메뉴 등에서 조사한 국가/성별별 헤어 트렌드 근거입니다.",
          emptyText: "아직 저장된 트렌드 리서치가 없습니다.",
          items: recentTrendSources.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.region_id),
              text(row.audience),
              text(row.platform),
              formatDate(row.researched_at || row.created_at),
            ]),
            status: text(row.status),
            subtitle: text(row.title),
            title: "지역별 트렌드 리서치",
          })),
          title: "최근 트렌드 리서치",
        },
        {
          categories: ["customers"],
          description: "고객이 저장한 최근 상담 결과입니다.",
          emptyText: "아직 저장된 상담 결과가 없습니다.",
          items: recentSessions.map((row) => ({
            detail: {
              audienceName: text(row.audience_name) || undefined,
              consultationImages: imageList(row.consultation_images),
              createdAt: text(row.created_at) || undefined,
              customerDisplayName: text(row.customer_display_name) || undefined,
              customerEmail: text(row.customer_email) || undefined,
              customerId: text(row.profile_id) || undefined,
              hairColorName: text(row.hair_color_name) || undefined,
              memo: text(row.style_memo) || undefined,
              recommendationImages: imageList(row.recommendation_images),
              regionName: text(row.region_name) || undefined,
              sessionId: text(row.id),
              sourcePhotos: imageList(row.source_photos),
              styleName: text(row.style_name) || undefined,
              type: "consultation_history",
            },
            id: text(row.id),
            meta: joinMeta([
              text(row.profile_id) ? `고객 ID ${text(row.profile_id)}` : "",
              text(row.customer_email) ? `이메일 ${text(row.customer_email)}` : "",
              text(row.audience_name),
              text(row.hair_color_name),
              formatDate(row.created_at),
            ]),
            status: text(row.status),
            subtitle: joinMeta([
              text(row.customer_display_name),
              text(row.id) ? `세션 ${text(row.id)}` : "",
            ]),
            title: text(row.style_name) || "이름 없는 상담 결과",
          })),
          title: "최근 상담 히스토리",
        },
        {
          action: {
            statuses: [
              { label: "연락 완료", status: "contacted", tone: "approve" },
              { label: "처리 완료", status: "done", tone: "neutral" },
              { label: "취소", status: "cancelled", tone: "danger" },
            ],
            table: "booking_requests",
          },
          categories: ["salons"],
          description: "미용실/디자이너에게 연결해야 할 신규 문의입니다.",
          emptyText: "아직 예약 문의가 없습니다.",
          items: recentBookings.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.service_type),
              text(row.preferred_date),
              formatDate(row.created_at),
            ]),
            status: text(row.status),
            subtitle: text(row.contact),
            title: text(row.name) || "이름 없는 예약 문의",
          })),
          title: "최근 예약 문의",
        },
        {
          action: {
            statuses: [
              { label: "연락 완료", status: "contacted", tone: "neutral" },
              { label: "승인/공개", status: "approved", tone: "approve" },
              { label: "거절", status: "rejected", tone: "danger" },
            ],
            table: "salon_applications",
          },
          categories: ["salons"],
          description:
            "미용실/디자이너 파트너 입점 신청입니다. 승인하면 고객용 살롱/디자이너 프로필이 생성됩니다.",
          emptyText: "아직 입점 신청이 없습니다.",
          items: recentApplications.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.applicant_type),
              text(row.contact_name),
              text(row.contact),
              formatDate(row.created_at),
            ]),
            status: text(row.status),
            subtitle: Array.isArray(row.specialties)
              ? row.specialties.filter(Boolean).join(", ")
              : text(row.designer_name),
            title: text(row.salon_name) || "이름 없는 입점 신청",
          })),
          title: "최근 입점 신청",
        },
        {
          action: {
            statuses: [
              { label: "승인", status: "approved", tone: "approve" },
              { label: "대기", status: "pending", tone: "neutral" },
              { label: "숨김", status: "hidden", tone: "danger" },
            ],
            table: "reviews",
          },
          categories: ["salons"],
          description:
            "공개 전 운영자가 확인해야 할 살롱/디자이너 리뷰입니다. 승인하면 평점, 리뷰 수, 고객 화면 하이라이트에 반영됩니다.",
          emptyText: "아직 리뷰가 없습니다.",
          items: recentReviews.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.salon_id),
              text(row.designer_id),
              rating(row.rating),
              formatDate(row.created_at),
            ]),
            status: text(row.status),
            subtitle: text(row.body).slice(0, 90),
            title: text(row.visitor_name) || "익명 리뷰",
          })),
          title: "최근 파일럿 리뷰",
        },
        {
          action: {
            statuses: [
              { label: "공개", status: "published", tone: "approve" },
              { label: "대기", status: "pending", tone: "neutral" },
              { label: "숨김", status: "hidden", tone: "danger" },
            ],
            table: "social_posts",
          },
          categories: ["community"],
          description:
            "회원이 사진과 글, 해시태그를 올린 인스타형 커뮤니티 피드입니다.",
          emptyText: "아직 사진 커뮤니티 게시물이 없습니다.",
          items: recentSocialPosts.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              `@${text(row.handle) || "unknown"}`,
              Array.isArray(row.hashtags)
                ? row.hashtags
                    .filter((tag): tag is string => typeof tag === "string")
                    .slice(0, 4)
                    .map((tag) => `#${tag}`)
                    .join(" ")
                : "",
              text(row.dm_policy),
              score(row.recommendation_score),
              formatDate(row.updated_at || row.created_at),
            ]),
            status: text(row.status),
            subtitle: text(row.body).slice(0, 90),
            title: text(row.display_name) || "미리룩 회원",
          })),
          title: "최근 사진 커뮤니티",
        },
        {
          categories: ["community"],
          description:
            "사진 커뮤니티 게시물을 외부로 공유하거나 링크를 복사한 이벤트입니다.",
          emptyText: "아직 사진 커뮤니티 공유 이벤트가 없습니다.",
          items: recentSocialShares.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.channel),
              text(row.sharer_profile_id).slice(0, 12) ||
                text(row.session_key).slice(0, 12),
              text(row.post_id).slice(0, 12),
              formatDate(row.created_at),
            ]),
            status: text(row.channel),
            subtitle: text(row.post_id),
            title: "사진 커뮤니티 공유",
          })),
          title: "최근 사진 커뮤니티 공유",
        },
        {
          action: {
            statuses: [
              { label: "전달 완료", status: "delivered", tone: "approve" },
              { label: "대기", status: "pending", tone: "neutral" },
              { label: "숨김", status: "hidden", tone: "danger" },
            ],
            table: "social_messages",
          },
          categories: ["community"],
          description: "사진 커뮤니티 게시물에 들어온 DM 전달 요청입니다.",
          emptyText: "아직 사진 커뮤니티 DM 요청이 없습니다.",
          items: recentSocialMessages.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.sender_name) || "익명",
              text(row.contact),
              text(row.post_id).slice(0, 12),
              formatDate(row.created_at),
            ]),
            status: text(row.status),
            subtitle: text(row.body).slice(0, 90),
            title: "사진 커뮤니티 DM 요청",
          })),
          title: "최근 사진 커뮤니티 DM",
        },
        {
          action: {
            statuses: [
              { label: "공개", status: "published", tone: "approve" },
              { label: "대기", status: "pending", tone: "neutral" },
              { label: "숨김", status: "hidden", tone: "danger" },
            ],
            table: "community_posts",
          },
          categories: ["community"],
          description: "익명 커뮤니티와 스타일 투표 요청입니다.",
          emptyText: "아직 투표/커뮤니티 글이 없습니다.",
          items: recentVotes.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.post_type),
              text(row.purpose),
              formatVoteGenderMeta(row.requester_gender, row.target_gender),
              text(row.dm_policy),
              formatDate(row.created_at),
            ]),
            status: text(row.status),
            subtitle: text(row.body).slice(0, 90),
            title: text(row.title) || "제목 없는 투표 요청",
          })),
          title: "최근 커뮤니티/투표",
        },
        {
          action: {
            statuses: [
              { label: "공개", status: "published", tone: "approve" },
              { label: "대기", status: "pending", tone: "neutral" },
              { label: "숨김", status: "hidden", tone: "danger" },
            ],
            table: "community_comments",
          },
          categories: ["community"],
          description: "익명 커뮤니티 댓글 승인 대기 목록입니다.",
          emptyText: "아직 커뮤니티 댓글이 없습니다.",
          items: recentComments.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.anonymous_name),
              text(row.post_id).slice(0, 12),
              formatDate(row.created_at),
            ]),
            status: text(row.status),
            subtitle: text(row.body).slice(0, 90),
            title: "커뮤니티 댓글",
          })),
          title: "최근 커뮤니티 댓글",
        },
        {
          action: {
            statuses: [
              { label: "전달 완료", status: "delivered", tone: "approve" },
              { label: "대기", status: "pending", tone: "neutral" },
              { label: "숨김", status: "hidden", tone: "danger" },
            ],
            table: "community_messages",
          },
          categories: ["community"],
          description: "DM 허용 게시글에 들어온 메시지 전달 요청입니다.",
          emptyText: "아직 DM 요청이 없습니다.",
          items: recentMessages.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.sender_name) || "익명",
              text(row.contact),
              formatDate(row.created_at),
            ]),
            status: text(row.status),
            subtitle: text(row.body).slice(0, 90),
            title: "커뮤니티 DM 요청",
          })),
          title: "최근 DM 요청",
        },
        {
          action: {
            statuses: [
              { label: "발송 완료", status: "sent", tone: "approve" },
              { label: "대기", status: "queued", tone: "neutral" },
              { label: "실패", status: "failed", tone: "danger" },
              { label: "취소", status: "cancelled", tone: "danger" },
            ],
            table: "notification_events",
          },
          categories: ["system"],
          description: "투표, DM, 결제 완료 이후 고객에게 나갈 Web Push 알림 큐입니다.",
          emptyText: "아직 알림 이벤트가 없습니다.",
          items: recentNotificationEvents.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.event_type),
              row.sent_at ? `발송 ${formatDate(row.sent_at)}` : "",
              formatDate(row.created_at),
            ]),
            status: text(row.status),
            subtitle: text(row.body).slice(0, 90),
            title: text(row.title) || "알림 이벤트",
          })),
          title: "최근 알림 이벤트",
        },
        {
          action: {
            statuses: [
              { label: "검토 중", status: "reviewing", tone: "neutral" },
              { label: "처리 완료", status: "resolved", tone: "approve" },
              { label: "기각", status: "dismissed", tone: "danger" },
            ],
            table: "moderation_events",
          },
          categories: ["community"],
          description:
            "커뮤니티, 리뷰, 공유 링크에서 접수된 신고와 삭제 요청입니다.",
          emptyText: "아직 신고나 삭제 요청이 없습니다.",
          items: recentModerationEvents.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.target_type),
              text(row.target_id).slice(0, 18),
              text(row.reporter_contact),
              formatDate(row.updated_at || row.created_at),
            ]),
            status: text(row.status),
            subtitle: text(row.body).slice(0, 90),
            title: text(row.reason) || "신고/삭제 요청",
          })),
          title: "최근 신고/삭제 요청",
        },
        {
          action: {
            statuses: [
              { label: "활성", status: "active", tone: "approve" },
              { label: "철회", status: "revoked", tone: "neutral" },
              { label: "비활성", status: "disabled", tone: "danger" },
            ],
            table: "push_subscriptions",
          },
          categories: ["system"],
          description: "고객 브라우저의 Web Push 수신 동의와 구독 상태입니다.",
          emptyText: "아직 Push 구독이 없습니다.",
          items: recentPushSubscriptions.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.id).slice(0, 12),
              `갱신 ${formatDate(row.updated_at || row.created_at)}`,
            ]),
            status: text(row.status),
            subtitle: text(row.consent_context),
            title: text(row.contact) || "익명 브라우저 구독",
          })),
          title: "최근 Push 구독",
        },
        {
          categories: ["revenue"],
          description: "결제 검증과 투표 노출 상품 처리 상태입니다.",
          emptyText: "아직 결제 이벤트가 없습니다.",
          items: recentPayments.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.product_id),
              amount(row.amount),
              row.verified === true ? "검증됨" : "미검증",
              formatDate(row.created_at),
            ]),
            status: text(row.status),
            subtitle: text(row.payment_id),
            title: "PortOne 결제 이벤트",
          })),
          title: "최근 결제 이벤트",
        },
        {
          categories: ["customers", "revenue"],
          description:
            "H머니 충전, 추천 차감, 환불, 운영 조정을 추적하는 계정 원장입니다.",
          emptyText: "아직 H머니 원장 거래가 없습니다.",
          items: recentHairMoneyLedger.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.direction),
              `${number(row.amount)} HM`,
              `잔액 ${number(row.balance_after)} HM`,
              text(row.source_type),
              formatDate(row.created_at),
            ]),
            status: text(row.direction),
            subtitle: joinMeta([
              text(row.profile_id).slice(0, 12),
              text(row.source_id).slice(0, 24),
              text(row.reason),
            ]),
            title: "H머니 원장 거래",
          })),
          title: "최근 H머니 원장",
        },
        {
          action: {
            statuses: [
              { label: "활성", status: "active", tone: "approve" },
              { label: "비활성", status: "revoked", tone: "danger" },
            ],
            table: "consultation_shares",
          },
          categories: ["customers"],
          description: "미용사나 지인에게 전달된 공유 보드 링크입니다.",
          emptyText: "아직 공유 링크가 없습니다.",
          items: recentShares.map((row) => ({
            id: text(row.token),
            meta: joinMeta([
              row.revoked_at ? "비활성" : "활성",
              `만료 ${formatDate(row.expires_at)}`,
            ]),
            status: row.revoked_at ? "revoked" : "active",
            subtitle: text(row.session_id),
            title: text(row.token).slice(0, 18),
          })),
          title: "최근 공유 링크",
        },
        {
          categories: ["customers", "system"],
          description:
            "미용사나 고객에게 전송한 상담 결과 이메일입니다. 공유 링크와 Resend 발송 ID를 함께 추적합니다.",
          emptyText: "아직 이메일 공유 발송 기록이 없습니다.",
          items: recentEmailEvents.map((row) => ({
            id: text(row.id),
            meta: joinMeta([
              text(row.recipient_email),
              text(row.resend_email_id).slice(0, 20),
              text(row.share_token).slice(0, 14),
              formatDate(row.updated_at || row.created_at),
            ]),
            status: text(row.status),
            subtitle: text(row.error_message) || text(row.session_id),
            title: "상담 결과 이메일",
          })),
          title: "최근 이메일 공유",
        },
      ],
    };
  } catch (error) {
    console.error("admin operations summary failed", error);

    return {
      connected: true,
      error: error instanceof Error ? error.message : "admin_summary_failed",
      metrics: [],
      sections: [],
    };
  }
}

async function syncAuthUsersToProfiles(supabase: SupabaseAdminClient) {
  const { data: existingProfiles, error: existingError } = await supabase
    .from("profiles")
    .select("id");

  if (existingError) {
    console.error("admin profile sync existing profile load failed", existingError);
    return;
  }

  const existingProfileIds = new Set(
    (existingProfiles ?? [])
      .map((row) => text((row as RecentRow).id))
      .filter(Boolean),
  );
  const authUsers = await listAllAuthUsers(supabase);
  const missingProfiles = authUsers
    .filter((user) => user.id && !existingProfileIds.has(user.id))
    .map((user) => ({
      created_at: user.created_at ?? new Date().toISOString(),
      display_name: getAuthUserDisplayName(user),
      email: user.email ?? null,
      id: user.id,
      provider: getAuthUserProvider(user),
      updated_at: new Date().toISOString(),
    }));

  if (!missingProfiles.length) {
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(missingProfiles, { onConflict: "id" });

  if (error) {
    console.error("admin profile sync upsert failed", error);
  }
}

async function listAllAuthUsers(supabase: SupabaseAdminClient) {
  const users: AuthUserLike[] = [];

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      console.error("admin auth user load failed", error);
      break;
    }

    const nextUsers = (data.users ?? []) as AuthUserLike[];

    users.push(...nextUsers);

    if (nextUsers.length < 100) {
      break;
    }
  }

  return users;
}

type AuthUserLike = {
  app_metadata?: Record<string, unknown>;
  created_at?: string;
  email?: string;
  id: string;
  identities?: Array<{ provider?: string | null }>;
  user_metadata?: Record<string, unknown>;
};

function getAuthUserDisplayName(user: AuthUserLike) {
  return (
    text(user.user_metadata?.display_name) ||
    text(user.user_metadata?.full_name) ||
    text(user.user_metadata?.name) ||
    text(user.email).split("@")[0] ||
    "Miri Look member"
  );
}

function getAuthUserProvider(user: AuthUserLike) {
  return (
    text(user.app_metadata?.provider) ||
    text(user.identities?.[0]?.provider) ||
    "email"
  );
}

async function countRows(tableName: string): Promise<CountResult> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { count: 0, error: "supabase_not_configured" };
  }

  const result = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });

  if (result.error) {
    return {
      count: 0,
      error: result.error.message,
    };
  }

  return { count: result.count ?? 0 };
}

async function selectRecent(tableName: string, columns: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const result = await supabase
    .from(tableName)
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(5);

  if (result.error) {
    console.error(`admin ${tableName} select failed`, result.error);
    return [];
  }

  return (result.data ?? []) as unknown as RecentRow[];
}

async function selectRecentConsultationSessions(): Promise<RecentRow[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const sessionsResult = await supabase
    .from("generation_sessions")
    .select(
      "id, profile_id, style_name, hair_color_name, audience_name, region_name, source_photo_count, style_memo, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(adminRecentConsultationLimit);

  if (sessionsResult.error) {
    console.error("admin consultation sessions select failed", sessionsResult.error);
    return [];
  }

  const sessions = (sessionsResult.data ?? []) as AdminConsultationSessionRow[];
  const sessionIds = sessions.map((session) => session.id).filter(Boolean);
  const profileIds = Array.from(
    new Set(sessions.map((session) => session.profile_id).filter(Boolean)),
  ) as string[];

  const [assetsBySession, profilesById] = await Promise.all([
    loadConsultationAssetsBySession(supabase, sessionIds),
    loadProfilesById(supabase, profileIds),
  ]);

  return Promise.all(
    sessions.map(async (session) => {
      const assets = assetsBySession.get(session.id) ?? [];
      const profile = session.profile_id
        ? profilesById.get(session.profile_id)
        : undefined;
      const [sourcePhotos, recommendationImages, consultationImages] =
        await Promise.all([
          buildAdminSignedAssetImages(
            supabase,
            filterAdminAssetsByType(assets, "source_photo"),
            3,
          ),
          buildAdminSignedAssetImages(
            supabase,
            filterAdminAssetsByType(assets, "recommendation_preview"),
            9,
          ),
          buildAdminSignedAssetImages(
            supabase,
            filterAdminAssetsByType(assets, "final_angle"),
            9,
          ),
        ]);

      return {
        ...session,
        consultation_images: consultationImages,
        customer_display_name: profile?.display_name ?? null,
        customer_email: profile?.email ?? null,
        recommendation_images: recommendationImages,
        source_photos: sourcePhotos,
      } satisfies RecentRow;
    }),
  );
}

async function loadConsultationAssetsBySession(
  supabase: SupabaseAdminClient,
  sessionIds: string[],
) {
  const assetsBySession = new Map<string, AdminConsultationAssetRow[]>();

  if (!sessionIds.length) {
    return assetsBySession;
  }

  const assetsResult = await supabase
    .from("generation_assets")
    .select("session_id, asset_type, angle_label, display_order, storage_path, original_url")
    .in("session_id", sessionIds)
    .in("asset_type", adminConsultationAssetTypes)
    .order("display_order", { ascending: true });

  if (assetsResult.error) {
    console.error("admin consultation assets select failed", assetsResult.error);
    return assetsBySession;
  }

  ((assetsResult.data ?? []) as AdminConsultationAssetRow[]).forEach((asset) => {
    const current = assetsBySession.get(asset.session_id) ?? [];
    current.push(asset);
    assetsBySession.set(asset.session_id, current);
  });

  return assetsBySession;
}

async function loadProfilesById(
  supabase: SupabaseAdminClient,
  profileIds: string[],
) {
  const profilesById = new Map<string, AdminProfileLookupRow>();

  if (!profileIds.length) {
    return profilesById;
  }

  const profilesResult = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", profileIds);

  if (profilesResult.error) {
    console.error("admin consultation profile select failed", profilesResult.error);
    return profilesById;
  }

  ((profilesResult.data ?? []) as AdminProfileLookupRow[]).forEach((profile) => {
    profilesById.set(profile.id, profile);
  });

  return profilesById;
}

function filterAdminAssetsByType(
  assets: AdminConsultationAssetRow[],
  assetType: AdminConsultationAssetType,
) {
  return assets.filter((asset) => asset.asset_type === assetType);
}

async function buildAdminSignedAssetImages(
  supabase: SupabaseAdminClient,
  assets: AdminConsultationAssetRow[],
  limit: number,
) {
  const bucket = getConsultationStorageBucket();

  const images = await Promise.all(
    assets
      .slice()
      .sort((left, right) => (left.display_order ?? 0) - (right.display_order ?? 0))
      .slice(0, limit)
      .map(async (asset, index) => {
        let imageUrl = text(asset.original_url);

        if (asset.storage_path && supabase) {
          const signed = await supabase.storage
            .from(bucket)
            .createSignedUrl(asset.storage_path, 60 * 60);

          if (signed.error) {
            console.warn("admin consultation asset signed url failed", signed.error);
          }

          imageUrl = signed.data?.signedUrl ?? imageUrl;
        }

        return {
          assetType: asset.asset_type as AdminOperationImage["assetType"],
          displayOrder: asset.display_order ?? index + 1,
          imageUrl,
          label: asset.angle_label ?? `${index + 1}번`,
        } satisfies AdminOperationImage;
      }),
  );

  return images.filter((image) => Boolean(image.imageUrl));
}

async function selectCustomerProfiles(): Promise<RecentRow[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const profilesResult = await supabase
    .from("profiles")
    .select("id, email, display_name, provider, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (profilesResult.error) {
    console.error("admin customer profiles select failed", profilesResult.error);
    return [];
  }

  const profiles = (profilesResult.data ?? []) as unknown as RecentRow[];
  const profileIds = profiles.map((row) => text(row.id)).filter(Boolean);

  if (!profileIds.length) {
    return profiles.map((row) => ({
      ...row,
      hair_money_balance: 0,
    }));
  }

  const accountsResult = await supabase
    .from("hair_money_accounts")
    .select("profile_id, balance")
    .in("profile_id", profileIds);

  if (accountsResult.error) {
    console.error("admin customer hair money select failed", accountsResult.error);

    return profiles.map((row) => ({
      ...row,
      hair_money_balance: 0,
    }));
  }

  const balanceByProfileId = new Map(
    (accountsResult.data ?? []).map((row) => [
      text((row as RecentRow).profile_id),
      Number((row as RecentRow).balance ?? 0),
    ]),
  );

  return profiles.map((row) => ({
    ...row,
    hair_money_balance: balanceByProfileId.get(text(row.id)) ?? 0,
  }));
}

function amount(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return "";
  }

  return `${parsed.toLocaleString("ko-KR")}원`;
}

function number(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return "0";
  }

  return parsed.toLocaleString("ko-KR");
}

function rating(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return "";
  }

  return `평점 ${parsed}`;
}

function score(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return "";
  }

  return `추천 ${Math.round(parsed)}`;
}

function formatCount(result: CountResult) {
  if (result.error) {
    return "확인 필요";
  }

  return result.count.toLocaleString("ko-KR");
}

function formatDate(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeZone: "Asia/Seoul",
    timeStyle: "short",
  }).format(date);
}

function joinMeta(values: string[]) {
  return values.filter(Boolean).join(" · ");
}

function formatVoteGenderMeta(requester: unknown, target: unknown) {
  const requesterLabel = genderLabel(text(requester));
  const targetLabel = genderLabel(text(target));

  if (!requesterLabel && !targetLabel) {
    return "";
  }

  return `${requesterLabel || "비공개"} -> ${targetLabel || "전체"}`;
}

function supportCaseTypeLabel(value: string) {
  switch (value) {
    case "generation_failure":
      return "생성 실패";
    case "refund_request":
      return "환불 요청";
    case "payment_issue":
      return "결제 문제";
    case "account_issue":
      return "계정 문제";
    case "data_deletion":
      return "데이터 삭제 요청";
    case "general_inquiry":
      return "일반 문의";
    default:
      return value;
  }
}

function supportPriorityLabel(value: string) {
  switch (value) {
    case "urgent":
      return "긴급";
    case "high":
      return "높음";
    case "low":
      return "낮음";
    case "normal":
      return "보통";
    default:
      return value;
  }
}

function genderLabel(value: string) {
  switch (value) {
    case "male":
      return "남성";
    case "female":
      return "여성";
    case "other":
      return "기타";
    default:
      return "";
  }
}

function imageList(value: unknown): AdminOperationImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const images: AdminOperationImage[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const record = item as Record<string, unknown>;
    const imageUrl = text(record.imageUrl);

    if (!imageUrl) {
      return;
    }

    const assetType = text(record.assetType);
    const displayOrder = Number(record.displayOrder);

    images.push({
      assetType:
        assetType === "final_angle" ||
        assetType === "recommendation_preview" ||
        assetType === "source_photo"
          ? assetType
          : undefined,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : undefined,
      imageUrl,
      label: text(record.label) || "사진",
    });
  });

  return images;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
