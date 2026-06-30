import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { MIN_EVENT_MINUTES } from "../constants";
import {
  DAY_END_MINUTE,
  isoFromDateAndMinutes,
  minutesOfDay,
} from "../lib/time";
import { useStore } from "../store";
import type { DateOnly } from "../types";
import { CategoryManager } from "./CategoryManager";
import { Markdown } from "./Markdown";
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
  const [notesMode, setNotesMode] = useState<"write" | "preview">("write");

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

        {/* Notes — markdown supported. Switch to Preview for clickable links. */}
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Notes
            </span>
            <div className="flex items-center gap-0.5 rounded-md bg-[var(--hover)] p-0.5 text-xs">
              {(["write", "preview"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setNotesMode(mode)}
                  className={[
                    "rounded px-2 py-0.5 capitalize transition-colors",
                    notesMode === mode
                      ? "bg-[var(--panel)] text-[var(--fg)] shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--fg)]",
                  ].join(" ")}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {notesMode === "write" ? (
            <textarea
              value={event.notes}
              onChange={(e) => updateEvent(event.id, { notes: e.target.value })}
              placeholder="Add notes… (markdown: **bold**, [link](https://…), - lists)"
              rows={4}
              className="w-full resize-y rounded-md bg-[var(--hover)] px-2 py-1.5 font-mono text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none"
            />
          ) : event.notes.trim() ? (
            <div className="max-h-48 min-h-[3.5rem] overflow-y-auto rounded-md bg-[var(--hover)] px-2.5 py-2">
              <Markdown source={event.notes} />
            </div>
          ) : (
            <div className="min-h-[3.5rem] rounded-md bg-[var(--hover)] px-2.5 py-2 text-sm text-[var(--muted)]">
              Nothing to preview.
            </div>
          )}
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
