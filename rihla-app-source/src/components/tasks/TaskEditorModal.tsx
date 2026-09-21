"use client";

import { useState } from "react";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  fromLocalInputValue,
  STATUS_LABELS,
  STATUS_ORDER,
  toLocalInputValue,
  type Task,
  type TaskCategory,
  type TaskFormPayload,
  type TaskStatus,
} from "./types";
import { CheckIcon, XIcon } from "./icons";

interface TaskEditorModalProps {
  mode: "create" | "edit";
  task?: Task;
  defaultStatus: TaskStatus;
  onClose: () => void;
  onSubmit: (payload: TaskFormPayload) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
}

export function TaskEditorModal({ mode, task, defaultStatus, onClose, onSubmit, onDelete }: TaskEditorModalProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [category, setCategory] = useState<TaskCategory>(task?.category ?? "personal");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus);
  const [dueAtLocal, setDueAtLocal] = useState(toLocalInputValue(task?.dueAt ?? null));
  const [reminderEnabled, setReminderEnabled] = useState(task?.reminderEnabled ?? false);
  const [reminderAtLocal, setReminderAtLocal] = useState(toLocalInputValue(task?.reminderAt ?? null));
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function toggleReminder(next: boolean) {
    setReminderEnabled(next);
    if (next && !reminderAtLocal && dueAtLocal) {
      setReminderAtLocal(dueAtLocal);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("العنوان مطلوب");
      return;
    }
    if (reminderEnabled && !reminderAtLocal) {
      setError("لازم تحدد وقت التذكير");
      return;
    }

    setError(null);
    setSubmitting(true);
    const ok = await onSubmit({
      title: trimmedTitle,
      category,
      status,
      dueAt: fromLocalInputValue(dueAtLocal),
      reminderEnabled,
      reminderAt: reminderEnabled ? fromLocalInputValue(reminderAtLocal) : null,
      notes: notes.trim() ? notes.trim() : null,
    });
    setSubmitting(false);
    if (ok) {
      onClose();
    } else {
      setError("حصل خطأ، حاول تاني");
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSubmitting(true);
    const ok = await onDelete();
    setSubmitting(false);
    if (ok) {
      onClose();
    } else {
      setError("تعذر حذف المهمة، حاول تاني");
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }} className="flex items-end justify-center">
      <div
        aria-hidden
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(20,18,13,0.45)" }}
      />
      <form
        onSubmit={handleSubmit}
        className="relative flex w-full max-w-[480px] flex-col gap-4 rounded-t-3xl border-t border-border bg-surface p-5"
        style={{ maxHeight: "88svh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
      >
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-extrabold">{mode === "create" ? "مهمة جديدة" : "تعديل المهمة"}</div>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={onClose}
            style={{ color: "var(--ink-muted)" }}
            className="flex h-8 w-8 items-center justify-center rounded-full"
          >
            <XIcon />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-title" className="text-[12.5px] font-bold" style={{ color: "var(--ink-muted)" }}>
            العنوان
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="اسم المهمة"
            maxLength={300}
            required
            className="rounded-xl border px-3.5 py-2.5 text-[14px]"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold" style={{ color: "var(--ink-muted)" }}>
            التصنيف
          </span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_ORDER.map((c) => {
              const active = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className="rounded-full px-3 py-1.5 text-[12.5px] font-bold"
                  style={{
                    background: active ? "var(--green)" : "var(--surface-2)",
                    color: active ? "#fff" : "var(--ink)",
                    border: `1px solid ${active ? "var(--green)" : "var(--border)"}`,
                  }}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold" style={{ color: "var(--ink-muted)" }}>
            العمود
          </span>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_ORDER.map((s) => {
              const active = s === status;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className="rounded-full px-3 py-1.5 text-[12.5px] font-bold"
                  style={{
                    background: active ? "var(--green)" : "var(--surface-2)",
                    color: active ? "#fff" : "var(--ink)",
                    border: `1px solid ${active ? "var(--green)" : "var(--border)"}`,
                  }}
                >
                  {STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-due" className="text-[12.5px] font-bold" style={{ color: "var(--ink-muted)" }}>
            تاريخ الاستحقاق (اختياري)
          </label>
          <input
            id="task-due"
            type="datetime-local"
            value={dueAtLocal}
            onChange={(e) => setDueAtLocal(e.target.value)}
            className="rounded-xl border px-3.5 py-2.5 text-[14px]"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-xl border p-3.5" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold">تذكير</span>
            <button
              type="button"
              role="switch"
              aria-checked={reminderEnabled}
              aria-label="تفعيل التذكير"
              onClick={() => toggleReminder(!reminderEnabled)}
              style={{
                position: "relative",
                width: 44,
                height: 26,
                borderRadius: 999,
                background: reminderEnabled ? "var(--gold)" : "var(--border)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  right: reminderEnabled ? 20 : 2,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "right 0.15s ease",
                }}
              />
            </button>
          </div>
          {reminderEnabled ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-reminder" className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
                وقت التذكير
              </label>
              <input
                id="task-reminder"
                type="datetime-local"
                value={reminderAtLocal}
                onChange={(e) => setReminderAtLocal(e.target.value)}
                required={reminderEnabled}
                className="rounded-xl border px-3.5 py-2.5 text-[14px]"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-notes" className="text-[12.5px] font-bold" style={{ color: "var(--ink-muted)" }}>
            ملاحظات (اختياري)
          </label>
          <textarea
            id="task-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            className="resize-none rounded-xl border px-3.5 py-2.5 text-[13.5px]"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl px-3.5 py-2.5 text-[12.5px] font-semibold"
            style={{ background: "var(--terracotta-soft)", color: "var(--terracotta)" }}
          >
            {error}
          </div>
        ) : null}

        <div className="mt-1 flex items-center gap-2">
          {mode === "edit" && onDelete ? (
            !confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="flex-shrink-0 rounded-xl px-3.5 py-2.5 text-[13px] font-bold"
                style={{ color: "var(--terracotta)" }}
              >
                حذف
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="flex-shrink-0 rounded-xl px-3.5 py-2.5 text-[13px] font-bold"
                style={{ background: "var(--terracotta-soft)", color: "var(--terracotta)" }}
              >
                تأكيد الحذف؟
              </button>
            )
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-[14px] font-bold text-white"
            style={{ background: "var(--green)", opacity: submitting ? 0.7 : 1 }}
          >
            <CheckIcon />
            {mode === "create" ? "إضافة المهمة" : "حفظ التعديلات"}
          </button>
        </div>
      </form>
    </div>
  );
}
