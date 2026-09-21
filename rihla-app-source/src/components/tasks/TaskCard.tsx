"use client";

import { useState } from "react";
import {
  CATEGORY_LABELS,
  computeDueBadge,
  formatTime,
  STATUS_LABELS,
  STATUS_ORDER,
  type Task,
  type TaskStatus,
} from "./types";
import { BellIcon, DotsIcon, GripIcon } from "./icons";

interface TaskCardProps {
  task: Task;
  isDragging: boolean;
  onEdit: () => void;
  onMove: (status: TaskStatus) => void;
  onDelete: () => void;
  onGripPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onGripPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onGripPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
}

const DUE_BADGE_STYLE: Record<string, { background: string; color: string }> = {
  muted: { background: "var(--surface-2)", color: "var(--ink-muted)" },
  today: { background: "var(--gold-soft)", color: "var(--gold)" },
  overdue: { background: "var(--terracotta-soft)", color: "var(--terracotta)" },
};

export function TaskCard({
  task,
  isDragging,
  onEdit,
  onMove,
  onDelete,
  onGripPointerDown,
  onGripPointerMove,
  onGripPointerUp,
}: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const badge = computeDueBadge(task.dueAt, task.status);

  function closeMenu() {
    setMenuOpen(false);
    setConfirmingDelete(false);
  }

  return (
    <div
      className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4"
      style={{ opacity: isDragging ? 0.35 : 1 }}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label="سحب لنقل المهمة لعمود تاني"
          onPointerDown={onGripPointerDown}
          onPointerMove={onGripPointerMove}
          onPointerUp={onGripPointerUp}
          onPointerCancel={onGripPointerUp}
          style={{ touchAction: "none", color: "var(--ink-muted)" }}
          className="mt-0.5 flex h-7 w-7 flex-shrink-0 cursor-grab items-center justify-center rounded-lg active:cursor-grabbing"
        >
          <GripIcon />
        </button>

        <button type="button" onClick={onEdit} className="flex-1 text-right" style={{ minWidth: 0 }}>
          <div className="text-[14.5px] font-bold leading-snug">{task.title}</div>
          {task.notes ? (
            <div
              className="mt-1 text-[12px] text-ink-muted"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {task.notes}
            </div>
          ) : null}
        </button>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            aria-label="خيارات المهمة"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            style={{ color: "var(--ink-muted)" }}
            className="flex h-7 w-7 items-center justify-center rounded-lg"
          >
            <DotsIcon />
          </button>

          {menuOpen ? (
            <>
              <div
                aria-hidden
                onClick={closeMenu}
                style={{ position: "fixed", inset: 0, zIndex: 30 }}
              />
              <div
                role="menu"
                className="absolute left-0 z-40 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    onEdit();
                  }}
                  className="block w-full px-3 py-2 text-right text-[13px] font-semibold"
                >
                  تعديل
                </button>

                <div className="px-3 pb-1 pt-2 text-[10.5px] font-bold" style={{ color: "var(--ink-muted)" }}>
                  نقل إلى
                </div>
                {STATUS_ORDER.filter((s) => s !== task.status).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeMenu();
                      onMove(s);
                    }}
                    className="block w-full px-3 py-2 text-right text-[13px] font-semibold"
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}

                <div className="my-1 h-px" style={{ background: "var(--border)" }} />

                {!confirmingDelete ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setConfirmingDelete(true)}
                    className="block w-full px-3 py-2 text-right text-[13px] font-semibold"
                    style={{ color: "var(--terracotta)" }}
                  >
                    حذف
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeMenu();
                      onDelete();
                    }}
                    className="block w-full px-3 py-2 text-right text-[13px] font-bold"
                    style={{ color: "var(--terracotta)" }}
                  >
                    تأكيد الحذف؟
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={{ background: "var(--surface-2)", color: "var(--ink-muted)", border: "1px solid var(--border)" }}
        >
          {CATEGORY_LABELS[task.category]}
        </span>

        {badge ? (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={DUE_BADGE_STYLE[badge.tone]}
          >
            {badge.label}
          </span>
        ) : null}

        {task.reminderEnabled && task.reminderAt ? (
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ background: "var(--green-soft)", color: "var(--green)" }}
          >
            <BellIcon />
            {formatTime(task.reminderAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
