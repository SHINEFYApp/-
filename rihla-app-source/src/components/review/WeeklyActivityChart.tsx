// عمود بار شارت "نشاط العبادة اليومي" — بديل صادق لشارت "الطاقة خلال الأسبوع" في النموذج
// المعتمد (Review.dc.html)، لأن مفيش حقل "طاقة" حقيقي في الـ schema. القيمة المعروضة هنا
// نسبة العناصر التعبدية المُنجزة فعليًا في اليوم (من dailyLogs) — راجع computeWeeklyStats
// في src/lib/weekly-review.ts للتفاصيل والتعليق الكامل.

interface DayActivity {
  dayIndex: number;
  label: string;
  fraction: number;
  hasData: boolean;
}

export function WeeklyActivityChart({ dailyActivity }: { dailyActivity: DayActivity[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface p-[18px]">
      <div className="text-[13px] font-extrabold text-ink">نشاط العبادة اليومي</div>
      <div className="flex h-[90px] items-end justify-between gap-1.5">
        {dailyActivity.map((day) => {
          const heightPct = Math.max(4, Math.round(day.fraction * 100));
          const color = !day.hasData
            ? "var(--border)"
            : day.fraction >= 0.8
              ? "var(--green)"
              : day.fraction >= 0.5
                ? "var(--gold-soft)"
                : "var(--terracotta-soft)";
          return (
            <div
              key={day.dayIndex}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <div
                className="w-full rounded-md"
                style={{ height: `${heightPct}%`, background: color }}
              />
              <span className="text-[10px] text-ink-muted">{day.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
