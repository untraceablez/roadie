# Roadie

Discord bot (TypeScript, discord.js v14, Node >= 22, ESM) that posts upcoming live shows matching each server's configured genres. See `README.md` for user-facing docs.

## Commands

- `npm run dev` run with auto-reload (needs a populated `.env`)
- `npm run deploy-commands` register slash commands globally (re-run after editing `src/bot/commands.ts`)
- `npm run lint && npm run typecheck && npm test && npm run build` must all pass before committing
- `npx prettier --write .` formatting (double quotes, trailing commas)

## Architecture

- `src/providers/`: `ShowProvider` implementations (`ticketmaster.ts` does genre/area search; `bandsintown.ts` is artist-keyed, watchlist only). `index.ts` has `buildProviders`, `searchAll` (tolerates per-provider failure, dedupes) and `watchlistShows`. `geocode.ts` uses Open-Meteo.
- `src/genres.ts`: canonical genre list plus aliases. Providers normalize their own taxonomy into it.
- `src/dedupe.ts`: `dedupeKey` = normalized headliner + venue + UTC date. Used for cross-source dedupe and the per-guild `seen_shows` table.
- `src/db/index.ts`: `Store` (better-sqlite3). Migrations are plain SQL in `migrations/`, applied in filename order on startup, so they must be idempotent (`IF NOT EXISTS`).
- `src/bot/`: slash command definitions and handlers (`commands.ts`), embeds, command registration script.
- `src/scheduler.ts`: node-cron polling and weekly digest. First poll for a guild only seeds `seen_shows` (`guild_config.seeded`).
- `src/config.ts`: zod-validated env; loads `./.env` via `process.loadEnvFile()` (shell variables win).

## Conventions

- Provider tests use recorded fixtures or parsing helpers (e.g. `parseTmEvent`); never hit the live network in tests.
- New scrapers must respect robots.txt and site terms, throttle, and be disabled by default behind `ENABLE_SCRAPERS`.
- Keep slash command option order valid for Discord (required options before optional ones).

## Secrets

- Real credentials live only in `.env` (gitignored). `.env.example` must stay blank. Never print token values in logs or output.
- Slash commands need the `applications.commands` invite scope in addition to `bot`.
