import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getOrCreateLifeBalanceAreas } from "@/lib/life-balance-server";
import {
  LIFE_BALANCE_PROTOCOL_LENGTH_DAYS,
  LIFE_BALANCE_PROTOCOL_SUBTEXT,
  computeProtocolDay,
  type LifeBalanceDomainKey,
  type LifeBalanceStatus,
} from "@/lib/life-balance";
import { LifeBalanceGrid } from "@/components/life/LifeBalanceGrid";

// خريطة توازن الحياة — منقولة من نموذج الواجهات المعتمد LifeBalance.dc.html.
// بروتوكول الـ ١٤ يوم بيتحسب من تاريخ إنشاء الحساب الحقيقي (users.createdAt)، مفيش رقم وهمي هنا.
export default async function LifeBalancePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/auth/sign-in");
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const areas = await getOrCreateLifeBalanceAreas(userId);

  const protocolDay = user?.createdAt ? computeProtocolDay(user.createdAt) : 0;
  const protocolPct = Math.round((protocolDay / LIFE_BALANCE_PROTOCOL_LENGTH_DAYS) * 100);

  return (
    <div className="flex flex-col gap-[18px] px-5 pb-4 pt-[22px]">
      <div>
        <div className="text-xl font-extrabold text-ink">خريطة توازن الحياة</div>
        <div className="mt-[3px] text-[12.5px] text-ink-muted">
          مستقر / هش / مُهمَل / عالي الاحتكاك / عالي الأثر — لا &quot;جيد أو سيئ&quot;
        </div>
      </div>

      <div className="flex flex-col gap-2.5 rounded-[18px] bg-green p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="text-[13.5px] font-extrabold">بروتوكول استقرار ١٤ يوم</div>
          <div className="text-xs text-white/75">
            يوم {protocolDay} من {LIFE_BALANCE_PROTOCOL_LENGTH_DAYS}
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-gold"
            style={{ width: `${protocolPct}%` }}
          />
        </div>
        <div className="text-xs text-white/80">{LIFE_BALANCE_PROTOCOL_SUBTEXT}</div>
      </div>

      <LifeBalanceGrid
        initialAreas={areas.map((a) => ({
          domainKey: a.domainKey as LifeBalanceDomainKey,
          status: a.status as LifeBalanceStatus,
          note: a.note,
        }))}
      />
    </div>
  );
}
