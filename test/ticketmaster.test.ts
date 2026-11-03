import { describe, expect, it } from "vitest";
import { parseTmEvent } from "../src/providers/ticketmaster.js";

describe("parseTmEvent", () => {
  it("maps a Ticketmaster event to a Show with canonical genres", () => {
    const show = parseTmEvent({
      id: "abc",
      name: "Tour Night",
      url: "https://tm.example/abc",
      images: [
        { url: "small.jpg", width: 100 },
        { url: "big.jpg", width: 900 },
      ],
      dates: { start: { dateTime: "2026-11-20T03:00:00Z" } },
      classifications: [
        {
          genre: { name: "Hip-Hop/Rap" },
          subGenre: { name: "Alternative Rock" },
        },
      ],
      _embedded: {
        venues: [{ name: "The Venue", city: { name: "Austin" } }],
        attractions: [{ name: "Headliner" }, { name: "Opener" }],
      },
    });
    expect(show).toMatchObject({
      source: "ticketmaster",
      artists: ["Headliner", "Opener"],
      venue: "The Venue",
      city: "Austin",
      imageUrl: "big.jpg",
    });
    expect(show?.genres.sort()).toEqual(["hip-hop", "rock"]);
  });

  it("skips events without a date", () => {
    expect(
      parseTmEvent({ id: "x", name: "TBA", url: "u", dates: {} }),
    ).toBeUndefined();
  });
});
