"use client";

import { useMemo, useState } from "react";
import { StatusTabs } from "./StatusTabs";
import { TaskCard } from "./TaskCard";
import { TaskEditorModal } from "./TaskEditorModal";
import { PlusIcon } from "./icons";
import { sortTasks, STATUS_LABELS, type Task, type TaskFormPayload, type TaskStatus } from "./types";

interface KanbanBoardProps {
  initialTasks: Task[];
}

type EditorState = { mode: "create" } | { mode: "edit"; task: Task } | null;

export function KanbanBoard({ initialTasks }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeStatus, setActiveStatus] = useState<TaskStatus>("today");
  const [editorState, setEditorState] = useState<EditorState>(null);
  const [error, setError] = useState<string | null>(null);

  // حالة السحب — pointer events بدل native HTML5 drag (شغالة باللمس، والـ tabs نفسها هي drop targets)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragTitle, setDragTitle] = useState<string>("");
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragHoverStatus, setDragHoverStatus] = useState<TaskStatus | null>(null);

  const counts = useMemo(() => {
    const c: Record<TaskStatus, number> = { backlog: 0, today: 0, in_progress: 0, done: 0 };
    for (const t of tasks) c[t.status] += 1;
    return c;
  }, [tasks]);

  const visibleTasks = useMemo(
    () => tasks.filter((t) => t.status === activeStatus).sort(sortTasks),
    [tasks, activeStatus]
  );

  async function createTask(payload: TaskFormPayload): Promise<boolean> {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return false;
      const created = (await res.json()) as Task;
      setTasks((prev) => [...prev, created]);
      setError(null);
      return true;
    } catch {
      return false;
    }
  }

  async function updateTask(id: string, patch: Partial<TaskFormPayload>): Promise<boolean> {
    const previous = tasks;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        setTasks(previous);
        return false;
      }
      const updated = (await res.json()) as Task;
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setError(null);
      return true;
    } catch {
      setTasks(previous);
      return false;
    }
  }

  async function deleteTask(id: string): Promise<boolean> {
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setTasks(previous);
        setError("تعذر حذف المهمة، حاول تاني");
        return false;
      }
      setError(null);
      return true;
    } catch {
      setTasks(previous);
      setError("تعذر حذف المهمة، حاول تاني");
      return false;
    }
  }

  function moveTask(id: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    void updateTask(id, { status });
  }

  function handleGripPointerDown(task: Task, e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragTaskId(task.id);
    setDragTitle(task.title);
    setDragPos({ x: e.clientX, y: e.clientY });
    setDragHoverStatus(null);
  }

  function handleGripPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragTaskId) return;
    setDragPos({ x: e.clientX, y: e.clientY });
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const tabEl = el?.closest<HTMLElement>("[data-tab-status]");
    const nextStatus = (tabEl?.dataset.tabStatus as TaskStatus | undefined) ?? null;
    setDragHoverStatus(nextStatus);
  }

  function handleGripPointerUp() {
    if (dragTaskId && dragHoverStatus) {
      moveTask(dragTaskId, dragHoverStatus);
    }
    setDragTaskId(null);
    setDragPos(null);
    setDragHoverStatus(null);
    setDragTitle("");
  }

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <StatusTabs
            activeStatus={activeStatus}
            onSelect={setActiveStatus}
            counts={counts}
            dragHoverStatus={dragHoverStatus}
          />
        </div>
        <button
          type="button"
          onClick={() => setEditorState({ mode: "create" })}
          aria-label="إضافة مهمة جديدة"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-white"
          style={{ background: "var(--green)" }}
        >
          <PlusIcon />
        </button>
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

      <div className="flex flex-col gap-3">
        {visibleTasks.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed p-6 text-center text-[12.5px]"
            style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
          >
            لا يوجد مهام في عمود «{STATUS_LABELS[activeStatus]}» دلوقتي
          </div>
        ) : (
          visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDragging={dragTaskId === task.id}
              onEdit={() => setEditorState({ mode: "edit", task })}
              onMove={(status) => moveTask(task.id, status)}
              onDelete={() => void deleteTask(task.id)}
              onGripPointerDown={(e) => handleGripPointerDown(task, e)}
              onGripPointerMove={handleGripPointerMove}
              onGripPointerUp={handleGripPointerUp}
            />
          ))
        )}
      </div>

      {dragTaskId && dragPos ? (
        <div
          style={{
            position: "fixed",
            left: dragPos.x,
            top: dragPos.y,
            transform: "translate(-50%, -130%)",
            pointerEvents: "none",
            zIndex: 60,
            maxWidth: 220,
            borderColor: "var(--gold)",
            background: "var(--surface)",
            color: "var(--ink)",
          }}
          className="truncate rounded-xl border px-3 py-2 text-[12.5px] font-bold shadow-lg"
        >
          {dragTitle}
        </div>
      ) : null}

      {editorState ? (
        <TaskEditorModal
          mode={editorState.mode}
          task={editorState.mode === "edit" ? editorState.task : undefined}
          defaultStatus={activeStatus}
          onClose={() => setEditorState(null)}
          onSubmit={(payload) =>
            editorState.mode === "create" ? createTask(payload) : updateTask(editorState.task.id, payload)
          }
          onDelete={
            editorState.mode === "edit" ? () => deleteTask(editorState.task.id) : undefined
          }
        />
      ) : null}
    </div>
  );
}
