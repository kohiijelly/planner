// §5 — Daily Command Center. Chunk 1 (Tasks) scrolls internally and absorbs
// overflow (flex-1, overflow-y-auto); Chunk 2 (Meals) and Chunk 3 (Habits) are
// pinned (flex-shrink-0).

import { HabitsChunk } from "./habits/HabitsChunk";
import { MealsChunk } from "./meals/MealsChunk";
import { TasksChunk } from "./tasks/TasksChunk";

export function RightSidebar() {
  return (
    <div className="flex h-full w-full flex-col bg-[var(--panel)]">
      <TasksChunk />
      <MealsChunk />
      <HabitsChunk />
    </div>
  );
}
