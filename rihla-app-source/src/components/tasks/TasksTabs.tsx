"use client";

// غلاف بسيط بيبدّل بين "الجدول" (الافتراضي — جدول اليوم/سجل الأيام اللي فاتت) و"اللوحة"
// (الكانبان الأصلي: قيد الانتظار/اليوم/جارٍ/تم).
import { useState } from "react";
import { KanbanBoard } from "./KanbanBoard";
import { ScheduleView } from "./ScheduleView";
import type { Task } from "./types";

type View = "schedule" | "board";

export function TasksTabs({ initialTasks, todayKey }: { initialTasks: Task[]; todayKey: string }) {
  const [view, setView] = useState<View>("schedule");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-2xl bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setView("schedule")}
          className="flex-1 rounded-xl py-2 text-[13px] font-bold transition-colors"
          style={{
            background: view === "schedule" ? "var(--surface)" : "transparent",
            color: view === "schedule" ? "var(--ink)" : "var(--ink-muted)",
          }}
        >
          الجدول
        </button>
        <button
          type="button"
          onClick={() => setView("board")}
          className="flex-1 rounded-xl py-2 text-[13px] font-bold transition-colors"
          style={{
            background: view === "board" ? "var(--surface)" : "transparent",
            color: view === "board" ? "var(--ink)" : "var(--ink-muted)",
          }}
        >
          اللوحة
        </button>
      </div>

      {view === "schedule" ? <ScheduleView todayKey={todayKey} /> : <KanbanBoard initialTasks={initialTasks} />}
    </div>
  );
}
