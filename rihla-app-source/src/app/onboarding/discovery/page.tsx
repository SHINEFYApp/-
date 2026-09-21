"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// منقول حرفيًا من نموذج الواجهات المعتمد Discovery.dc.html:
// نفس نصوص الأسئلة، نفس التاجز الأربعة على السؤال الأول، نفس نقاط التقدم وحركة التالي/السابق.
// الفرق الوحيد عن النموذج: عند إنهاء الدفعة، بدل الانتقال لشاشة LifeBalance.dc.html (خارج نطاق هذا الـ agent)،
// بنحفظ الإجابات فعليًا في قاعدة البيانات (POST /api/onboarding/discovery) وبعدين نحوّل لـ /home.
const QUESTIONS: { text: string; hasTags: boolean }[] = [
  { text: "إيه اللي بيضايقك أكتر في حياتك دلوقتي؟", hasTags: true },
  { text: "امتى آخر مرة حسيت إنك قريب من ربنا بجد؟", hasTags: false },
  {
    text: "لو حياتك اتحسّنت فعلاً بعد ٩٠ يوم، هتبقى عارف إزاي؟ (دنيا وآخرة)",
    hasTags: false,
  },
];

const TAG_KEYS = ["مفيش وقت", "مفيش طاقة", "تشتت ذهني", "ضغط شغل"] as const;

export default function DiscoveryOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [tags, setTags] = useState<Record<string, boolean>>({
    "مفيش وقت": false,
    "مفيش طاقة": false,
    "تشتت ذهني": false,
    "ضغط شغل": false,
  });
  const [answers, setAnswers] = useState<string[]>(QUESTIONS.map(() => ""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = QUESTIONS.length;
  const current = QUESTIONS[step];
  const isNotLast = step < total - 1;
  const isLast = step === total - 1;

  function toggleTag(key: string) {
    setTags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setAnswer(value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = value;
      return next;
    });
  }

  function goPrev() {
    if (step > 0) setStep(step - 1);
  }

  function goNext() {
    if (step < total - 1) setStep(step + 1);
  }

  async function finish() {
    setError(null);
    setSubmitting(true);

    const payload = answers
      .map((answer, i) => ({
        questionNo: i + 1,
        answer: answer.trim(),
        tags:
          QUESTIONS[i].hasTags
            ? TAG_KEYS.filter((k) => tags[k])
            : undefined,
      }))
      .filter((a) => a.answer.length > 0);

    try {
      if (payload.length > 0) {
        const res = await fetch("/api/onboarding/discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: payload }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? "حصلت مشكلة في حفظ إجاباتك، جرب تاني");
          setSubmitting(false);
          return;
        }
      }
      router.push("/home");
    } catch {
      setError("حصلت مشكلة في الاتصال، جرب تاني");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[480px] flex-col bg-bg text-ink">
      <div className="flex flex-col gap-3.5 px-5 pb-3.5 pt-[22px]">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="رجوع للشاشة الافتتاحية"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
          <div className="text-[13px] font-bold text-ink-muted">
            السؤال {step + 1} من {total}
          </div>
        </div>
        <div className="text-[11.5px] font-extrabold text-gold">
          لا تُصلح قبل أن تفهم — دفعة ١ من ٢
        </div>
        <div className="h-[5px] overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-green transition-[width]"
            style={{ width: `${Math.round(((step + 1) / total) * 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-grow flex-col gap-5 overflow-y-auto px-5 pb-5 pt-1.5">
        <div className="rounded-[18px] border border-border bg-surface px-5 py-[22px]">
          <div className="text-[18.5px] font-bold leading-[1.75] text-ink">{current.text}</div>
        </div>

        {current.hasTags && (
          <div className="flex flex-wrap gap-2">
            {TAG_KEYS.map((key) => {
              const selected = tags[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleTag(key)}
                  aria-pressed={selected}
                  className={`rounded-full border px-4 py-2.5 text-[13.5px] font-bold ${
                    selected
                      ? "border-green bg-green text-white"
                      : "border-border bg-surface text-ink"
                  }`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="answer" className="text-[12.5px] font-bold text-ink-muted">
            إجابتك بصراحة، من غير ما تحاول تبان كويس
          </label>
          <textarea
            id="answer"
            value={answers[step]}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="اكتب هنا..."
            className="min-h-[120px] w-full resize-none rounded-2xl border border-border bg-surface p-3.5 text-[14.5px] text-ink outline-none focus:border-green"
          />
        </div>

        <div className="flex justify-center gap-2 pt-1">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === step ? 22 : 8,
                backgroundColor: i <= step ? "var(--green)" : "var(--border)",
              }}
            />
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-terracotta/30 bg-terracotta-soft px-4 py-3 text-sm font-medium text-terracotta">
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-2.5 border-t border-border bg-surface px-5 pb-7 pt-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 0}
          aria-label="السؤال السابق"
          className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-border bg-surface-2"
          style={{ opacity: step === 0 ? 0.35 : 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>

        {isNotLast && (
          <button
            type="button"
            onClick={goNext}
            className="flex h-[52px] flex-grow items-center justify-center gap-2 rounded-2xl bg-green text-[15.5px] font-bold text-white"
          >
            <span>التالي</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        )}
        {isLast && (
          <button
            type="button"
            onClick={finish}
            disabled={submitting}
            className="flex h-[52px] flex-grow items-center justify-center gap-2 rounded-2xl bg-green text-[15.5px] font-bold text-white disabled:opacity-60"
          >
            <span>{submitting ? "جاري الحفظ..." : "إنهاء الدفعة الأولى"}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
