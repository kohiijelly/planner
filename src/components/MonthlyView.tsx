import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useMemo } from "react";

import { WEEK_STARTS_ON } from "../constants";
import { dateOnlyOf, minutesOfDay } from "../lib/time";
import { useStore } from "../store";
import { toDateOnly } from "../types";
import { IconChevronLeft, IconChevronRight } from "./icons";

// Monday-first weekday headers.
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** §6.5 — map a day's total scheduled minutes to a 4-step bucket. */
function loadBucket(minutes: number): 0 | 1 | 2 | 3 {
  if (minutes <= 0) return 0; // none
  if (minutes <= 120) return 1; // light  (≤ 2h)
  if (minutes <= 300) return 2; // medium (≤ 5h)
  return 3; // heavy
}

const BUCKET_STYLE: Record<1 | 2 | 3, { widthPct: number; opacity: number }> = {
  1: { widthPct: 34, opacity: 0.4 },
  2: { widthPct: 67, opacity: 0.7 },
  3: { widthPct: 100, opacity: 1 },
};

export function MonthlyView() {
  const selectedDate = useStore((s) => s.selectedDate);
  const setSelectedDate = useStore((s) => s.setSelectedDate);
  const setCurrentView = useStore((s) => s.setCurrentView);
  const events = useStore((s) => s.events);

  const monthAnchor = parseISO(selectedDate);

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthAnchor), {
      weekStartsOn: WEEK_STARTS_ON,
    });
    const end = endOfWeek(endOfMonth(monthAnchor), {
      weekStartsOn: WEEK_STARTS_ON,
    });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // Total scheduled minutes per calendar day (§6.5).
  const minutesByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const ds = dateOnlyOf(e.startTime);
      const dur = Math.max(0, minutesOfDay(e.endTime) - minutesOfDay(e.startTime));
      map.set(ds, (map.get(ds) ?? 0) + dur);
    }
    return map;
  }, [events]);

  const rows = gridDays.length / 7;

  const openDay = (day: Date) => {
    setSelectedDate(toDateOnly(day));
    setCurrentView("daily");
  };

  const goPrev = () =>
    setSelectedDate(toDateOnly(subMonths(monthAnchor, 1)));
  const goNext = () =>
    setSelectedDate(toDateOnly(addMonths(monthAnchor, 1)));
  const goToday = () => setSelectedDate(toDateOnly(new Date()));

  return (
    <div className="flex h-full flex-col">
      {/* Header: month + navigation */}
      <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-[var(--border)] px-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          >
            <IconChevronRight />
          </button>
        </div>
        <span className="text-sm font-semibold">
          {format(monthAnchor, "MMMM yyyy")}
        </span>
        <button
          type="button"
          onClick={goToday}
          className="ml-2 rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
        >
          Today
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid flex-shrink-0 grid-cols-7 border-b border-[var(--border)]">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-[11px] uppercase tracking-wider text-[var(--muted)]"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells with load indicators only — no event text (§4.3 / §6.5). */}
      <div
        className="grid min-h-0 flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {gridDays.map((day) => {
          const inMonth = isSameMonth(day, monthAnchor);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, monthAnchor);
          const minutes = minutesByDay.get(toDateOnly(day)) ?? 0;
          const bucket = loadBucket(minutes);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => openDay(day)}
              className={[
                "flex flex-col items-start gap-1 border-b border-l border-[var(--border)] p-1.5 text-left transition-colors hover:bg-[var(--hover)]",
                isSelected ? "bg-[var(--active)]" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums",
                  isToday ? "bg-[var(--accent)] font-semibold text-white" : "",
                  !inMonth ? "text-[var(--muted)]/50" : "text-[var(--fg)]",
                ].join(" ")}
              >
                {format(day, "d")}
              </span>

              <div className="mt-auto h-1.5 w-full">
                {bucket !== 0 && (
                  <div
                    className="h-1.5 rounded-full bg-[var(--accent)]"
                    style={{
                      width: `${BUCKET_STYLE[bucket].widthPct}%`,
                      opacity: BUCKET_STYLE[bucket].opacity,
                    }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
