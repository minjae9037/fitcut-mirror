import type { Metadata } from "next";
import Link from "next/link";
import { MirilookGenerationRefundNotice } from "@/components/mirilook-generation-refund-notice";

export const metadata: Metadata = {
  title: "이용약관",
  description: "미리룩 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <div className="space-y-8 text-sm leading-7 text-[#d8cbb8]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f3d28a]">
          Terms of Service
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#fffaf1]">이용약관</h1>
        <p className="mt-3">시행일: 2026. 06. 26.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">제1조 목적</h2>
        <p>
          본 약관은 미리룩(Miri Look, 이하 “회사”)이 제공하는 AI 기반
          헤어스타일, 코디, 메이크업 추천 서비스 및 관련 커뮤니티, 투표,
          입점, 예약, 결제 기능의 이용 조건과 회사와 회원의 권리·의무를
          정하는 것을 목적으로 합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">제2조 서비스의 성격</h2>
        <p>
          미리룩은 회원이 업로드한 얼굴·헤어 사진, 선택한 선호 조건, 서비스
          이용 이력 등을 바탕으로 이미지와 상담 참고자료를 생성합니다. AI
          결과물은 미용실 상담을 돕기 위한 참고자료이며, 실제 시술 결과,
          만족도, 특정 미용실 또는 디자이너의 서비스 품질을 보장하지 않습니다.
        </p>
        <p>
          회사는 서비스 품질 향상을 위해 추천 알고리즘, 이미지 생성 방식,
          제공 기능, 유료 상품 구성을 변경할 수 있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">제3조 회원가입과 계정</h2>
        <p>
          회원은 이메일 또는 회사가 제공하는 인증 방식을 통해 가입할 수
          있습니다. 회원은 정확한 정보를 제공해야 하며, 본인의 계정을 제3자에게
          양도, 대여, 공유할 수 없습니다.
        </p>
        <p>
          회사는 서비스 운영, 보안, 부정 이용 방지를 위해 필요한 범위에서
          본인확인, 이용 제한, 계정 정지 또는 탈퇴 처리를 할 수 있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">제4조 사진과 콘텐츠 이용</h2>
        <p>
          회원은 본인에게 적법한 이용 권한이 있는 사진만 업로드해야 합니다.
          타인의 얼굴 사진, 초상, 저작물, 개인정보를 권한 없이 업로드해서는 안
          됩니다.
        </p>
        <p>
          회원이 사진을 업로드하고 AI 생성에 동의하는 경우, 회사는 해당 사진과
          입력 정보를 헤어스타일 추천, 이미지 생성, 결과 저장, 오류 개선,
          고객지원, 부정 이용 방지 목적으로 처리할 수 있습니다. 회원이
          미용사·미용실·커뮤니티·투표 기능으로 결과를 공유하는 경우, 공유 범위
          내에서 다른 이용자가 해당 콘텐츠를 볼 수 있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">제5조 금지행위</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>타인의 개인정보, 사진, 계정, 결제수단을 무단으로 이용하는 행위</li>
          <li>불법, 음란, 혐오, 차별, 명예훼손, 스토킹, 사칭성 콘텐츠를 게시하는 행위</li>
          <li>AI 결과물을 실제 인물의 명예를 훼손하거나 오인시키는 방식으로 이용하는 행위</li>
          <li>서비스를 역설계하거나 자동화 도구로 과도하게 호출하는 행위</li>
          <li>H머니, 쿠폰, 무료 크레딧, 결제 시스템을 부정 취득 또는 악용하는 행위</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">제6조 H머니와 유료 서비스</h2>
        <p>
          Hair money 또는 H머니는 회원이 원화로 구매해 미리룩의 헤어, 코디,
          메이크업 추천 및 AI 이미지 생성 등 유료 기능에 사용할 수 있는 서비스
          내 결제 단위입니다. H머니는 현금, 예금, 전자화폐가 아니며, 서비스
          외부에서 양도, 판매, 교환하거나 현금처럼 사용할 수 없습니다.
        </p>
        <p>
          유료 기능을 실행하면 사전에 고지된 H머니가 차감됩니다. 추천 또는
          이미지 생성이 시작된 이후에는 디지털 콘텐츠 제공의 특성상 단순 변심에
          따른 취소가 제한될 수 있습니다. 환불 기준은{" "}
          <Link className="font-semibold text-[#f3d28a] underline" href="/refund">
            환불정책
          </Link>
          을 따릅니다.
        </p>
        <MirilookGenerationRefundNotice className="mt-4" />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">제7조 커뮤니티, 투표, 메시지</h2>
        <p>
          회원은 익명 또는 닉네임 기반으로 글, 댓글, 투표, 스타일 평가, 메시지
          기능을 이용할 수 있습니다. 단, 회사는 신고, 법령 준수, 분쟁 대응,
          안전한 운영을 위해 필요한 경우 게시물과 이용 기록을 확인하고 조치할
          수 있습니다.
        </p>
        <p>
          투표나 메시지 기능에서 회원이 수신을 허용한 경우에만 다른 회원이
          대화 요청을 보낼 수 있습니다. 수신 거부 상태에서는 투표와 댓글 등
          제한된 상호작용만 가능합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">제8조 미용실·디자이너 정보와 예약</h2>
        <p>
          회사는 미용실, 헤어 디자이너, 리뷰, 위치, 예약 관련 정보를 제공할 수
          있습니다. 입점자가 등록한 정보의 정확성, 실제 시술 가능 여부, 예약
          이행, 현장 결제, 시술 결과는 해당 입점자의 책임 영역일 수 있습니다.
          회사가 직접 통신판매 또는 예약 중개자로 표시되는 경우에는 관련 법령과
          별도 고지에 따른 책임을 부담합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">제9조 서비스 제한과 종료</h2>
        <p>
          회사는 시스템 점검, 장애, 보안 위험, 외부 API 제공자의 정책 변경,
          법령상 제한, 운영상 필요가 있는 경우 서비스의 전부 또는 일부를
          일시적으로 중단하거나 변경할 수 있습니다. 장기 중단 또는 유료 서비스에
          중대한 영향을 주는 변경은 합리적인 방법으로 사전 또는 사후 고지합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">제10조 책임 제한</h2>
        <p>
          회사는 고의 또는 중대한 과실이 없는 한 AI 추천 결과의 미적 만족도,
          실제 시술과의 동일성, 제3자 서비스 장애, 회원의 잘못된 사진 업로드나
          선호 입력으로 인한 결과에 대해 책임을 부담하지 않습니다. 다만, 관련
          법령상 회사의 책임을 배제할 수 없는 경우에는 해당 법령을 따릅니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">제11조 약관 변경</h2>
        <p>
          회사는 법령, 서비스 구조, 결제 정책, 운영상 필요에 따라 약관을 변경할
          수 있습니다. 변경 내용은 서비스 내 공지, 이메일, 앱 알림 등 합리적인
          방법으로 고지하며, 회원에게 불리한 중요한 변경은 적용일 전 충분한
          기간을 두고 고지합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">제12조 문의</h2>
        <p>
          서비스 이용, 결제, 환불, 개인정보, 신고 관련 문의는
          hello@mirilook.com으로 접수할 수 있습니다. 회사 정보와 고객센터
          운영시간은 정식 사업자 등록 및 결제 오픈 시 별도 고지합니다.
        </p>
      </section>
    </div>
  );
}
