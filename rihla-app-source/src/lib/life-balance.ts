// رحلة — خريطة توازن الحياة (Life Balance Map)
//
// المجالات الثمانية وترتيبها منقولين حرفيًا من نموذج الواجهات المعتمد:
// /home/claude/islamic-life-os/prototype/project/LifeBalance.dc.html (مصفوفة raw داخل renderVals)
// ما تتغيرش الأسماء أو الترتيب من غير مراجعة النموذج المعتمد.

export type LifeBalanceDomainKey =
  | "sp"
  | "sleep"
  | "work"
  | "money"
  | "rel"
  | "body"
  | "digital"
  | "growth";

// حالات المجال الخمسة — نفس الخيارات الظاهرة في النموذج المعتمد (بدون "جيد/سيئ")
export type LifeBalanceStatus =
  | "stable" // مستقر
  | "fragile" // هش
  | "neglected" // مُهمَل
  | "high_friction" // عالي الاحتكاك
  | "high_impact"; // عالي الأثر

export const LIFE_BALANCE_DOMAIN_ORDER: LifeBalanceDomainKey[] = [
  "sp",
  "sleep",
  "work",
  "money",
  "rel",
  "body",
  "digital",
  "growth",
];

export const LIFE_BALANCE_DOMAIN_LABELS: Record<LifeBalanceDomainKey, string> = {
  sp: "الروح والعبادة",
  sleep: "النوم",
  work: "العمل",
  money: "المال",
  rel: "العلاقات",
  body: "الصحة الجسدية",
  digital: "الحياة الرقمية",
  growth: "النمو الشخصي",
};

export const LIFE_BALANCE_STATUS_ORDER: LifeBalanceStatus[] = [
  "stable",
  "fragile",
  "neglected",
  "high_friction",
  "high_impact",
];

export const LIFE_BALANCE_STATUS_LABELS: Record<LifeBalanceStatus, string> = {
  stable: "مستقر",
  fragile: "هش",
  neglected: "مُهمَل",
  high_friction: "عالي الاحتكاك",
  high_impact: "عالي الأثر",
};

// الـ tone بيحدد لون الشارة (badge) — مطابق لخريطة toneColor/toneBg/toneRing في النموذج المعتمد
export type LifeBalanceTone = "green" | "gold" | "terracotta";

export const LIFE_BALANCE_STATUS_TONE: Record<LifeBalanceStatus, LifeBalanceTone> = {
  stable: "green",
  fragile: "gold",
  high_impact: "gold",
  neglected: "terracotta",
  high_friction: "terracotta",
};

export function isLifeBalanceDomainKey(value: string): value is LifeBalanceDomainKey {
  return (LIFE_BALANCE_DOMAIN_ORDER as string[]).includes(value);
}

export function isLifeBalanceStatus(value: string): value is LifeBalanceStatus {
  return (LIFE_BALANCE_STATUS_ORDER as string[]).includes(value);
}

// النص الثابت تحت شريط التقدم — منقول حرفيًا من النموذج المعتمد، بدون تعديل
export const LIFE_BALANCE_PROTOCOL_SUBTEXT =
  "الثوابت التعبدية حاضرة بنسختها الدنيا من أول يوم";

export const LIFE_BALANCE_PROTOCOL_LENGTH_DAYS = 14;

/**
 * عدد أيام بروتوكول الاستقرار الحقيقي منذ إنشاء الحساب — مش رقم وهمي.
 * يوم التسجيل نفسه = يوم ١، ومحدود بين ١ و١٤ (أو صفر لو التاريخ غير متاح لأي سبب).
 */
export function computeProtocolDay(createdAt: Date, now: Date = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / msPerDay);
  const day = daysSince + 1;
  return Math.min(LIFE_BALANCE_PROTOCOL_LENGTH_DAYS, Math.max(0, day));
}
