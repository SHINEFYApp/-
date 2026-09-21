// رحلة — منطق حاسبة الزكاة التقريبية
//
// المرجع الحاكم: /home/claude/islamic-life-os/skills/islamic-finance-muamalat/SKILL.md
// (قسم "واجبات مالية-تعبدية تُتابَع دائمًا" وقسم "التنويه الإلزامي").
//
// خط أحمر: الحساب هنا حساب تنظيمي تقريبي فقط، مبني على نسبة ٢٫٥٪ ومقادير النصاب
// المُجمَع عليها (٨٥ جم ذهب أو ٥٩٥ جم فضة) — مفيش أي إفتاء شخصي أو حكم في مسائل خلافية.
// أي نص تنويه هنا منسوخ حرفيًا من الـ SKILL.md المعتمد أعلاه، مش صياغة حرة.

export const NISAB_GOLD_GRAMS = 85;
export const NISAB_SILVER_GRAMS = 595;
export const ZAKAT_RATE = 0.025; // ٢٫٥٪ (رُبع العُشر)
// طول الحول القمري بالتقريب (السنة الهجرية ≈ ٣٥٤٫٣٦ يوم) — تقريب للأيام الصحيحة فقط
export const HAWL_APPROX_DAYS = 354;

// التنويه الإلزامي — منسوخ حرفيًا من قسم "واجبات مالية-تعبدية تُتابَع دائمًا" في
// SKILL.md (islamic-finance-muamalat). يجب عرضه دائمًا مع أي نتيجة حساب زكاة.
export const ZAKAT_CALCULATION_DISCLAIMER =
  "هذا تقدير تنظيمي، والمرجع النهائي لمقادير الزكاة ومصارفها مفتٍ أو مركز زكاة موثوق.";

// التنويه العام الإلزامي — منسوخ حرفيًا من قسم "تنويه إلزامي" في نفس الـ SKILL.md.
export const ISLAMIC_FINANCE_GENERAL_DISCLAIMER =
  "هذا تنظيم تعليمي يستند لفقه المعاملات ومصادر معتمدة، وليس بديلاً عن مستشار شرعي أو مالي مرخّص، خصوصًا في العقود التجارية والاستثمارات الكبيرة وتقسيم الميراث.";

export type NisabReference = "gold" | "silver";

export interface ZakatInputs {
  currency: string;
  nisabReference: NisabReference;
  goldPricePerGram: number | null;
  silverPricePerGram: number | null;
  cashAmount: number;
  goldGrams: number;
  silverGrams: number;
  tradeGoodsValue: number;
  debtsOwed: number;
}

export interface ZakatResult {
  goldValue: number;
  silverValue: number;
  grossWealth: number;
  netWealth: number;
  nisabValue: number | null;
  isAboveNisab: boolean;
  zakatDue: number;
}

/** قيمة الذهب/الفضة اللي المستخدم مالكها (مش النصاب) — بتستخدم أسعار المستخدم المُدخلة */
export function computeZakat(inputs: ZakatInputs): ZakatResult {
  const goldValue = inputs.goldGrams * (inputs.goldPricePerGram ?? 0);
  const silverValue = inputs.silverGrams * (inputs.silverPricePerGram ?? 0);
  const grossWealth = inputs.cashAmount + inputs.tradeGoodsValue + goldValue + silverValue;
  const netWealth = Math.max(0, grossWealth - inputs.debtsOwed);

  const referencePricePerGram =
    inputs.nisabReference === "gold" ? inputs.goldPricePerGram : inputs.silverPricePerGram;
  const referenceGrams = inputs.nisabReference === "gold" ? NISAB_GOLD_GRAMS : NISAB_SILVER_GRAMS;
  const nisabValue =
    referencePricePerGram && referencePricePerGram > 0 ? referencePricePerGram * referenceGrams : null;

  const isAboveNisab = nisabValue !== null && netWealth >= nisabValue;
  const zakatDue = isAboveNisab ? netWealth * ZAKAT_RATE : 0;

  return { goldValue, silverValue, grossWealth, netWealth, nisabValue, isAboveNisab, zakatDue };
}

/** تاريخ استحقاق الزكاة (نهاية الحول) بناءً على تاريخ بداية الحول — تقريب بالأيام */
export function computeHawlDueDate(hawlStartDate: Date | null): Date | null {
  if (!hawlStartDate) return null;
  const due = new Date(hawlStartDate);
  due.setUTCDate(due.getUTCDate() + HAWL_APPROX_DAYS);
  return due;
}

export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}
