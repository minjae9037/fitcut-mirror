import { TriangleAlert } from "lucide-react";

type MirilookGenerationRefundNoticeProps = {
  className?: string;
};

export function MirilookGenerationRefundNotice({
  className = "",
}: MirilookGenerationRefundNoticeProps) {
  return (
    <div
      className={`rounded-md border border-[#f48aa5]/45 bg-[#30151c]/82 p-3 text-xs leading-5 text-[#ffd5dd] shadow-lg shadow-[#ff5d87]/10 ${className}`}
    >
      <div className="flex gap-2">
        <TriangleAlert
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-[#ff8fa8]"
          size={16}
        />
        <div>
          <p className="font-bold text-[#ffe6eb]">생성 중 화면 이탈 시 환불 불가</p>
          <p className="mt-1">
            뒤로 가기, 화면 전환, 브라우저 새로고침·종료, 서비스 이용 중
            다른 앱이나 웹 이용 등 사용자 조작 또는 이용 환경 변경으로 생성
            오류가 발생한 경우 미리룩은 책임지지 않으며 환불하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
