import type { DailyLog, DailyLogToggleKey } from "@/lib/daily-log";

// نصوص "النسخة الدنيا" هنا منقولة حرفيًا (بدون أي إعادة صياغة) من جدول "البنية القياسية لكل
// عبادة" في /home/claude/islamic-life-os/skills/worship-habit-engine/SKILL.md — عمود "النسخة
// الدنيا (لأسوأ الأيام)". ممنوع تعديلها أو صياغة نص بديل (راجع المبدأ الثاني/الثالث).
const MIN_VERSION = {
  prayers: "أداؤها في وقتها ولو منفردًا وبسرعة",
  quran: "آية إلى صفحة",
  adhkar: "أذكار مختصرة صباحًا/مساءً",
  sadaqah: "ولو بسيطة/رمزية",
} as const;

type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

const PRAYERS: { key: PrayerKey; label: string }[] = [
  { key: "fajr", label: "الفجر" },
  { key: "dhuhr", label: "الظهر" },
  { key: "asr", label: "العصر" },
  { key: "maghrib", label: "المغرب" },
  { key: "isha", label: "العشاء" },
];

function CheckIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth={size >= 17 ? 2.6 : 3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CheckboxRow({
  label,
  done,
  disabled,
  onClick,
}: {
  label: string;
  done: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      disabled={disabled}
      className="flex w-full items-center gap-3 disabled:opacity-70"
    >
      <span
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-[1.5px] border-green"
        style={{ background: done ? "var(--green)" : "var(--surface)" }}
      >
        {done && <CheckIcon size={14} />}
      </span>
      <span className="grow text-right text-[13.5px]">{label}</span>
    </button>
  );
}

interface WorshipCardProps {
  log: DailyLog;
  pendingKeys: Set<DailyLogToggleKey>;
  onToggle: (key: DailyLogToggleKey) => void;
}

// بطاقة "الثوابت التعبدية" — الصلوات الخمس + الورد القرآني + الأذكار + الصدقة، مع مفتاح
// "وضع يوم صعب" اللي بيبدّل عرض الشاشة نفسها لصياغة "النسخة الدنيا" (مش مجرد فلاج مخفي —
// راجع المبدأ الثاني غير القابل للتفاوض). التبديل نفسه (done/not-done-yet) مش حذف، وده
// أصلًا التصرف الوحيد المسموح به هنا؛ مفيش أي مسار لحذف يوم أو صف تتبع.
export function WorshipCard({ log, pendingKeys, onToggle }: WorshipCardProps) {
  const badDay = log.badDayMode;
  const doneCount = PRAYERS.filter((p) => log[p.key]).length;
  const foundationNote = badDay
    ? "وضع يوم صعب مفعّل — النسخة الدنيا بس، وهي كافية"
    : "كل الثوابت في نسختها العادية";

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border-[1.5px] border-gold bg-surface p-[18px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <div className="text-[15px] font-extrabold">الثوابت التعبدية</div>
        </div>
        <button
          type="button"
          onClick={() => onToggle("badDayMode")}
          aria-pressed={badDay}
          aria-label="تفعيل وضع يوم صعب"
          disabled={pendingKeys.has("badDayMode")}
          className="relative h-[26px] w-11 shrink-0 rounded-full transition-colors disabled:opacity-70"
          style={{ background: badDay ? "var(--gold)" : "var(--border)" }}
        >
          <span
            className="absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white transition-[left] duration-150"
            style={{ left: badDay ? 20 : 2 }}
          />
        </button>
      </div>

      <div className="text-[12px] text-ink-muted">
        {foundationNote} · {doneCount} من ٥ صلوات اليوم
      </div>

      <div className="flex justify-between">
        {PRAYERS.map((p) => {
          const done = log[p.key];
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onToggle(p.key)}
              aria-pressed={done}
              disabled={pendingKeys.has(p.key)}
              className="flex flex-col items-center gap-1.5 disabled:opacity-70"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full border-2"
                style={{
                  background: done ? "var(--green)" : "var(--surface)",
                  borderColor: done ? "var(--green)" : "var(--gold)",
                }}
              >
                {done && <CheckIcon size={17} />}
              </span>
              <span className="text-[11px] font-bold">{p.label}</span>
            </button>
          );
        })}
      </div>

      {badDay && (
        <div className="-mt-2 text-[11px] text-gold">
          الحد الأدنى المقبول للصلوات: {MIN_VERSION.prayers}
        </div>
      )}

      <div className="h-px bg-border" />

      <CheckboxRow
        label={badDay ? `ورد اليوم — الحد الأدنى: ${MIN_VERSION.quran}` : "ورد اليوم: صفحة واحدة"}
        done={log.quran}
        disabled={pendingKeys.has("quran")}
        onClick={() => onToggle("quran")}
      />

      <CheckboxRow
        label="أذكار الصباح"
        done={log.adhkarMorning}
        disabled={pendingKeys.has("adhkarMorning")}
        onClick={() => onToggle("adhkarMorning")}
      />

      <CheckboxRow
        label="أذكار المساء"
        done={log.adhkarEvening}
        disabled={pendingKeys.has("adhkarEvening")}
        onClick={() => onToggle("adhkarEvening")}
      />

      {badDay && (
        <div className="-mt-2 text-[11px] text-gold">الحد الأدنى للأذكار: {MIN_VERSION.adhkar}</div>
      )}

      <CheckboxRow
        label={badDay ? `صدقة اليوم — الحد الأدنى: ${MIN_VERSION.sadaqah}` : "صدقة اليوم"}
        done={log.sadaqah}
        disabled={pendingKeys.has("sadaqah")}
        onClick={() => onToggle("sadaqah")}
      />
    </div>
  );
}
