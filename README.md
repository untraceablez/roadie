# Roadie 🎸

A Discord bot that watches live-music listings and posts upcoming shows matching your server's genres into a channel you choose.

## Features

- **New-show alerts**: embeds posted once per show, deduplicated across sources.
- **Artist watchlist**: get alerts when specific artists announce dates (Bandsintown).
- **`/shows`**: on-demand search near your server's configured location.
- **Weekly digest**: a summary of the next two weeks on the weekday you pick.

## Data sources

| Source                   | Status                     | Notes                                                                                                |
| ------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Ticketmaster Discovery   | Supported                  | Genre + location search. Free API key.                                                               |
| Bandsintown              | Supported (watchlist)      | Public API is artist-keyed only; needs an app id.                                                    |
| Songkick / FestivalGuide | Planned, optional scrapers | No open API. Disabled by default; check each site's terms of service and robots.txt before enabling. |

## Setup

1. Create an application at the [Discord developer portal](https://discord.com/developers/applications), add a bot, and copy the token and client id.
2. Invite it with scopes `bot applications.commands` and permissions _View Channel_, _Send Messages_, _Embed Links_.
3. `cp .env.example .env` and fill in the values (see below).
4. `npm install && npm run deploy-commands && npm run dev`

Or with Docker: `docker compose up -d --build` (SQLite persists in a volume).

### Environment

| Variable                             | Required    | Description                            |
| ------------------------------------ | ----------- | -------------------------------------- |
| `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` | yes         | Discord credentials                    |
| `TICKETMASTER_API_KEY`               | recommended | Enables genre/area search              |
| `BANDSINTOWN_APP_ID`                 | optional    | Enables the artist watchlist           |
| `ENABLE_SCRAPERS`                    | no          | `true` to enable experimental scrapers |
| `DATABASE_PATH`                      | no          | Default `./data/roadie.db`             |
| `POLL_INTERVAL_MINUTES`              | no          | Default 30 (min 5)                     |

## Commands

Config commands require _Manage Server_.

- `/roadie setup channel place [radius_km]`
- `/roadie genres add|remove|list`
- `/roadie watch add|remove|list`
- `/roadie digest day`
- `/shows [genre] [days]`

The first poll after setup silently records existing shows, so the channel isn't flooded; only newly listed shows are announced afterwards.

## Adding a provider

Implement `ShowProvider` from `src/types.ts` in `src/providers/`, register it in `buildProviders` (`src/providers/index.ts`), and add a fixture-based test.

## Development

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## License

MIT
