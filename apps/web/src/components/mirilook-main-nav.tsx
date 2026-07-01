import { Store } from "lucide-react";
import Link from "next/link";
import { MirilookAdminNavButton } from "@/components/mirilook-admin-nav-button";
import { MirilookAuthNav } from "@/components/mirilook-auth-nav";
import { MirilookLanguageSwitcher } from "@/components/mirilook-language-switcher";
import { MirilookLogoMark } from "@/components/mirilook-logo-mark";
import { MirilookThemeToggle } from "@/components/mirilook-theme-toggle";

type MirilookMainNavProps = {
  subtitle?: string;
};

const mainNavItems = [
  { href: "/salons", label: "미용실" },
  { href: "/community", label: "커뮤니티" },
];

export function MirilookMainNav({
  subtitle = "AI Salon Consultation",
}: MirilookMainNavProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Link
        className="flex w-fit items-center gap-4 transition hover:opacity-85"
        href="/"
      >
        <MirilookLogoMark className="size-14 shrink-0 md:size-16" decorative />
        <div>
          <p className="text-lg font-semibold tracking-[0.08em] text-[#fffaf1]">
            Miri Look
          </p>
          <p className="text-xs uppercase tracking-[0.24em] text-[#b8aa95]">
            {subtitle}
          </p>
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
        <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#d8cbb8] lg:flex-nowrap">
          {mainNavItems.map((item) => (
            <Link
              className="rounded-md border border-white/10 px-3 py-2 transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <MirilookAuthNav />
        <MirilookLanguageSwitcher />
        <Link
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-[#f3d28a]/50 bg-[#f3d28a] px-3 py-2 text-sm font-bold text-black transition hover:bg-[#ffdf98] hover:text-black"
          href="/store"
          style={{ color: "#000000" }}
        >
          <Store aria-hidden="true" className="text-black" size={15} />
          스토어
        </Link>
        <MirilookThemeToggle />
        <MirilookAdminNavButton />
      </div>
    </header>
  );
}
