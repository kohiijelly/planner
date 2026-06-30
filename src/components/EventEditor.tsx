import { addDays, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { MIN_EVENT_MINUTES } from "../constants";
import { openExternal } from "../lib/open";
import {
  DAY_END_MINUTE,
  isoFromDateAndMinutes,
  minutesOfDay,
} from "../lib/time";
import { useStore } from "../store";
import { toDateOnly, type DateOnly } from "../types";
import { CategoryManager } from "./CategoryManager";
import { IconClose, IconPlus } from "./icons";

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function EventEditor({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const event = useStore((s) => s.events.find((e) => e.id === eventId));
  const categories = useStore((s) => s.categories);
  const updateEvent = useStore((s) => s.updateEvent);
  const deleteEvent = useStore((s) => s.deleteEvent);

  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The event may have been deleted out from under us.
  if (!event) return null;

  const date = event.startTime.slice(0, 10) as DateOnly;
  const startMin = minutesOfDay(event.startTime);
  const endMin = minutesOfDay(event.endTime);

  const onStartChange = (value: string) => {
    const min = hhmmToMinutes(value);
    if (min === null) return;
    const clamped = Math.max(0, Math.min(min, endMin - MIN_EVENT_MINUTES));
    updateEvent(event.id, {
      startTime: isoFromDateAndMinutes(date, clamped),
    });
  };

  // Move the event to another calendar day, preserving its time-of-day.
  const moveToDate = (newDate: DateOnly) => {
    updateEvent(event.id, {
      startTime: isoFromDateAndMinutes(newDate, startMin),
      endTime: isoFromDateAndMinutes(newDate, endMin),
    });
  };

  const onEndChange = (value: string) => {
    const min = hhmmToMinutes(value);
    if (min === null) return;
    const clamped = Math.min(
      DAY_END_MINUTE,
      Math.max(min, startMin + MIN_EVENT_MINUTES),
    );
    updateEvent(event.id, {
      endTime: isoFromDateAndMinutes(date, clamped),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onPointerDown={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-start gap-2">
          <input
            autoFocus
            value={event.title}
            onChange={(e) => updateEvent(event.id, { title: e.target.value })}
            placeholder="Event title"
            className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1 text-base font-medium text-[var(--fg)] placeholder:text-[var(--muted)] focus:bg-[var(--hover)] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          >
            <IconClose width={15} height={15} />
          </button>
        </div>

        {/* Time range */}
        <div className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="time"
            step={MIN_EVENT_MINUTES * 60}
            value={minutesToHHMM(startMin)}
            onChange={(e) => onStartChange(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-[var(--fg)] focus:outline-none"
          />
          <span className="text-[var(--muted)]">→</span>
          <input
            type="time"
            step={MIN_EVENT_MINUTES * 60}
            value={minutesToHHMM(endMin)}
            onChange={(e) => onEndChange(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-[var(--fg)] focus:outline-none"
          />
        </div>

        {/* Date — move the block to another day (the date input is a calendar). */}
        <div className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) moveToDate(e.target.value as DateOnly);
            }}
            className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-[var(--fg)] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => moveToDate(toDateOnly(addDays(parseISO(date), 1)))}
            title="Move to the next day"
            className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          >
            Next day →
          </button>
        </div>

        {/* Category — selecting changes the event color. */}
        <div className="mb-3">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            Category
          </span>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const selected = c.id === event.categoryId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => updateEvent(event.id, { categoryId: c.id })}
                  title={c.name}
                  className={[
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    selected
                      ? "border-[var(--fg)] text-[var(--fg)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]",
                  ].join(" ")}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: c.colorCode }}
                  />
                  {c.name}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setManageOpen(true)}
              title="Add or edit categories"
              className="flex items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
            >
              <IconPlus width={12} height={12} />
              New
            </button>
          </div>
        </div>

        {/* Notes — rich text. ⌘B bolds the selection, ⌘K inserts a link. */}
        <div className="mb-3">
          <RichNotes eventId={event.id} initialHtml={event.notes} />
          <p className="mt-1 px-0.5 text-[11px] text-[var(--muted)]">
            ⌘B bold · ⌘K link · ⌘-click a link to open
          </p>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              deleteEvent(event.id);
              onClose();
            }}
            className="rounded-md px-2.5 py-1 text-xs text-red-500 transition-colors hover:bg-red-500/10"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white"
          >
            Done
          </button>
        </div>
      </motion.div>

      {manageOpen && (
        <CategoryManager autoCreate onClose={() => setManageOpen(false)} />
      )}
    </div>
  );
}

/**
 * WYSIWYG notes editor. Stores HTML in `event.notes`. Uncontrolled so the
 * caret never jumps: we seed innerHTML once per event and only read back out.
 * ⌘B / Ctrl+B toggles bold; ⌘K / Ctrl+K wraps the selection in a link.
 */
function RichNotes({
  eventId,
  initialHtml,
}: {
  eventId: string;
  initialHtml: string;
}) {
  const updateEvent = useStore((s) => s.updateEvent);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialHtml ?? "";
    // Re-seed only when switching to a different event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const save = () => updateEvent(eventId, { notes: ref.current?.innerHTML ?? "" });

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const key = e.key.toLowerCase();
    if (key === "b") {
      e.preventDefault();
      document.execCommand("bold");
      save();
    } else if (key === "k") {
      e.preventDefault();
      const raw = window.prompt("Link URL");
      if (raw) {
        const href = /^[a-z][\w+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
        // If nothing is selected, drop the URL in as its own link text.
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          document.execCommand("insertHTML", false, `<a href="${href}">${href}</a>`);
        } else {
          document.execCommand("createLink", false, href);
        }
        save();
      }
    }
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest("a");
    if (anchor && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void openExternal(anchor.getAttribute("href") ?? undefined);
    }
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      data-placeholder="Add notes…"
      onInput={save}
      onBlur={save}
      onKeyDown={onKeyDown}
      onClickCapture={onClickCapture}
      className="notes-editor max-h-56 min-h-[5rem] w-full overflow-y-auto rounded-md bg-[var(--hover)] px-2.5 py-2 text-sm leading-relaxed text-[var(--fg)] focus:outline-none"
    />
  );
}
