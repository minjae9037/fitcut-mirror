import Link from "next/link";

const legalLinks = [
  { href: "/company", label: "회사소개" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/refund", label: "환불정책" },
];

export function MirilookLegalFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0c0b0a] text-[#b8aa95]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.16em] text-[#fffaf1]">
            Miri Look
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-6">
            미리룩의 AI 추천 이미지는 상담 참고용이며, 실제 시술 결과를
            보장하지 않습니다. 회사 정보, 결제, 환불, 개인정보 처리 기준은
            아래 CS/정책 메뉴에서 안내합니다.
          </p>
          <div className="mt-4 space-y-1 rounded-md border border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-6 text-[#d8cbb8]">
            <p>엠제이인사이트 주식회사 · 대표 이민재 · 사업자등록번호 226-81-56027</p>
            <p>통신판매업신고 제2026-부천소사-0462호 · 경기도 부천시 소사구 소삼로 62</p>
            <p>문의 010-2704-5672 · jipsa.admin@gmail.com</p>
          </div>
          <p className="mt-2 text-xs">© {new Date().getFullYear()} Miri Look.</p>
        </div>
        <nav
          aria-label="법적 고지"
          className="flex flex-wrap items-center gap-2 text-sm font-semibold"
        >
          {legalLinks.map((item) => (
            <Link
              className="rounded-md border border-white/10 px-3 py-2 transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
