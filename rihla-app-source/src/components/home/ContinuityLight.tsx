import type { ContinuityResult } from "@/lib/daily-log";

// درجات "نور الاستمرارية" — توهّج/لون كيفي بس، مفيش أي رقم أو نسبة مئوية بتتعرض هنا
// (راجع المبدأ الرابع غير القابل للتفاوض: مؤشر الاستمرارية كيفي لا رقمي تنافسي).
const BAND_GLOW: Record<ContinuityResult["band"], string> = {
  starting: "none",
  gentle: "0 0 0 4px var(--terracotta-soft)",
  improving: "0 0 0 4px var(--green-soft)",
  steady: "0 0 16px 1px var(--gold-soft), 0 0 0 4px var(--gold-soft)",
};

export function ContinuityLight({ continuity }: { continuity: ContinuityResult }) {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface px-[18px] py-4">
      <div className="text-[13px] font-extrabold">نور الاستمرارية</div>

      <div
        className="flex justify-between rounded-2xl p-1.5 transition-shadow"
        style={{ boxShadow: BAND_GLOW[continuity.band] }}
      >
        {continuity.days.map((day) => (
          <div key={day.dateKey} className="flex flex-col items-center gap-1.5">
            <div
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px]"
              style={{
                borderColor: day.isToday
                  ? "var(--green)"
                  : day.lit
                    ? "var(--gold)"
                    : "var(--border)",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill={day.lit ? "var(--gold)" : "var(--surface)"}
                stroke={day.isToday ? "var(--green)" : day.lit ? "var(--gold)" : "var(--border)"}
                strokeWidth="1.3"
              >
                <path d="M20 14.5A9 9 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-ink-muted">{day.dayLetter}</span>
          </div>
        ))}
      </div>

      <div className="text-[12px] text-ink-muted">{continuity.label}</div>
    </div>
  );
}
