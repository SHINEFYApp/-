"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// نفس منطق الشريط السفلي في نموذج الواجهات المعتمد (Home.dc.html) — بعد إضافة تبويبين جديدين
// بطلب خالد: "الإنتاجية" (لوحة الكانبان) و"الونيس" (شات الرفيق)، مع إبقاء "اليوم" في المنتصف
// كنقطة الارتكاز الأساسية زي التصميم الأصلي.
const TABS = [
  {
    href: "/tasks",
    label: "الإنتاجية",
    icon: (active: boolean) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--green)" : "var(--ink-muted)"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="7" height="16" rx="1.5" />
        <rect x="14" y="4" width="7" height="9" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/life",
    label: "الحياة",
    icon: (active: boolean) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--green)" : "var(--ink-muted)"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/home",
    label: "اليوم",
    icon: (active: boolean) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--green)" : "var(--ink-muted)"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" />
      </svg>
    ),
  },
  {
    href: "/companion",
    label: "الونيس",
    icon: (active: boolean) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--green)" : "var(--ink-muted)"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    href: "/review",
    label: "المراجعة",
    icon: (active: boolean) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--green)" : "var(--ink-muted)"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18" />
        <path d="M8 3v4M16 3v4" />
        <path d="m8 15 2.3 2.3L16 12" />
      </svg>
    ),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex border-t border-border bg-surface px-2 pt-2.5 pb-[max(env(safe-area-inset-bottom),14px)]">
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-1 flex-col items-center gap-1"
          >
            {tab.icon(!!active)}
            <span
              className="text-[11px] font-bold"
              style={{ color: active ? "var(--green)" : "var(--ink-muted)" }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
