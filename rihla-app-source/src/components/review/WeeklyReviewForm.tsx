"use client";

import { useRef, useState } from "react";

interface WeeklyReviewValues {
  whatHappened: string;
  whatDrained: string;
  whatToChange: string;
}

// أسئلة المراجعة الثلاثة — نص السؤال منقول حرفيًا من النموذج المعتمد Review.dc.html، بدون أي تعديل.
const QUESTIONS: { key: keyof WeeklyReviewValues; label: string }[] = [
  { key: "whatHappened", label: "إيه اللي حصل الأسبوع ده؟ إيه اللي نجح؟" },
  { key: "whatDrained", label: "إيه اللي استنزف طاقتك؟" },
  { key: "whatToChange", label: "إيه اللي محتاج يتغيّر في النظام، مش في الشخص؟" },
];

type SaveState = "idle" | "saving" | "saved" | "error";

export function WeeklyReviewForm({ initial }: { initial: WeeklyReviewValues }) {
  const [values, setValues] = useState<WeeklyReviewValues>(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function scheduleSave(next: WeeklyReviewValues) {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/weekly-reviews", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!res.ok) throw new Error();
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 700);
  }

  function handleChange(key: keyof WeeklyReviewValues, text: string) {
    const next = { ...values, [key]: text };
    setValues(next);
    scheduleSave(next);
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-extrabold text-ink">أسئلة المراجعة</div>
        <div className="text-[11px] text-ink-muted">
          {saveState === "saving" ? "بيتحفظ..." : saveState === "saved" ? "اتحفظ" : saveState === "error" ? "تعذّر الحفظ" : ""}
        </div>
      </div>

      {QUESTIONS.map((q) => (
        <div key={q.key} className="flex flex-col gap-2">
          <label htmlFor={q.key} className="text-[12.5px] font-bold text-ink-muted">
            {q.label}
          </label>
          <textarea
            id={q.key}
            value={values[q.key]}
            onChange={(e) => handleChange(q.key, e.target.value)}
            placeholder="اكتب هنا..."
            className="min-h-[70px] resize-none rounded-xl border border-border bg-surface p-3 text-[13.5px] leading-[1.8] text-ink placeholder:text-ink-muted"
          />
        </div>
      ))}
    </div>
  );
}
