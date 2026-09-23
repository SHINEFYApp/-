"use client";

// "الجدول" — جدول يوم واحد بيجمع عباداتك ومهامك مع بعض مرتبة زمنيًا، بتأكيد بسيط
// (تم/لأ) لكل بند. تقدر ترجع لأي يوم فات تلاقي أحداثه (اللي اتسجلت فعليًا) في مكان
// واحد — سجل تاريخي للأيام اللي فاتت (للعرض بس، مش قابل للتعديل)، واليوم الحالي بس
// هو القابل للتفاعل.
import { useCallback, useEffect, useState } from "react";
import type { WorshipReminderType } from "@/lib/worship-content";

interface ScheduleAnchorItem {
  kind: "anchor";
  type: WorshipReminderType;
  label: string;
  time: string;
  done: boolean;
}

interface ScheduleTaskItem {
  kind: "task";
  id: string;
  title: string;
  category: string;
  time: string | null;
  done: boolean;
}

type ScheduleItem = ScheduleAnchorItem | ScheduleTaskItem;

interface DaySchedule {
  dateKey: string;
  isToday: boolean;
  timed: ScheduleItem[];
  doneNoTime: ScheduleTaskItem[];
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return "اليوم";
  if (dateKey === shiftDateKey(todayKey, -1)) return "أمس";
  const d = new Date(`${dateKey}T00:00:00Z`);
  return new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(d);
}

export function ScheduleView({ todayKey }: { todayKey: string }) {
  const [dateKey, setDateKey] = useState(todayKey);
  const [schedule, setSchedule] = useState<DaySchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  // بنفس نمط "cancelled" الآمن المستخدم في notifications/page.tsx.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/schedule?date=${dateKey}`);
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as DaySchedule;
        if (!cancelled) {
          setSchedule(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("تعذّر تحميل الجدول — تأكد من الاتصال وحاول تاني");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const toggleAnchor = useCallback(
    async (item: ScheduleAnchorItem) => {
      if (dateKey !== todayKey) return;
      setPending(item.type);
      setSchedule((prev) =>
        prev
          ? {
              ...prev,
              timed: prev.timed.map((it) => (it.kind === "anchor" && it.type === item.type ? { ...it, done: !it.done } : it)),
            }
          : prev
      );
      try {
        await fetch("/api/daily-logs/today", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: item.type }),
        });
      } catch {
        // هنسيبها متفائلة — هتتصحح مع أي تحميل لاحق
      } finally {
        setPending(null);
      }
    },
    [dateKey, todayKey]
  );

  const toggleTask = useCallback(
    async (item: ScheduleTaskItem) => {
      if (dateKey !== todayKey) return;
      setPending(item.id);
      const nextStatus = item.done ? "today" : "done";
      setSchedule((prev) =>
        prev
          ? {
              ...prev,
              timed: prev.timed.map((it) => (it.kind === "task" && it.id === item.id ? { ...it, done: !it.done } : it)),
            }
          : prev
      );
      try {
        await fetch(`/api/tasks/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });
      } catch {
        // متفائل برضو
      } finally {
        setPending(null);
      }
    },
    [dateKey, todayKey]
  );

  const isReadOnly = dateKey !== todayKey;
  const canGoForward = dateKey !== todayKey;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-2 py-2.5">
        <button
          type="button"
          onClick={() => setDateKey((k) => shiftDateKey(k, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2"
          aria-label="اليوم اللي قبله"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[13.5px] font-extrabold text-ink">{formatDayLabel(dateKey, todayKey)}</span>
          {isReadOnly && <span className="text-[10.5px] text-ink-muted">سجل يوم فات — للعرض بس</span>}
        </div>
        <button
          type="button"
          onClick={() => canGoForward && setDateKey((k) => shiftDateKey(k, 1))}
          disabled={!canGoForward}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 disabled:opacity-30"
          aria-label="اليوم اللي بعده"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {error && <div className="rounded-xl bg-terracotta-soft p-3 text-[12.5px] text-terracotta">{error}</div>}
      {!schedule && !error && <div className="py-6 text-center text-[13px] text-ink-muted">جارِ التحميل…</div>}

      {schedule && (
        <>
          <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-2">
            {schedule.timed.map((item) => {
              const key = item.kind === "anchor" ? item.type : item.id;
              const label = item.kind === "anchor" ? item.label : item.title;
              const busy = pending === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isReadOnly || busy}
                  onClick={() => (item.kind === "anchor" ? toggleAnchor(item) : toggleTask(item))}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-right disabled:opacity-100"
                >
                  <span className="w-[42px] shrink-0 text-[11px] text-ink-muted" dir="ltr">
                    {item.time}
                  </span>
                  <span
                    className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-[1.5px] border-green"
                    style={{ background: item.done ? "var(--green)" : "var(--surface)" }}
                  >
                    {item.done && <CheckIcon />}
                  </span>
                  <span className={`flex-1 text-[13px] font-bold ${item.done ? "text-ink-muted line-through" : "text-ink"}`}>{label}</span>
                </button>
              );
            })}
            {schedule.timed.length === 0 && (
              <div className="p-3 text-center text-[12.5px] text-ink-muted">مفيش بنود ليها وقت في اليوم ده</div>
            )}
          </div>

          {schedule.doneNoTime.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[12px] font-extrabold text-ink-muted">مهام اتعملت من غير وقت محدد</div>
              <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-2">
                {schedule.doneNoTime.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-2 py-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-soft">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-[12.5px] text-ink-muted line-through">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
