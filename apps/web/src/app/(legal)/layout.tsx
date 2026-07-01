import Link from "next/link";
import { MirilookMainNav } from "@/components/mirilook-main-nav";

const legalLinks = [
  { href: "/company", label: "회사소개" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/refund", label: "환불정책" },
];

export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-[#11100e] text-[#f8f1e5]">
      <div className="mx-auto max-w-6xl px-5 py-5">
        <MirilookMainNav subtitle="CS / Policy" />
      </div>
      <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-16 pt-4 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-lg border border-white/10 bg-black/30 p-3">
          <nav aria-label="정책 메뉴" className="grid gap-2">
            {legalLinks.map((item) => (
              <Link
                className="rounded-md px-3 py-2 text-sm font-semibold text-[#d8cbb8] transition hover:bg-white/5 hover:text-[#f3d28a]"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <article className="rounded-lg border border-white/10 bg-black/35 p-5 shadow-2xl shadow-black/30 md:p-8">
          {children}
        </article>
      </section>
    </main>
  );
}
