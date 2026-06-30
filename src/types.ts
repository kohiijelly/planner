import { format } from "date-fns";

// §8.1 — Date conventions. Two and only two string shapes, branded so they
// can never be mixed. All times are LOCAL wall-clock: never UTC, never 'Z',
// never offsets.

/** Calendar date only, format 'YYYY-MM-DD' (local wall date, no time, no zone). */
export type DateOnly = string & { readonly __brand: "DateOnly" };

/** Full ISO 8601 LOCAL wall-clock timestamp 'YYYY-MM-DDTHH:mm:ss' (NO 'Z', NO offset). */
export type ISOTimestamp = string & { readonly __brand: "ISOTimestamp" };

/** The one and only place the DateOnly brand is applied. */
export function toDateOnly(d: Date): DateOnly {
  return format(d, "yyyy-MM-dd") as DateOnly;
}

/** The one and only place the ISOTimestamp brand is applied. */
export function toISOTimestamp(d: Date): ISOTimestamp {
  return format(d, "yyyy-MM-dd'T'HH:mm:ss") as ISOTimestamp;
}

// §8.2 — Interfaces

export type Category = {
  id: string;
  name: string;
  colorCode: string; // hex, e.g. '#A8C7FA'
};

export type CalendarEvent = {
  id: string;
  title: string;
  notes: string;
  startTime: ISOTimestamp;
  endTime: ISOTimestamp; // same calendar day as startTime (see §6.3)
  categoryId: string;
};

export type Task = {
  id: string;
  title: string;
  isCompleted: boolean;
  scheduledFor: DateOnly;
  categoryId: string;
};

export type Meal = {
  id: string;
  date: DateOnly;
  time: string; // free text: "08:00 AM", "Lunch", etc. NOT sortable
  food: string;
  order: number; // sort key within a day, ascending
};

export type Habit = {
  id: string;
  title: string;
  completionDates: DateOnly[];
};

export type CurrentView = "daily" | "weekly" | "monthly";
export type Theme = "light" | "dark";

export type AppState = {
  events: CalendarEvent[];
  tasks: Task[];
  meals: Meal[];
  habits: Habit[];
  categories: Category[];
  currentView: CurrentView;
  selectedDate: DateOnly;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean; // user preference; actual visibility is DERIVED (§3.1)
  theme: Theme;

  // Right-sidebar layout preferences (user-adjustable).
  rightSidebarWidth: number; // px
  tasksCollapsed: boolean;
  mealsCollapsed: boolean;
  habitsCollapsed: boolean;
  mealsHeight: number; // px, used when Meals is a fixed (non-filler) section
  habitsHeight: number; // px, used when Habits is a fixed (non-filler) section
};

export type RightSection = "tasks" | "meals" | "habits";
