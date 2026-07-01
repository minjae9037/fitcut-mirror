import type { Metadata } from "next";
import { MirilookGenerationRefundNotice } from "@/components/mirilook-generation-refund-notice";
import { MirilookSupportCaseForm } from "@/components/mirilook-support-case-form";

export const metadata: Metadata = {
  title: "환불정책",
  description: "미리룩 H머니 및 유료 서비스 환불정책",
};

export default function RefundPage() {
  return (
    <div className="space-y-8 text-sm leading-7 text-[#d8cbb8]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f3d28a]">
          Refund Policy
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#fffaf1]">환불정책</h1>
        <p className="mt-3">시행일: 2026. 06. 26.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">1. H머니의 정의</h2>
        <p>
          Hair money 또는 H머니는 미리룩의 헤어, 코디, 메이크업 추천과 AI
          이미지 생성 등 유료 기능 이용을 위해 회원이 원화로 구매하는 서비스 내
          결제 단위입니다. H머니는 현금, 예금, 전자화폐가 아니며 서비스 밖에서
          사용할 수 없습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">2. 환불 가능 기준</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>구매 후 7일 이내이며 사용하지 않은 유상 H머니</li>
          <li>일부 사용 후 남은 유상 H머니 중 회사가 환불 가능하다고 확인한 잔액</li>
          <li>중복 결제, 결제 승인 오류, 회사 귀책으로 서비스가 제공되지 않은 경우</li>
          <li>법령 또는 결제대행사 정책상 환불이 필요한 경우</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">3. 환불이 제한될 수 있는 경우</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>회원이 유료 추천 또는 AI 이미지 생성을 실행해 디지털 콘텐츠 제공이 시작되거나 완료된 경우</li>
          <li>뒤로 가기, 화면 전환, 브라우저 새로고침·종료, 서비스 이용 중 다른 앱이나 웹 이용 등 사용자 조작 또는 이용 환경 변경으로 생성 오류가 발생한 경우</li>
          <li>결과 이미지의 취향 불일치, 시술 결과와의 차이, 사진 품질 문제 등 주관적 사유만 있는 경우</li>
          <li>타인의 사진, 부정 결제, 자동화 호출, 약관 위반 등 부정 이용이 확인된 경우</li>
          <li>이벤트, 무료 지급, 보너스, 프로모션으로 제공된 무상 H머니</li>
          <li>결제일 또는 사용일로부터 상당 기간이 지나 거래 확인이 어려운 경우</li>
        </ul>
        <MirilookGenerationRefundNotice className="mt-4" />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">4. 환불 금액 산정</h2>
        <p>
          환불은 실제 결제한 유상 H머니를 기준으로 산정합니다. 회원이 일부
          유료 기능을 사용한 경우 사용된 H머니, 결제대행 수수료, 법령상 공제
          가능한 비용을 제외한 금액이 환불될 수 있습니다. 무상 H머니는 현금으로
          환불되지 않습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">5. 유효기간</h2>
        <p>
          유상 H머니의 유효기간은 구매일로부터 5년을 원칙으로 합니다. 이벤트나
          프로모션으로 지급된 무상 H머니는 별도 고지된 기간을 따를 수 있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">6. 신청 절차</h2>
        <p>
          환불 요청은 회원 계정 이메일, 결제일, 결제금액, 주문번호 또는
          승인번호, 환불 사유를 포함해 jipsa.admin@gmail.com으로 접수할 수
          있습니다. 회사는 접수 후 결제대행사 확인과 사용 이력 검토를 거쳐
          합리적인 기간 내 결과를 안내합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">
          환불/실패/고객문의 접수
        </h2>
        <p>
          생성 실패, 결제 오류, 환불 요청은 아래 양식으로 접수할 수 있습니다.
          추천 요청 ID나 결제 ID를 함께 남기면 확인 시간이 줄어듭니다.
        </p>
        <MirilookSupportCaseForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">7. 처리 방식</h2>
        <p>
          환불은 원칙적으로 최초 결제수단 취소 또는 결제대행사가 허용하는 방식에
          따릅니다. 카드사, 간편결제사, 은행, 앱마켓 등 외부 사업자의 처리
          일정에 따라 실제 입금 또는 승인 취소까지 추가 시간이 소요될 수
          있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">8. 정책 변경</h2>
        <p>
          본 정책은 법령, 결제수단, H머니 상품 구조, 유료 기능 변경에 따라
          수정될 수 있습니다. 중요한 변경은 서비스 내 공지 또는 이메일 등
          합리적인 방법으로 고지합니다.
        </p>
      </section>
    </div>
  );
}
