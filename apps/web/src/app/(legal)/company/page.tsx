import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "회사소개",
  description: "미리룩 운영 회사 정보",
};

const companyInfo = [
  { label: "상호", value: "엠제이인사이트 주식회사" },
  { label: "대표", value: "이민재" },
  { label: "사업자등록번호", value: "226-81-56027" },
  { label: "통신판매업신고", value: "제2026-부천소사-0462호" },
  { label: "소재지", value: "경기도 부천시 소사구 소삼로 62" },
  { label: "이메일", value: "jipsa.admin@gmail.com" },
  { label: "전화", value: "010-2704-5672" },
];

export default function CompanyPage() {
  return (
    <div className="space-y-8 text-sm leading-7 text-[#d8cbb8]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f3d28a]">
          Company
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#fffaf1]">회사소개</h1>
        <p className="mt-3 max-w-3xl">
          미리룩은 엠제이인사이트 주식회사가 운영하는 AI 헤어스타일 추천
          서비스입니다.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">미리룩이 하는 일</h2>
        <p className="max-w-3xl">
          헤어스타일 변화는 첫인상을 크게 바꾸지만, 시술 전에는 결과를 예측하기 어렵고 원하는 스타일을 미용사에게 말로
          정확히 전달하기도 쉽지 않습니다. 미리룩은 이 간극을 좁히기 위해 만들어졌습니다. 고객의 얼굴 사진을 분석해 얼굴형·
          이목구비·비율·분위기에 어울리는 헤어컷과 컬러를 AI가 제안하고, 미용실 상담에 그대로 쓸 수 있는 참고 이미지를
          생성합니다.
        </p>
        <p className="max-w-3xl">
          추천은 세 가지를 함께 반영합니다. ① 매월 갱신하는 최신 헤어스타일 트렌드 후보군, ② 고객 사진에서 도출한 얼굴
          적합도 분석, ③ 고객이 직접 입력한 선호(프롬프트)입니다. 이를 종합해 어울리는 스타일 9개를 제시하여, 고객은 시술
          실패 부담을 줄이고 미용사는 더 명확한 참고 자료로 상담 품질을 높일 수 있습니다.
        </p>
        <p className="max-w-3xl text-[#b8aa95]">
          미리룩의 AI 추천 이미지는 상담 참고용이며 실제 시술 결과를 보장하지 않습니다. 모발 상태·시술 난이도·디자이너의
          판단에 따라 결과가 달라질 수 있어, 최종 시술은 반드시 전문 미용사와 상담해 결정하시기 바랍니다. 또한 업로드된
          사진은 추천·상담 이미지 생성 목적으로만 처리하며, 별도 동의 없이 AI 모델 학습에 사용하지 않습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">기업 정보</h2>
        <div className="overflow-hidden rounded-lg border border-white/10">
          {companyInfo.map((item) => (
            <div
              className="grid gap-1 border-b border-white/8 px-4 py-3 last:border-b-0 sm:grid-cols-[180px_1fr]"
              key={item.label}
            >
              <dt className="font-semibold text-[#f3d28a]">{item.label}</dt>
              <dd className="text-[#fffaf1]">{item.value}</dd>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">문의</h2>
        <p>
          서비스 이용, 결제, 환불, 개인정보, 신고 관련 문의는{" "}
          <Link
            className="font-semibold text-[#f3d28a] underline"
            href="mailto:jipsa.admin@gmail.com"
          >
            jipsa.admin@gmail.com
          </Link>
          으로 접수할 수 있습니다.
        </p>
      </section>
    </div>
  );
}
