"use client";

// شاشة "أذكار سريعة" — منقولة من نموذج الواجهة المعتمد Dhikr.dc.html، ببيانات حقيقية
// من /api/dhikr/today. نصوص الأذكار والفضل والمصدر كلها من worship-content.ts (مالوقفناش
// عليها ولا عدّلناها). العدّادات شخصية بس — مفيش نقط ولا مقارنة بمستخدمين تانيين.

import { useCallback, useEffect, useMemo, useState } from "react";
import { DHIKR_LIBRARY, type DhikrKey } from "@/lib/worship-content";

interface DhikrItem {
  key: DhikrKey;
  count: number;
  target: number;
}

export default function DhikrPage() {
  const [items, setItems] = useState<DhikrItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Record<string, boolean>>({});

  // بنجيب أذكار اليوم مرة واحدة عند فتح الشاشة — بنستخدم علم "cancelled" عشان منحدّثش
  // state لو الكومبوننت اتشال قبل ما يخلص الطلب (زي نمط React الموصى بيه لجلب البيانات).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dhikr/today");
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { items: DhikrItem[] };
        if (!cancelled) {
          setItems(data.items);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("تعذّر تحميل أذكار اليوم — تأكد من الاتصال وحاول تاني");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateItem = useCallback(async (key: DhikrKey, action: "increment" | "reset") => {
    setPendingKeys((p) => ({ ...p, [key]: true }));
    setItems((prev) =>
      prev
        ? prev.map((it) =>
            it.key === key
              ? { ...it, count: action === "reset" ? 0 : Math.min(it.count + 1, it.target) }
              : it
          )
        : prev
    );

    try {
      const res = await fetch("/api/dhikr/today", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, action }),
      });
      if (res.ok) {
        const data = (await res.json()) as { item: DhikrItem };
        setItems((prev) => (prev ? prev.map((it) => (it.key === key ? data.item : it)) : prev));
      }
    } catch {
      // بنسيب الحالة المحلية زي ما هي — هتتصحح تلقائيًا مع أي تحديث لاحق للصفحة
    } finally {
      setPendingKeys((p) => ({ ...p, [key]: false }));
    }
  }, []);

  const goalsDone = useMemo(() => items?.filter((i) => i.count >= i.target).length ?? 0, [items]);
  const goalsTotal = items?.length ?? 0;
  const goalsPct = goalsTotal > 0 ? Math.round((goalsDone / goalsTotal) * 100) : 0;

  return (
    <div className="flex flex-1 flex-col gap-3 px-5 pt-6 pb-6">
      <div>
        <div className="text-[17px] font-extrabold text-ink">أذكار سريعة</div>
        <div className="mt-0.5 text-[11.5px] text-ink-muted">
          عندك دقيقة؟ املاها بذكر — مش لازم تستنى وقت معين
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-green-2 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-extrabold">أهداف اليوم</div>
          <div className="text-[11.5px] text-white/75">
            {goalsDone} من {goalsTotal}
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-gold transition-[width]"
            style={{ width: `${goalsPct}%` }}
          />
        </div>
        <div className="text-[11px] text-white/65">مجموعة النهارده — بتتغيّر كل يوم من مكتبة أوسع</div>
      </div>

      {error && (
        <div className="rounded-xl bg-terracotta-soft p-3 text-[12.5px] text-terracotta">{error}</div>
      )}

      {!items && !error && (
        <div className="py-10 text-center text-[13px] text-ink-muted">جارِ التحميل…</div>
      )}

      {items?.map((item) => {
        const entry = DHIKR_LIBRARY[item.key];
        const isDone = item.count >= item.target;
        const pct = Math.round((item.count / item.target) * 100);
        return (
          <div
            key={item.key}
            className="flex flex-col gap-2.5 rounded-[18px] border-[1.5px] bg-surface p-4"
            style={{ borderColor: isDone ? "var(--green)" : "var(--border)" }}
          >
            <button
              type="button"
              onClick={() => updateItem(item.key, "increment")}
              disabled={pendingKeys[item.key]}
              aria-label="سجّل تكرارة من الذكر"
              className="flex w-full flex-col gap-2.5 text-right disabled:opacity-70"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="font-arabic-display text-[19px] font-bold leading-[1.5] text-ink">
                  {entry.text}
                </div>
                {isDone && (
                  <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-green">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="text-[12px] leading-[1.7] text-ink-muted">{entry.virtue}</div>
              <div className="text-[10.5px] font-bold text-gold">{entry.source}</div>

              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${pct}%`, background: isDone ? "var(--green)" : "var(--gold)" }}
                />
              </div>
            </button>

            <div className="-mt-0.5 flex items-center justify-between">
              <span
                className="text-[13px] font-extrabold"
                style={{ color: isDone ? "var(--green)" : "var(--ink)" }}
              >
                {item.count} / {item.target}
              </span>
              <button
                type="button"
                onClick={() => updateItem(item.key, "reset")}
                disabled={pendingKeys[item.key]}
                className="text-[11.5px] text-ink-muted underline disabled:opacity-60"
              >
                ابدأ تاني
              </button>
            </div>
          </div>
        );
      })}

      <div className="rounded-xl bg-green-soft p-3.5 text-[12px] leading-[1.8] text-ink">
        دوس على أي بطاقة كل ما تقول الذكر — مفيش عدّاد بينقص لو نسيت يوم، وكل مرة بتبدأ من الأول
        براحتك.
      </div>
    </div>
  );
}
