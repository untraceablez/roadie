import { normalizeGenre } from "../genres.js";
import type { SearchQuery, Show, ShowProvider } from "../types.js";
import { getJson } from "./http.js";

interface TmEvent {
  id: string;
  name: string;
  url: string;
  images?: { url: string; width: number }[];
  dates?: { start?: { dateTime?: string; localDate?: string } };
  classifications?: { genre?: { name: string }; subGenre?: { name: string } }[];
  _embedded?: {
    venues?: { name: string; city?: { name: string } }[];
    attractions?: { name: string }[];
  };
}

interface TmResponse {
  _embedded?: { events: TmEvent[] };
}

const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

export function parseTmEvent(e: TmEvent): Show | undefined {
  const start =
    e.dates?.start?.dateTime ??
    (e.dates?.start?.localDate && `${e.dates.start.localDate}T00:00:00Z`);
  if (!start) return undefined;
  const venue = e._embedded?.venues?.[0];
  const artists = e._embedded?.attractions?.map((a) => a.name) ?? [e.name];
  const genres = new Set<string>();
  for (const c of e.classifications ?? []) {
    for (const raw of [c.genre?.name, c.subGenre?.name]) {
      const g = raw && normalizeGenre(raw);
      if (g) genres.add(g);
    }
  }
  const image = [...(e.images ?? [])].sort((a, b) => b.width - a.width)[0];
  return {
    id: e.id,
    source: "ticketmaster",
    artists: artists.length ? artists : [e.name],
    venue: venue?.name ?? "Unknown venue",
    city: venue?.city?.name ?? "",
    startsAt: new Date(start),
    genres: [...genres],
    url: e.url,
    ticketUrl: e.url,
    imageUrl: image?.url,
  };
}

export class TicketmasterProvider implements ShowProvider {
  readonly name = "ticketmaster";
  constructor(private apiKey: string) {}

  async search(q: SearchQuery): Promise<Show[]> {
    const out: Show[] = [];
    // One request per genre; Ticketmaster's classificationName accepts a single genre cleanly.
    const genres = q.genres.length ? q.genres : [""];
    for (const genre of genres) {
      const params = new URLSearchParams({
        apikey: this.apiKey,
        classificationName: genre || "music",
        segmentName: "Music",
        latlong: `${q.lat},${q.lng}`,
        radius: String(q.radiusKm),
        unit: "km",
        startDateTime: iso(q.from),
        endDateTime: iso(q.to),
        sort: "date,asc",
        size: "100",
      });
      const data = await getJson<TmResponse>(
        `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
      );
      for (const e of data._embedded?.events ?? []) {
        const show = parseTmEvent(e);
        if (!show) continue;
        if (genre && !show.genres.includes(genre)) show.genres.push(genre);
        out.push(show);
      }
    }
    return out;
  }
}
