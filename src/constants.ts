// §7 — Constants. Define once, import everywhere.

/** Vertical scale of the time grid: pixels per hour (1 minute = HOUR_HEIGHT/60 px). */
export const HOUR_HEIGHT = 64;

/** Snap increment, in minutes, for create/resize interactions. */
export const SNAP_MINUTES = 15;

/** Minimum event duration, in minutes. Resizing below this clamps to it. */
export const MIN_EVENT_MINUTES = 15;

/** Week start passed to all date-fns week functions. 1 = Monday. */
export const WEEK_STARTS_ON = 1 as const;

/** Fallback category for any creation flow that doesn't specify one. Never deletable. */
export const DEFAULT_CATEGORY_ID = "cat-uncategorized";
