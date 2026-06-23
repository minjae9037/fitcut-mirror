import Image from "next/image";
import {
  Camera,
  Check,
  ChevronRight,
  CircleDot,
  Download,
  ImagePlus,
  LockKeyhole,
  MirrorRound,
  Scissors,
  Share2,
  Sparkles,
  Upload,
} from "lucide-react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;

const uploadSlots = [
  { label: "정면", detail: "필수", icon: Camera, ready: true },
  { label: "좌측", detail: "필수", icon: Upload, ready: true },
  { label: "우측", detail: "필수", icon: Upload, ready: false },
  { label: "후면", detail: "선택", icon: ImagePlus, ready: false },
];

const styleOptions = [
  { label: "리프컷", active: true },
  { label: "6:4 가르마", active: false },
  { label: "아이비리그", active: false },
  { label: "댄디컷", active: false },
];

const toneOptions = [
  { label: "블랙", active: true },
  { label: "애쉬 브라운", active: false },
  { label: "다운펌", active: true },
  { label: "볼륨 낮게", active: false },
];

const sessionSteps = [
  "사진 업로드",
  "스타일 큐레이션",
  "AI 시뮬레이션",
  "미용사 공유",
];

const resultAngles = ["좌측", "정면", "우측", "후면"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#11100e] text-[#f8f1e5]">
      <section className="relative min-h-[760px] overflow-hidden">
        <Image
          alt="Premium salon consultation suite"
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src={asset("/mock/premium-salon-suite.png")}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,16,14,0.96)_0%,rgba(17,16,14,0.83)_42%,rgba(17,16,14,0.38)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,16,14,0.26)_0%,rgba(17,16,14,0.18)_58%,#11100e_100%)]" />

        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-md border border-[#c9a96a]/50 bg-[#c9a96a]/14 text-[#f3d28a]">
                <Scissors aria-hidden="true" size={21} />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-[0.08em]">
                  FITCUT MIRROR
                </p>
                <p className="text-xs uppercase tracking-[0.24em] text-[#b8aa95]">
                  AI Salon Consultation
                </p>
              </div>
            </div>
            <nav
              aria-label="주요 화면"
              className="hidden items-center gap-2 text-sm font-medium text-[#e7dccb] md:flex"
            >
              <a className="rounded-md px-3 py-2 hover:bg-white/8" href="#studio">
                스튜디오
              </a>
              <a className="rounded-md px-3 py-2 hover:bg-white/8" href="#result">
                결과
              </a>
              <a className="rounded-md px-3 py-2 hover:bg-white/8" href="#share">
                미용사 공유
              </a>
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(480px,1.12fr)] lg:py-14">
          <div className="flex min-h-[560px] flex-col justify-between gap-8">
            <div>
              <div className="mb-5 inline-flex h-10 items-center gap-2 rounded-md border border-[#c9a96a]/35 bg-[#c9a96a]/12 px-3 text-sm font-semibold text-[#f3d28a]">
                <Sparkles aria-hidden="true" size={16} />
                Private Mirror Session
              </div>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] tracking-normal text-[#fffaf1] sm:text-6xl">
                Fitcut Mirror
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-[#d8cbb8]">
                내 얼굴에 어울리는 헤어를 먼저 확인하고, 미용사와 같은
                이미지를 보며 상담합니다.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-5 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffd98b]"
                  href="#studio"
                >
                  새 스타일 생성
                  <ChevronRight aria-hidden="true" size={18} />
                </a>
                <a
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/18 bg-white/8 px-5 text-sm font-semibold text-[#fffaf1] transition hover:bg-white/13"
                  href="#share"
                >
                  미용사용 화면
                  <MirrorRound aria-hidden="true" size={18} />
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="파일럿" value="30-50명" />
              <Metric label="기본 생성" value="1-3천원" />
              <Metric label="공유 링크" value="48시간" />
            </div>
          </div>

          <section
            aria-label="시뮬레이션 생성 패널"
            className="rounded-lg border border-white/12 bg-[#171511]/88 p-5 shadow-2xl shadow-black/40 backdrop-blur"
            id="studio"
          >
            <div className="mb-5 flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c9a96a]">
                  Session 001
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#fffaf1]">
                  AI 스타일 상담
                </h2>
              </div>
              <div className="inline-flex h-9 items-center gap-2 rounded-md bg-[#203830] px-3 text-sm font-semibold text-[#a7dcc5]">
                <CircleDot aria-hidden="true" size={15} />
                Mock AI
              </div>
            </div>

            <div className="grid gap-5">
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[#f7ead5]">
                    사진
                  </h3>
                  <span className="text-xs text-[#aa9c87]">3장 필수</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {uploadSlots.map((slot) => {
                    const Icon = slot.icon;

                    return (
                      <button
                        className={`flex aspect-[4/3] min-h-28 flex-col items-center justify-center gap-2 rounded-md border text-sm transition ${
                          slot.ready
                            ? "border-[#c9a96a]/55 bg-[#30271a] text-[#f3d28a]"
                            : "border-white/12 bg-white/[0.035] text-[#cbbda8] hover:border-[#c9a96a]/45"
                        }`}
                        key={slot.label}
                        type="button"
                      >
                        <Icon aria-hidden="true" size={21} />
                        <span className="font-semibold">{slot.label}</span>
                        <span className="text-xs text-[#a99b87]">
                          {slot.detail}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <ChoiceRow label="스타일" options={styleOptions} />
              <ChoiceRow label="디테일" options={toneOptions} />

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#f7ead5]">
                  요청사항
                </span>
                <textarea
                  className="min-h-24 resize-none rounded-md border border-white/12 bg-[#0f0e0c] px-3 py-3 text-sm text-[#f8f1e5] outline-none transition placeholder:text-[#817461] focus:border-[#c9a96a] focus:ring-2 focus:ring-[#c9a96a]/15"
                  placeholder="앞머리는 자연스럽게, 옆머리는 뜨지 않게"
                />
              </label>

              <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-start gap-3 text-sm leading-6 text-[#cbbda8]">
                  <input
                    className="mt-1 size-4 rounded border-[#766a58] bg-[#0f0e0c]"
                    defaultChecked
                    type="checkbox"
                  />
                  <span>사진 생성 및 미용사 공유 범위에 동의합니다.</span>
                </label>
                <button className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-5 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffd98b]">
                  <Sparkles aria-hidden="true" size={18} />
                  결과 생성
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="grid gap-4">
          <section className="rounded-lg border border-[#2b281f] bg-[#171511] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c9a96a]">
                  Concierge Flow
                </p>
                <h2 className="mt-2 text-xl font-semibold">진행 상태</h2>
              </div>
              <span className="rounded-md bg-[#203830] px-3 py-2 text-sm font-semibold text-[#a7dcc5]">
                2/4
              </span>
            </div>
            <div className="grid gap-2">
              {sessionSteps.map((step, index) => (
                <div
                  className="flex h-12 items-center justify-between rounded-md border border-[#2b281f] bg-[#11100e] px-3"
                  key={step}
                >
                  <span className="text-sm font-semibold text-[#efe3d1]">
                    {step}
                  </span>
                  {index < 2 ? (
                    <Check
                      aria-hidden="true"
                      className="text-[#a7dcc5]"
                      size={17}
                    />
                  ) : (
                    <span className="size-2 rounded-full bg-[#665c4c]" />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section
            className="rounded-lg border border-[#2b281f] bg-[#171511] p-5"
            id="share"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-[#203830] text-[#a7dcc5]">
                <LockKeyhole aria-hidden="true" size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">공유 링크</h2>
                <p className="text-sm text-[#a99b87]">미용사용 상담 화면</p>
              </div>
            </div>
            <div className="rounded-md border border-[#2b281f] bg-[#0f0e0c] p-3 text-sm text-[#cbbda8]">
              fitcutmirror.app/share/mirror-001
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#1a1712]">
                <Share2 aria-hidden="true" size={17} />
                링크 복사
              </button>
              <button
                aria-label="상담 자료 다운로드"
                className="flex size-11 items-center justify-center rounded-md border border-[#3a3529] text-[#f7ead5]"
                type="button"
              >
                <Download aria-hidden="true" size={18} />
              </button>
            </div>
          </section>
        </div>

        <section
          className="rounded-lg border border-[#2b281f] bg-[#171511] p-5"
          id="result"
        >
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c9a96a]">
                Mirror Result
              </p>
              <h2 className="mt-2 text-2xl font-semibold">리프컷 상담안</h2>
              <p className="mt-1 text-sm text-[#a99b87]">
                블랙 · 가르마펌 · 측면 볼륨 낮춤
              </p>
            </div>
            <div className="flex gap-2">
              <button
                aria-label="결과 다운로드"
                className="flex size-10 items-center justify-center rounded-md border border-[#3a3529] text-[#f7ead5]"
                type="button"
              >
                <Download aria-hidden="true" size={18} />
              </button>
              <button
                aria-label="결과 공유"
                className="flex size-10 items-center justify-center rounded-md border border-[#3a3529] text-[#f7ead5]"
                type="button"
              >
                <Share2 aria-hidden="true" size={18} />
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_220px]">
            <div className="overflow-hidden rounded-md border border-[#2b281f] bg-[#0f0e0c]">
              <Image
                alt="Fitcut Mirror AI hairstyle result preview"
                className="aspect-square h-auto w-full object-cover"
                height={1024}
                src={asset("/mock/fitcut-result-front.png")}
                width={1024}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {resultAngles.map((angle) => (
                <button
                  className={`flex min-h-20 items-center justify-center rounded-md border text-sm font-semibold ${
                    angle === "정면"
                      ? "border-[#c9a96a] bg-[#30271a] text-[#f3d28a]"
                      : "border-[#2b281f] bg-[#0f0e0c] text-[#cbbda8]"
                  }`}
                  key={angle}
                  type="button"
                >
                  {angle}
                </button>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/12 bg-white/[0.045] p-4 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b8aa95]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[#fffaf1]">{value}</p>
    </div>
  );
}

function ChoiceRow({
  label,
  options,
}: {
  label: string;
  options: { label: string; active: boolean }[];
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold text-[#f7ead5]">{label}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((option) => (
          <button
            className={`h-11 rounded-md border px-2 text-sm font-semibold transition ${
              option.active
                ? "border-[#c9a96a] bg-[#30271a] text-[#f3d28a]"
                : "border-white/12 bg-white/[0.035] text-[#cbbda8] hover:border-[#c9a96a]/45"
            }`}
            key={option.label}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
