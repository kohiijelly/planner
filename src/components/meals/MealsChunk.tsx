import { useMemo } from "react";

import { useStore } from "../../store";
import type { Meal } from "../../types";
import { IconClose, IconPlus } from "../icons";

export function MealsChunk() {
  const selectedDate = useStore((s) => s.selectedDate);
  const meals = useStore((s) => s.meals);
  const addMeal = useStore((s) => s.addMeal);

  // Filtered to selectedDate, sorted by `order` ascending — NEVER by the
  // free-text time string (§5.2).
  const dayMeals = useMemo(
    () =>
      meals
        .filter((m) => m.date === selectedDate)
        .sort((a, b) => a.order - b.order),
    [meals, selectedDate],
  );

  const appendRow = () => addMeal({ date: selectedDate });

  return (
    <>
      {dayMeals.length > 0 && (
        <ul className="flex flex-col">
          {dayMeals.map((meal) => (
            <MealRow key={meal.id} meal={meal} onEnter={appendRow} />
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={appendRow}
        className="mt-1 flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
      >
        <IconPlus width={13} height={13} />
        {dayMeals.length === 0 ? "Add a meal for today" : "Add meal"}
      </button>
    </>
  );
}

function MealRow({ meal, onEnter }: { meal: Meal; onEnter: () => void }) {
  const updateMeal = useStore((s) => s.updateMeal);
  const deleteMeal = useStore((s) => s.deleteMeal);

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <li className="group flex items-center gap-2">
      <input
        value={meal.time}
        onChange={(e) => updateMeal(meal.id, { time: e.target.value })}
        onKeyDown={handleEnter}
        placeholder="Time"
        className="w-24 flex-shrink-0 rounded-md bg-transparent px-2 py-1.5 text-sm text-[var(--muted)] placeholder:text-[var(--muted)]/60 focus:bg-[var(--hover)] focus:outline-none"
      />
      <input
        value={meal.food}
        onChange={(e) => updateMeal(meal.id, { food: e.target.value })}
        onKeyDown={handleEnter}
        placeholder="Food"
        className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1.5 text-sm text-[var(--fg)] placeholder:text-[var(--muted)]/60 focus:bg-[var(--hover)] focus:outline-none"
      />
      <button
        type="button"
        onClick={() => deleteMeal(meal.id)}
        aria-label="Remove meal"
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[var(--muted)] opacity-0 transition-opacity hover:bg-[var(--hover)] hover:text-[var(--fg)] group-hover:opacity-100"
      >
        <IconClose width={13} height={13} />
      </button>
    </li>
  );
}
