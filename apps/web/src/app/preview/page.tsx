"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Download,
  RefreshCw,
  Share2,
  Sparkles,
} from "lucide-react";

// 토스 앱/웹 느낌의 심플 리디자인 "미리보기 전용" 인터랙티브 프로토타입.
// 운영 디자인(/)은 그대로 두고, 이 라우트에서만 전체 흐름을 클릭으로 체험한다.
// 로그인·결제·실제 AI 호출 없이, 실제 샘플 이미지로 UX 흐름만 시뮬레이션한다.

const INK = "#191F28";
const SUB = "#4E5968";
const FAINT = "#8B95A1";
const BLUE = "#3182F6";
const LINE = "#EDF0F3";

type Gender = "women" | "men";
type Step =
  | "intro"
  | "gender"
  | "upload"
  | "analyzing"
  | "recommend"
  | "generating"
  | "board";

const SLOTS: Array<{ key: "front" | "left" | "right"; label: string; hint: string }> = [
  { key: "front", label: "정면", hint: "필수 권장" },
  { key: "left", label: "좌측", hint: "선택" },
  { key: "right", label: "우측", hint: "선택" },
];

const STYLE_NAMES: Record<Gender, string[]> = {
  women: [
    "레이어드컷",
    "단발 보브",
    "허쉬컷",
    "빌드펌",
    "C컬펌",
    "시스루뱅",
    "슬릭컷",
    "글램웨이브",
    "히피펌",
  ],
  men: [
    "가르마펌",
    "울프컷",
    "리프컷",
    "포마드",
    "쉐도우펌",
    "크롭컷",
    "댄디컷",
    "가일컷",
    "애즈펌",
  ],
};

function assets(gender: Gender) {
  return gender === "men"
    ? {
        catalog: "/mock/style-samples/men-haircut-catalog-3x3.png",
        board: "/mock/style-samples/men-wolf-consultation-board-3x3.png",
      }
    : {
        catalog: "/mock/style-samples/women-haircut-catalog-3x3.png",
        board: "/mock/style-samples/women-bob-consultation-board-3x3.png",
      };
}

const STAGE: Partial<Record<Step, number>> = {
  gender: 0.25,
  upload: 0.5,
  analyzing: 0.65,
  recommend: 0.75,
  generating: 0.9,
  board: 1,
};

export default function PreviewFlow() {
  const [step, setStep] = useState<Step>("intro");
  const [gender, setGender] = useState<Gender>("women");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [sampleMode, setSampleMode] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState("");

  const photoReady = sampleMode || Object.keys(photos).length > 0;

  // 로딩 화면(분석/생성) — 진행률을 0→100까지 채운 뒤 다음 단계로 자동 이동
  useEffect(() => {
    if (step !== "analyzing" && step !== "generating") {
      return;
    }

    const start = performance.now();
    const duration = 2200;
    const id = window.setInterval(() => {
      const value = Math.min(100, ((performance.now() - start) / duration) * 100);
      setProgress(value);

      if (value >= 100) {
        window.clearInterval(id);
        setStep(step === "analyzing" ? "recommend" : "board");
      }
    }, 40);

    return () => window.clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const id = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(id);
  }, [toast]);

  function handleFile(key: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSampleMode(false);
      setPhotos((current) => ({ ...current, [key]: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }

  function goRecommend() {
    setSelected(null);
    setProgress(0);
    setStep("analyzing");
  }

  function goBoard() {
    setProgress(0);
    setStep("generating");
  }

  function restart() {
    setStep("intro");
    setPhotos({});
    setSampleMode(false);
    setSelected(null);
    setProgress(0);
  }

  const { catalog, board } = assets(gender);
  const stage = STAGE[step] ?? 0;

  return (
    <main
      className="min-h-screen w-full bg-[#F2F4F6]"
      style={{ colorScheme: "light", color: INK }}
    >
      {/* 미리보기에서만 전역 다크 푸터 숨김 + 화면 전환 애니메이션 */}
      <style>{`
        body > footer{display:none!important}
        @keyframes ml-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .ml-rise{animation:ml-rise .28s ease-out both}
        @media (prefers-reduced-motion: reduce){.ml-rise{animation:none}}
      `}</style>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[460px] flex-col bg-white shadow-[0_0_60px_rgba(0,0,0,0.05)]">
        {/* 상단바 + 진행바 */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3.5">
            {step !== "intro" ? (
              <button
                aria-label="뒤로"
                className="flex size-9 items-center justify-center rounded-full text-[#4E5968] transition active:scale-95"
                onClick={restart}
                type="button"
              >
                <ChevronLeft size={22} />
              </button>
            ) : (
              <span className="text-[17px] font-extrabold tracking-tight">미리룩</span>
            )}
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ background: "#E8F3FF", color: BLUE }}
            >
              리디자인 미리보기
            </span>
          </div>
          {stage > 0 ? (
            <div className="h-1 w-full bg-[#F2F4F6]">
              <div
                className="h-full rounded-r-full transition-all duration-500"
                style={{ width: `${Math.round(stage * 100)}%`, background: BLUE }}
              />
            </div>
          ) : null}
        </header>

        {/* ------- STEP: INTRO ------- */}
        {step === "intro" ? (
          <section key="intro" className="ml-rise flex flex-1 flex-col px-5 pb-8 pt-8">
            <p className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: BLUE }}>
              <Sparkles size={15} aria-hidden="true" /> AI 헤어 시뮬레이션
            </p>
            <h1 className="mt-3 text-[30px] font-extrabold leading-[1.28] tracking-[-0.02em]">
              내 얼굴에 어울리는
              <br />
              헤어, 미리 봐요
            </h1>
            <p className="mt-4 text-[15px] leading-7" style={{ color: SUB }}>
              사진 3장이면 충분해요. AI가 어울리는 스타일 9개를 골라주고,
              9방향 상담 이미지까지 만들어드려요.
            </p>

            <div className="relative mt-7 overflow-hidden rounded-[24px] bg-[#F2F4F6] shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src="/mock/style-samples/women-layer-real.png"
                  alt="미리룩 결과 예시"
                  fill
                  priority
                  sizes="460px"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="mt-auto pt-8">
              <PrimaryButton onClick={() => setStep("gender")}>
                사진 올리고 시작하기
              </PrimaryButton>
              <p className="mt-3 text-center text-[13px]" style={{ color: FAINT }}>
                버튼을 눌러 전체 흐름을 체험해 보세요
              </p>
            </div>
          </section>
        ) : null}

        {/* ------- STEP: GENDER ------- */}
        {step === "gender" ? (
          <section key="gender" className="ml-rise flex flex-1 flex-col px-5 pb-8 pt-6">
            <h2 className="text-[24px] font-extrabold tracking-tight">
              어떤 추천을 받을까요?
            </h2>
            <p className="mt-2 text-[14px]" style={{ color: SUB }}>
              성별에 맞는 전용 카탈로그로 추천해요.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3">
              {(["women", "men"] as const).map((g) => {
                const on = gender === g;
                return (
                  <button
                    key={g}
                    className="flex flex-col items-center gap-2 rounded-[20px] border-2 bg-white px-4 py-8 transition active:scale-[0.98]"
                    onClick={() => setGender(g)}
                    style={{
                      borderColor: on ? BLUE : LINE,
                      boxShadow: on ? "0 8px 24px rgba(49,130,246,0.16)" : "none",
                    }}
                    type="button"
                  >
                    <span className="text-[34px]">{g === "women" ? "💇‍♀️" : "💇‍♂️"}</span>
                    <span className="text-[17px] font-extrabold">
                      {g === "women" ? "여성" : "남성"}
                    </span>
                    <span className="text-[12px]" style={{ color: FAINT }}>
                      {g === "women" ? "Women's salon" : "Men's grooming"}
                    </span>
                    {on ? (
                      <span
                        className="mt-1 flex size-6 items-center justify-center rounded-full text-white"
                        style={{ background: BLUE }}
                      >
                        <Check size={15} />
                      </span>
                    ) : (
                      <span className="mt-1 size-6" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-8">
              <PrimaryButton onClick={() => setStep("upload")}>다음</PrimaryButton>
            </div>
          </section>
        ) : null}

        {/* ------- STEP: UPLOAD ------- */}
        {step === "upload" ? (
          <section key="upload" className="ml-rise flex flex-1 flex-col px-5 pb-8 pt-6">
            <h2 className="text-[24px] font-extrabold tracking-tight">
              얼굴 사진을 올려요
            </h2>
            <p className="mt-2 text-[14px] leading-6" style={{ color: SUB }}>
              정면·좌·우 3장이면 가장 정확해요. 지금은 체험용이라
              <b style={{ color: SUB }}> 샘플로 바로 진행</b>할 수도 있어요.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {SLOTS.map((slot) => {
                const filled = sampleMode || Boolean(photos[slot.key]);
                return (
                  <label
                    key={slot.key}
                    className="relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[16px] border-2 border-dashed"
                    style={{
                      borderColor: filled ? BLUE : "#D5DBE1",
                      background: filled ? "#F4F9FF" : "#F9FAFB",
                    }}
                  >
                    {photos[slot.key] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={slot.label}
                        className="absolute inset-0 size-full object-cover"
                        src={photos[slot.key]}
                      />
                    ) : (
                      <>
                        <span
                          className="flex size-9 items-center justify-center rounded-full text-white"
                          style={{ background: filled ? BLUE : "#C3CBD4" }}
                        >
                          {filled ? <Check size={18} /> : "＋"}
                        </span>
                        <span className="mt-2 text-[13px] font-bold" style={{ color: INK }}>
                          {slot.label}
                        </span>
                        <span className="text-[11px]" style={{ color: FAINT }}>
                          {slot.hint}
                        </span>
                      </>
                    )}
                    <input
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleFile(slot.key, event)}
                      type="file"
                    />
                  </label>
                );
              })}
            </div>

            <button
              className="mt-4 w-full rounded-[14px] border py-3 text-[14px] font-bold transition active:scale-[0.99]"
              onClick={() => {
                setPhotos({});
                setSampleMode(true);
              }}
              style={{ borderColor: LINE, color: BLUE, background: "#F4F9FF" }}
              type="button"
            >
              샘플 사진으로 체험하기
            </button>

            <div className="mt-auto pt-8">
              <PrimaryButton disabled={!photoReady} onClick={goRecommend}>
                추천 9개 받기
              </PrimaryButton>
            </div>
          </section>
        ) : null}

        {/* ------- STEP: ANALYZING / GENERATING ------- */}
        {step === "analyzing" || step === "generating" ? (
          <section
            key={step}
            className="ml-rise flex flex-1 flex-col items-center justify-center px-8 text-center"
          >
            <div className="relative flex size-24 items-center justify-center">
              <span
                className="absolute inset-0 rounded-full"
                style={{ border: "5px solid #E8F3FF" }}
              />
              <span
                className="absolute inset-0 animate-spin rounded-full"
                style={{
                  border: "5px solid transparent",
                  borderTopColor: BLUE,
                  animationDuration: "0.9s",
                }}
              />
              <span className="text-[18px] font-extrabold" style={{ color: BLUE }}>
                {Math.round(progress)}%
              </span>
            </div>
            <p className="mt-7 text-[19px] font-extrabold">
              {step === "analyzing"
                ? "얼굴을 분석하고 있어요"
                : "9방향 상담 이미지를 만들고 있어요"}
            </p>
            <p className="mt-2 text-[14px] leading-6" style={{ color: SUB }}>
              {step === "analyzing"
                ? "얼굴형·비율·분위기를 읽고 어울리는 스타일을 고르는 중이에요."
                : "같은 사람·같은 머리로 보이도록 방향을 이어서 생성해요."}
            </p>
          </section>
        ) : null}

        {/* ------- STEP: RECOMMEND ------- */}
        {step === "recommend" ? (
          <section key="recommend" className="ml-rise flex flex-1 flex-col px-5 pb-8 pt-6">
            <h2 className="text-[24px] font-extrabold tracking-tight">
              어울리는 스타일 9개예요
            </h2>
            <p className="mt-2 text-[14px]" style={{ color: SUB }}>
              마음에 드는 스타일 하나를 골라주세요.
            </p>

            <div className="relative mt-6 overflow-hidden rounded-[20px] bg-[#F2F4F6]">
              <div className="relative aspect-square w-full">
                <Image src={catalog} alt="추천 스타일 9개" fill sizes="460px" className="object-cover" />
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, i) => {
                    const on = selected === i;
                    return (
                      <button
                        key={i}
                        className="relative transition"
                        onClick={() => setSelected(i)}
                        style={{
                          outline: on ? `3px solid ${BLUE}` : "none",
                          outlineOffset: "-3px",
                          background: on ? "rgba(49,130,246,0.12)" : "transparent",
                        }}
                        type="button"
                      >
                        {on ? (
                          <span
                            className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full text-white"
                            style={{ background: BLUE }}
                          >
                            <Check size={13} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 flex min-h-[24px] items-center justify-center text-[15px] font-bold">
              {selected !== null ? (
                <span style={{ color: BLUE }}>
                  {STYLE_NAMES[gender][selected]} 선택됨
                </span>
              ) : (
                <span style={{ color: FAINT }}>사진 속 한 칸을 눌러 선택하세요</span>
              )}
            </div>

            <div className="mt-auto pt-6">
              <PrimaryButton disabled={selected === null} onClick={goBoard}>
                이 스타일로 상담 이미지 만들기
              </PrimaryButton>
              <p className="mt-3 text-center text-[13px]" style={{ color: FAINT }}>
                첫 상담 세트(9방향)는 무료예요
              </p>
            </div>
          </section>
        ) : null}

        {/* ------- STEP: BOARD (결과) ------- */}
        {step === "board" ? (
          <section key="board" className="ml-rise flex flex-1 flex-col px-5 pb-8 pt-6">
            <div className="flex items-center gap-2">
              <span
                className="flex size-8 items-center justify-center rounded-full text-white"
                style={{ background: BLUE }}
              >
                <Check size={18} />
              </span>
              <h2 className="text-[22px] font-extrabold tracking-tight">
                상담 보드가 완성됐어요
              </h2>
            </div>
            <p className="mt-2 text-[14px]" style={{ color: SUB }}>
              {selected !== null ? `${STYLE_NAMES[gender][selected]} · ` : ""}
              9방향을 같은 머리로 만들었어요. 미용실에 그대로 보여주세요.
            </p>

            <div className="mt-5 overflow-hidden rounded-[20px] bg-[#F2F4F6] shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
              <div className="relative aspect-square w-full">
                <Image src={board} alt="9방향 상담 보드" fill sizes="460px" className="object-cover" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { icon: Download, label: "저장" },
                { icon: Share2, label: "공유" },
                { icon: Download, label: "PDF" },
              ].map((action) => (
                <button
                  key={action.label}
                  className="flex flex-col items-center gap-1.5 rounded-[16px] border py-4 transition active:scale-[0.97]"
                  onClick={() => setToast(`${action.label} 완료 (체험)`) }
                  style={{ borderColor: LINE, color: INK }}
                  type="button"
                >
                  <action.icon size={20} style={{ color: BLUE }} />
                  <span className="text-[13px] font-bold">{action.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-auto grid gap-2 pt-6">
              <PrimaryButton onClick={() => setStep("recommend")}>
                다른 스타일 더 보기
              </PrimaryButton>
              <button
                className="flex h-14 w-full items-center justify-center gap-2 rounded-[16px] text-[15px] font-bold transition active:scale-[0.98]"
                onClick={restart}
                style={{ background: "#F2F4F6", color: SUB }}
                type="button"
              >
                <RefreshCw size={16} /> 처음부터 다시
              </button>
              <Link
                className="mt-1 text-center text-[13px] font-bold"
                href="/"
                style={{ color: FAINT }}
              >
                실제 서비스로 가기 →
              </Link>
            </div>
          </section>
        ) : null}

        {/* 토스트 */}
        {toast ? (
          <div className="pointer-events-none fixed inset-x-0 bottom-8 z-30 flex justify-center px-6">
            <div
              className="ml-rise rounded-full px-4 py-2.5 text-[13px] font-bold text-white shadow-lg"
              style={{ background: "rgba(25,31,40,0.92)" }}
            >
              {toast}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex h-14 w-full items-center justify-center gap-2 rounded-[16px] text-[16px] font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed"
      disabled={disabled}
      onClick={onClick}
      style={{ background: disabled ? "#C3CBD4" : BLUE }}
      type="button"
    >
      {children}
      {!disabled ? <ArrowRight size={18} aria-hidden="true" /> : null}
    </button>
  );
}
