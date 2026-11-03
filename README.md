# Roadie 🎸

A self-hosted Discord bot that watches live-music listings and posts upcoming shows matching your server's genres into a channel you choose.

## Features

- **New-show alerts**: rich embeds posted once per show, deduplicated across sources.
- **Artist watchlist**: get alerts when specific artists announce dates (Bandsintown, optional).
- **`/shows`**: on-demand search near your server's configured location.
- **Weekly digest**: a summary of the next two weeks on the weekday you pick.

## Data sources

| Source                   | Status                     | Notes                                                                                                   |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| Ticketmaster Discovery   | Supported                  | Genre + location search. Free API key. This is the main source.                                         |
| Bandsintown              | Supported (watchlist only) | Public API is artist-keyed only and intended for artists. See [setup](#3-bandsintown-api-key-optional). |
| Songkick / FestivalGuide | Planned, optional scrapers | No open API. Disabled by default; check each site's terms of service and robots.txt before enabling.    |

## Self-hosting guide

You run your own copy of the bot with your own credentials, so there is no shared server and no one else holds your token. You need four values:

| Value                  | Required    | Where to get it                                |
| ---------------------- | ----------- | ---------------------------------------------- |
| `DISCORD_CLIENT_ID`    | yes         | [Discord](#1-discord-client-id-and-bot-token)  |
| `DISCORD_TOKEN`        | yes         | [Discord](#1-discord-client-id-and-bot-token)  |
| `TICKETMASTER_API_KEY` | recommended | [Ticketmaster](#2-ticketmaster-api-key)        |
| `BANDSINTOWN_APP_ID`   | optional    | [Bandsintown](#3-bandsintown-api-key-optional) |

Without a Ticketmaster key the bot starts but has nothing to search, so `/shows` and genre alerts return no results.

### 1. Discord client ID and bot token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**. Name it (e.g. "Roadie") and accept the terms.
2. On **General Information**, copy the **Application ID**. This is your `DISCORD_CLIENT_ID`.
3. Open the **Bot** tab and click **Reset Token**, then copy the token. This is your `DISCORD_TOKEN`. Discord shows it only once; if you lose it, reset it again.
   - Treat the token like a password. Anyone with it can control your bot. If it leaks, reset it immediately.
   - You do **not** need any privileged gateway intents (Presence, Server Members, Message Content). Leave them off.
4. Invite the bot to your server using this URL, replacing `YOUR_CLIENT_ID`:

   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot+applications.commands&permissions=19456
   ```

   - **Both scopes matter.** `bot` lets the bot join and post; `applications.commands` is what makes the slash commands show up. With `bot` alone, the bot connects but `/roadie` never appears.
   - `permissions=19456` is _View Channel_, _Send Messages_ and _Embed Links_, which is all the bot needs.
   - You need the **Manage Server** permission on the server you're inviting it to.

### 2. Ticketmaster API key

1. Register for a free account on the [Ticketmaster Developer Portal](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) (follow the links to register or log in).
2. After signing in, open your account's apps/keys page and copy the key for the Discovery API. This is your `TICKETMASTER_API_KEY`.
3. The key goes in the `apikey` query parameter. You can verify it with:

   ```
   curl "https://app.ticketmaster.com/discovery/v2/events.json?apikey=YOUR_KEY&classificationName=rock&size=1"
   ```

   A JSON response means it works. HTTP 401 means the key is wrong.

Things to know:

- The default quota is **5 requests per second and 5,000 per day**. Roadie makes about one request per tracked genre per poll per server, so a few servers with a handful of genres each stays far below the cap at the default 30-minute interval.
- Ticketmaster requires that apps follow their Terms of Service and [branding guide](https://design.ticketmaster.com/). Higher limits are only granted to apps that comply.

### 3. Bandsintown API key (optional)

_Setup instructions for the Bandsintown artist watchlist are coming soon._ Leave `BANDSINTOWN_APP_ID` empty for now; Roadie works without it, and `/roadie watch` will say it isn't configured.

### 4. Configure and run

Requires **Node.js 22 or newer** (a requirement of the SQLite library). A C/C++ toolchain is only needed if no prebuilt SQLite binary exists for your platform.

```bash
git clone https://github.com/untraceablez/roadie.git
cd roadie
npm install
cp .env.example .env     # then edit .env and fill in your values
npm run deploy-commands  # registers the slash commands with Discord (run again if commands change)
npm run dev              # run the bot
```

`.env` is gitignored. Never commit it, and don't put real values in `.env.example`.

For a long-running deployment:

- **Docker:** `docker compose up -d --build`. Reads `.env`, keeps the SQLite database in a named volume. Run `npm run deploy-commands` once (on the host or in a one-off container) before first use.
- **Plain Node:** `npm run build && npm start`, under a process manager such as systemd or pm2.

#### Environment reference

| Variable                | Required    | Description                                       |
| ----------------------- | ----------- | ------------------------------------------------- |
| `DISCORD_TOKEN`         | yes         | Bot token                                         |
| `DISCORD_CLIENT_ID`     | yes         | Application ID                                    |
| `TICKETMASTER_API_KEY`  | recommended | Enables genre/area search                         |
| `BANDSINTOWN_APP_ID`    | optional    | Enables the artist watchlist                      |
| `ENABLE_SCRAPERS`       | no          | `true` to enable experimental scrapers (none yet) |
| `DATABASE_PATH`         | no          | Default `./data/roadie.db`                        |
| `POLL_INTERVAL_MINUTES` | no          | Default 30, minimum 5                             |
| `LOG_LEVEL`             | no          | pino level, default `info`                        |

Variables already set in your shell take precedence over `.env`.

### 5. First use in Discord

1. `/roadie setup` choose the alert channel and a place (e.g. `Austin, TX`), plus an optional radius in km.
2. `/roadie genres add` pick one or more genres.
3. `/shows` to confirm results come back.

The first poll after setup silently records existing shows so the channel isn't flooded. After that, only newly listed shows are announced.

## Commands

Config commands require the **Manage Server** permission.

- `/roadie setup channel place [radius_km]`
- `/roadie genres add|remove|list`
- `/roadie watch add|remove|list` (needs a Bandsintown key)
- `/roadie digest day`
- `/shows [genre] [days]`

## Troubleshooting

| Symptom                                                      | Likely cause and fix                                                                                                                   |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Bot is online but typing `/roadie` shows nothing             | Invited without the `applications.commands` scope. Re-invite with the URL above (no need to kick it), then reload Discord with Ctrl+R. |
| `Invalid environment configuration: DISCORD_TOKEN: Required` | `.env` is missing or not in the directory you ran from. Run the bot from the repo root.                                                |
| `/shows` returns nothing                                     | No `TICKETMASTER_API_KEY`, no genres added, or nothing listed in your radius. Check the logs for `provider failed` warnings.           |
| `/roadie watch` says it needs `BANDSINTOWN_APP_ID`           | The bot owner hasn't set a Bandsintown key.                                                                                            |
| HTTP 429 in the logs                                         | Ticketmaster rate limit hit. Raise `POLL_INTERVAL_MINUTES` or track fewer genres.                                                      |
| `better-sqlite3` fails to install                            | Use Node 22 or newer. If no prebuilt binary exists for your platform, install a C++ toolchain so it can build from source.             |

## Adding a provider

Implement `ShowProvider` from `src/types.ts` in `src/providers/`, register it in `buildProviders` (`src/providers/index.ts`), and add a fixture-based test. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## License

MIT, see [LICENSE](LICENSE).
