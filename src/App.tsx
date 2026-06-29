import { useEffect } from "react";

import { AppShell } from "./components/AppShell";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { useStore } from "./store";

function App() {
  const hydrated = useStore((s) => s.hydrated);
  const hydrate = useStore((s) => s.hydrate);
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Apply the theme token set to the document root (§2 — CSS variables).
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (!hydrated) {
    return <LoadingSkeleton />;
  }

  return <AppShell />;
}

export default App;
