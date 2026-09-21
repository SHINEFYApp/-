import { auth } from "@/auth";
import { isKidsMode } from "@/lib/kids-mode";
import { BottomNav } from "@/components/BottomNav";

// إطار مشترك لكل شاشات التطبيق بعد تسجيل الدخول (محمي عن طريق src/proxy.ts — راجع
// ملحوظة Next.js 16 هناك: الاسم اتغير من middleware لـ proxy).
// كل agent بيبني شاشته جوه المجلد ده كـ page.tsx مستقل — العنوان العلوي/المحتوى بتاع كل شاشة
// من مسؤولية الـ agent، الإطار ده بيوفّر بس الحاوية بعرض الموبايل + الشريط السفلي الثابت.
//
// data-kids على الحاوية الجذرية هنا بيفعّل "نسخة الأطفال" اللونية بالكامل (راجع الـ
// [data-kids="true"] block في globals.css) — أي مستخدم فئته العمرية "أقل من ١٨" (راجع
// src/lib/kids-mode.ts) بيشوف التطبيق بألوان وطابع مختلف تلقائيًا من غير أي إعداد يدوي.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const kids = isKidsMode(session?.user?.ageRange);

  return (
    <div
      data-kids={kids ? "true" : undefined}
      className="mx-auto flex min-h-svh w-full max-w-[480px] flex-col bg-bg"
    >
      <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
