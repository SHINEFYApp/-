import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { userInterests, users } from "@/db/schema";
import { isSourceAgeRange, isSourceInterestKey, type SourceInterestKey } from "@/lib/sources-content";
import { SourcesFlow } from "@/components/sources/SourcesFlow";
import { ConnectedAccounts } from "@/components/sources/ConnectedAccounts";

// مصادر مقترحة — منقولة من نموذج الواجهات المعتمد Sources.dc.html.
export default async function SourcesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/auth/sign-in");
  }

  const [rows, [user]] = await Promise.all([
    db.select().from(userInterests).where(eq(userInterests.userId, userId)),
    db.select().from(users).where(eq(users.id, userId)).limit(1),
  ]);

  const initialInterests = rows
    .map((r) => r.key)
    .filter((k): k is SourceInterestKey => isSourceInterestKey(k));
  const initialAgeRange = user?.ageRange && isSourceAgeRange(user.ageRange) ? user.ageRange : null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-5 pb-1.5 pt-[22px]">
        <Link
          href="/home"
          aria-label="رجوع للرئيسية"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-surface"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        <div>
          <div className="text-[17px] font-extrabold text-ink">مصادر مقترحة ليك</div>
          <div className="mt-[1px] text-[11.5px] text-ink-muted">مبنية على اهتماماتك، مش أرقام مشاهدات</div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-5 pt-4">
        <SourcesFlow initialAgeRange={initialAgeRange} initialInterests={initialInterests} />
        <ConnectedAccounts />
      </div>
    </div>
  );
}
