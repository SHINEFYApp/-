"use client";

import { useState } from "react";
import {
  SOURCES_CATALOG,
  SOURCE_AGE_OPTIONS,
  type SourceAgeRange,
  type SourceInterestKey,
} from "@/lib/sources-content";

interface Props {
  initialAgeRange: SourceAgeRange | null;
  initialInterests: SourceInterestKey[];
}

type Phase = "setup" | "results";

export function SourcesFlow({ initialAgeRange, initialInterests }: Props) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [age, setAge] = useState<SourceAgeRange>(initialAgeRange ?? "25-34");
  const [interests, setInterests] = useState<Set<SourceInterestKey>>(
    new Set(initialInterests.length ? initialInterests : (["tafsir", "tazkiyah"] as SourceInterestKey[]))
  );
  const [saving, setSaving] = useState(false);

  function toggleInterest(key: SourceInterestKey) {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function showResults() {
    setSaving(true);
    try {
      await fetch("/api/user-interests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: Array.from(interests), ageRange: age }),
      });
    } catch {
      // نعرض النتائج برضو حتى لو الحفظ فشل — البيانات ما زالت في الحالة المحلية
    } finally {
      setSaving(false);
      setPhase("results");
    }
  }

  const isYouth = age === "18-24";
  const built = SOURCES_CATALOG.map((c) => ({
    ...c,
    desc: isYouth ? c.descYouth : c.descAdult,
    sel: interests.has(c.key),
  }));
  const recommended = built.filter((c) => c.sel);
  const others = built.filter((c) => !c.sel);
  const recommendedList = recommended.length ? recommended : built.slice(0, 2);
  const othersList = recommended.length ? others : built.slice(2);

  if (phase === "setup") {
    return (
      <div className="flex flex-col gap-4 rounded-[18px] border border-border bg-surface p-[18px]">
        <div className="text-[14px] leading-[1.8] text-ink">
          عشان الاقتراحات تكون ليك انت، مش عامة — قولّي شوية عن نفسك
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold text-ink-muted">فين عمرك؟</div>
          <div className="flex flex-wrap gap-2">
            {SOURCE_AGE_OPTIONS.map((a) => {
              const sel = a.key === age;
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setAge(a.key)}
                  aria-pressed={sel}
                  className="rounded-full border px-[15px] py-2.5 text-[13px] font-bold"
                  style={{
                    background: sel ? "var(--green)" : "var(--surface)",
                    color: sel ? "#fff" : "var(--ink)",
                    borderColor: sel ? "var(--green)" : "var(--border)",
                  }}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold text-ink-muted">إيه اللي بيفيدك أكتر؟ (اختار كذا)</div>
          <div className="flex flex-wrap gap-2">
            {SOURCES_CATALOG.map((c) => {
              const sel = interests.has(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleInterest(c.key)}
                  aria-pressed={sel}
                  className="rounded-full border px-[15px] py-2.5 text-[13px] font-bold"
                  style={{
                    background: sel ? "var(--green)" : "var(--surface)",
                    color: sel ? "#fff" : "var(--ink)",
                    borderColor: sel ? "var(--green)" : "var(--border)",
                  }}
                >
                  {c.chipLabel}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={showResults}
          disabled={saving}
          className="flex h-[50px] items-center justify-center rounded-[13px] bg-green text-[14.5px] font-bold text-white disabled:opacity-70"
        >
          اقترح ليّ
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPhase("setup")}
        className="self-start text-xs text-ink-muted underline"
      >
        تعديل اهتماماتك
      </button>

      {recommendedList.map((r) => (
        <div key={r.key} className="flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-gold bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gold-soft px-2.5 py-[3px] text-[10.5px] font-extrabold text-gold">
              الأنسب ليك
            </span>
            <span className="text-[11px] text-ink-muted">{r.chipLabel}</span>
          </div>
          <div className="text-[14.5px] font-bold text-ink">{r.title}</div>
          <div className="text-[13px] leading-[1.7] text-ink-muted">{r.desc}</div>
          <div className="text-[11.5px] text-ink-muted">{r.whyLine}</div>
          <div className="rounded-[10px] bg-surface-2 px-3 py-2.5 text-[12.5px] text-ink">
            <span className="text-ink-muted">جرّب تدور على: </span>
            {r.searchHint}
          </div>
        </div>
      ))}

      <div className="mt-1 text-xs font-bold text-ink-muted">أنواع تانية ممكن تفيدك</div>

      {othersList.map((o) => (
        <div key={o.key} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3.5">
          <div className="text-[11px] text-ink-muted">{o.chipLabel}</div>
          <div className="text-[13.5px] font-bold text-ink">{o.title}</div>
          <div className="text-xs leading-[1.7] text-ink-muted">{o.desc}</div>
          <div className="rounded-[10px] bg-surface-2 px-[11px] py-2.5 text-xs text-ink">
            <span className="text-ink-muted">جرّب تدور على: </span>
            {o.searchHint}
          </div>
        </div>
      ))}

      <div className="mt-1 flex flex-col gap-1 rounded-[14px] bg-green-soft p-3.5">
        <div className="text-[12.5px] font-extrabold text-green">قنوات بعينها؟</div>
        <div className="text-xs leading-[1.8] text-ink">
          دي أنواع محتوى مقترحة، مش أسماء قنوات محددة — عشان نضمن إننا منرشّحش حاجة من غير ما نتأكد منها فعلاً.
          قولّي القنوات أو المشايخ اللي بتثق فيهم، وهنظبط الاقتراحات عليهم.
        </div>
      </div>
    </>
  );
}
