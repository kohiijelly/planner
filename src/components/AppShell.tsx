import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { DEFAULT_CATEGORY_ID } from "../constants";
import { DAILY_GRID_DROPPABLE_ID } from "./DailyView";
import {
  DAY_END_MINUTE,
  clampMinute,
  isoFromDateAndMinutes,
  snapMinutes,
  yToMinutes,
} from "../lib/time";
import { selectRightSidebarVisible, useStore } from "../store";
import { CenterPane } from "./CenterPane";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";

const EASE = [0.22, 1, 0.36, 1] as const;
const RIGHT_WIDTH = 340;

/** Default duration (minutes) for an event created by dropping a task (step 6). */
const DROP_EVENT_MINUTES = 30;

type TaskDragData = { type: "task"; title: string; categoryId: string };

export function AppShell() {
  // §3.1 — Right sidebar visibility is DERIVED. We never mutate rightSidebarOpen
  // on a view change; the selector recomputes it from currentView + preference.
  const rightVisible = useStore(selectRightSidebarVisible);

  const [activeTitle, setActiveTitle] = useState<string | null>(null);

  // Long-press to pick up a task: a quick tap operates row controls / edits the
  // title; holding (then moving) starts a drag. Moving before the delay elapses
  // is treated as native interaction (e.g. selecting text), not a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
  );

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as TaskDragData | undefined;
    setActiveTitle(data?.type === "task" ? data.title : null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTitle(null);
    const { active, over, delta, activatorEvent } = e;
    if (!over) return;

    const data = active.data.current as TaskDragData | undefined;
    if (data?.type !== "task") return;

    // Dropped onto the Daily grid → create an event at the drop time.
    if (over.id === DAILY_GRID_DROPPABLE_ID) {
      // Final pointer Y = where the drag began + total movement, mapped into the
      // grid's coordinate space via the droppable's measured rect.
      const startClientY = (activatorEvent as PointerEvent | MouseEvent).clientY;
      const y = startClientY + delta.y - over.rect.top;

      let startMin = clampMinute(snapMinutes(yToMinutes(y)));
      let endMin = startMin + DROP_EVENT_MINUTES;
      if (endMin > DAY_END_MINUTE) {
        endMin = DAY_END_MINUTE; // §6.3 same-day clamp
        startMin = Math.max(0, endMin - DROP_EVENT_MINUTES);
      }

      // §6.6 — Task → Event is a strictly one-way copy of title + categoryId.
      // No foreign key in either direction; this never mutates the task.
      const { selectedDate, addEvent } = useStore.getState();
      addEvent({
        title: data.title,
        categoryId: data.categoryId || DEFAULT_CATEGORY_ID,
        startTime: isoFromDateAndMinutes(selectedDate, startMin),
        endTime: isoFromDateAndMinutes(selectedDate, endMin),
      });
      return;
    }

    // Dropped over another task → manual reorder within the list.
    if (over.id !== active.id) {
      useStore.getState().reorderTasks(String(active.id), String(over.id));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTitle(null)}
    >
      <div className="flex h-full w-full overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
        <LeftSidebar />

        {/* Center reflows automatically as the sidebars animate their widths
            (§6.4 — animate container width only; no per-block layout animation). */}
        <main className="flex min-w-0 flex-1 flex-col">
          <CenterPane />
        </main>

        <AnimatePresence initial={false}>
          {rightVisible && (
            <motion.aside
              key="right-sidebar"
              initial={{ width: 0 }}
              animate={{ width: RIGHT_WIDTH }}
              exit={{ width: 0 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="h-full flex-shrink-0 overflow-hidden border-l border-[var(--border)]"
            >
              {/* Fixed inner width keeps content from squishing during animation. */}
              <div className="h-full" style={{ width: RIGHT_WIDTH }}>
                <RightSidebar />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTitle ? (
          <div className="pointer-events-none rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm font-medium text-[var(--fg)] shadow-lg">
            {activeTitle}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
