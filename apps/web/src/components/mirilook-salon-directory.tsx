"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ExternalLink,
  Images,
  type LucideIcon,
  MapPinned,
  MessageSquareText,
  Scissors,
  Star,
  UserRound,
  X,
} from "lucide-react";
import {
  getKakaoSalonMapUrl,
  getSalonMapUrl,
  type PilotSalon,
  type SalonDesigner,
} from "@/lib/mirilook-marketplace";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;

type ImagePreview = {
  alt: string;
  src: string;
  title: string;
};

// Fills its positioned parent with the image, but degrades to a tasteful
// branded placeholder (instead of a broken-image icon) if the asset 404s.
function FallbackImage({
  alt,
  fallbackIcon: FallbackIcon = Images,
  priority,
  sizes,
  src,
}: {
  alt: string;
  fallbackIcon?: LucideIcon;
  priority?: boolean;
  sizes: string;
  src: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="absolute inset-0 flex items-center justify-center bg-[#171511] text-[#8f826f]">
        <FallbackIcon aria-hidden="true" size={26} />
      </span>
    );
  }

  return (
    <Image
      alt={alt}
      className="object-cover"
      fill
      onError={() => setFailed(true)}
      priority={priority}
      sizes={sizes}
      src={src}
    />
  );
}

type MirilookSalonDirectoryProps = {
  salons: PilotSalon[];
};

export function MirilookSalonDirectory({ salons }: MirilookSalonDirectoryProps) {
  const [activeDesignerIds, setActiveDesignerIds] = useState<
    Record<string, string>
  >({});
  const [preview, setPreview] = useState<ImagePreview | null>(null);

  useEffect(() => {
    if (!preview) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreview(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [preview]);

  return (
    <>
      <section className="grid gap-5 lg:grid-cols-3">
        {salons.map((salon) => {
          const activeDesignerId =
            activeDesignerIds[salon.id] ?? salon.designers[0]?.id ?? "";
          const activeDesigner =
            salon.designers.find(
              (designer) => designer.id === activeDesignerId,
            ) ?? salon.designers[0];

          return (
            <article
              className="overflow-hidden rounded-md border border-[#2b281f] bg-[#171511]/92"
              key={salon.id}
            >
              <div className="relative aspect-[16/10] bg-[#0f0e0c]">
                <FallbackImage
                  alt={`${salon.name} salon`}
                  fallbackIcon={Scissors}
                  priority={salon.id === salons[0]?.id}
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  src={asset(salon.imageUrl)}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,16,14,0.03)_0%,rgba(17,16,14,0.76)_100%)]" />
                <span className="absolute left-3 top-3 inline-flex items-center rounded-md bg-[#11100e]/80 px-2 py-1 text-[11px] font-semibold text-[#f3d28a] ring-1 ring-[#f3d28a]/30">
                  예시
                </span>
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-[#fffaf1]">
                        {salon.name}
                      </h2>
                      <p className="mt-1 flex items-center gap-1 text-sm text-[#e7dccb]">
                        <MapPinned aria-hidden="true" size={15} />
                        {salon.address}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#30271a]/90 px-2 py-1 text-xs font-semibold text-[#f3d28a]">
                      <Star aria-hidden="true" size={13} />
                      {salon.rating}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-4">
                <p className="text-sm leading-6 text-[#d8cbb8]">
                  {salon.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {salon.tags.map((tag) => (
                    <span
                      className="rounded-md bg-white/7 px-2 py-1 text-xs font-semibold text-[#b8aa95]"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="grid gap-3 border-y border-white/8 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#fffaf1]">
                      {salon.priceRange}
                    </p>
                    <p className="mt-1 text-sm text-[#b8aa95]">
                      {salon.hours} · {salon.phone}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#03c75a] px-3 text-sm font-bold text-white transition hover:bg-[#06b753]"
                      href={getSalonMapUrl(salon)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      네이버
                      <ExternalLink aria-hidden="true" size={14} />
                    </a>
                    <a
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#fee500] px-3 text-sm font-bold text-[#191600] transition hover:bg-[#f6da00]"
                      href={getKakaoSalonMapUrl(salon)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      카카오
                      <ExternalLink aria-hidden="true" size={14} />
                    </a>
                  </div>
                </div>

                <div className="grid gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[#fffaf1]">
                    <Scissors aria-hidden="true" size={16} />
                    디자이너
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {salon.designers.map((designer) => {
                      const isActive = designer.id === activeDesigner?.id;

                      return (
                        <button
                          className={`grid min-h-16 grid-cols-[42px_minmax(0,1fr)] items-center gap-2 rounded-md border px-2 py-2 text-left transition ${
                            isActive
                              ? "border-[#f3d28a] bg-[#30271a] text-[#fffaf1]"
                              : "border-white/10 bg-[#0f0e0c] text-[#d8cbb8] hover:border-[#f3d28a]/45"
                          }`}
                          key={designer.id}
                          onClick={() =>
                            setActiveDesignerIds((current) => ({
                              ...current,
                              [salon.id]: designer.id,
                            }))
                          }
                          type="button"
                        >
                          <span className="relative aspect-square overflow-hidden rounded-md bg-[#171511]">
                            <FallbackImage
                              alt={`${designer.name} profile`}
                              fallbackIcon={UserRound}
                              sizes="42px"
                              src={asset(designer.imageUrl)}
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {designer.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-[#b8aa95]">
                              {designer.specialties[0]}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activeDesigner ? (
                  <DesignerDetail
                    designer={activeDesigner}
                    onPreview={setPreview}
                  />
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      <ImagePreviewModal preview={preview} onClose={() => setPreview(null)} />
    </>
  );
}

function DesignerDetail({
  designer,
  onPreview,
}: {
  designer: SalonDesigner;
  onPreview: (preview: ImagePreview) => void;
}) {
  const primaryPortfolio = designer.portfolio[0];

  return (
    <div className="grid gap-4 rounded-md border border-white/10 bg-[#0f0e0c]/78 p-3">
      <div className="grid gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
        <button
          aria-label={`${designer.name} 사진 확대`}
          className="relative aspect-square overflow-hidden rounded-md bg-[#171511] outline-none ring-[#f3d28a]/70 transition hover:opacity-90 focus-visible:ring-2"
          onClick={() =>
            onPreview({
              alt: `${designer.name} profile`,
              src: designer.imageUrl,
              title: designer.name,
            })
          }
          type="button"
        >
          <FallbackImage
            alt={`${designer.name} profile`}
            fallbackIcon={UserRound}
            sizes="112px"
            src={asset(designer.imageUrl)}
          />
        </button>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#fffaf1]">
                {designer.name}
              </h3>
              <p className="mt-1 text-xs font-semibold text-[#f3d28a]">
                ★ {designer.rating} · 리뷰{" "}
                {designer.reviewCount.toLocaleString("ko-KR")}
              </p>
            </div>
            <UserRound
              aria-hidden="true"
              className="shrink-0 text-[#f3d28a]"
              size={18}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-[#b8aa95]">
            {designer.bio}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {designer.serviceMenu.map((service) => (
          <span
            className="rounded-md border border-white/8 px-2 py-1 text-[11px] font-semibold text-[#d8cbb8]"
            key={service}
          >
            {service}
          </span>
        ))}
      </div>

      {primaryPortfolio ? (
        <div className="grid gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#fffaf1]">
            <Images aria-hidden="true" size={15} />
            포트폴리오
          </p>
          <button
            aria-label={`${designer.name} 포트폴리오 확대`}
            className="relative aspect-[16/10] overflow-hidden rounded-md bg-[#171511] outline-none ring-[#f3d28a]/70 transition hover:opacity-90 focus-visible:ring-2"
            onClick={() =>
              onPreview({
                alt: `${designer.name} portfolio`,
                src: primaryPortfolio.imageUrl,
                title: primaryPortfolio.title,
              })
            }
            type="button"
          >
            <FallbackImage
              alt={`${designer.name} portfolio`}
              fallbackIcon={Images}
              sizes="(min-width: 1024px) 30vw, 100vw"
              src={asset(primaryPortfolio.imageUrl)}
            />
          </button>
          <div>
            <p className="text-sm font-semibold text-[#fffaf1]">
              {primaryPortfolio.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#b8aa95]">
              {primaryPortfolio.note}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#fffaf1]">
          <MessageSquareText aria-hidden="true" size={15} />
          리뷰
        </p>
        <ul className="grid gap-2 text-xs leading-5 text-[#b8aa95]">
          {designer.reviews.map((review) => (
            <li
              className="rounded-md border border-white/8 px-3 py-2"
              key={review}
            >
              “{review}”
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ImagePreviewModal({
  onClose,
  preview,
}: {
  onClose: () => void;
  preview: ImagePreview | null;
}) {
  if (!preview) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="relative grid w-full max-w-5xl gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="닫기"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/15 bg-[#171511] text-[#fffaf1] transition hover:bg-[#30271a]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
        <div className="relative aspect-[4/3] max-h-[78vh] overflow-hidden rounded-md border border-white/12 bg-[#0f0e0c] shadow-2xl">
          <Image
            alt={preview.alt}
            className="object-contain"
            fill
            priority
            sizes="100vw"
            src={asset(preview.src)}
          />
        </div>
      </div>
    </div>
  );
}
