import type { Show } from "./types.js";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Stable key so the same show from different sources collapses to one. */
export function dedupeKey(show: Show): string {
  const headliner = norm(show.artists[0] ?? "");
  const venue = norm(show.venue);
  const day = show.startsAt.toISOString().slice(0, 10);
  return `${headliner}|${venue}|${day}`;
}

export function dedupe(shows: Show[]): Show[] {
  const seen = new Map<string, Show>();
  for (const s of shows) {
    const key = dedupeKey(s);
    if (!seen.has(key)) seen.set(key, s);
  }
  return [...seen.values()];
}
