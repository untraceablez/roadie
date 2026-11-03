import { describe, expect, it } from "vitest";
import { dedupe, dedupeKey } from "../src/dedupe.js";
import type { Show } from "../src/types.js";

const base: Show = {
  id: "1",
  source: "ticketmaster",
  artists: ["The National"],
  venue: "Red Rocks Amphitheatre",
  city: "Morrison",
  startsAt: new Date("2026-12-05T02:00:00Z"),
  genres: ["indie"],
  url: "https://example.com/1",
};

describe("dedupe", () => {
  it("collapses the same show across sources despite punctuation/case", () => {
    const other: Show = {
      ...base,
      id: "2",
      source: "bandsintown",
      artists: ["the national"],
      venue: "Red Rocks Amphitheatre!",
    };
    expect(dedupeKey(base)).toBe(dedupeKey(other));
    expect(dedupe([base, other])).toHaveLength(1);
  });

  it("keeps shows on different days", () => {
    const next = { ...base, startsAt: new Date("2026-12-06T02:00:00Z") };
    expect(dedupe([base, next])).toHaveLength(2);
  });
});
