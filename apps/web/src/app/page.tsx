import Image from "next/image";
import { ChevronDown, Sparkles, TriangleAlert } from "lucide-react";
import { MirilookDemoGallery } from "@/components/mirilook-demo-gallery";
import { MirilookGuidelineVideoDialog } from "@/components/mirilook-guideline-video-dialog";
import { MirilookHomeContactButton } from "@/components/mirilook-home-contact-button";
import { MirilookMainNav } from "@/components/mirilook-main-nav";
import { MirilookStudio } from "@/components/mirilook-studio";

// 특허 출원 기간 동안 홈 화면에서 숨김: 결과 미리보기(남/여) 탭 + 가이드라인 영상.
// (컴포넌트·영상 파일은 삭제하지 않고 그대로 보존.) 특허 등록 완료 후 다시 공개하려면
// Vercel 환경변수 NEXT_PUBLIC_SHOW_HOME_PREVIEW=true 로 설정하고 재배포하면 복구된다.
const showHomePreviewAndGuideline =
  process.env.NEXT_PUBLIC_SHOW_HOME_PREVIEW === "true";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;

export default function Home() {
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
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,16,14,0.94)_0%,rgba(17,16,14,0.78)_46%,rgba(17,16,14,0.38)_100%)]"
          data-mirilook-hero-scrim="side"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,16,14,0.12)_0%,rgba(17,16,14,0.2)_54%,#11100e_100%)]"
          data-mirilook-hero-scrim="base"
        />

        <header className="relative z-30">
          <div className="mx-auto max-w-7xl px-5 py-5">
            <MirilookMainNav />
          </div>
        </header>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-5 pb-10 pt-4 md:pb-14 md:pt-8">
          <div className="mb-6 max-w-5xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="font-korean-calligraphy max-w-3xl text-4xl leading-tight tracking-normal text-[#fffaf1] sm:text-5xl">
                내 얼굴에 어울리는 헤어스타일을 추천받아보세요.
              </h1>
              <div className="flex w-full flex-col items-stretch gap-2 sm:w-80">
                {showHomePreviewAndGuideline ? (
                  <MirilookGuidelineVideoDialog />
                ) : null}
                <MirilookHomeContactButton />
              </div>
            </div>
            <p className="mt-3 text-base leading-7 text-[#d8cbb8]">
              Get personalized hairstyle recommendations for your face.
            </p>
            <div className="mt-5 max-w-2xl text-base leading-7 text-[#d8cbb8]">
              <p>
                내 사진을 올리고, 헤어스타일을 추천받고, 미용사에게 더
                고품질의 서비스를 받아보세요.
              </p>
              <p className="mt-1 text-[#b8aa95]">
                Upload your photos, preview your style, and give your stylist a
                clearer reference.
              </p>
            </div>
            <MirilookHomeDisclosureGrid className="mt-4 max-w-5xl" />
          </div>

          {showHomePreviewAndGuideline ? (
            <MirilookDemoGallery className="mb-6 max-w-5xl" />
          ) : null}

          <MirilookStudio />
        </div>
      </section>

      <MirilookAboutFaq />
    </main>
  );
}

// 서비스 소개 + 자주 묻는 질문 — 검색엔진이 읽는 실질 콘텐츠(+ FAQ 구조화데이터)
const MIRILOOK_FAQ: [string, string][] = [
  ["미리룩은 어떤 서비스인가요?", "미리룩(Miri Look)은 얼굴 사진을 바탕으로 어울리는 헤어컷과 컬러를 AI가 추천하고, 미용실 상담에 쓸 수 있는 참고 이미지를 생성해 주는 AI 헤어스타일 추천 서비스입니다. 시술 전에 여러 스타일을 미리 시뮬레이션해 실패를 줄이는 것을 목표로 합니다."],
  ["어떻게 이용하나요?", "정면·좌측면·우측면 얼굴 사진을 올리고 선호하는 헤어컷·컬러·분위기를 입력하면, 얼굴 적합도 분석과 추천 알고리즘을 반영해 어울리는 스타일 9개를 제안하고 상담용 이미지를 생성합니다."],
  ["어떤 사진이 필요한가요?", "정확한 얼굴형·비율 분석을 위해 정면과 좌·우 측면 사진을 권장합니다. 조명이 고르고 얼굴이 가려지지 않은 사진일수록 결과 품질이 좋아집니다."],
  ["추천은 어떤 기준으로 이루어지나요?", "고객 사진에서 얼굴형·이목구비·비율·분위기를 분석하고, 매월 갱신되는 최신 헤어스타일 트렌드 후보군과 고객이 입력한 선호(프롬프트)를 함께 반영해 어울림을 평가한 뒤 9개 스타일을 제안합니다."],
  ["생성된 이미지는 실제 시술 결과를 보장하나요?", "아닙니다. 미리룩의 AI 추천 이미지는 상담 참고용이며 실제 시술 결과를 보장하지 않습니다. 모발 상태·시술 난이도·디자이너의 판단에 따라 결과는 달라질 수 있어, 최종 시술은 반드시 전문 미용사와 상담해 결정하시기 바랍니다."],
  ["내 사진은 안전하게 처리되나요?", "업로드한 사진은 추천·상담 이미지 생성을 위해서만 처리되며, 별도 동의 없이 얼굴을 식별하는 생체인식 템플릿을 만들거나 AI 모델 학습에 사용하지 않습니다. 사진과 생성 결과의 삭제는 언제든 요청할 수 있습니다."],
  ["비용은 어떻게 되나요?", "미리룩은 서비스 내 재화(H머니)로 추천·이미지 생성을 이용합니다. 구매·사용·환불 기준은 서비스 내 안내와 환불정책 페이지에서 확인하실 수 있습니다."],
  ["미용실에서 어떻게 활용하나요?", "추천받은 스타일 이미지를 미용사에게 보여주면, 말로 설명하기 어려운 원하는 느낌을 시각적으로 전달할 수 있어 상담이 빨라지고 결과 만족도를 높이는 데 도움이 됩니다."],
];

const MIRILOOK_FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: MIRILOOK_FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
};

function MirilookAboutFaq() {
  return (
    <section className="bg-[#11100e] px-5 py-16 text-[#f8f1e5]">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-bold text-[#fffaf1] sm:text-3xl">미리룩 소개</h2>
        <p className="mt-4 text-[15px] leading-8 text-[#d8cbb8]">
          미리룩(Miri Look)은 엠제이인사이트 주식회사가 운영하는 AI 헤어스타일 추천 서비스입니다. 헤어스타일 변화는 인상을
          크게 바꾸지만, 시술 전에는 결과를 가늠하기 어렵고 말로 원하는 스타일을 전달하기도 쉽지 않습니다. 미리룩은 얼굴 사진을
          분석해 어울리는 컷·컬러를 제안하고 상담용 이미지를 생성함으로써, 고객은 실패 부담을 줄이고 미용사는 더 명확한 참고
          자료로 상담할 수 있도록 돕습니다.
        </p>

        <h2 className="mt-12 text-2xl font-bold text-[#fffaf1] sm:text-3xl">자주 묻는 질문</h2>
        <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
          {MIRILOOK_FAQ.map(([q, a]) => (
            <div className="py-5" key={q}>
              <h3 className="text-[15px] font-bold text-[#f3d28a]">Q. {q}</h3>
              <p className="mt-2 text-sm leading-7 text-[#c9bda9]">{a}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs leading-6 text-[#8f8778]">
          미리룩의 AI 추천 이미지는 상담 참고용이며 실제 시술 결과를 보장하지 않습니다. 회사 정보·결제·환불·개인정보 처리
          기준은 하단 CS/정책 메뉴에서 확인하실 수 있습니다.
        </p>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(MIRILOOK_FAQ_LD) }}
      />
    </section>
  );
}

function MirilookHomeDisclosureGrid({ className = "" }: { className?: string }) {
  const steps = [
    {
      title: "월 1회 트렌드 조사",
      body: "미리룩이 최신 헤어스타일 흐름과 상담 사례를 조사해 추천 후보군을 갱신합니다.",
    },
    {
      title: "얼굴 적합도 분석",
      body: "고객 사진에서 얼굴형, 이목구비, 비율, 분위기를 분석하고, 후보 스타일과의 어울림을 평가합니다.",
    },
    {
      title: "9개 스타일 추천",
      body: "고객 프롬프트와 추천 알고리즘을 함께 반영해 어울리는 스타일 9개를 제안합니다.",
    },
  ];

  return (
    <div className={`grid items-start gap-3 md:grid-cols-2 ${className}`}>
      <details className="group rounded-md border border-[#f48aa5]/42 bg-[#30151c]/82 p-3 text-xs leading-5 text-[#ffd5dd] shadow-lg shadow-[#ff5d87]/10">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <TriangleAlert
              aria-hidden="true"
              className="shrink-0 text-[#ff8fa8]"
              size={16}
            />
            <span className="truncate font-bold text-[#ffe6eb]">
              생성 중 화면 이탈 시 환불 불가
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="shrink-0 text-[#ffb8c8] transition group-open:rotate-180"
            size={15}
          />
        </summary>
        <p className="mt-3 text-xs leading-5">
          뒤로 가기, 화면 전환, 브라우저 새로고침·종료, 서비스 이용 중 다른 앱이나 웹
          이용 등 사용자 조작 또는 이용 환경 변경으로 생성 오류가 발생한 경우
          미리룩은 책임지지 않으며 환불하지 않습니다.
        </p>
      </details>

      <details className="group rounded-md border border-[#f3d28a]/30 bg-[#171511]/86 p-3 text-xs leading-5 text-[#d8cbb8] shadow-lg shadow-black/18">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <Sparkles
              aria-hidden="true"
              className="shrink-0 text-[#f3d28a]"
              size={16}
            />
            <span className="truncate font-bold text-[#fffaf1]">
              미리룩 추천 알고리즘
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="shrink-0 text-[#f3d28a] transition group-open:rotate-180"
            size={15}
          />
        </summary>
        <div className="mt-3 grid gap-2">
          {steps.map((step, index) => (
            <article
              className="rounded-md border border-white/10 bg-[#0f0e0c]/72 p-2.5"
              key={step.title}
            >
              <p className="font-bold text-[#f3d28a]">
                {index + 1}. {step.title}
              </p>
              <p className="mt-1 text-[#b8aa95]">{step.body}</p>
            </article>
          ))}
        </div>
      </details>
    </div>
  );
}
