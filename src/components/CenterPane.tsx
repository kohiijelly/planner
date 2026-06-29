import { addDays, format, parseISO, subDays } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";

import { useStore } from "../store";
import { toDateOnly } from "../types";
import { DailyView } from "./DailyView";
import { MonthlyView } from "./MonthlyView";
import { WeeklyView } from "./WeeklyView";
import { IconChevronLeft, IconChevronRight } from "./icons";

function DailyHeader() {
  const selectedDate = useStore((s) => s.selectedDate);
  const setSelectedDate = useStore((s) => s.setSelectedDate);

  const date = parseISO(selectedDate);
  const goPrev = () => setSelectedDate(toDateOnly(subDays(date, 1)));
  const goNext = () => setSelectedDate(toDateOnly(addDays(date, 1)));
  const goToday = () => setSelectedDate(toDateOnly(new Date()));

  return (
    <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-[var(--border)] px-4">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous day"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
        >
          <IconChevronLeft />
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next day"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
        >
          <IconChevronRight />
        </button>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">{format(date, "EEEE")}</span>
        <span className="text-xs text-[var(--muted)]">
          {format(date, "MMMM d, yyyy")}
        </span>
      </div>
      <button
        type="button"
        onClick={goToday}
        className="ml-2 rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
      >
        Today
      </button>
    </div>
  );
}

function DailyPane() {
  return (
    <div className="flex h-full flex-col">
      <DailyHeader />
      <div className="min-h-0 flex-1">
        <DailyView />
      </div>
    </div>
  );
}

export function CenterPane() {
  const currentView = useStore((s) => s.currentView);

  // §6.4 — animate view changes with a simple opacity crossfade only. No
  // `layout` animation is applied to the time-grid event blocks.
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={currentView}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="h-full"
      >
        {currentView === "weekly" ? (
          <WeeklyView />
        ) : currentView === "monthly" ? (
          <MonthlyView />
        ) : (
          <DailyPane />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
