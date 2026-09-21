import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lifeBalanceAreas } from "@/db/schema";
import { LIFE_BALANCE_DOMAIN_ORDER } from "@/lib/life-balance";

/**
 * يتأكد إن كل الـ ٨ مجالات موجودة لمستخدم معين (بينشئ الناقص بحالة "stable")،
 * وبيرجعهم مرتبين بترتيب النموذج المعتمد. مقيّد دايمًا بـ userId اللي بيتمرر له.
 */
export async function getOrCreateLifeBalanceAreas(userId: string) {
  const existing = await db
    .select()
    .from(lifeBalanceAreas)
    .where(eq(lifeBalanceAreas.userId, userId));

  const existingKeys = new Set(existing.map((row) => row.domainKey));
  const missing = LIFE_BALANCE_DOMAIN_ORDER.filter((key) => !existingKeys.has(key));

  if (missing.length > 0) {
    const inserted = await db
      .insert(lifeBalanceAreas)
      .values(missing.map((domainKey) => ({ userId, domainKey })))
      .onConflictDoNothing()
      .returning();
    existing.push(...inserted);
  }

  const byKey = new Map(existing.map((row) => [row.domainKey, row]));
  return LIFE_BALANCE_DOMAIN_ORDER.map((key) => byKey.get(key)).filter(
    (row): row is (typeof existing)[number] => Boolean(row)
  );
}
