/** Open a URL in the system browser (Tauri), falling back to window.open in a plain browser. */
export async function openExternal(url?: string): Promise<void> {
  if (!url) return;
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
