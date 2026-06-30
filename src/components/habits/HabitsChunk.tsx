import { addDays, isSameDay, startOfWeek } from "date-fns";
import { useState } from "react";

import { WEEK_STARTS_ON } from "../../constants";
import { useStore } from "../../store";
import { toDateOnly, type Habit } from "../../types";
import { IconClose } from "../icons";

const DAY_LABELS = ["M", "T", "W", "Th", "F", "S", "Su"];

// Completed cells are a single neutral gray dot regardless of habit.
const DONE_COLOR = "#9ca3af";

const GRID_COLS = "minmax(0,1fr) repeat(7, 26px)";

export function HabitsChunk() {
  const habits = useStore((s) => s.habits);
  const addHabit = useStore((s) => s.addHabit);

  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const title = draft.trim();
    if (!title) return;
    addHabit(title);
    setDraft("");
  };

  // ⚠️ §5.3 SCOPING EXCEPTION: this grid is NOT wired to selectedDate. It always
  // shows the rolling week containing SYSTEM TODAY.
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <>
      <div className="grid items-center gap-y-1.5" style={{ gridTemplateColumns: GRID_COLS }}>
        {/* X-axis header: M T W Th F S Su (sticky to the section scroll top) */}
        <span className="sticky top-0 z-10 bg-[var(--panel)]" />
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <span
              key={i}
              className={[
                "sticky top-0 z-10 bg-[var(--panel)] pb-1 text-center text-[11px] font-medium",
                isToday ? "text-[var(--fg)]" : "text-[var(--muted)]",
              ].join(" ")}
            >
              {DAY_LABELS[i]}
            </span>
          );
        })}

        {habits.map((habit) => (
          <HabitRow key={habit.id} habit={habit} weekDays={weekDays} />
        ))}
      </div>

      {habits.length === 0 && (
        <p className="py-1 text-xs text-[var(--muted)]">No habits yet.</p>
      )}

      {/* Add-habit affordance → appends a new row. */}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitDraft();
        }}
        onBlur={commitDraft}
        placeholder="Add a habit"
        className="mt-2 w-full rounded-md bg-transparent px-1 py-1 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:bg-[var(--hover)] focus:outline-none"
      />
    </>
  );
}

function HabitRow({
  habit,
  weekDays,
}: {
  habit: Habit;
  weekDays: Date[];
}) {
  const toggleHabitCompletion = useStore((s) => s.toggleHabitCompletion);
  const updateHabit = useStore((s) => s.updateHabit);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const completed = new Set(habit.completionDates);

  return (
    <>
      <div className="group flex min-w-0 items-center gap-1 pr-2">
        <input
          value={habit.title}
          onChange={(e) => updateHabit(habit.id, { title: e.target.value })}
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-sm text-[var(--fg)] focus:bg-[var(--hover)] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => deleteHabit(habit.id)}
          aria-label="Delete habit"
          title="Delete habit"
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[var(--muted)] opacity-0 transition-opacity hover:bg-[var(--hover)] hover:text-[var(--fg)] group-hover:opacity-100"
        >
          <IconClose width={12} height={12} />
        </button>
      </div>
      {weekDays.map((day, i) => {
        const dateOnly = toDateOnly(day);
        const isDone = completed.has(dateOnly);
        return (
          <div key={i} className="flex justify-center">
            <button
              type="button"
              aria-label={`${habit.title} ${dateOnly} ${isDone ? "done" : "not done"}`}
              aria-pressed={isDone}
              onClick={() => toggleHabitCompletion(habit.id, dateOnly)}
              className="h-[18px] w-[18px] rounded-full border transition-all"
              style={
                isDone
                  ? { backgroundColor: DONE_COLOR, borderColor: DONE_COLOR }
                  : { backgroundColor: "transparent", borderColor: "var(--border)" }
              }
            />
          </div>
        );
      })}
    </>
  );
}
