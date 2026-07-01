"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CreditCard,
  Database,
  Eye,
  ImageIcon,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Scissors,
  Search,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { AdminResearchTrendForm } from "@/components/admin-research-trend-form";
import { AdminStatusActions } from "@/components/admin-status-actions";
import type {
  AdminOperationCategory,
  AdminOperationImage,
  AdminOperationItemDetail,
  AdminOperationMetric,
  AdminOperationSection,
  AdminOperationsSummary,
} from "@/lib/server/admin-operations";

type IntegrationItem = {
  description: string;
  label: string;
  tone: "blocked" | "partial" | "planned" | "ready";
  value: string;
};

type AdminTab = {
  description: string;
  icon: LucideIcon;
  id: AdminOperationCategory;
  metricLabels: string[];
  title: string;
};

type AdminNotificationResult = {
  accepted?: boolean;
  reason?: string;
  triggered?: boolean;
};

const tabs: AdminTab[] = [
  {
    description: "회원, 상담 기록, 고객지원, 환불과 H머니 상태를 처리합니다.",
    icon: Users,
    id: "customers",
    metricLabels: ["회원", "상담 세션", "고객지원", "H머니 원장"],
    title: "고객 관리",
  },
  {
    description: "입점 신청, 예약 문의, 리뷰 승인과 파트너 공개 상태를 관리합니다.",
    icon: Scissors,
    id: "salons",
    metricLabels: ["입점 신청", "예약 문의", "리뷰"],
    title: "미용실 관리",
  },
  {
    description: "사진 피드, 투표, 댓글, DM, 신고와 숨김 처리를 운영합니다.",
    icon: MessageSquare,
    id: "community",
    metricLabels: ["사진 피드", "투표 글", "댓글 / DM", "신고/삭제"],
    title: "커뮤니티 관리",
  },
  {
    description: "PortOne 결제, H머니 원장, 유료 권한과 환불 케이스를 확인합니다.",
    icon: CreditCard,
    id: "revenue",
    metricLabels: ["결제 이벤트", "H머니 원장", "고객지원"],
    title: "매출 관리",
  },
  {
    description: "리서치 agent, 알림 큐, Push, 외부 연동 상태를 점검합니다.",
    icon: Settings,
    id: "system",
    metricLabels: ["트렌드 리서치", "알림 이벤트", "Push 구독"],
    title: "리서치/시스템",
  },
];

const integrationToneStyles = {
  blocked: "border-[#ffad9d]/42 bg-[#391c17] text-[#ffb8aa]",
  partial: "border-[#f3d28a]/42 bg-[#322713] text-[#f3d28a]",
  planned: "border-white/10 bg-white/5 text-[#b8aa95]",
  ready: "border-[#6fc48d]/40 bg-[#173522] text-[#b7e3bb]",
} satisfies Record<IntegrationItem["tone"], string>;

export function AdminOperationsConsole({
  integrationItems,
  summary,
}: {
  integrationItems: IntegrationItem[];
  summary: AdminOperationsSummary;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] =
    useState<AdminOperationCategory>("customers");
  const [selectedDetail, setSelectedDetail] =
    useState<AdminOperationItemDetail | null>(null);
  const [query, setQuery] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isTriggeringNotifications, startNotificationTransition] =
    useTransition();
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const activeSections = useMemo(
    () =>
      filterSections(
        summary.sections.filter((section) => section.categories.includes(activeTab)),
        query,
      ),
    [activeTab, query, summary.sections],
  );
  const tabItemCounts = useMemo(
    () =>
      Object.fromEntries(
        tabs.map((tab) => [
          tab.id,
          summary.sections
            .filter((section) => section.categories.includes(tab.id))
            .reduce((sum, section) => sum + section.items.length, 0),
        ]),
      ) as Record<AdminOperationCategory, number>,
    [summary.sections],
  );

  function refresh() {
    startRefreshTransition(() => router.refresh());
  }

  function triggerNotifications() {
    setNotificationMessage("");
    startNotificationTransition(async () => {
      try {
        const response = await fetch("/api/admin/notifications/", {
          body: JSON.stringify({
            action: "trigger_dispatch",
            limit: 20,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const result = (await response.json()) as AdminNotificationResult;

        if (!response.ok || result.accepted === false) {
          setNotificationMessage(
            result.reason === "trigger_not_configured"
              ? "Trigger.dev 키가 없어 알림 큐를 실행할 수 없습니다."
              : `알림 큐 실행 실패: ${result.reason ?? response.status}`,
          );
          return;
        }

        setNotificationMessage("알림 큐 실행을 요청했습니다.");
        refresh();
      } catch {
        setNotificationMessage("알림 큐 실행 요청 중 네트워크 오류가 발생했습니다.");
      }
    });
  }

  return (
    <section className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database aria-hidden="true" className="text-[#f3d28a]" size={18} />
            <h2 className="text-lg font-semibold text-[#fffaf1]">
              운영 콘솔
            </h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#b8aa95]">
            탭을 눌러 업무 영역을 전환하고, 각 항목의 처리 버튼으로 실제 운영 상태를
            변경합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a] disabled:cursor-wait disabled:opacity-60"
            disabled={isRefreshing}
            onClick={refresh}
            type="button"
          >
            {isRefreshing ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={15} />
            ) : (
              <RefreshCcw aria-hidden="true" size={15} />
            )}
            새로고침
          </button>
          <span
            className={`rounded-md border px-3 py-2 text-xs font-semibold ${
              summary.connected
                ? "border-[#6fc48d]/40 bg-[#173522] text-[#b7e3bb]"
                : "border-[#ffad9d]/42 bg-[#391c17] text-[#ffb8aa]"
            }`}
          >
            {summary.connected ? "Supabase 연결됨" : "Supabase 연결 대기"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              className={`min-h-32 rounded-md border p-3 text-left transition ${
                active
                  ? "border-[#f3d28a] bg-[#2d2414] text-[#fffaf1]"
                  : "border-white/10 bg-[#0f0e0c]/72 text-[#d8cbb8] hover:border-[#f3d28a]/55"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <Icon aria-hidden="true" size={17} />
                  {tab.title}
                </span>
                <span className="rounded-md bg-white/8 px-2 py-1 text-xs font-bold">
                  {tabItemCounts[tab.id] ?? 0}
                </span>
              </span>
              <span className="mt-3 block text-xs leading-5 text-[#b8aa95]">
                {tab.description}
              </span>
            </button>
          );
        })}
      </div>

      {!summary.connected ? (
        <div className="mt-4 rounded-md border border-[#ffad9d]/24 bg-[#391c17]/55 p-4 text-sm leading-6 text-[#ffb8aa]">
          미리룩 전용 Supabase 프로젝트와 service role key가 연결되면 운영 데이터와
          상태 변경 기능이 활성화됩니다.
        </div>
      ) : (
        <>
          {summary.error ? (
            <div className="mt-4 rounded-md border border-[#ffad9d]/24 bg-[#391c17]/55 p-3 text-sm leading-6 text-[#ffb8aa]">
              일부 운영 데이터를 읽지 못했습니다: {summary.error}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-[#fffaf1]">
                    {activeTabConfig.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#b8aa95]">
                    {activeTabConfig.description}
                  </p>
                </div>
                <label className="relative block w-full md:w-80">
                  <Search
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f826f]"
                    size={16}
                  />
                  <input
                    className="h-10 w-full rounded-md border border-white/10 bg-[#0f0e0c] px-9 text-sm text-[#fffaf1] outline-none placeholder:text-[#6f6658] focus:border-[#f3d28a]"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="이름, 이메일, ID, 상태 검색"
                    value={query}
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4">
                {activeSections.length ? (
                  activeSections.map((section) => (
                    <AdminSectionView
                      key={section.title}
                      onOpenDetail={setSelectedDetail}
                      section={section}
                    />
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-white/10 bg-[#0f0e0c]/72 px-3 py-5 text-sm text-[#8f826f]">
                    검색 조건에 맞는 운영 항목이 없습니다.
                  </p>
                )}
              </div>

              {activeTab === "system" ? (
                <div className="mt-4 grid gap-4">
                  <section className="rounded-md border border-white/10 bg-[#0f0e0c]/72 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[#fffaf1]">
                          알림 큐 실행
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-[#8f826f]">
                          queued 상태의 Web Push 알림을 Trigger.dev 작업으로 발송 요청합니다.
                        </p>
                      </div>
                      <button
                        className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#6fc48d]/40 bg-[#173522] px-3 text-sm font-bold text-[#b7e3bb] transition hover:bg-[#21462d] disabled:cursor-wait disabled:opacity-60"
                        disabled={isTriggeringNotifications}
                        onClick={triggerNotifications}
                        type="button"
                      >
                        {isTriggeringNotifications ? (
                          <Loader2
                            aria-hidden="true"
                            className="animate-spin"
                            size={15}
                          />
                        ) : (
                          <Bell aria-hidden="true" size={15} />
                        )}
                        알림 큐 실행
                      </button>
                    </div>
                    {notificationMessage ? (
                      <p className="mt-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-[#d8cbb8]">
                        {notificationMessage}
                      </p>
                    ) : null}
                  </section>
                  <AdminResearchTrendForm />
                </div>
              ) : null}
            </div>

            <aside className="grid h-fit gap-3">
              <MetricPanel
                labels={activeTabConfig.metricLabels}
                metrics={summary.metrics}
              />
              {activeTab === "system" ? (
                <IntegrationPanel integrationItems={integrationItems} />
              ) : null}
            </aside>
          </div>
          {selectedDetail ? (
            <AdminConsultationDetailDialog
              detail={selectedDetail}
              onClose={() => setSelectedDetail(null)}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function AdminSectionView({
  onOpenDetail,
  section,
}: {
  onOpenDetail: (detail: AdminOperationItemDetail) => void;
  section: AdminOperationSection;
}) {
  return (
    <section className="rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#fffaf1]">
            {section.title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#8f826f]">
            {section.description}
          </p>
        </div>
        <span className="w-fit rounded-md bg-white/7 px-2 py-1 text-xs font-semibold text-[#b8aa95]">
          {section.items.length}건
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        {section.items.length ? (
          section.items.map((item) => (
            <article
              className="rounded-md border border-white/10 bg-[#15130f] p-3"
              key={`${section.title}-${item.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-[#fffaf1]">
                  {item.title}
                </p>
                {item.status ? (
                  <span
                    className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${getAdminStatusBadgeClass(
                      item.status,
                    )}`}
                  >
                    {item.status}
                  </span>
                ) : null}
              </div>
              {item.subtitle ? (
                <p className="mt-1 whitespace-pre-line break-words text-xs leading-5 text-[#b8aa95]">
                  {item.subtitle}
                </p>
              ) : null}
              {item.meta ? (
                <p className="mt-2 break-words text-xs leading-5 text-[#8f826f]">
                  {item.meta}
                </p>
              ) : null}
              {item.detail?.type === "consultation_history" ? (
                <button
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-[#c9a96a]/50 px-3 text-xs font-bold text-[#f3d28a] transition hover:bg-[#f3d28a]/10"
                  onClick={() => onOpenDetail(item.detail as AdminOperationItemDetail)}
                  type="button"
                >
                  <Eye aria-hidden="true" size={14} />
                  원본/추천/상담 사진 보기
                </button>
              ) : null}
              {section.action ? (
                <AdminStatusActions action={section.action} itemId={item.id} />
              ) : null}
            </article>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-white/10 px-3 py-4 text-sm text-[#8f826f]">
            {section.emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

function AdminConsultationDetailDialog({
  detail,
  onClose,
}: {
  detail: AdminOperationItemDetail;
  onClose: () => void;
}) {
  const groups = [
    {
      description: "고객이 상담 전에 업로드한 원본 사진입니다.",
      images: detail.sourcePhotos,
      title: "1. 고객 원본 사진",
    },
    {
      description: "고객이 추천받은 스타일 후보 이미지입니다.",
      images: detail.recommendationImages,
      title: "2. 추천 받은 스타일 9장",
    },
    {
      description: "선택 스타일 기준으로 생성된 각도별 상담 이미지입니다.",
      images: detail.consultationImages,
      title: "3. 상담용 이미지 9장",
    },
  ];

  return (
    <div
      aria-label="상담 히스토리 사진 상세"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-md border border-[#2b281f] bg-[#11100e] shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-[#171511]/95 p-4 backdrop-blur">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#f3d28a]">
              상담 히스토리 상세
            </p>
            <h3 className="mt-1 truncate text-xl font-bold text-[#fffaf1]">
              {detail.styleName || "미리룩 상담 결과"}
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#8f826f]">
              {detail.createdAt ? formatAdminDate(detail.createdAt) : ""}
            </p>
          </div>
          <button
            aria-label="상세 창 닫기"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-white/12 bg-[#0f0e0c] text-[#d8cbb8] transition hover:bg-white/10 hover:text-[#fffaf1]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-4">
          <div className="grid gap-2 rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3 text-xs leading-5 text-[#d8cbb8] md:grid-cols-2">
            <AdminDetailMeta label="고객 ID" value={detail.customerId} />
            <AdminDetailMeta label="이메일" value={detail.customerEmail} />
            <AdminDetailMeta label="고객명" value={detail.customerDisplayName} />
            <AdminDetailMeta label="세션 ID" value={detail.sessionId} />
            <AdminDetailMeta label="대상" value={detail.audienceName} />
            <AdminDetailMeta label="헤어 컬러" value={detail.hairColorName} />
            <AdminDetailMeta label="지역" value={detail.regionName} />
          </div>

          {detail.memo ? (
            <div className="rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3">
              <p className="text-xs font-bold text-[#8f826f]">고객 메모</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#d8cbb8]">
                {detail.memo}
              </p>
            </div>
          ) : null}

          {groups.map((group) => (
            <AdminConsultationImageGroup
              description={group.description}
              images={group.images}
              key={group.title}
              title={group.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminDetailMeta({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="min-w-0 rounded-md bg-white/5 px-3 py-2">
      <p className="text-[11px] font-bold text-[#8f826f]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#fffaf1]">
        {value || "-"}
      </p>
    </div>
  );
}

function AdminConsultationImageGroup({
  description,
  images,
  title,
}: {
  description: string;
  images: AdminOperationImage[];
  title: string;
}) {
  return (
    <section className="rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-[#fffaf1]">{title}</h4>
          <p className="mt-1 text-xs leading-5 text-[#8f826f]">
            {description}
          </p>
        </div>
        <span className="rounded-md bg-white/7 px-2 py-1 text-xs font-bold text-[#b8aa95]">
          {images.length}장
        </span>
      </div>
      {images.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
          {images.map((image, index) => (
            <a
              className="group overflow-hidden rounded-md border border-white/10 bg-[#15130f] transition hover:border-[#f3d28a]/60"
              href={image.imageUrl}
              key={`${image.assetType ?? "image"}-${image.displayOrder ?? index}-${image.label}`}
              rel="noreferrer"
              target="_blank"
            >
              <div className="relative aspect-square overflow-hidden bg-[#080705]">
                <img
                  alt={`${title} ${image.label}`}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
                  src={image.imageUrl}
                />
                <span className="absolute left-2 top-2 rounded-md bg-[#11100e]/82 px-2 py-1 text-[11px] font-bold text-[#f3d28a]">
                  {image.label}
                </span>
              </div>
              <div className="flex items-center gap-2 px-2 py-2 text-xs font-semibold text-[#b8aa95]">
                <ImageIcon aria-hidden="true" size={13} />
                <span className="truncate">{image.label}</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-white/10 px-3 py-4 text-sm text-[#8f826f]">
          저장된 사진이 없습니다.
        </p>
      )}
    </section>
  );
}

function getAdminStatusBadgeClass(status: string) {
  const normalized = status.trim().toLowerCase();
  const hairMoneyMatch = normalized.match(/^h?머니\s*(\d+)개$/);

  if (hairMoneyMatch) {
    const balance = Number(hairMoneyMatch[1] ?? 0);

    return balance > 0
      ? "border-[#6fc48d]/40 bg-[#173522] text-[#b7e3bb]"
      : "border-[#f3d28a]/42 bg-[#322713] text-[#f3d28a]";
  }

  if (
    [
      "active",
      "approved",
      "completed",
      "credit",
      "published",
      "refunded",
      "resolved",
      "sent",
    ].includes(normalized)
  ) {
    return "border-[#6fc48d]/40 bg-[#173522] text-[#b7e3bb]";
  }

  if (["debit", "done", "pending", "queued", "reviewing"].includes(normalized)) {
    return "border-[#f3d28a]/42 bg-[#322713] text-[#f3d28a]";
  }

  if (["delivered", "contacted", "waiting_customer"].includes(normalized)) {
    return "border-[#9cc8ff]/35 bg-[#102136] text-[#bcd5ef]";
  }

  if (
    ["cancelled", "disabled", "dismissed", "failed", "hidden", "rejected", "revoked"].includes(
      normalized,
    )
  ) {
    return "border-[#ffad9d]/42 bg-[#391c17] text-[#ffb8aa]";
  }

  return "border-white/10 bg-white/7 text-[#b8aa95]";
}

function MetricPanel({
  labels,
  metrics,
}: {
  labels: string[];
  metrics: AdminOperationMetric[];
}) {
  return (
    <section className="rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3">
      <h3 className="text-sm font-semibold text-[#fffaf1]">핵심 지표</h3>
      <div className="mt-3 grid gap-2">
        {labels.map((label) => {
          const metric = metrics.find((item) => item.label === label);

          return (
            <div
              className="rounded-md border border-white/10 bg-[#15130f] p-3"
              key={label}
            >
              <p className="text-xs font-semibold text-[#8f826f]">{label}</p>
              <p className="mt-1 text-xl font-bold text-[#fffaf1]">
                {metric?.value ?? "0"}
              </p>
              {metric?.description ? (
                <p className="mt-1 text-xs leading-5 text-[#8f826f]">
                  {metric.description}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function IntegrationPanel({
  integrationItems,
}: {
  integrationItems: IntegrationItem[];
}) {
  return (
    <section className="rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3">
      <h3 className="text-sm font-semibold text-[#fffaf1]">서비스 연결</h3>
      <div className="mt-3 grid gap-2">
        {integrationItems.map((item) => (
          <div
            className="rounded-md border border-white/10 bg-[#15130f] p-3"
            key={item.label}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#d8cbb8]">
                {item.label}
              </p>
              <span
                className={`rounded-md border px-2 py-1 text-xs font-bold ${integrationToneStyles[item.tone]}`}
              >
                {item.value}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#8f826f]">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatAdminDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function filterSections(sections: AdminOperationSection[], query: string) {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return sections;
  }

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        [item.id, item.title, item.subtitle, item.meta, item.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle),
      ),
    }))
    .filter((section) => section.items.length);
}
