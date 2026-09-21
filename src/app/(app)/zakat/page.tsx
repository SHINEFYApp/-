import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { zakatProfiles } from "@/db/schema";
import { ZakatCalculator } from "@/components/zakat/ZakatCalculator";

// شاشة "حاسبة الزكاة" — Server Component بيجيب (أو ينشئ) ملف الزكاة بتاع المستخدم،
// وبيسلّمه لمكوّن عميل واحد بيتولى الحساب التفاعلي والحفظ (راجع src/lib/zakat.ts للمنطق).
export default async function ZakatPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/auth/sign-in");
  }

  let [profile] = await db.select().from(zakatProfiles).where(eq(zakatProfiles.userId, userId)).limit(1);
  if (!profile) {
    [profile] = await db.insert(zakatProfiles).values({ userId }).returning();
  }

  return (
    <div className="flex flex-col gap-[18px] px-5 pb-4 pt-[22px]">
      <div>
        <div className="text-xl font-extrabold text-ink">حاسبة الزكاة</div>
        <div className="mt-[3px] text-[12.5px] text-ink-muted">حساب تقريبي + تذكير بموعد الاستحقاق</div>
      </div>

      <ZakatCalculator
        currency={profile.currency}
        initialProfile={{
          currency: profile.currency,
          nisabReference: profile.nisabReference as "gold" | "silver",
          goldPricePerGram: profile.goldPricePerGram,
          silverPricePerGram: profile.silverPricePerGram,
          cashAmount: profile.cashAmount,
          goldGrams: profile.goldGrams,
          silverGrams: profile.silverGrams,
          tradeGoodsValue: profile.tradeGoodsValue,
          debtsOwed: profile.debtsOwed,
          hawlStartDate: profile.hawlStartDate ? profile.hawlStartDate.toISOString() : null,
          lastPaidDate: profile.lastPaidDate ? profile.lastPaidDate.toISOString() : null,
          malReminderEnabled: profile.malReminderEnabled,
          fitrReminderEnabled: profile.fitrReminderEnabled,
        }}
      />
    </div>
  );
}
