import { motion } from "framer-motion";
import { useState } from "react";

import { useStore } from "../store";
import type { CurrentView } from "../types";
import { CategoryManager } from "./CategoryManager";
import {
  IconDaily,
  IconMonthly,
  IconMoon,
  IconPanelLeft,
  IconSun,
  IconTag,
  IconWeekly,
} from "./icons";

const VIEWS: { id: CurrentView; label: string; Icon: typeof IconDaily }[] = [
  { id: "daily", label: "Daily", Icon: IconDaily },
  { id: "weekly", label: "Weekly", Icon: IconWeekly },
  { id: "monthly", label: "Monthly", Icon: IconMonthly },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function LeftSidebar() {
  const open = useStore((s) => s.leftSidebarOpen);
  const toggle = useStore((s) => s.toggleLeftSidebar);
  const currentView = useStore((s) => s.currentView);
  const setView = useStore((s) => s.setCurrentView);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  const [categoriesOpen, setCategoriesOpen] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? 232 : 64 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--panel)]"
    >
      <div className="flex h-14 items-center justify-between px-3">
        {open && (
          <span className="truncate px-1 text-sm font-semibold tracking-tight">
            Planner
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
        >
          <IconPanelLeft />
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-2">
        {VIEWS.map(({ id, label, Icon }) => {
          const active = currentView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-pressed={active}
              title={label}
              className={[
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                active
                  ? "bg-[var(--active)] font-medium text-[var(--fg)]"
                  : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]",
                open ? "" : "justify-center px-0",
              ].join(" ")}
            >
              <Icon className="flex-shrink-0" />
              {open && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 p-2">
        <button
          type="button"
          onClick={() => setCategoriesOpen(true)}
          title="Categories"
          aria-label="Categories"
          className={[
            "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]",
            open ? "" : "justify-center px-0",
          ].join(" ")}
        >
          <IconTag className="flex-shrink-0" />
          {open && <span className="truncate">Categories</span>}
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          title="Toggle theme"
          aria-label="Toggle theme"
          className={[
            "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]",
            open ? "" : "justify-center px-0",
          ].join(" ")}
        >
          {theme === "light" ? (
            <IconMoon className="flex-shrink-0" />
          ) : (
            <IconSun className="flex-shrink-0" />
          )}
          {open && (
            <span className="truncate">
              {theme === "light" ? "Dark mode" : "Light mode"}
            </span>
          )}
        </button>
      </div>

      {categoriesOpen && (
        <CategoryManager onClose={() => setCategoriesOpen(false)} />
      )}
    </motion.aside>
  );
}
