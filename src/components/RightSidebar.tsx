// §5 — Daily Command Center. Three stacked sections (Tasks, Meals, Habits) that
// the user can collapse/expand and vertically resize. The top-most EXPANDED
// section is the flexible "filler" (it absorbs leftover height and scrolls);
// sections below it have user-adjustable fixed heights with a drag handle.

import { useRef, type ReactNode } from "react";

import { useStore } from "../store";
import type { RightSection } from "../types";
import { IconChevronDown } from "./icons";
import { HabitsChunk } from "./habits/HabitsChunk";
import { MealsChunk } from "./meals/MealsChunk";
import { TasksChunk } from "./tasks/TasksChunk";

const ORDER: RightSection[] = ["tasks", "meals", "habits"];
const TITLES: Record<RightSection, string> = {
  tasks: "Tasks",
  meals: "Meals",
  habits: "Habits",
};

export function RightSidebar() {
  const tasksCollapsed = useStore((s) => s.tasksCollapsed);
  const mealsCollapsed = useStore((s) => s.mealsCollapsed);
  const habitsCollapsed = useStore((s) => s.habitsCollapsed);
  const mealsHeight = useStore((s) => s.mealsHeight);
  const habitsHeight = useStore((s) => s.habitsHeight);
  const toggleSection = useStore((s) => s.toggleSection);

  const collapsed: Record<RightSection, boolean> = {
    tasks: tasksCollapsed,
    meals: mealsCollapsed,
    habits: habitsCollapsed,
  };
  const heights: Record<RightSection, number> = {
    tasks: 0, // tasks is the filler whenever expanded, so it has no fixed height
    meals: mealsHeight,
    habits: habitsHeight,
  };

  // The first expanded section (top-down) becomes the flexible filler.
  const fillerKey = ORDER.find((k) => !collapsed[k]) ?? null;

  return (
    <div className="flex h-full w-full flex-col bg-[var(--panel)]">
      {ORDER.map((key, idx) => {
        const isFiller = key === fillerKey;
        const isCollapsed = collapsed[key];
        // Resize handle on a non-filler, expanded Meals/Habits section.
        const resizable = !isFiller && !isCollapsed && key !== "tasks";

        return (
          <SectionPanel
            key={key}
            title={TITLES[key]}
            collapsed={isCollapsed}
            onToggle={() => toggleSection(key)}
            bordered={idx > 0}
            filler={isFiller && !isCollapsed}
            height={!isFiller && !isCollapsed ? heights[key] : undefined}
            resizeSection={resizable ? (key as "meals" | "habits") : undefined}
          >
            {key === "tasks" ? (
              <TasksChunk />
            ) : key === "meals" ? (
              <MealsChunk />
            ) : (
              <HabitsChunk />
            )}
          </SectionPanel>
        );
      })}
    </div>
  );
}

function SectionPanel({
  title,
  collapsed,
  onToggle,
  bordered,
  filler,
  height,
  resizeSection,
  children,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  bordered: boolean;
  filler: boolean;
  height?: number;
  resizeSection?: "meals" | "habits";
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "relative flex flex-col",
        bordered ? "border-t border-[var(--border)]" : "",
        filler ? "min-h-0 flex-1" : "flex-shrink-0",
      ].join(" ")}
      style={!filler && !collapsed && height != null ? { height } : undefined}
    >
      {resizeSection && <ResizeDivider section={resizeSection} />}

      <button
        type="button"
        onClick={onToggle}
        className="flex flex-shrink-0 items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
      >
        <IconChevronDown
          width={13}
          height={13}
          className={collapsed ? "-rotate-90 transition-transform" : "transition-transform"}
        />
        {title}
      </button>

      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      )}
    </div>
  );
}

/** Draggable divider that resizes the section directly below it (its own section). */
function ResizeDivider({ section }: { section: "meals" | "habits" }) {
  const height = useStore((s) => (section === "meals" ? s.mealsHeight : s.habitsHeight));
  const setSectionHeight = useStore((s) => s.setSectionHeight);
  const start = useRef<{ y: number; h: number } | null>(null);

  return (
    <div
      onPointerDown={(e) => {
        start.current = { y: e.clientY, h: height };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        // Dragging up grows the section; dragging down shrinks it.
        setSectionHeight(section, start.current.h + (start.current.y - e.clientY));
      }}
      onPointerUp={(e) => {
        start.current = null;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }}
      className="group absolute -top-1.5 left-0 right-0 z-20 flex h-3 cursor-row-resize touch-none items-center justify-center"
    >
      <div className="h-0.5 w-8 rounded-full bg-transparent transition-colors group-hover:bg-[var(--muted)]" />
    </div>
  );
}
