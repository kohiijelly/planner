import { useDroppable } from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_CATEGORY_ID, HOUR_HEIGHT } from "../constants";
import { layoutDayEvents } from "../lib/overlap";
import {
  DAY_END_MINUTE,
  DAY_HEIGHT,
  MIN_EVENT_MINUTES,
  clampMinute,
  dateOnlyOf,
  isoFromDateAndMinutes,
  minutesOfDay,
  minutesToY,
  snapMinutes,
  yToMinutes,
} from "../lib/time";
import { useStore } from "../store";
import type { Category, CalendarEvent } from "../types";
import { EventEditor } from "./EventEditor";

const GUTTER = 56; // px reserved on the left for hour labels
const HOURS = Array.from({ length: 25 }, (_, h) => h); // 0..24 lines

/** Droppable id for the Daily grid (task → event drops, step 6 / §6.6). */
export const DAILY_GRID_DROPPABLE_ID = "daily-grid";

/**
 * In-progress pointer interaction. Kept in LOCAL state only (§9 — never persist
 * transient drag coordinates). Committed to the store on pointer-up.
 */
type Drag =
  | { mode: "create"; fixedMin: number; movingMin: number }
  | {
      mode: "resize-top" | "resize-bottom";
      eventId: string;
      fixedMin: number;
      movingMin: number;
    }
  | {
      mode: "move";
      eventId: string;
      durationMin: number;
      originStartMin: number;
      pointerStartMin: number;
      currentStartMin: number;
      moved: boolean;
    };

function formatHour(h: number): string {
  return `${String(h % 24).padStart(2, "0")}:00`;
}

export function DailyView() {
  const selectedDate = useStore((s) => s.selectedDate);
  const events = useStore((s) => s.events);
  const categories = useStore((s) => s.categories);
  const addEvent = useStore((s) => s.addEvent);
  const updateEvent = useStore((s) => s.updateEvent);

  const scrollRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // The interaction area doubles as the dnd-kit droppable for task → event drops.
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: DAILY_GRID_DROPPABLE_ID,
  });
  const setAreaRef = useCallback(
    (node: HTMLDivElement | null) => {
      areaRef.current = node;
      setDroppableRef(node);
    },
    [setDroppableRef],
  );

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const dayEvents = useMemo(
    () => events.filter((e) => dateOnlyOf(e.startTime) === selectedDate),
    [events, selectedDate],
  );

  const positioned = useMemo(() => layoutDayEvents(dayEvents), [dayEvents]);

  // Scroll to the morning on first mount so the grid isn't pinned at midnight.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = minutesToY(7 * 60) - 12;
    }
  }, []);

  function minuteFromPointer(clientY: number): number {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return clampMinute(snapMinutes(yToMinutes(clientY - rect.top)));
  }

  function onPointerDown(e: React.PointerEvent) {
    const target = e.target as HTMLElement;
    const role = target.dataset.role;
    if (!role) return;

    const minute = minuteFromPointer(e.clientY);

    if (role === "grid-bg") {
      setDrag({ mode: "create", fixedMin: minute, movingMin: minute });
    } else if (role === "resize-top" || role === "resize-bottom") {
      const id = target.dataset.eventId;
      const ev = id ? dayEvents.find((x) => x.id === id) : undefined;
      if (!ev) return;
      const startMin = minutesOfDay(ev.startTime);
      const endMin = minutesOfDay(ev.endTime);
      setDrag(
        role === "resize-top"
          ? { mode: "resize-top", eventId: ev.id, fixedMin: endMin, movingMin: startMin }
          : { mode: "resize-bottom", eventId: ev.id, fixedMin: startMin, movingMin: endMin },
      );
    } else if (role === "event-body") {
      const id = target.dataset.eventId;
      const ev = id ? dayEvents.find((x) => x.id === id) : undefined;
      if (!ev) return;
      const startMin = minutesOfDay(ev.startTime);
      const endMin = minutesOfDay(ev.endTime);
      setDrag({
        mode: "move",
        eventId: ev.id,
        durationMin: endMin - startMin,
        originStartMin: startMin,
        pointerStartMin: minute,
        currentStartMin: startMin,
        moved: false,
      });
    } else {
      return;
    }

    areaRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const minute = minuteFromPointer(e.clientY);

    if (drag.mode === "move") {
      const maxStart = DAY_END_MINUTE - drag.durationMin; // §6.3 keep same day
      let next = drag.originStartMin + (minute - drag.pointerStartMin);
      next = Math.max(0, Math.min(next, maxStart));
      setDrag({
        ...drag,
        currentStartMin: next,
        moved: drag.moved || next !== drag.originStartMin,
      });
      return;
    }

    setDrag({ ...drag, movingMin: minute });
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!drag) return;
    areaRef.current?.releasePointerCapture(e.pointerId);

    if (drag.mode === "create") {
      let start = Math.min(drag.fixedMin, drag.movingMin);
      let end = Math.max(drag.fixedMin, drag.movingMin);

      // A click without a drag should not create an event.
      if (end - start >= 1) {
        if (end - start < MIN_EVENT_MINUTES) end = start + MIN_EVENT_MINUTES;
        // §6.3 — clamp to the same calendar day (end ≤ 23:59).
        if (end > DAY_END_MINUTE) end = DAY_END_MINUTE;
        if (start < 0) start = 0;
        if (end - start < MIN_EVENT_MINUTES) start = end - MIN_EVENT_MINUTES;

        const id = addEvent({
          title: "New event",
          startTime: isoFromDateAndMinutes(selectedDate, start),
          endTime: isoFromDateAndMinutes(selectedDate, end),
          categoryId: DEFAULT_CATEGORY_ID,
        });
        // Open the editor immediately so a new block can be named right away.
        setEditingId(id);
      }
    } else if (drag.mode === "move") {
      if (drag.moved) {
        const start = drag.currentStartMin;
        const end = start + drag.durationMin;
        updateEvent(drag.eventId, {
          startTime: isoFromDateAndMinutes(selectedDate, start),
          endTime: isoFromDateAndMinutes(selectedDate, end),
        });
      } else {
        // A click (no movement) opens the editor.
        setEditingId(drag.eventId);
      }
    } else {
      const ev = dayEvents.find((x) => x.id === drag.eventId);
      if (ev) {
        let start: number;
        let end: number;
        if (drag.mode === "resize-top") {
          end = drag.fixedMin;
          start = drag.movingMin;
          if (start < 0) start = 0;
          if (end - start < MIN_EVENT_MINUTES) start = end - MIN_EVENT_MINUTES;
        } else {
          start = drag.fixedMin;
          end = drag.movingMin;
          if (end > DAY_END_MINUTE) end = DAY_END_MINUTE; // §6.3 same-day clamp
          if (end - start < MIN_EVENT_MINUTES) end = start + MIN_EVENT_MINUTES;
          if (end > DAY_END_MINUTE) {
            end = DAY_END_MINUTE;
            start = end - MIN_EVENT_MINUTES;
          }
        }
        updateEvent(ev.id, {
          startTime: isoFromDateAndMinutes(selectedDate, start),
          endTime: isoFromDateAndMinutes(selectedDate, end),
        });
      }
    }

    setDrag(null);
  }

  // Live draft block while creating.
  const draft =
    drag?.mode === "create"
      ? {
          start: Math.min(drag.fixedMin, drag.movingMin),
          end: Math.max(drag.fixedMin, drag.movingMin),
        }
      : null;

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto">
      <div className="relative w-full" style={{ height: DAY_HEIGHT }}>
        {/* Hour gridlines + labels (non-interactive) */}
        <div className="pointer-events-none absolute inset-0">
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-[var(--grid-line)]"
              style={{ top: h * HOUR_HEIGHT }}
            >
              <span
                className="absolute -top-2 left-2 text-[11px] tabular-nums text-[var(--muted)]"
                style={{ width: GUTTER - 12 }}
              >
                {h < 24 ? formatHour(h) : ""}
              </span>
            </div>
          ))}
        </div>

        {/* Interaction + event area (offset past the gutter) */}
        <div
          ref={setAreaRef}
          className="absolute bottom-0 top-0 touch-none select-none"
          style={{ left: GUTTER, right: 8, height: DAY_HEIGHT }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Background capture layer for drag-create */}
          <div data-role="grid-bg" className="absolute inset-0" />

          {/* Empty-day hint (§10) — never a blank void; vanishes once events exist. */}
          {dayEvents.length === 0 && !drag && (
            <div
              className="pointer-events-none absolute left-0 right-0 flex items-center justify-center"
              style={{ top: minutesToY(9 * 60), height: HOUR_HEIGHT }}
            >
              <span className="rounded-md px-3 py-1 text-xs text-[var(--muted)]">
                Drag on the grid to schedule a block
              </span>
            </div>
          )}

          {positioned.map((p) => {
            // While interacting with this event, preview from the live drag.
            let sMin = p.startMin;
            let eMin = p.endMin;
            if (drag && "eventId" in drag && drag.eventId === p.event.id) {
              if (drag.mode === "resize-top" || drag.mode === "resize-bottom") {
                sMin = Math.min(drag.fixedMin, drag.movingMin);
                eMin = Math.max(drag.fixedMin, drag.movingMin);
              } else if (drag.mode === "move") {
                sMin = drag.currentStartMin;
                eMin = drag.currentStartMin + drag.durationMin;
              }
            }

            const color =
              categoryById.get(p.event.categoryId)?.colorCode ?? "#9CA3AF";
            const top = minutesToY(sMin);
            const height = Math.max(minutesToY(eMin - sMin), 12);
            const widthPct = 100 / p.lanes;
            const leftPct = p.lane * widthPct;

            return (
              <EventBlock
                key={p.event.id}
                event={p.event}
                color={color}
                top={top}
                height={height}
                leftPct={leftPct}
                widthPct={widthPct}
              />
            );
          })}

          {draft && (
            <div
              className="pointer-events-none absolute left-0 right-0 rounded-md border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)]"
              style={{
                top: minutesToY(draft.start),
                height: Math.max(minutesToY(draft.end - draft.start), 2),
              }}
            />
          )}
        </div>
      </div>

      {editingId && (
        <EventEditor eventId={editingId} onClose={() => setEditingId(null)} />
      )}
    </div>
  );
}

function EventBlock({
  event,
  color,
  top,
  height,
  leftPct,
  widthPct,
}: {
  event: CalendarEvent;
  color: string;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
}) {
  return (
    <div
      data-role="event-body"
      data-event-id={event.id}
      className="absolute cursor-grab overflow-hidden rounded-md px-2 py-1 text-xs active:cursor-grabbing"
      style={{
        top,
        height,
        left: `calc(${leftPct}% + ${leftPct === 0 ? 0 : 2}px)`,
        width: `calc(${widthPct}% - 4px)`,
        backgroundColor: `${color}29`,
        borderLeft: `3px solid ${color}`,
        color: "var(--fg)",
      }}
    >
      {/* Top resize handle (§6.1 edge-resize) */}
      <div
        data-role="resize-top"
        data-event-id={event.id}
        className="absolute left-0 right-0 top-0 h-2 cursor-ns-resize"
      />
      <div className="pointer-events-none truncate font-medium leading-tight">
        {event.title || "Untitled"}
      </div>
      {/* Bottom resize handle */}
      <div
        data-role="resize-bottom"
        data-event-id={event.id}
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"
      />
    </div>
  );
}
