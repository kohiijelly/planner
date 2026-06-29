import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { DEFAULT_CATEGORY_ID } from "../constants";
import { useStore } from "../store";
import { IconClose, IconPlus } from "./icons";

// Preset pastel palette offered when choosing/creating a category color.
export const PASTEL_PALETTE = [
  "#A8C7FA",
  "#AECBFA",
  "#BFDBFE",
  "#C4B5FD",
  "#D8B4FE",
  "#E9D5FF",
  "#FBCFE8",
  "#F5B5D3",
  "#FCA5A5",
  "#FBB6A8",
  "#FDE68A",
  "#FCD34D",
  "#BBF7D0",
  "#A7F3D0",
  "#99F6E4",
];

/** Pick a palette color not already used; fall back to cycling if all are taken. */
function nextUnusedColor(used: string[]): string {
  const taken = new Set(used.map((c) => c.toLowerCase()));
  const free = PASTEL_PALETTE.find((c) => !taken.has(c.toLowerCase()));
  return free ?? PASTEL_PALETTE[used.length % PASTEL_PALETTE.length];
}

export function CategoryManager({
  onClose,
  autoCreate = false,
}: {
  onClose: () => void;
  /** When true, immediately add a fresh category on open (focused for naming). */
  autoCreate?: boolean;
}) {
  const categories = useStore((s) => s.categories);
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);

  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [paletteFor, setPaletteFor] = useState<string | null>(null);
  const didAutoCreate = useRef(false);

  const handleAdd = () => {
    const color = nextUnusedColor(
      useStore.getState().categories.map((c) => c.colorCode),
    );
    const id = addCategory({ name: "", colorCode: color });
    setJustAddedId(id);
  };

  useEffect(() => {
    if (autoCreate && !didAutoCreate.current) {
      didAutoCreate.current = true;
      handleAdd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onPointerDown={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Categories</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          >
            <IconClose width={15} height={15} />
          </button>
        </div>

        <ul className="flex flex-col gap-1.5">
          {categories.map((c) => {
            const locked = c.id === DEFAULT_CATEGORY_ID;
            const paletteOpen = paletteFor === c.id;
            return (
              <li key={c.id} className="group relative flex items-center gap-2">
                {/* Color swatch → opens the preset pastel palette */}
                <button
                  type="button"
                  onClick={() => setPaletteFor(paletteOpen ? null : c.id)}
                  className="h-6 w-6 flex-shrink-0 rounded-full border border-[var(--border)]"
                  style={{ backgroundColor: c.colorCode }}
                  title="Choose color"
                  aria-label="Choose color"
                />

                {paletteOpen && (
                  <div
                    className="absolute left-0 top-8 z-10 grid w-[208px] grid-cols-5 gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-2 shadow-xl"
                  >
                    {PASTEL_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          updateCategory(c.id, { colorCode: color });
                          setPaletteFor(null);
                        }}
                        className={[
                          "h-7 w-7 rounded-full border transition-transform hover:scale-110",
                          color.toLowerCase() === c.colorCode.toLowerCase()
                            ? "border-[var(--fg)]"
                            : "border-transparent",
                        ].join(" ")}
                        style={{ backgroundColor: color }}
                        aria-label={`Set color ${color}`}
                      />
                    ))}
                  </div>
                )}

                <input
                  autoFocus={c.id === justAddedId}
                  value={c.name}
                  onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                  placeholder="Category name"
                  className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1.5 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:bg-[var(--hover)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => deleteCategory(c.id)}
                  disabled={locked}
                  aria-label="Delete category"
                  title={
                    locked
                      ? "The default category can't be deleted"
                      : "Delete category"
                  }
                  className={[
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-opacity",
                    locked
                      ? "cursor-not-allowed text-[var(--muted)]/30"
                      : "text-[var(--muted)] opacity-0 hover:bg-[var(--hover)] hover:text-[var(--fg)] group-hover:opacity-100",
                  ].join(" ")}
                >
                  <IconClose width={13} height={13} />
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={handleAdd}
          className="mt-3 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
        >
          <IconPlus width={14} height={14} />
          Add category
        </button>

        <p className="mt-2 text-[11px] leading-snug text-[var(--muted)]">
          Deleting a category reassigns its tasks and events to “Uncategorized.”
        </p>
      </motion.div>
    </div>
  );
}
