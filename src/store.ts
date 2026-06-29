import { create } from "zustand";
import { addDays, parseISO } from "date-fns";
import { load, type Store } from "@tauri-apps/plugin-store";

import { DEFAULT_CATEGORY_ID } from "./constants";
import {
  toDateOnly,
  type AppState,
  type Category,
  type CalendarEvent,
  type CurrentView,
  type DateOnly,
  type Habit,
  type ISOTimestamp,
  type Meal,
  type Task,
  type Theme,
} from "./types";

// ---------------------------------------------------------------------------
// §8.3 Seed / first-run state
// ---------------------------------------------------------------------------

const SEED_CATEGORIES: Category[] = [
  { id: "cat-uncategorized", name: "Uncategorized", colorCode: "#9CA3AF" },
  { id: "cat-work", name: "Work", colorCode: "#A8C7FA" },
  { id: "cat-personal", name: "Personal", colorCode: "#C4B5FD" },
  { id: "cat-health", name: "Health", colorCode: "#A7F3D0" },
];

function createSeedState(): AppState {
  return {
    events: [],
    tasks: [],
    meals: [],
    habits: [
      { id: crypto.randomUUID(), title: "Read", completionDates: [] },
      { id: crypto.randomUUID(), title: "Exercise", completionDates: [] },
      { id: crypto.randomUUID(), title: "Hydrate", completionDates: [] },
    ],
    categories: SEED_CATEGORIES.map((c) => ({ ...c })),
    currentView: "daily",
    selectedDate: toDateOnly(new Date()),
    leftSidebarOpen: true,
    rightSidebarOpen: true,
    theme: "light",
  };
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

type Actions = {
  // lifecycle
  hydrate: () => Promise<void>;

  // CalendarEvent CRUD
  addEvent: (input: {
    title: string;
    notes?: string;
    startTime: ISOTimestamp;
    endTime: ISOTimestamp;
    categoryId?: string;
  }) => string;
  updateEvent: (
    id: string,
    patch: Partial<Omit<CalendarEvent, "id">>,
  ) => void;
  deleteEvent: (id: string) => void;

  // Task CRUD
  addTask: (input: {
    title: string;
    scheduledFor: DateOnly;
    categoryId?: string;
    isCompleted?: boolean;
  }) => string;
  updateTask: (id: string, patch: Partial<Omit<Task, "id">>) => void;
  toggleTask: (id: string) => void;
  moveTaskToTomorrow: (id: string) => void;
  /** Manual reorder: move `activeId` to `overId`'s position in the task array. */
  reorderTasks: (activeId: string, overId: string) => void;
  deleteTask: (id: string) => void;

  // Meal CRUD
  addMeal: (input: {
    date: DateOnly;
    time?: string;
    food?: string;
  }) => string;
  updateMeal: (id: string, patch: Partial<Omit<Meal, "id">>) => void;
  deleteMeal: (id: string) => void;

  // Habit CRUD
  addHabit: (title: string) => string;
  updateHabit: (id: string, patch: Partial<Omit<Habit, "id">>) => void;
  toggleHabitCompletion: (habitId: string, date: DateOnly) => void;
  deleteHabit: (id: string) => void;

  // Category CRUD (with §8.4 referential integrity)
  addCategory: (input: { name: string; colorCode: string }) => string;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id">>) => void;
  deleteCategory: (id: string) => void;

  // UI / view state
  setCurrentView: (view: CurrentView) => void;
  setSelectedDate: (date: DateOnly) => void;
  setLeftSidebarOpen: (open: boolean) => void;
  toggleLeftSidebar: () => void;
  setRightSidebarOpen: (open: boolean) => void;
  toggleRightSidebar: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

/** Transient (non-persisted) flags layered on top of the persisted AppState. */
type Transient = {
  /** True once the store has loaded from disk (or fallen back to seed). */
  hydrated: boolean;
};

export type StoreState = AppState & Transient & Actions;

// ---------------------------------------------------------------------------
// Persistence (§9)
// ---------------------------------------------------------------------------

const STORE_FILE = "app-state.json";
const STORE_KEY = "appState";
const SAVE_DEBOUNCE_MS = 400;

let storeHandle: Store | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let persistenceEnabled = false;

/** Extract only the serializable AppState slice; never persist transient UI/actions. */
function pickAppState(s: StoreState): AppState {
  return {
    events: s.events,
    tasks: s.tasks,
    meals: s.meals,
    habits: s.habits,
    categories: s.categories,
    currentView: s.currentView,
    selectedDate: s.selectedDate,
    leftSidebarOpen: s.leftSidebarOpen,
    rightSidebarOpen: s.rightSidebarOpen,
    theme: s.theme,
  };
}

/** Minimal structural validation so a corrupt file falls back to seed. */
function isValidAppState(v: unknown): v is AppState {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const arrays = ["events", "tasks", "meals", "habits", "categories"];
  if (!arrays.every((k) => Array.isArray(o[k]))) return false;
  if (o.currentView !== "daily" && o.currentView !== "weekly" && o.currentView !== "monthly")
    return false;
  if (typeof o.selectedDate !== "string") return false;
  if (typeof o.leftSidebarOpen !== "boolean") return false;
  if (typeof o.rightSidebarOpen !== "boolean") return false;
  if (o.theme !== "light" && o.theme !== "dark") return false;
  return true;
}

function scheduleSave() {
  if (!persistenceEnabled || !storeHandle) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void persistNow();
  }, SAVE_DEBOUNCE_MS);
}

async function persistNow() {
  if (!storeHandle) return;
  try {
    const slice = pickAppState(useStore.getState());
    await storeHandle.set(STORE_KEY, slice);
    await storeHandle.save();
  } catch (err) {
    console.error("[planner] failed to persist state:", err);
  }
}

/**
 * Persistence hardening (§9): if the app is closing/hiding within the debounce
 * window, flush the pending write immediately so the last change isn't lost.
 */
function flushPendingSave() {
  if (!persistenceEnabled || !storeHandle) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  void persistNow();
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushPendingSave);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingSave();
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStore = create<StoreState>((set, get) => ({
  ...createSeedState(),
  hydrated: false,

  hydrate: async () => {
    // Idempotent: never re-hydrate once done.
    if (get().hydrated) return;
    try {
      storeHandle = await load(STORE_FILE, { defaults: {}, autoSave: false });
      const persisted = await storeHandle.get<unknown>(STORE_KEY);
      if (isValidAppState(persisted)) {
        set({ ...persisted });
      } else {
        // Absent or corrupt: keep seed state and write it as the baseline.
        const seed = pickAppState(get());
        await storeHandle.set(STORE_KEY, seed);
        await storeHandle.save();
      }
      persistenceEnabled = true;
    } catch (err) {
      // Not running under Tauri (e.g. plain browser) or store unavailable.
      // Fall back to in-memory seed state; the app stays runnable.
      console.warn("[planner] persistence unavailable, using in-memory state:", err);
      persistenceEnabled = false;
    } finally {
      set({ hydrated: true });
    }
  },

  // ----- CalendarEvent -----
  addEvent: (input) => {
    const id = crypto.randomUUID();
    const event: CalendarEvent = {
      id,
      title: input.title,
      notes: input.notes ?? "",
      startTime: input.startTime,
      endTime: input.endTime,
      categoryId: input.categoryId ?? DEFAULT_CATEGORY_ID,
    };
    set((s) => ({ events: [...s.events, event] }));
    return id;
  },
  updateEvent: (id, patch) =>
    set((s) => ({
      events: s.events.map((e) => (e.id === id ? { ...e, ...patch, id } : e)),
    })),
  deleteEvent: (id) =>
    set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

  // ----- Task -----
  addTask: (input) => {
    const id = crypto.randomUUID();
    const task: Task = {
      id,
      title: input.title,
      isCompleted: input.isCompleted ?? false,
      scheduledFor: input.scheduledFor,
      categoryId: input.categoryId ?? DEFAULT_CATEGORY_ID,
    };
    set((s) => ({ tasks: [...s.tasks, task] }));
    return id;
  },
  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, id } : t)),
    })),
  toggleTask: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, isCompleted: !t.isCompleted } : t,
      ),
    })),
  moveTaskToTomorrow: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? { ...t, scheduledFor: toDateOnly(addDays(parseISO(t.scheduledFor), 1)) }
          : t,
      ),
    })),
  reorderTasks: (activeId, overId) =>
    set((s) => {
      const from = s.tasks.findIndex((t) => t.id === activeId);
      const to = s.tasks.findIndex((t) => t.id === overId);
      if (from === -1 || to === -1 || from === to) return {};
      const next = s.tasks.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { tasks: next };
    }),
  deleteTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  // ----- Meal -----
  addMeal: (input) => {
    const id = crypto.randomUUID();
    set((s) => {
      const maxOrder = s.meals
        .filter((m) => m.date === input.date)
        .reduce((mx, m) => Math.max(mx, m.order), -1);
      const meal: Meal = {
        id,
        date: input.date,
        time: input.time ?? "",
        food: input.food ?? "",
        order: maxOrder + 1,
      };
      return { meals: [...s.meals, meal] };
    });
    return id;
  },
  updateMeal: (id, patch) =>
    set((s) => ({
      meals: s.meals.map((m) => (m.id === id ? { ...m, ...patch, id } : m)),
    })),
  deleteMeal: (id) =>
    set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),

  // ----- Habit -----
  addHabit: (title) => {
    const id = crypto.randomUUID();
    const habit: Habit = { id, title, completionDates: [] };
    set((s) => ({ habits: [...s.habits, habit] }));
    return id;
  },
  updateHabit: (id, patch) =>
    set((s) => ({
      habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch, id } : h)),
    })),
  toggleHabitCompletion: (habitId, date) =>
    set((s) => ({
      habits: s.habits.map((h) => {
        if (h.id !== habitId) return h;
        const has = h.completionDates.includes(date);
        return {
          ...h,
          completionDates: has
            ? h.completionDates.filter((d) => d !== date)
            : [...h.completionDates, date],
        };
      }),
    })),
  deleteHabit: (id) =>
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

  // ----- Category (§8.4) -----
  addCategory: (input) => {
    const id = crypto.randomUUID();
    const category: Category = {
      id,
      name: input.name,
      colorCode: input.colorCode,
    };
    set((s) => ({ categories: [...s.categories, category] }));
    return id;
  },
  updateCategory: (id, patch) =>
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, ...patch, id } : c,
      ),
    })),
  deleteCategory: (id) => {
    // 'cat-uncategorized' can never be deleted.
    if (id === DEFAULT_CATEGORY_ID) return;
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      // Reassign any record referencing the deleted category to the default.
      tasks: s.tasks.map((t) =>
        t.categoryId === id ? { ...t, categoryId: DEFAULT_CATEGORY_ID } : t,
      ),
      events: s.events.map((e) =>
        e.categoryId === id ? { ...e, categoryId: DEFAULT_CATEGORY_ID } : e,
      ),
    }));
  },

  // ----- UI / view state -----
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
  toggleRightSidebar: () =>
    set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
}));

// ---------------------------------------------------------------------------
// Debounced save subscription (§9). Persist only the AppState slice, only
// after hydration, and only when persistence is available.
// ---------------------------------------------------------------------------

let lastSlice: AppState | null = null;

useStore.subscribe((state) => {
  if (!state.hydrated || !persistenceEnabled) return;
  const slice = pickAppState(state);
  // Skip if nothing in the persisted slice actually changed.
  if (lastSlice && shallowEqualAppState(lastSlice, slice)) return;
  lastSlice = slice;
  scheduleSave();
});

function shallowEqualAppState(a: AppState, b: AppState): boolean {
  return (
    a.events === b.events &&
    a.tasks === b.tasks &&
    a.meals === b.meals &&
    a.habits === b.habits &&
    a.categories === b.categories &&
    a.currentView === b.currentView &&
    a.selectedDate === b.selectedDate &&
    a.leftSidebarOpen === b.leftSidebarOpen &&
    a.rightSidebarOpen === b.rightSidebarOpen &&
    a.theme === b.theme
  );
}

// ---------------------------------------------------------------------------
// Derived selectors
// ---------------------------------------------------------------------------

/** §3.1 — Right sidebar visibility is DERIVED, never stored as independent truth. */
export const selectRightSidebarVisible = (s: StoreState): boolean =>
  s.currentView === "daily" && s.rightSidebarOpen;
