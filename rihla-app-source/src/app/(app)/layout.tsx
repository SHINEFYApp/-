import { BottomNav } from "@/components/BottomNav";

// إطار مشترك لكل شاشات التطبيق بعد تسجيل الدخول (محمي عن طريق src/proxy.ts — راجع
// ملحوظة Next.js 16 هناك: الاسم اتغير من middleware لـ proxy).
// كل agent بيبني شاشته جوه المجلد ده كـ page.tsx مستقل — العنوان العلوي/المحتوى بتاع كل شاشة
// من مسؤولية الـ agent، الإطار ده بيوفّر بس الحاوية بعرض الموبايل + الشريط السفلي الثابت.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[480px] flex-col bg-bg">
      <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
