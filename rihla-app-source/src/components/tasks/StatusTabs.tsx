"use client";

import { STATUS_LABELS, STATUS_ORDER, type TaskStatus } from "./types";

interface StatusTabsProps {
  activeStatus: TaskStatus;
  onSelect: (status: TaskStatus) => void;
  counts: Record<TaskStatus, number>;
  // العمود اللي متعلّم عليه بطاقة بتتسحب فوقه دلوقتي (أو null) — نفس عناصر التابات
  // دي بتستخدم كـ drop targets، عن طريق data-tab-status وقراءتها بـ elementFromPoint
  dragHoverStatus: TaskStatus | null;
}

export function StatusTabs({ activeStatus, onSelect, counts, dragHoverStatus }: StatusTabsProps) {
  return (
    <div className="flex items-stretch gap-1.5 rounded-2xl border border-border bg-surface-2 p-1.5">
      {STATUS_ORDER.map((status) => {
        const active = status === activeStatus;
        const hovered = dragHoverStatus === status;
        return (
          <button
            key={status}
            type="button"
            data-tab-status={status}
            onClick={() => onSelect(status)}
            className="flex-1 rounded-xl px-1.5 py-2 text-center transition-colors"
            style={{
              background: hovered ? "var(--gold)" : active ? "var(--green)" : "transparent",
              color: hovered || active ? "#fff" : "var(--ink-muted)",
            }}
          >
            <div className="text-[11.5px] font-bold leading-tight">{STATUS_LABELS[status]}</div>
            <div
              className="mt-0.5 text-[10px] font-semibold"
              style={{ color: hovered || active ? "rgba(255,255,255,0.75)" : "var(--ink-muted)" }}
            >
              {counts[status]}
            </div>
          </button>
        );
      })}
    </div>
  );
}
