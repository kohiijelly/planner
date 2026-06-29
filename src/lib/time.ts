import { addMinutes, parseISO } from "date-fns";

import {
  HOUR_HEIGHT,
  MIN_EVENT_MINUTES,
  SNAP_MINUTES,
} from "../constants";
import { toISOTimestamp, type DateOnly, type ISOTimestamp } from "../types";

/** Total minutes in a day. */
export const MINUTES_PER_DAY = 24 * 60;

/** Latest legal end-of-day minute per §6.3 (events clamp to 23:59 of start day). */
export const DAY_END_MINUTE = 24 * 60 - 1; // 23:59

/** Full pixel height of the 24h column. */
export const DAY_HEIGHT = MINUTES_PER_DAY * (HOUR_HEIGHT / 60); // 1536

// §6.1 — Coordinate ↔ time conversion.

export function yToMinutes(y: number): number {
  return Math.round((y / HOUR_HEIGHT) * 60);
}

export function minutesToY(min: number): number {
  return (min / 60) * HOUR_HEIGHT;
}

/** Snap to SNAP_MINUTES (15-min) increments. */
export function snapMinutes(min: number): number {
  return Math.round(min / SNAP_MINUTES) * SNAP_MINUTES;
}

/** Clamp a minute-of-day into the legal [0, MINUTES_PER_DAY] range. */
export function clampMinute(min: number): number {
  return Math.max(0, Math.min(MINUTES_PER_DAY, min));
}

export { MIN_EVENT_MINUTES };

// Local wall-clock helpers (§8.1) bridging ISOTimestamp ↔ minute-of-day.

/** Minute offset from local midnight for a timestamp. */
export function minutesOfDay(iso: ISOTimestamp): number {
  const d = parseISO(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** The 'YYYY-MM-DD' calendar-date portion of a timestamp. */
export function dateOnlyOf(iso: ISOTimestamp): string {
  return iso.slice(0, 10);
}

/** Build a local wall-clock timestamp on `date` at `minutes` past midnight. */
export function isoFromDateAndMinutes(
  date: DateOnly,
  minutes: number,
): ISOTimestamp {
  const base = parseISO(date);
  return toISOTimestamp(addMinutes(base, minutes));
}
