import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "미리룩 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="space-y-8 text-sm leading-7 text-[#d8cbb8]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f3d28a]">
          Privacy Policy
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#fffaf1]">
          개인정보처리방침
        </h1>
        <p className="mt-3">시행일: 2026. 06. 26.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">1. 처리하는 개인정보</h2>
        <p>
          회사는 회원가입, 로그인, 추천 생성, 결제, 히스토리 저장, 커뮤니티,
          예약, 고객지원 과정에서 아래 정보를 처리할 수 있습니다.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>계정 정보: 이메일, 닉네임, 소셜 로그인 식별값, 프로필 사진</li>
          <li>서비스 입력 정보: 좌측면·정면·우측면 얼굴 사진, 선호 헤어컷, 컬러, 메모, 성별 선택, 생성 요청 기록</li>
          <li>생성 결과 정보: AI 추천 이미지, 상담용 이미지, 코디·메이크업 결과, 저장·공유·다운로드 이력</li>
          <li>커뮤니티 정보: 게시글, 댓글, 투표, 신고, 메시지 수신 설정</li>
          <li>입점·예약 정보: 미용실·디자이너 정보, 예약 요청, 리뷰, 위치 조회 이력</li>
          <li>결제 정보: H머니 구매·사용·환불 내역, 결제 승인번호, 결제수단 일부 식별정보</li>
          <li>자동 생성 정보: IP 주소, 쿠키, 기기·브라우저 정보, 접속 로그, 오류 로그, 부정 이용 탐지 정보</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">2. 개인정보의 이용 목적</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>AI 헤어스타일, 코디, 메이크업 추천과 이미지 생성</li>
          <li>회원별 히스토리 저장, 결과 공유, PDF·이미지 내보내기</li>
          <li>H머니 결제, 차감, 환불, 결제 오류 처리</li>
          <li>미용실·디자이너 예약, 리뷰, 위치 기반 탐색 제공</li>
          <li>커뮤니티, 투표, 댓글, 메시지, 신고 및 안전 관리</li>
          <li>고객 상담, 공지, 약관 변경 안내, 서비스 품질 개선</li>
          <li>보안, 부정 이용 방지, 법령상 의무 이행</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">3. 얼굴 사진과 AI 처리</h2>
        <p>
          얼굴 사진은 헤어스타일 추천과 상담 이미지 생성을 위해 처리됩니다.
          회사는 별도 고지와 동의 없이 얼굴을 고유하게 식별하기 위한 생체인식
          템플릿을 만들거나 본인확인 목적으로 사용하지 않습니다. 또한 회원의
          얼굴 사진과 생성 결과를 별도 동의 없이 AI 모델 학습·고도화의 학습
          데이터로 사용하지 않습니다. 다만, 업로드된 사진과 생성 결과는 회원이
          요청한 추천, 저장, 공유, 오류 대응을 위해 필요한 기간 동안 보관될 수
          있습니다.
        </p>
        <p>
          회원은 업로드한 사진과 생성 결과의 삭제를 언제든지 요청할 수 있습니다.
          서비스 내 문의하기에서 “내 사진·데이터 삭제 요청”을 선택해 접수하면
          법령상 보관 의무가 있는 정보를 제외하고 지체 없이 파기합니다. 회원
          탈퇴 시에도 동일하게 처리됩니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">4. 보유 및 이용 기간</h2>
        <p>
          회사는 원칙적으로 이용 목적 달성 또는 회원 탈퇴 시 개인정보를
          파기합니다. 단, 결제·환불·분쟁 대응·전자상거래 기록·통신비밀보호 등
          법령상 보관 의무가 있는 정보는 해당 법령에서 정한 기간 동안 보관할 수
          있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">5. 제3자 제공과 공유</h2>
        <p>
          회사는 원칙적으로 회원의 개인정보를 제3자에게 제공하지 않습니다. 다만
          회원이 미용실, 디자이너, 투표, 커뮤니티, 카카오톡·이메일 공유 등
          기능을 직접 선택한 경우 해당 기능 제공에 필요한 범위에서 정보가
          공유될 수 있습니다. 법령상 의무가 있거나 수사기관의 적법한 요청이
          있는 경우에도 필요한 범위에서 제공될 수 있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">6. 처리위탁 및 국외 처리</h2>
        <p>
          서비스 운영을 위해 회사는 클라우드, 인증, 데이터베이스, 이메일,
          결제, 자동화, AI 이미지 생성 사업자에게 업무를 위탁할 수 있습니다.
          현재 또는 예정된 주요 처리 수탁자는 Supabase, Vercel, OpenAI, Google
          Gemini, Resend, Trigger.dev, PortOne 및 결제대행사입니다. 일부
          사업자는 국외에 서버를 둘 수 있으며, 회사는 실제 도입 시 서비스 내
          고지 또는 본 방침 개정을 통해 세부 항목을 안내합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">7. 이용자의 권리</h2>
        <p>
          회원은 본인의 개인정보 열람, 정정, 삭제, 처리정지, 동의 철회를
          요청할 수 있습니다. 서비스 내 마이페이지에서 일부 정보를 직접 수정할
          수 있으며, 직접 처리가 어려운 요청은 hello@mirilook.com으로 접수할 수
          있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">8. 안전성 확보 조치</h2>
        <p>
          회사는 접근권한 관리, 암호화 전송, 로그 점검, 최소 권한 원칙,
          관리자 접근 통제, 외부 API 키 보호, 오류·침해 대응 절차 등 개인정보
          보호를 위한 기술적·관리적 조치를 적용합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">9. 쿠키와 유사 기술</h2>
        <p>
          회사는 로그인 유지, 사용성 개선, 보안, 서비스 분석을 위해 쿠키 또는
          유사 기술을 사용할 수 있습니다. 회원은 브라우저 설정을 통해 쿠키
          저장을 거부할 수 있으나, 일부 기능 이용이 제한될 수 있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">10. 광고 및 제3자 광고 쿠키(Google AdSense)</h2>
        <p>
          본 서비스는 광고 게재를 위해 Google AdSense 등 제3자 광고 공급업체를
          이용하며, 이들은 이용자의 방문 기록을 바탕으로 한 맞춤형 광고를
          제공하기 위해 쿠키를 사용합니다.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Google을 포함한 제3자 공급업체는 쿠키(Google의 경우 DoubleClick
            DART 쿠키 등)와 광고 식별자를 사용해 이용자의 본 서비스 및 다른
            사이트 방문 기록에 기반한 광고를 게재합니다.
          </li>
          <li>
            이용자는{" "}
            <a
              className="text-[#f3d28a] underline"
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google 광고 설정(google.com/settings/ads)
            </a>
            에서 맞춤형 광고를 비활성화할 수 있으며,{" "}
            <a
              className="text-[#f3d28a] underline"
              href="https://www.aboutads.info/choices"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.aboutads.info/choices
            </a>
            에서 제3자 공급업체의 쿠키 사용을 일괄 거부할 수 있습니다.
          </li>
          <li>
            Google의 광고 쿠키 사용에 관한 자세한 정책은{" "}
            <a
              className="text-[#f3d28a] underline"
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google 광고 정책
            </a>
            을 참고하시기 바랍니다.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">11. 문의처</h2>
        <p>
          개인정보 관련 문의, 권리 행사, 침해 신고는 hello@mirilook.com으로
          접수할 수 있습니다. 정식 개인정보 보호책임자와 사업자 정보는 법인
          설립 및 정식 오픈 시 업데이트합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#fffaf1]">12. 방침 변경</h2>
        <p>
          본 방침은 법령, 서비스 구조, 수탁자, 처리 항목 변경에 따라 수정될 수
          있습니다. 중요한 변경은 서비스 내 공지, 이메일, 알림 등 합리적인
          방법으로 고지합니다.
        </p>
      </section>
    </div>
  );
}
