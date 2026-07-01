import Link from "next/link";
import { AdminOperationsConsole } from "@/components/admin-operations-console";
import { MirilookLogoMark } from "@/components/mirilook-logo-mark";
import { loadAdminOperationsSummary } from "@/lib/server/admin-operations";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Database,
  ImageIcon,
  Mail,
  ShieldCheck,
  Vote,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

type ReadinessTone = "ready" | "partial" | "blocked" | "planned";

type ReadinessItem = {
  description: string;
  label: string;
  tone: ReadinessTone;
  value: string;
};

type LaunchGate = {
  checks: ReadinessItem[];
  icon: LucideIcon;
  title: string;
};

const toneStyles: Record<
  ReadinessTone,
  {
    badge: string;
    border: string;
    dot: string;
    icon: string;
  }
> = {
  ready: {
    badge: "border-[#6fc48d]/40 bg-[#173522] text-[#b7e3bb]",
    border: "border-[#6fc48d]/24",
    dot: "bg-[#6fc48d]",
    icon: "text-[#b7e3bb]",
  },
  partial: {
    badge: "border-[#f3d28a]/42 bg-[#322713] text-[#f3d28a]",
    border: "border-[#f3d28a]/24",
    dot: "bg-[#f3d28a]",
    icon: "text-[#f3d28a]",
  },
  blocked: {
    badge: "border-[#ffad9d]/42 bg-[#391c17] text-[#ffb8aa]",
    border: "border-[#ffad9d]/24",
    dot: "bg-[#ff9c88]",
    icon: "text-[#ffb8aa]",
  },
  planned: {
    badge: "border-white/10 bg-white/5 text-[#b8aa95]",
    border: "border-white/10",
    dot: "bg-[#8f826f]",
    icon: "text-[#b8aa95]",
  },
};

export default async function AdminPage() {
  const integrationItems = buildIntegrationItems();
  const launchGates = buildLaunchGates(integrationItems);
  const operationsSummary = await loadAdminOperationsSummary();
  const readyCount = integrationItems.filter((item) => item.tone === "ready").length;
  const blockedCount = integrationItems.filter(
    (item) => item.tone === "blocked",
  ).length;
  const partialCount = integrationItems.filter(
    (item) => item.tone === "partial",
  ).length;

  return (
    <main className="min-h-screen bg-[#11100e] text-[#f8f1e5]">
      <div className="mx-auto grid w-full max-w-[88rem] gap-6 px-5 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4">
          <Link className="flex items-center gap-3" href="/">
            <MirilookLogoMark className="size-10 shrink-0" decorative />
            <span>
              <span className="block text-sm font-bold tracking-[0.08em] text-[#fffaf1]">
                Miri Look
              </span>
              <span className="text-xs uppercase tracking-[0.18em] text-[#8f826f]">
                Admin
              </span>
            </span>
          </Link>
          <nav className="mt-6 grid gap-2 text-sm font-semibold text-[#b8aa95]">
            {[
              ["운영 홈", "#admin-console"],
              ["고객 관리", "#admin-console"],
              ["미용실 관리", "#admin-console"],
              ["커뮤니티 관리", "#admin-console"],
              ["매출 관리", "#admin-console"],
              ["리서치/시스템", "#admin-console"],
            ].map(([item, href]) => (
              <a
                className="rounded-md bg-white/5 px-3 py-2 text-[#d8cbb8] transition hover:bg-white/10 hover:text-[#f3d28a]"
                href={href}
                key={item}
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="mt-6 rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-3 text-xs leading-5 text-[#b8aa95]">
            `minjae9037@naver.com` 계정 또는 Basic Auth로 접근한 운영자만 이 화면을
            사용할 수 있습니다.
          </div>
        </aside>

        <section className="grid gap-6">
          <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold text-[#f3d28a]">
                운영 대시보드
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[#fffaf1]">
                관리자 운영 콘솔
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b8aa95]">
                고객, 미용실, 커뮤니티, 매출 업무를 탭으로 전환하고 각 항목의 처리
                상태를 바로 변경합니다.
              </p>
            </div>
            <div className="rounded-md border border-[#2b281f] bg-[#171511]/92 px-4 py-3 text-sm text-[#d8cbb8]">
              Final provider:{" "}
              <span className="font-semibold text-[#f3d28a]">
                {process.env.MIRILOOK_FINAL_IMAGE_PROVIDER ?? "openai"}
              </span>
            </div>
          </header>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              icon={CheckCircle2}
              label="연결 완료"
              tone="ready"
              value={`${readyCount}`}
            />
            <SummaryCard
              icon={AlertTriangle}
              label="부분 준비"
              tone="partial"
              value={`${partialCount}`}
            />
            <SummaryCard
              icon={ShieldCheck}
              label="론칭 전 필수"
              tone={blockedCount ? "blocked" : "ready"}
              value={`${blockedCount}`}
            />
          </div>

          <div id="admin-console">
            <AdminOperationsConsole
              integrationItems={integrationItems}
              summary={operationsSummary}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {launchGates.map((gate) => (
              <LaunchGateCard gate={gate} key={gate.title} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone: ReadinessTone;
  value: string;
}) {
  const style = toneStyles[tone];

  return (
    <div className={`rounded-md border ${style.border} bg-[#171511]/92 p-4`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#b8aa95]">{label}</p>
        <Icon aria-hidden="true" className={style.icon} size={18} />
      </div>
      <p className={`mt-4 text-3xl font-bold ${style.icon}`}>{value}</p>
    </div>
  );
}

function ReadinessRow({ item }: { item: ReadinessItem }) {
  const style = toneStyles[item.tone];

  return (
    <div
      className={`rounded-md border ${style.border} bg-[#0f0e0c]/72 px-3 py-3`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`size-2 rounded-full ${style.dot}`} />
          <p className="truncate text-sm font-semibold text-[#fffaf1]">
            {item.label}
          </p>
        </div>
        <span
          className={`rounded-md border px-2 py-1 text-xs font-semibold ${style.badge}`}
        >
          {item.value}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
        {item.description}
      </p>
    </div>
  );
}

function LaunchGateCard({ gate }: { gate: LaunchGate }) {
  const Icon = gate.icon;

  return (
    <section className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="text-[#f3d28a]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">{gate.title}</h2>
      </div>
      <div className="mt-4 grid gap-2">
        {gate.checks.map((item) => (
          <ReadinessRow item={item} key={`${gate.title}-${item.label}`} />
        ))}
      </div>
    </section>
  );
}

function buildIntegrationItems(): ReadinessItem[] {
  return [
    {
      description: "고객 화면에서 실제 AI 생성 API를 호출하는 공개 설정입니다.",
      label: "Live AI",
      tone:
        process.env.NEXT_PUBLIC_ENABLE_LIVE_AI === "true" ? "ready" : "blocked",
      value:
        process.env.NEXT_PUBLIC_ENABLE_LIVE_AI === "true" ? "활성" : "비활성",
    },
    {
      description: "추천 분석과 이미지 생성의 기본 provider 키입니다.",
      label: "OpenAI",
      tone: isConfigured("OPENAI_API_KEY") ? "ready" : "blocked",
      value: isConfigured("OPENAI_API_KEY") ? "연결" : "필요",
    },
    {
      description: "최종 이미지 provider 또는 fallback으로 사용할 Gemini 키입니다.",
      label: "Gemini / Nano Banana Pro 경로",
      tone: isConfigured("GEMINI_API_KEY") ? "ready" : "partial",
      value: isConfigured("GEMINI_API_KEY") ? "연결" : "대기",
    },
    {
      description: "상담 결과, 이미지, 공유 링크를 저장할 전용 Supabase 프로젝트입니다.",
      label: "Supabase",
      tone:
        isConfigured("NEXT_PUBLIC_SUPABASE_URL") &&
        isConfigured("SUPABASE_SERVICE_ROLE_KEY")
          ? "ready"
          : "blocked",
      value:
        isConfigured("NEXT_PUBLIC_SUPABASE_URL") &&
        isConfigured("SUPABASE_SERVICE_ROLE_KEY")
          ? "연결"
          : "전용 프로젝트 필요",
    },
    {
      description:
        "상담 결과를 미용사 또는 고객 이메일로 보내는 발송 키와 검증 발신자 주소입니다.",
      label: "Resend",
      tone:
        isConfigured("RESEND_API_KEY") && isConfigured("RESEND_FROM_EMAIL")
          ? "ready"
          : isConfigured("RESEND_API_KEY")
            ? "partial"
            : "blocked",
      value:
        isConfigured("RESEND_API_KEY") && isConfigured("RESEND_FROM_EMAIL")
          ? "발송 준비"
          : isConfigured("RESEND_API_KEY")
            ? "발신자 주소 필요"
            : "필요",
    },
    {
      description: "장시간 이미지 생성, 재시도, 알림 작업을 비동기로 넘길 큐입니다.",
      label: "Trigger.dev",
      tone: isConfigured("TRIGGER_SECRET_KEY") ? "partial" : "planned",
      value: isConfigured("TRIGGER_SECRET_KEY") ? "키 연결" : "예정",
    },
    {
      description:
        "브라우저 Web Push 구독과 실제 발송에 필요한 VAPID 공개키/비공개키입니다.",
      label: "Web Push",
      tone:
        isConfigured("NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY") &&
        isConfigured("WEB_PUSH_PRIVATE_KEY")
          ? "ready"
          : "blocked",
      value:
        isConfigured("NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY") &&
        isConfigured("WEB_PUSH_PRIVATE_KEY")
          ? "발송 준비"
          : "VAPID 키 필요",
    },
    {
      description:
        "스타일 투표, 재생성, 프리미엄 상담 결제를 처리할 브라우저 키와 서버 검증/웹훅 키입니다.",
      label: "PortOne",
      tone:
        isConfigured("PORTONE_API_SECRET") &&
        isConfigured("NEXT_PUBLIC_PORTONE_STORE_ID") &&
        isConfigured("NEXT_PUBLIC_PORTONE_CHANNEL_KEY") &&
        isConfigured("PORTONE_WEBHOOK_SECRET")
          ? "ready"
          : isConfigured("PORTONE_API_SECRET") &&
              isConfigured("NEXT_PUBLIC_PORTONE_STORE_ID") &&
              isConfigured("NEXT_PUBLIC_PORTONE_CHANNEL_KEY")
            ? "partial"
          : "planned",
      value:
        isConfigured("PORTONE_API_SECRET") &&
        isConfigured("NEXT_PUBLIC_PORTONE_STORE_ID") &&
        isConfigured("NEXT_PUBLIC_PORTONE_CHANNEL_KEY") &&
        isConfigured("PORTONE_WEBHOOK_SECRET")
          ? "검증/웹훅 연결"
          : isConfigured("PORTONE_API_SECRET") &&
              isConfigured("NEXT_PUBLIC_PORTONE_STORE_ID") &&
              isConfigured("NEXT_PUBLIC_PORTONE_CHANNEL_KEY")
            ? "웹훅 시크릿 필요"
          : "예정",
    },
    {
      description:
        "관리자 화면 기본 인증입니다. production에서는 원문 비밀번호 또는 SHA-256 해시 미설정 시 관리자 화면을 닫습니다.",
      label: "Admin Basic Auth",
      tone: isAnyConfigured(
        "MIRILOOK_ADMIN_PASSWORD",
        "FITCUT_ADMIN_PASSWORD",
        "MIRILOOK_ADMIN_PASSWORD_SHA256",
        "FITCUT_ADMIN_PASSWORD_SHA256",
      )
        ? "ready"
        : "blocked",
      value: isAnyConfigured(
        "MIRILOOK_ADMIN_PASSWORD",
        "FITCUT_ADMIN_PASSWORD",
        "MIRILOOK_ADMIN_PASSWORD_SHA256",
        "FITCUT_ADMIN_PASSWORD_SHA256",
      )
        ? "보호"
        : "비밀번호 필요",
    },
  ];
}

function buildLaunchGates(integrations: ReadinessItem[]): LaunchGate[] {
  const integration = new Map(integrations.map((item) => [item.label, item]));

  return [
    {
      icon: ImageIcon,
      title: "고객 AI 생성",
      checks: [
        integration.get("Live AI") ?? planned("Live AI"),
        integration.get("OpenAI") ?? planned("OpenAI"),
        {
          description: "남성/여성 모드, 헤어컷/컬러/퍼스널 컨설팅 선택이 고객 플로우에 반영됩니다.",
          label: "남성/여성 추천 UI",
          tone: "ready",
          value: "구현",
        },
        {
          description: "선택한 스타일 기준 상담용 9장 생성 플로우가 production에 배포되어 있습니다.",
          label: "상담용 9장",
          tone: "ready",
          value: "구현",
        },
      ],
    },
    {
      icon: Database,
      title: "히스토리 / 저장",
      checks: [
        integration.get("Supabase") ?? planned("Supabase"),
        {
          description: "브라우저 IndexedDB에 최근 상담 결과를 저장합니다.",
          label: "로컬 히스토리",
          tone: "ready",
          value: "구현",
        },
        {
          description: "`/mypage`에서 저장된 상담 결과를 다시 열고 PDF 저장, 공유 링크 생성, 삭제를 처리합니다.",
          label: "고객 히스토리 화면",
          tone: "ready",
          value: "구현",
        },
        {
          description: "Supabase 연결 시 세션 메타데이터와 결과 이미지를 저장할 API와 migration이 준비되어 있습니다.",
          label: "서버 저장 API",
          tone: "partial",
          value: "연결 대기",
        },
      ],
    },
    {
      icon: Mail,
      title: "Export / 공유",
      checks: [
        integration.get("Resend") ?? planned("Resend"),
        {
          description: "인쇄 화면을 통해 상담 보드를 PDF로 저장할 수 있습니다.",
          label: "PDF 저장",
          tone: "ready",
          value: "구현",
        },
        {
          description: "각 결과 이미지를 개별 파일로 저장할 수 있습니다.",
          label: "이미지 저장",
          tone: "ready",
          value: "구현",
        },
        {
          description:
            "Supabase 연결 시 만료형 공유 링크를 만들고 `/share/[token]` 상담 보드로 전달합니다. 카카오톡 네이티브 공유는 공식 도메인과 OG 최종 후 연결합니다.",
          label: "공유 링크 / 카카오톡",
          tone: "partial",
          value: "링크 구현",
        },
      ],
    },
    {
      icon: ShieldCheck,
      title: "관리자 / 보안",
      checks: [
        integration.get("Admin Basic Auth") ?? planned("Admin Basic Auth"),
        {
          description: "고객 화면과 운영 화면이 `/`와 `/admin`으로 분리되어 있습니다.",
          label: "화면 분리",
          tone: "ready",
          value: "구현",
        },
        {
          description: "예약, 리뷰, 커뮤니티, 공유 링크 상태 변경 API와 버튼을 붙였습니다.",
          label: "운영 처리",
          tone: "ready",
          value: "콘솔 연결",
        },
      ],
    },
    {
      icon: Building2,
      title: "입점 / 예약 / 지도",
      checks: [
        {
          description:
            "미용실, 디자이너, 리뷰, 예약 문의 테이블과 파일럿 데이터 구조가 준비되어 있고, 입점 승인 시 공개 프로필을 생성합니다.",
          label: "입점 데이터 모델",
          tone: "partial",
          value: "승인 흐름 구현",
        },
        {
          description: "현재는 외부 지도 검색 링크로 연결했고, Kakao 또는 Google Maps 키 연결 후 좌표 기반 지도로 확장합니다.",
          label: "지도",
          tone: "partial",
          value: "검색 링크 구현",
        },
        {
          description: "예약 문의와 파일럿 리뷰 접수 API/화면을 연결했습니다. 상담 보드 첨부는 Supabase 저장 후 연결합니다.",
          label: "예약",
          tone: "partial",
          value: "폼 구현",
        },
      ],
    },
    {
      icon: Vote,
      title: "커뮤니티 / 투표 / 결제",
      checks: [
        integration.get("PortOne") ?? planned("PortOne"),
        integration.get("Trigger.dev") ?? planned("Trigger.dev"),
        integration.get("Web Push") ?? planned("Web Push"),
        {
          description:
            "익명 투표 요청, 대상 성별, 댓글, DM 허용/비허용 정책과 관리자 공개/숨김 처리를 연결했습니다.",
          label: "커뮤니티 / DM",
          tone: "ready",
          value: "콘솔 연결",
        },
        {
          description:
            "투표 요청·댓글·DM은 알림 큐에 쌓이고, Web Push 발송은 Trigger.dev 스케줄러와 VAPID 키 연결 후 자동 처리합니다.",
          label: "투표 / Push",
          tone: "partial",
          value: "큐 구현",
        },
      ],
    },
  ];
}

function planned(label: string): ReadinessItem {
  return {
    description: "아직 연결되지 않은 운영 항목입니다.",
    label,
    tone: "planned",
    value: "예정",
  };
}

function isConfigured(name: string) {
  return Boolean(process.env[name]?.replace(/^\uFEFF/, "").trim());
}

function isAnyConfigured(...names: string[]) {
  return names.some((name) => isConfigured(name));
}
