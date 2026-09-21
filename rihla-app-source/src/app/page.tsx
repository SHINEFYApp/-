import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

// الشاشة الافتتاحية — منقولة من نموذج الواجهات المعتمد (Main.dc.html) بنفس النص والتصميم حرفيًا.
export default async function Splash() {
  const session = await auth();
  if (session?.user) {
    redirect("/home");
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-between overflow-hidden bg-green-2 px-8 pb-11 pt-16 text-white">
      <div
        className="pointer-events-none absolute left-1/2 top-[110px] h-[220px] w-[220px] -translate-x-1/2"
        aria-hidden
      >
        <div className="absolute inset-0 border border-[rgba(212,175,90,0.32)]" />
        <div className="absolute inset-0 rotate-45 border border-[rgba(212,175,90,0.32)]" />
      </div>

      <div className="z-10 flex flex-grow flex-col items-center justify-center gap-[18px] text-center">
        <div className="font-arabic-display text-[58px] font-bold leading-none text-gold-soft">
          رِحلة
        </div>
        <div className="text-[14.5px] tracking-[0.3px] text-white/72">
          Islamic Personal &amp; Family Life OS
        </div>
        <div className="my-1.5 h-px w-10 bg-[rgba(212,175,90,0.55)]" />
        <div className="max-w-[260px] text-[17px] leading-[1.9] text-[#EFE6CE]">
          الإسلام هو الـ North Star،
          <br />
          مش مجرد Tab داخل تطبيق عادات
        </div>
      </div>

      <div className="z-10 flex w-full flex-col gap-3.5">
        <Link
          href="/auth/sign-up"
          className="flex items-center justify-center gap-2 rounded-2xl bg-gold px-4 py-4 text-base font-bold text-[#2A2107]"
        >
          <span>نبدأ رحلتنا</span>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <div className="text-center text-xs text-white/50">
          PHASE B — تطبيق ويب حقيقي، لاستخدامك الشخصي أولًا
        </div>
      </div>
    </div>
  );
}
