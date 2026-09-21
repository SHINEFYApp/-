"use client";

import { useMemo, useState } from "react";
import {
  ISLAMIC_FINANCE_GENERAL_DISCLAIMER,
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
  ZAKAT_CALCULATION_DISCLAIMER,
  computeHawlDueDate,
  computeZakat,
  daysBetween,
  type NisabReference,
} from "@/lib/zakat";

export interface ZakatProfileClient {
  currency: string;
  nisabReference: NisabReference;
  goldPricePerGram: number | null;
  silverPricePerGram: number | null;
  cashAmount: number;
  goldGrams: number;
  silverGrams: number;
  tradeGoodsValue: number;
  debtsOwed: number;
  hawlStartDate: string | null;
  lastPaidDate: string | null;
  malReminderEnabled: boolean;
  fitrReminderEnabled: boolean;
}

type NumField =
  | "cashAmount"
  | "goldGrams"
  | "goldPricePerGram"
  | "silverGrams"
  | "silverPricePerGram"
  | "tradeGoodsValue"
  | "debtsOwed";

const FIELD_LABELS: Record<NumField, string> = {
  cashAmount: "النقد (كاش وأرصدة بنكية)",
  goldGrams: "وزن الذهب المملوك (جم)",
  goldPricePerGram: "سعر جرام الذهب الحالي",
  silverGrams: "وزن الفضة المملوكة (جم)",
  silverPricePerGram: "سعر جرام الفضة الحالي",
  tradeGoodsValue: "قيمة عروض التجارة (بضاعة للبيع)",
  debtsOwed: "ديون عليك (تُخصم)",
};

function fmt(n: number, currency: string): string {
  return `${Math.round(n).toLocaleString("ar-EG")} ${currency}`;
}

export function ZakatCalculator({ initialProfile, currency: initialCurrency }: { initialProfile: ZakatProfileClient; currency: string }) {
  const [profile, setProfile] = useState(initialProfile);
  const [currency, setCurrency] = useState(initialCurrency);
  const [hawlDate, setHawlDate] = useState(initialProfile.hawlStartDate?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const result = useMemo(
    () =>
      computeZakat({
        currency,
        nisabReference: profile.nisabReference,
        goldPricePerGram: profile.goldPricePerGram,
        silverPricePerGram: profile.silverPricePerGram,
        cashAmount: profile.cashAmount,
        goldGrams: profile.goldGrams,
        silverGrams: profile.silverGrams,
        tradeGoodsValue: profile.tradeGoodsValue,
        debtsOwed: profile.debtsOwed,
      }),
    [profile, currency]
  );

  const hawlDueDate = useMemo(
    () => (hawlDate ? computeHawlDueDate(new Date(hawlDate)) : null),
    [hawlDate]
  );
  const daysLeft = hawlDueDate ? daysBetween(new Date(), hawlDueDate) : null;

  function updateField(field: NumField, raw: string) {
    const value = raw === "" ? null : Number(raw);
    setProfile((prev) => ({ ...prev, [field]: value === null || Number.isNaN(value) ? (field === "cashAmount" || field === "goldGrams" || field === "silverGrams" || field === "tradeGoodsValue" || field === "debtsOwed" ? 0 : null) : value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/zakat/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          nisabReference: profile.nisabReference,
          goldPricePerGram: profile.goldPricePerGram,
          silverPricePerGram: profile.silverPricePerGram,
          cashAmount: profile.cashAmount,
          goldGrams: profile.goldGrams,
          silverGrams: profile.silverGrams,
          tradeGoodsValue: profile.tradeGoodsValue,
          debtsOwed: profile.debtsOwed,
          hawlStartDate: hawlDate || null,
          malReminderEnabled: profile.malReminderEnabled,
          fitrReminderEnabled: profile.fitrReminderEnabled,
        }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid() {
    setMarkingPaid(true);
    try {
      const res = await fetch("/api/zakat/mark-paid", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (data?.profile?.hawlStartDate) {
        setHawlDate(String(data.profile.hawlStartDate).slice(0, 10));
      }
    } finally {
      setMarkingPaid(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border-[1.5px] border-gold bg-gold-soft p-4">
        <p className="text-[12.5px] font-semibold leading-relaxed text-ink">{ZAKAT_CALCULATION_DISCLAIMER}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="text-[13.5px] font-extrabold text-ink">بيانات المال</div>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-ink-muted">العملة</span>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-[13px] text-ink"
          />
        </label>

        {(["cashAmount", "tradeGoodsValue", "goldGrams", "goldPricePerGram", "silverGrams", "silverPricePerGram", "debtsOwed"] as NumField[]).map(
          (field) => (
            <label key={field} className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold text-ink-muted">{FIELD_LABELS[field]}</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={profile[field] ?? ""}
                onChange={(e) => updateField(field, e.target.value)}
                placeholder="0"
                className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-[13px] text-ink"
              />
            </label>
          )
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-ink-muted">مرجع النصاب</span>
          <div className="flex gap-2">
            {(["silver", "gold"] as NisabReference[]).map((ref) => (
              <button
                key={ref}
                type="button"
                onClick={() => setProfile((prev) => ({ ...prev, nisabReference: ref }))}
                className={`flex-1 rounded-xl border px-3 py-2 text-[12.5px] font-bold ${
                  profile.nisabReference === ref
                    ? "border-green bg-green-soft text-green"
                    : "border-border bg-surface-2 text-ink-muted"
                }`}
              >
                {ref === "silver" ? `فضة (${NISAB_SILVER_GRAMS} جم)` : `ذهب (${NISAB_GOLD_GRAMS} جم)`}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink-muted">
            بعض أهل العلم يرى الفضة أحوط (نصاب أقل، زكاة أوسع للفقراء)، وبعضهم يعتمد الذهب — اختر ما تطمئن إليه أو اسأل مركز زكاة موثوق.
          </p>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-ink-muted">تاريخ بداية الحول (متى بلغ مالك النصاب أول مرة)</span>
          <input
            type="date"
            value={hawlDate}
            onChange={(e) => setHawlDate(e.target.value)}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-[13px] text-ink"
          />
        </label>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-full bg-green px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {saving ? "جاري الحفظ..." : saved ? "تم الحفظ ✓" : "احفظ البيانات"}
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-green p-4 text-white">
        <div className="text-[13px] font-bold text-white/85">إجمالي المال الزكوي (بعد خصم الديون)</div>
        <div className="text-2xl font-extrabold">{fmt(result.netWealth, currency)}</div>

        {result.nisabValue === null ? (
          <p className="text-[12px] text-white/80">أدخل سعر الجرام الحالي للمرجع اللي اخترته عشان نحسب لك قيمة النصاب.</p>
        ) : (
          <>
            <div className="h-px bg-white/20" />
            <div className="flex items-center justify-between text-[12.5px] text-white/85">
              <span>قيمة النصاب التقريبية</span>
              <span className="font-bold">{fmt(result.nisabValue, currency)}</span>
            </div>
            {result.isAboveNisab ? (
              <>
                <div className="flex items-center justify-between text-[12.5px] text-white/85">
                  <span>الزكاة الواجبة (٢٫٥٪)</span>
                  <span className="font-bold text-gold">{fmt(result.zakatDue, currency)}</span>
                </div>
              </>
            ) : (
              <p className="text-[12.5px] text-white/85">مالك لسه تحت النصاب — مفيش زكاة واجبة عليك حاليًا (حسب البيانات المُدخلة).</p>
            )}
          </>
        )}
      </div>

      {hawlDueDate && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
          <div className="text-[13px] font-extrabold text-ink">موعد استحقاق الزكاة (نهاية الحول)</div>
          <div className="text-[13px] text-ink-muted">
            {hawlDueDate.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
            {daysLeft !== null && daysLeft >= 0 && ` — باقي ${daysLeft} يوم تقريبًا`}
            {daysLeft !== null && daysLeft < 0 && ` — فات موعدها من ${Math.abs(daysLeft)} يوم`}
          </div>
          {daysLeft !== null && daysLeft < 0 && (
            <p className="text-[12px] leading-relaxed text-ink-muted">
              الزكاة المتأخرة تفضل واجبة السداد فورًا بمجرد التذكر (زي أي دين)، مع الاستغفار عن التأخير — مفيش كفارة إضافية زيادة عن نفس مبلغ الزكاة.
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleMarkPaid()}
            disabled={markingPaid}
            className="self-start rounded-full border border-green px-4 py-2 text-[12.5px] font-bold text-green disabled:opacity-60"
          >
            {markingPaid ? "جاري التسجيل..." : "سددت الزكاة — ابدأ حول جديد"}
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface-2 p-4">
        <div className="mb-1.5 text-[12.5px] font-extrabold text-ink">زكاة الفطر</div>
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          واجبة على كل مسلم (عن نفسه وعمّن يعول) قبل صلاة عيد الفطر، مقدارها صاع (تقريبًا ٢٫٥-٣ كجم) من غالب قوت البلد، أو قيمته نقدًا حسب رأي معتمد. المقدار بالعملة الحالية يختلف كل سنة — راجع مركز زكاة أو دار إفتاء موثوقة قبل رمضان بكام يوم. هنفكّرك في التطبيق قبل العيد بإذن الله.
        </p>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-ink-muted">{ISLAMIC_FINANCE_GENERAL_DISCLAIMER}</p>
    </div>
  );
}
