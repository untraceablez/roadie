import type { Config } from "../config.js";
import { dedupe } from "../dedupe.js";
import type { SearchQuery, Show, ShowProvider } from "../types.js";
import { BandsintownProvider } from "./bandsintown.js";
import { TicketmasterProvider } from "./ticketmaster.js";

export function buildProviders(config: Config): ShowProvider[] {
  const providers: ShowProvider[] = [];
  if (config.TICKETMASTER_API_KEY)
    providers.push(new TicketmasterProvider(config.TICKETMASTER_API_KEY));
  if (config.BANDSINTOWN_APP_ID)
    providers.push(new BandsintownProvider(config.BANDSINTOWN_APP_ID));
  // Scrapers (Songkick, FestivalGuide) plug in here behind config.ENABLE_SCRAPERS.
  return providers;
}

/** Query every provider, tolerating individual failures, and merge duplicates. */
export async function searchAll(
  providers: ShowProvider[],
  q: SearchQuery,
  onError: (provider: string, err: unknown) => void = () => {},
): Promise<Show[]> {
  const results = await Promise.all(
    providers.map((p) =>
      p.search(q).catch((err) => {
        onError(p.name, err);
        return [] as Show[];
      }),
    ),
  );
  return dedupe(results.flat()).sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
}

export async function watchlistShows(
  providers: ShowProvider[],
  artists: string[],
  from: Date,
  to: Date,
  onError: (provider: string, err: unknown) => void = () => {},
): Promise<Show[]> {
  const jobs: Promise<Show[]>[] = [];
  for (const p of providers) {
    if (!p.byArtist) continue;
    for (const a of artists) {
      jobs.push(
        p.byArtist(a, from, to).catch((err) => (onError(p.name, err), [])),
      );
    }
  }
  return dedupe((await Promise.all(jobs)).flat()).sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
}
