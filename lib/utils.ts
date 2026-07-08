import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Chrome's print header/footer (date + URL) can't be suppressed from CSS —
// only the user's own "Headers and footers" print-dialog toggle controls it.
// What we CAN control is document.title, which Chrome uses as the header
// text — swap the generic app title for something meaningful for the
// duration of the print job, then restore it once the dialog closes.
export function printWithTitle(title: string) {
  const original = document.title
  document.title = title
  const restore = () => { document.title = original; window.removeEventListener("afterprint", restore) }
  window.addEventListener("afterprint", restore)
  window.print()
}

// Seconds -> "Xh YYm" (or "YYm" under an hour). Used for active-time display.
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`
}

// Short relative time, e.g. "just now", "5m ago", "3h ago", "2d ago".
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ""
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ""
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 45) return "just now"
  if (s < 90) return "1m ago"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}w ago`
  return `${Math.floor(d / 30)}mo ago`
}
