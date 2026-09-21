"use client";

import { useState, useTransition } from "react";
import {
  HABIT_CHALLENGE_INTRO,
  HABIT_VERSION_LABELS,
  HABIT_VERSION_ORDER,
  type HabitChallengeTrack,
  type HabitVersionLevel,
} from "@/lib/habit-challenge-content";

type EnrollmentStatus = "active" | "paused" | "completed";

interface EnrollmentData {
  trackKey: string;
  versionLevel: HabitVersionLevel;
  status: EnrollmentStatus;
}

interface LogData {
  trackKey: string;
  date: string;
  kept: boolean;
}

function last7Days(todayKey: string): string[] {
  const [y, m, d] = todayKey.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(base);
    dd.setUTCDate(dd.getUTCDate() - i);
    out.push(dd.toISOString().slice(0, 10));
  }
  return out;
}

export function ChallengesBoard({
  tracks,
  initialEnrollments,
  initialRecentLogs,
  todayKey,
}: {
  tracks: HabitChallengeTrack[];
  initialEnrollments: EnrollmentData[];
  initialRecentLogs: LogData[];
  todayKey: string;
}) {
  const [enrollments, setEnrollments] = useState<Record<string, EnrollmentData>>(() =>
    Object.fromEntries(initialEnrollments.map((e) => [e.trackKey, e]))
  );
  const [logs, setLogs] = useState<Record<string, Record<string, boolean>>>(() => {
    const map: Record<string, Record<string, boolean>> = {};
    for (const log of initialRecentLogs) {
      map[log.trackKey] = map[log.trackKey] ?? {};
      map[log.trackKey][log.date] = log.kept;
    }
    return map;
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const days = last7Days(todayKey);

  async function enroll(trackKey: string) {
    setError(null);
    try {
      const res = await fetch("/api/challenges/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackKey, versionLevel: "tiny" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEnrollments((prev) => ({
        ...prev,
        [trackKey]: {
          trackKey,
          versionLevel: data.enrollment.versionLevel,
          status: data.enrollment.status,
        },
      }));
      setExpanded(trackKey);
    } catch {
      setError("تعذّر البدء — حاول تاني");
    }
  }

  async function changeVersion(trackKey: string, versionLevel: HabitVersionLevel) {
    setError(null);
    try {
      const res = await fetch("/api/challenges/enroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackKey, versionLevel }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEnrollments((prev) => ({
        ...prev,
        [trackKey]: { trackKey, versionLevel: data.enrollment.versionLevel, status: data.enrollment.status },
      }));
    } catch {
      setError("تعذّر الحفظ — حاول تاني");
    }
  }

  async function toggleStatus(trackKey: string, status: EnrollmentStatus) {
    setError(null);
    try {
      const res = await fetch("/api/challenges/enroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackKey, status }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEnrollments((prev) => ({
        ...prev,
        [trackKey]: { trackKey, versionLevel: data.enrollment.versionLevel, status: data.enrollment.status },
      }));
    } catch {
      setError("تعذّر الحفظ — حاول تاني");
    }
  }

  async function logToday(trackKey: string, kept: boolean) {
    setError(null);
    const note = noteDrafts[trackKey]?.trim() || undefined;
    try {
      const res = await fetch("/api/challenges/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackKey, kept, note }),
      });
      if (!res.ok) throw new Error();
      setLogs((prev) => ({
        ...prev,
        [trackKey]: { ...(prev[trackKey] ?? {}), [todayKey]: kept },
      }));
      setNoteDrafts((prev) => ({ ...prev, [trackKey]: "" }));
    } catch {
      setError("تعذّر التسجيل — حاول تاني");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border-[1.5px] border-gold bg-gold-soft p-4">
        <p className="text-[12.5px] font-semibold leading-relaxed text-ink">{HABIT_CHALLENGE_INTRO}</p>
      </div>

      {error ? (
        <div className="rounded-xl bg-terracotta-soft px-3 py-2.5 text-[12px] text-terracotta">{error}</div>
      ) : null}

      {tracks.map((track) => {
        const enrollment = enrollments[track.key];
        const isOpen = expanded === track.key;
        const todayKept = logs[track.key]?.[todayKey];
        const hasLoggedToday = todayKept !== undefined;

        return (
          <div key={track.key} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : track.key)}
              className="flex items-center justify-between gap-3 text-right"
            >
              <div>
                <div className="text-[14.5px] font-extrabold text-ink">{track.title}</div>
                <div className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{track.shortDescription}</div>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ink-muted)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: isOpen ? "rotate(-90deg)" : "rotate(90deg)", flexShrink: 0 }}
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>

            {(track.professionalReferral || track.safetyNote) && (
              <div className="flex flex-col gap-1.5 rounded-xl bg-terracotta-soft px-3 py-2.5">
                {track.professionalReferral ? (
                  <p className="text-[11.5px] leading-relaxed text-terracotta">{track.professionalReferral}</p>
                ) : null}
                {track.safetyNote ? (
                  <p className="text-[11.5px] leading-relaxed text-terracotta">{track.safetyNote}</p>
                ) : null}
              </div>
            )}

            {isOpen && (
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                <p className="text-[11.5px] font-semibold text-ink-muted">{track.audienceNote}</p>

                <div>
                  <span className="text-[11.5px] font-bold text-green">ليه؟</span>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink">{track.why}</p>
                </div>

                <div>
                  <span className="text-[11.5px] font-bold text-green">المحفّز</span>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink">{track.trigger}</p>
                </div>

                <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
                  <span className="text-[11.5px] font-bold text-green">النسخ الثلاث</span>
                  {HABIT_VERSION_ORDER.map((level) => (
                    <div key={level} className="text-[12.5px] leading-relaxed text-ink">
                      <span className="font-bold">{HABIT_VERSION_LABELS[level]}:</span> {track.versions[level].description}
                    </div>
                  ))}
                </div>

                <div>
                  <span className="text-[11.5px] font-bold text-green">تصميم البيئة</span>
                  <ul className="mt-1 flex flex-col gap-1 ps-4 text-[12.5px] leading-relaxed text-ink" style={{ listStyleType: "disc" }}>
                    {track.environmentDesign.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-[11.5px] font-bold text-green">تقليل الاحتكاك</span>
                  <ul className="mt-1 flex flex-col gap-1 ps-4 text-[12.5px] leading-relaxed text-ink" style={{ listStyleType: "disc" }}>
                    {track.frictionReduction.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-[11.5px] font-bold text-green">المكافأة</span>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink">{track.reward}</p>
                </div>

                <div className="rounded-xl bg-green-soft px-3 py-2.5">
                  <span className="text-[11.5px] font-bold text-green">لو حصل يوم صعب</span>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{track.recoveryPlan}</p>
                </div>

                {track.refs.map((ref, i) => (
                  <div key={i} className="flex flex-col gap-1 border-t border-border pt-2.5">
                    <p className="text-[13px] leading-[1.9] text-ink" dir="rtl">
                      {ref.text}
                    </p>
                    <span className="text-[11px] font-semibold text-ink-muted">{ref.source}</span>
                  </div>
                ))}
              </div>
            )}

            {!enrollment ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => enroll(track.key))}
                className="self-start rounded-xl bg-green px-4 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60"
              >
                ابدأ بالنسخة الدنيا
              </button>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {HABIT_VERSION_ORDER.map((level) => {
                      const active = enrollment.versionLevel === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          disabled={isPending}
                          onClick={() => startTransition(() => changeVersion(track.key, level))}
                          className="rounded-full border px-3 py-1.5 text-[11.5px] font-bold disabled:opacity-60"
                          style={{
                            background: active ? "var(--green-soft)" : "var(--surface)",
                            color: active ? "var(--green)" : "var(--ink-muted)",
                            borderColor: active ? "var(--green)" : "var(--border)",
                          }}
                        >
                          {HABIT_VERSION_LABELS[level]}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() =>
                        toggleStatus(track.key, enrollment.status === "paused" ? "active" : "paused")
                      )
                    }
                    className="text-[11.5px] font-bold text-ink-muted underline"
                  >
                    {enrollment.status === "paused" ? "استكمال" : "إيقاف مؤقت"}
                  </button>
                </div>

                <div className="flex gap-1.5">
                  {days.map((dayKey) => {
                    const kept = logs[track.key]?.[dayKey];
                    return (
                      <div
                        key={dayKey}
                        title={dayKey}
                        className="h-2.5 flex-1 rounded-full"
                        style={{
                          background:
                            kept === undefined ? "var(--border)" : kept ? "var(--green)" : "var(--terracotta)",
                        }}
                      />
                    );
                  })}
                </div>

                {enrollment.status !== "paused" && (
                  <div className="flex flex-col gap-2">
                    <div className="text-[12px] font-bold text-ink-muted">النهارده:</div>
                    {hasLoggedToday ? (
                      <div className="text-[12.5px] font-semibold text-ink">
                        {todayKept ? "الحمد لله، التزمت النهارده ✓" : "سجّلت يوم صعب — تمام، بكرة يوم جديد"}
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={noteDrafts[track.key] ?? ""}
                          onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [track.key]: e.target.value }))}
                          placeholder="ملاحظة اختيارية (إيه اللي صعّب/سهّل الموضوع النهارده)"
                          className="min-h-[54px] resize-none rounded-lg border border-border bg-surface p-2.5 text-[12.5px] leading-relaxed text-ink placeholder:text-ink-muted"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => startTransition(() => logToday(track.key, true))}
                            className="flex-1 rounded-lg bg-green px-3 py-2 text-[12px] font-bold text-white disabled:opacity-60"
                          >
                            التزمت النهارده
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => startTransition(() => logToday(track.key, false))}
                            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] font-bold text-ink-muted disabled:opacity-60"
                          >
                            كان يوم صعب
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
