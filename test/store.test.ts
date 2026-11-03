import { describe, expect, it } from "vitest";
import { Store } from "../src/db/index.js";

describe("Store", () => {
  it("round-trips guild config and tracks seen shows", () => {
    const s = new Store(":memory:");
    s.upsertGuild({
      guildId: "g",
      channelId: "c",
      genres: ["rock"],
      lat: 1,
      lng: 2,
      radiusKm: 50,
      place: "X",
      digestDay: 1,
    });
    s.setGenres("g", ["rock", "punk"]);
    expect(s.getGuild("g")).toMatchObject({
      genres: ["rock", "punk"],
      seeded: false,
    });

    expect(s.hasSeen("g", "k")).toBe(false);
    s.markSeen("g", "k");
    expect(s.hasSeen("g", "k")).toBe(true);

    s.addWatch("g", "Wilco");
    expect(s.removeWatch("g", "wilco")).toBe(true);
    expect(s.watchlist("g")).toEqual([]);
  });
});
