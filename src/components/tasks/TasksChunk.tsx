import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { addDays, parseISO } from "date-fns";
import { useMemo, useState } from "react";

import { useStore } from "../../store";
import { toDateOnly, type Task } from "../../types";
import { IconArrowRight, IconCheck, IconGrip } from "../icons";

export function TasksChunk() {
  const selectedDate = useStore((s) => s.selectedDate);
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);

  const tomorrowDate = useMemo(
    () => toDateOnly(addDays(parseISO(selectedDate), 1)),
    [selectedDate],
  );

  // "Tomorrow" is relative to selectedDate, NOT system today (§5.1). No
  // auto-rollover anywhere — incomplete past tasks simply stay put.
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.scheduledFor === selectedDate),
    [tasks, selectedDate],
  );
  const tomorrowTasks = useMemo(
    () => tasks.filter((t) => t.scheduledFor === tomorrowDate),
    [tasks, tomorrowDate],
  );

  const todayIds = useMemo(() => todayTasks.map((t) => t.id), [todayTasks]);

  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const title = draft.trim();
    if (!title) return;
    addTask({ title, scheduledFor: selectedDate });
    setDraft("");
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        Tasks
      </h2>

      {/* Today's tasks: long-press to reorder, or drag onto the grid (§6.6). */}
      <SortableContext items={todayIds} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col">
          {todayTasks.map((task) => (
            <SortableTask key={task.id} task={task} />
          ))}
        </ul>
      </SortableContext>

      {/* Add-task input at the bottom of the today section (§5.1). */}
      <div className="mt-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitDraft();
          }}
          onBlur={commitDraft}
          placeholder="Add a task"
          className="w-full rounded-md bg-transparent px-2 py-1.5 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:bg-[var(--hover)] focus:outline-none"
        />
      </div>

      {/* Muted "Tomorrow" sub-section (§5.1). */}
      <div className="mt-5">
        <h3 className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
          Tomorrow
        </h3>
        {tomorrowTasks.length === 0 ? (
          <p className="px-2 py-1 text-xs text-[var(--muted)]">Nothing yet.</p>
        ) : (
          <ul className="flex flex-col opacity-60">
            {tomorrowTasks.map((task) => (
              <PlainTask key={task.id} task={task} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function TaskCheckbox({ task }: { task: Task }) {
  const toggleTask = useStore((s) => s.toggleTask);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={task.isCompleted}
      onClick={() => toggleTask(task.id)}
      onPointerDown={(e) => e.stopPropagation()}
      className={[
        "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[5px] border transition-colors",
        task.isCompleted
          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
          : "border-[var(--muted)] text-transparent hover:border-[var(--fg)]",
      ].join(" ")}
    >
      <IconCheck width={11} height={11} strokeWidth={3} />
    </button>
  );
}

/** Inline-editable title — edit any task again after creation. */
function TaskTitleInput({ task }: { task: Task }) {
  const updateTask = useStore((s) => s.updateTask);
  return (
    <input
      value={task.title}
      onChange={(e) => updateTask(task.id, { title: e.target.value })}
      className={[
        "min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-sm focus:bg-[var(--hover)] focus:outline-none",
        task.isCompleted ? "text-[var(--muted)] line-through" : "text-[var(--fg)]",
      ].join(" ")}
    />
  );
}

function MoveToTomorrowButton({ id }: { id: string }) {
  const moveTaskToTomorrow = useStore((s) => s.moveTaskToTomorrow);
  return (
    <button
      type="button"
      onClick={() => moveTaskToTomorrow(id)}
      onPointerDown={(e) => e.stopPropagation()}
      title="Move to tomorrow"
      aria-label="Move to tomorrow"
      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[var(--muted)] opacity-0 transition-opacity hover:bg-[var(--hover)] hover:text-[var(--fg)] group-hover:opacity-100"
    >
      <IconArrowRight width={15} height={15} />
    </button>
  );
}

/**
 * Today's task. The whole row is a sortable drag source: long-press to reorder
 * within the list, or drag onto the Daily grid to create an event (§6.6 —
 * one-way copy, no FK). Interactive controls stop propagation so taps still work.
 */
function SortableTask({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", title: task.title, categoryId: task.categoryId },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "group flex touch-none items-center gap-2 rounded-md px-1 py-1.5 hover:bg-[var(--hover)]",
        isDragging ? "opacity-40" : "",
      ].join(" ")}
      {...attributes}
      {...listeners}
    >
      <span className="flex h-5 w-4 flex-shrink-0 cursor-grab items-center justify-center text-[var(--muted)] opacity-0 group-hover:opacity-100">
        <IconGrip width={14} height={14} />
      </span>
      <TaskCheckbox task={task} />
      <TaskTitleInput task={task} />
      <MoveToTomorrowButton id={task.id} />
    </li>
  );
}

function PlainTask({ task }: { task: Task }) {
  return (
    <li className="group flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-[var(--hover)]">
      <span className="w-4 flex-shrink-0" />
      <TaskCheckbox task={task} />
      <TaskTitleInput task={task} />
      <MoveToTomorrowButton id={task.id} />
    </li>
  );
}
