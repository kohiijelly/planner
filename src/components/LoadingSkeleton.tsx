// §10 — Loading state: a brief, layout-shaped skeleton while the store
// hydrates from disk. Mirrors the three-pane shell so the first paint after
// hydration doesn't jump.

export function LoadingSkeleton() {
  return (
    <div
      className="flex h-full w-full overflow-hidden bg-[var(--bg)] text-[var(--fg)]"
      aria-busy="true"
      aria-label="Loading"
    >
      {/* Left rail */}
      <div className="flex w-[232px] flex-shrink-0 flex-col gap-2 border-r border-[var(--border)] bg-[var(--panel)] p-3">
        <div className="h-6 w-24 animate-pulse rounded bg-[var(--hover)]" />
        <div className="mt-2 h-9 animate-pulse rounded-lg bg-[var(--hover)]" />
        <div className="h-9 animate-pulse rounded-lg bg-[var(--hover)]" />
        <div className="h-9 animate-pulse rounded-lg bg-[var(--hover)]" />
      </div>

      {/* Center: faux time grid */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-[var(--border)] px-4">
          <div className="h-8 w-32 animate-pulse rounded bg-[var(--hover)]" />
        </div>
        <div className="relative flex-1 overflow-hidden p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="mb-6 h-px w-full bg-[var(--grid-line)]"
              style={{ opacity: 1 - i * 0.06 }}
            />
          ))}
        </div>
      </div>

      {/* Right command center */}
      <div className="flex w-[340px] flex-shrink-0 flex-col gap-3 border-l border-[var(--border)] bg-[var(--panel)] p-4">
        <div className="h-4 w-16 animate-pulse rounded bg-[var(--hover)]" />
        <div className="h-8 animate-pulse rounded bg-[var(--hover)]" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-[var(--hover)]" />
        <div className="mt-auto h-20 animate-pulse rounded bg-[var(--hover)]" />
      </div>
    </div>
  );
}
