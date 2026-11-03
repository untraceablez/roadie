import type { Show, ShowProvider } from "../types.js";
import { getJson } from "./http.js";

interface BitEvent {
  id: string;
  url: string;
  datetime: string;
  venue: { name: string; city: string };
  lineup: string[];
  offers?: { url: string }[];
}

/** Bandsintown's public API is artist-keyed only, so it powers the watchlist, not area search. */
export class BandsintownProvider implements ShowProvider {
  readonly name = "bandsintown";
  constructor(private appId: string) {}

  async search(): Promise<Show[]> {
    return [];
  }

  async byArtist(artist: string, from: Date, to: Date): Promise<Show[]> {
    const range = `${from.toISOString().slice(0, 10)},${to.toISOString().slice(0, 10)}`;
    const url =
      `https://rest.bandsintown.com/artists/${encodeURIComponent(artist)}/events` +
      `?app_id=${encodeURIComponent(this.appId)}&date=${range}`;
    const events = await getJson<BitEvent[] | { errorMessage?: string }>(url);
    if (!Array.isArray(events)) return [];
    return events.map((e) => ({
      id: e.id,
      source: "bandsintown",
      artists: e.lineup.length ? e.lineup : [artist],
      venue: e.venue.name,
      city: e.venue.city,
      startsAt: new Date(
        e.datetime.endsWith("Z") ? e.datetime : `${e.datetime}Z`,
      ),
      genres: [],
      url: e.url,
      ticketUrl: e.offers?.[0]?.url,
    }));
  }
}
