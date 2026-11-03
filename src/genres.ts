/** Canonical genre list. Providers map these to their own taxonomy. */
export const GENRES = [
  "rock",
  "metal",
  "punk",
  "indie",
  "pop",
  "hip-hop",
  "electronic",
  "jazz",
  "blues",
  "country",
  "folk",
  "classical",
  "r&b",
  "reggae",
  "latin",
] as const;

export type Genre = (typeof GENRES)[number];

export function isGenre(value: string): value is Genre {
  return (GENRES as readonly string[]).includes(value);
}

/** Free-text aliases seen in provider data -> canonical genre. */
const ALIASES: Record<string, Genre> = {
  "hip hop": "hip-hop",
  "hip-hop/rap": "hip-hop",
  rap: "hip-hop",
  "alternative rock": "rock",
  alternative: "indie",
  "hard rock": "rock",
  hardcore: "punk",
  "punk rock": "punk",
  edm: "electronic",
  dance: "electronic",
  "r&b/soul": "r&b",
  rnb: "r&b",
  soul: "r&b",
  "heavy metal": "metal",
};

export function normalizeGenre(raw: string): Genre | undefined {
  const key = raw.trim().toLowerCase();
  if (isGenre(key)) return key;
  return ALIASES[key];
}
