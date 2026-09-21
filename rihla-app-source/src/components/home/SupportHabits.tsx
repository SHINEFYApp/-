import type { DailyLog, DailyLogToggleKey } from "@/lib/daily-log";

type HabitKey = "habitSleep" | "habitWalk" | "habitScreen";

const HABITS: { key: HabitKey; label: string }[] = [
  { key: "habitSleep", label: "نوم قبل الساعة ١٢" },
  { key: "habitWalk", label: "مشي ١٥ دقيقة" },
  { key: "habitScreen", label: "وقف الشاشة بعد العشاء" },
];

interface SupportHabitsProps {
  log: DailyLog;
  pendingKeys: Set<DailyLogToggleKey>;
  onToggle: (key: DailyLogToggleKey) => void;
}

// عادات الدعم الثلاثة — منفصلة عمدًا عن الثوابت التعبدية (مش عبادة، ومحرك العادات العام
// ينطبق عليها لا محرك العبادات الثابتة، لكن التتبع هنا برضو toggle بسيط بدون أي حذف).
export function SupportHabits({ log, pendingKeys, onToggle }: SupportHabitsProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[13px] font-extrabold text-ink-muted">عادات الدعم</div>
      {HABITS.map((h) => {
        const done = log[h.key];
        return (
          <button
            key={h.key}
            type="button"
            onClick={() => onToggle(h.key)}
            aria-pressed={done}
            disabled={pendingKeys.has(h.key)}
            className="flex items-center gap-3 rounded-[14px] border border-border bg-surface px-3.5 py-[13px] disabled:opacity-70"
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] border-green"
              style={{ background: done ? "var(--green)" : "var(--surface)" }}
            >
              {done && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className="grow text-right text-[13.5px]">{h.label}</span>
          </button>
        );
      })}
    </div>
  );
}
