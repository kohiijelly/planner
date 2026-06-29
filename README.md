# Planner

A minimalist desktop calendar & daily productivity app for macOS. 

## Stack

Tauri 2 · React 18 + TypeScript · Tailwind CSS · Zustand · Framer Motion · date-fns · dnd-kit. Local-only persistence via `@tauri-apps/plugin-store` (no cloud, no accounts).

## Develop

```bash
npm install
npm run tauri dev    # native desktop window with hot reload
```

## Build a macOS app

```bash
npm run tauri build
```

Artifacts land in `src-tauri/target/release/bundle/` (`.app` and `.dmg`).
