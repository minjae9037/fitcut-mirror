import Image from "next/image";
import Link from "next/link";
import { MirilookLogoMark } from "@/components/mirilook-logo-mark";
import { MirilookShareActions } from "@/components/mirilook-share-actions";
import {
  getConsultationStorageBucket,
  getSupabaseAdminClient,
} from "@/lib/server/supabase-admin";

/* eslint-disable @next/next/no-img-element */

type SharePageProps = {
  params: Promise<{
    token: string;
  }>;
};

type GenerationSessionRow = {
  audience_name: string | null;
  completed_at: string | null;
  consulting_focus_names: string[] | null;
  hair_color_name: string | null;
  id: string;
  source_photo_count: number | null;
  style_memo: string | null;
  style_name: string | null;
};

type GenerationAssetRow = {
  angle_label: string | null;
  display_order: number | null;
  original_url: string | null;
  storage_path: string | null;
};

type RecommendationRow = {
  caution: string | null;
  reason: string | null;
  salon_process: string | null;
  tags: string[] | null;
};

type RecommendationAdvice = {
  makeupAdvice?: string;
  maintenanceAdvice?: string;
  outfitAdvice?: string;
};

const siteUrl = "https://mirilook.com";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await loadSharedConsultation(token);
  const shareUrl = buildAbsoluteShareUrl(token);

  if (!data.ok) {
    return {
      title: `${data.title} | Miri Look`,
      description: data.message,
      alternates: {
        canonical: shareUrl,
      },
      robots: {
        follow: false,
        index: false,
      },
    };
  }

  const styleName = data.session.style_name || "미리룩 상담 결과";
  const title = `${styleName} 상담 결과 | Miri Look`;
  const description = [
    data.session.hair_color_name,
    data.session.audience_name,
    `사진 ${data.session.source_photo_count ?? 0}장 기준`,
  ]
    .filter(Boolean)
    .join(" · ");
  const imageUrl = buildAbsoluteThumbnailUrl(token, data.session.completed_at);

  return {
    title,
    description,
    alternates: {
      canonical: shareUrl,
    },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      siteName: "Miri Look",
      url: shareUrl,
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1024,
          height: 1024,
          alt: `${styleName} 상담 결과 이미지`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const data = await loadSharedConsultation(token);

  if (!data.ok) {
    return <ShareMessage title={data.title} message={data.message} />;
  }

  const { advice, assets, recommendation, session, share } = data;

  return (
    <main className="min-h-screen bg-[#11100e] text-[#f8f1e5]">
      <section className="relative min-h-screen overflow-hidden">
        <Image
          alt="Premium salon consultation suite"
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src={asset("/mock/premium-salon-suite.png")}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,16,14,0.96)_0%,rgba(17,16,14,0.84)_48%,rgba(17,16,14,0.58)_100%)]" />
        <div className="relative z-10 mx-auto max-w-6xl px-5 py-6">
          <header className="flex items-center justify-between gap-4">
            <Link className="flex items-center gap-3 transition hover:opacity-85" href="/">
              <MirilookLogoMark className="size-11 shrink-0" decorative />
              <div>
                <p className="text-lg font-semibold tracking-[0.08em]">Miri Look</p>
                <p className="text-xs uppercase tracking-[0.24em] text-[#b8aa95]">
                  Shared Consultation
                </p>
              </div>
            </Link>
            <Link
              className="rounded-md border border-[#c9a96a]/50 px-3 py-2 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#f3d28a]/10"
              href="/"
            >
              내 스타일 만들기
            </Link>
          </header>

          <section className="mt-10 rounded-lg border border-white/12 bg-[#171511]/90 p-4 shadow-2xl shadow-black/40 backdrop-blur md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f3d28a]">
              Salon Reference Board
            </p>
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold leading-tight text-[#fffaf1] md:text-4xl">
                  {session.style_name || "미리룩 상담 결과"}
                </h1>
                <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
                  {formatDate(session.completed_at)} · {session.audience_name || "헤어 상담"} · 사진{" "}
                  {session.source_photo_count ?? 0}장 기준
                </p>
              </div>
              <div className="rounded-md border border-[#c9a96a]/35 bg-[#30271a]/70 px-3 py-2 text-sm text-[#f3d28a]">
                {formatDate(share.expires_at)}까지 열람 가능
              </div>
            </div>
            <div className="mt-4 rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-3">
              <MirilookShareActions
                text="미리룩에서 만든 헤어 상담 보드입니다."
                title={`${session.style_name || "Miri Look"} 상담 결과`}
              />
            </div>

            <div className="mt-5 grid gap-4 rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-4 md:grid-cols-3">
              <InfoBlock label="헤어 컬러" value={session.hair_color_name || "-"} />
              <InfoBlock
                label="상담 포커스"
                value={(session.consulting_focus_names ?? []).join(" · ") || "-"}
              />
              <InfoBlock label="공유 코드" value={token.slice(0, 14)} />
            </div>

            {session.style_memo ? (
              <p className="mt-4 rounded-md border border-white/10 bg-[#0f0e0c]/72 px-4 py-3 text-sm leading-6 text-[#d8cbb8]">
                {session.style_memo}
              </p>
            ) : null}

            {recommendation?.reason || hasAdvice(advice, recommendation) ? (
              <section className="mt-4 rounded-md border border-white/10 bg-[#0f0e0c]/72 p-4">
                <h2 className="text-base font-semibold text-[#fffaf1]">
                  상담 조언
                </h2>
                {recommendation?.reason ? (
                  <p className="mt-2 text-sm leading-6 text-[#d8cbb8]">
                    {recommendation.reason}
                  </p>
                ) : null}
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <AdviceLine label="시술" value={recommendation?.salon_process} />
                  <AdviceLine label="관리" value={advice.maintenanceAdvice} />
                  <AdviceLine label="코디" value={advice.outfitAdvice} />
                  <AdviceLine label="메이크업" value={advice.makeupAdvice} />
                </div>
              </section>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
              {assets.map((item, index) => (
                <figure
                  className="overflow-hidden rounded-md border border-white/10 bg-[#11100e]"
                  key={`${item.label}-${item.url}`}
                >
                  <img
                    alt={`${session.style_name || "상담 결과"} ${item.label}`}
                    className="aspect-square w-full object-cover"
                    src={item.url}
                  />
                  <figcaption className="px-3 py-2 text-sm font-semibold text-[#fffaf1]">
                    <span>{item.label}</span>
                    <a
                      className="float-right text-xs font-bold text-[#f3d28a] underline-offset-4 hover:underline"
                      download={buildShareImageFileName(
                        session.style_name,
                        item.label,
                        index,
                      )}
                      href={item.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      저장
                    </a>
                  </figcaption>
                </figure>
              ))}
            </div>

            <p className="mt-5 text-xs leading-5 text-[#8f826f]">
              AI 이미지는 상담 참고용 시안이며 실제 시술 결과를 보장하지 않습니다. 미용사는 모발 상태,
              두상, 손상도, 관리 난이도를 함께 확인해 주세요.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f826f]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#fffaf1]">{value}</p>
    </div>
  );
}

function AdviceLine({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <p className="text-sm leading-6 text-[#d8cbb8]">
      <span className="mr-2 rounded-md bg-[#f3d28a]/12 px-2 py-1 text-xs font-semibold text-[#f3d28a]">
        {label}
      </span>
      {value}
    </p>
  );
}

function ShareMessage({ message, title }: { message: string; title: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#11100e] px-5 text-[#f8f1e5]">
      <section className="w-full max-w-lg rounded-lg border border-white/12 bg-[#171511] p-6 text-center">
        <MirilookLogoMark className="mx-auto size-12" decorative />
        <h1 className="mt-4 text-2xl font-bold text-[#fffaf1]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#b8aa95]">{message}</p>
        <Link
          className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#1a1712]"
          href="/"
        >
          홈으로 이동
        </Link>
      </section>
    </main>
  );
}

async function loadSharedConsultation(token: string) {
  const safeToken = sanitizeToken(token);

  if (!safeToken) {
    return {
      message: "공유 링크 형식이 올바르지 않습니다.",
      ok: false as const,
      title: "공유 링크를 열 수 없습니다",
    };
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      message: "서버 저장소가 아직 연결되지 않아 공유 결과를 불러올 수 없습니다.",
      ok: false as const,
      title: "공유 기능 준비 중",
    };
  }

  const shareResult = await supabase
    .from("consultation_shares")
    .select("token, session_id, expires_at, revoked_at")
    .eq("token", safeToken)
    .maybeSingle();

  if (shareResult.error || !shareResult.data) {
    return {
      message: "공유 링크가 없거나 삭제되었습니다.",
      ok: false as const,
      title: "공유 링크를 찾을 수 없습니다",
    };
  }

  if (shareResult.data.revoked_at) {
    return {
      message: "이 공유 링크는 더 이상 사용할 수 없습니다.",
      ok: false as const,
      title: "공유가 종료되었습니다",
    };
  }

  if (new Date(shareResult.data.expires_at).getTime() < Date.now()) {
    return {
      message: "공유 링크의 열람 기간이 만료되었습니다.",
      ok: false as const,
      title: "공유 기간이 만료되었습니다",
    };
  }

  const sessionResult = await supabase
    .from("generation_sessions")
    .select(
      "id, audience_name, completed_at, consulting_focus_names, hair_color_name, source_photo_count, style_memo, style_name",
    )
    .eq("id", shareResult.data.session_id)
    .maybeSingle<GenerationSessionRow>();

  if (sessionResult.error || !sessionResult.data) {
    return {
      message: "상담 결과 원본을 찾을 수 없습니다.",
      ok: false as const,
      title: "상담 결과가 없습니다",
    };
  }

  const recommendationResult = await supabase
    .from("hairstyle_recommendations")
    .select("reason, tags, salon_process, caution")
    .eq("session_id", sessionResult.data.id)
    .order("rank", { ascending: true })
    .limit(1)
    .maybeSingle<RecommendationRow>();

  if (recommendationResult.error) {
    console.warn("shared recommendation load failed", recommendationResult.error);
  }

  const assetResult = await supabase
    .from("generation_assets")
    .select("angle_label, display_order, original_url, storage_path")
    .eq("session_id", sessionResult.data.id)
    .eq("asset_type", "final_angle")
    .order("display_order", { ascending: true })
    .returns<GenerationAssetRow[]>();

  if (assetResult.error) {
    return {
      message: "상담 이미지를 불러오지 못했습니다.",
      ok: false as const,
      title: "이미지 로딩 실패",
    };
  }

  const assets = await buildShareAssets(assetResult.data ?? []);

  if (!assets.length) {
    return {
      message: "공유할 상담 이미지가 없습니다.",
      ok: false as const,
      title: "이미지가 없습니다",
    };
  }

  return {
    advice: decodeRecommendationAdvice(recommendationResult.data?.caution),
    assets,
    ok: true as const,
    recommendation: recommendationResult.data ?? null,
    session: sessionResult.data,
    share: shareResult.data,
  };
}

async function buildShareAssets(assets: GenerationAssetRow[]) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const bucket = getConsultationStorageBucket();

  return (
    await Promise.all(
      assets.map(async (asset, index) => {
        if (asset.storage_path) {
          const signed = await supabase.storage
            .from(bucket)
            .createSignedUrl(asset.storage_path, 60 * 60);

          if (signed.data?.signedUrl) {
            return {
              label: asset.angle_label || `${index + 1}번`,
              url: signed.data.signedUrl,
            };
          }
        }

        if (asset.original_url) {
          return {
            label: asset.angle_label || `${index + 1}번`,
            url: asset.original_url,
          };
        }

        return null;
      }),
    )
  ).filter((item): item is { label: string; url: string } => Boolean(item));
}

function buildShareImageFileName(
  styleName: string | null,
  label: string,
  index: number,
) {
  return [
    "mirilook",
    slugify(styleName || "consultation"),
    String(index + 1).padStart(2, "0"),
    slugify(label),
  ]
    .filter(Boolean)
    .join("-")
    .concat(".jpg");
}

function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "image"
  );
}

function hasAdvice(
  advice: RecommendationAdvice,
  recommendation: RecommendationRow | null,
) {
  return Boolean(
    recommendation?.salon_process ||
      advice.maintenanceAdvice ||
      advice.outfitAdvice ||
      advice.makeupAdvice,
  );
}

function decodeRecommendationAdvice(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as {
      makeupAdvice?: unknown;
      maintenanceAdvice?: unknown;
      outfitAdvice?: unknown;
    };

    return {
      makeupAdvice: sanitizeText(parsed.makeupAdvice, 400),
      maintenanceAdvice: sanitizeText(parsed.maintenanceAdvice, 400),
      outfitAdvice: sanitizeText(parsed.outfitAdvice, 400),
    } satisfies RecommendationAdvice;
  } catch {
    return {
      maintenanceAdvice: sanitizeText(value, 400),
    } satisfies RecommendationAdvice;
  }
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function sanitizeToken(value: string) {
  return /^[a-zA-Z0-9_-]{12,96}$/.test(value) ? value : "";
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildAbsoluteShareUrl(token: string) {
  return new URL(`/share/${encodeURIComponent(token)}`, siteUrl).toString();
}

function buildAbsoluteThumbnailUrl(token: string, completedAt: string | null) {
  const url = new URL(
    `/api/consultations/share/${encodeURIComponent(token)}/thumbnail`,
    siteUrl,
  );
  const version = new Date(completedAt ?? "").getTime();

  if (Number.isFinite(version)) {
    url.searchParams.set("v", version.toString(36));
  }

  return url.toString();
}
import type { Metadata } from "next";
