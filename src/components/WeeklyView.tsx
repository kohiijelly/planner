import { addDays, addWeeks, format, isSameDay, parseISO, startOfWeek, subWeeks } from "date-fns";
import { useEffect, useMemo, useRef } from "react";

import { HOUR_HEIGHT, WEEK_STARTS_ON } from "../constants";
import { layoutDayEvents, type PositionedEvent } from "../lib/overlap";
import { DAY_HEIGHT, dateOnlyOf, minutesToY } from "../lib/time";
import { useStore } from "../store";
import { toDateOnly, type Category } from "../types";
import { IconChevronLeft, IconChevronRight } from "./icons";

const GUTTER = 56;
const HOURS = Array.from({ length: 25 }, (_, h) => h);

function formatHour(h: number): string {
  return `${String(h % 24).padStart(2, "0")}:00`;
}

export function WeeklyView() {
  const selectedDate = useStore((s) => s.selectedDate);
  const setSelectedDate = useStore((s) => s.setSelectedDate);
  const setCurrentView = useStore((s) => s.setCurrentView);
  const events = useStore((s) => s.events);
  const categories = useStore((s) => s.categories);

  const scrollRef = useRef<HTMLDivElement>(null);

  const weekDays = useMemo(() => {
    const start = startOfWeek(parseISO(selectedDate), {
      weekStartsOn: WEEK_STARTS_ON,
    });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  // Per-day overlap layout (§6.2), one independent cluster set per column.
  const layoutByDay = useMemo(
    () =>
      weekDays.map((day) => {
        const ds = toDateOnly(day);
        return layoutDayEvents(events.filter((e) => dateOnlyOf(e.startTime) === ds));
      }),
    [weekDays, events],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = minutesToY(7 * 60) - 12;
    }
  }, []);

  const openDay = (day: Date) => {
    setSelectedDate(toDateOnly(day));
    setCurrentView("daily");
  };

  const goPrev = () =>
    setSelectedDate(toDateOnly(subWeeks(parseISO(selectedDate), 1)));
  const goNext = () =>
    setSelectedDate(toDateOnly(addWeeks(parseISO(selectedDate), 1)));
  const goToday = () => setSelectedDate(toDateOnly(new Date()));

  const rangeLabel = `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`;

  return (
    <div className="flex h-full flex-col">
      {/* Header: week range + navigation */}
      <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-[var(--border)] px-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous week"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next week"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          >
            <IconChevronRight />
          </button>
        </div>
        <span className="text-sm font-semibold">{rangeLabel}</span>
        <button
          type="button"
          onClick={goToday}
          className="ml-2 rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
        >
          Today
        </button>
      </div>

      {/* Day-header row (clicking a header opens that day in Daily View). */}
      <div className="flex flex-shrink-0 border-b border-[var(--border)]">
        <div style={{ width: GUTTER }} className="flex-shrink-0" />
        {weekDays.map((day) => {
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, parseISO(selectedDate));
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => openDay(day)}
              className={[
                "flex flex-1 flex-col items-center gap-0.5 border-l border-[var(--border)] py-2 transition-colors hover:bg-[var(--hover)]",
                isSelected ? "bg-[var(--active)]" : "",
              ].join(" ")}
            >
              <span className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                {format(day, "EEE")}
              </span>
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums",
                  isToday
                    ? "bg-[var(--accent)] font-semibold text-white"
                    : "text-[var(--fg)]",
                ].join(" ")}
              >
                {format(day, "d")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scrollable time grid mirroring the Daily vertical scale. */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="relative" style={{ height: DAY_HEIGHT }}>
          {/* Hour lines + gutter labels */}
          <div className="pointer-events-none absolute inset-0">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-[var(--grid-line)]"
                style={{ top: h * HOUR_HEIGHT }}
              >
                <span className="absolute -top-2 left-2 text-[11px] tabular-nums text-[var(--muted)]">
                  {h < 24 ? formatHour(h) : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div
            className="absolute bottom-0 top-0 flex"
            style={{ left: GUTTER, right: 0 }}
          >
            {weekDays.map((day, i) => (
              <DayColumn
                key={day.toISOString()}
                positioned={layoutByDay[i]}
                categoryById={categoryById}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  positioned,
  categoryById,
}: {
  positioned: PositionedEvent[];
  categoryById: Map<string, Category>;
}) {
  return (
    <div className="relative flex-1 border-l border-[var(--border)]">
      {positioned.map((p) => {
        const color = categoryById.get(p.event.categoryId)?.colorCode ?? "#9CA3AF";
        const top = minutesToY(p.startMin);
        const height = Math.max(minutesToY(p.endMin - p.startMin), 12);
        const widthPct = 100 / p.lanes;
        const leftPct = p.lane * widthPct;
        return (
          <div
            key={p.event.id}
            className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-tight"
            style={{
              top,
              height,
              left: `calc(${leftPct}% + ${leftPct === 0 ? 1 : 1}px)`,
              width: `calc(${widthPct}% - 2px)`,
              backgroundColor: `${color}29`,
              borderLeft: `3px solid ${color}`,
              color: "var(--fg)",
            }}
            title={p.event.title || "Untitled"}
          >
            <span className="block truncate font-medium">
              {p.event.title || "Untitled"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
