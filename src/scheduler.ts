import cron from "node-cron";
import type { Client, SendableChannels } from "discord.js";
import type { Logger } from "pino";
import { listEmbed, showEmbed } from "./bot/embeds.js";
import type { AppContext } from "./bot/context.js";
import type { GuildConfig } from "./db/index.js";
import { dedupeKey } from "./dedupe.js";
import { searchAll, watchlistShows } from "./providers/index.js";

const DAY = 86_400_000;
const LOOKAHEAD_DAYS = 90;

async function channelFor(
  client: Client,
  cfg: GuildConfig,
): Promise<SendableChannels | undefined> {
  const ch = await client.channels.fetch(cfg.channelId).catch(() => null);
  return ch?.isSendable() ? ch : undefined;
}

/** Find unseen matching shows for a guild and post them. The first run only seeds the seen-set. */
export async function pollGuild(
  client: Client,
  ctx: AppContext,
  cfg: GuildConfig,
  log: Logger,
): Promise<void> {
  if (!cfg.genres.length && !ctx.store.watchlist(cfg.guildId).length) return;
  const from = new Date();
  const to = new Date(from.getTime() + LOOKAHEAD_DAYS * DAY);
  const onError = (p: string, err: unknown) =>
    log.warn({ provider: p, err }, "provider failed");

  const [genreShows, artistShows] = await Promise.all([
    cfg.genres.length
      ? searchAll(
          ctx.providers,
          {
            genres: cfg.genres,
            lat: cfg.lat,
            lng: cfg.lng,
            radiusKm: cfg.radiusKm,
            from,
            to,
          },
          onError,
        )
      : [],
    watchlistShows(
      ctx.providers,
      ctx.store.watchlist(cfg.guildId),
      from,
      to,
      onError,
    ),
  ]);

  const fresh = [...genreShows, ...artistShows].filter(
    (s) => !ctx.store.hasSeen(cfg.guildId, dedupeKey(s)),
  );
  const unique = new Map(fresh.map((s) => [dedupeKey(s), s]));

  if (!cfg.seeded) {
    for (const key of unique.keys()) ctx.store.markSeen(cfg.guildId, key);
    ctx.store.markSeeded(cfg.guildId);
    log.info({ guild: cfg.guildId, seeded: unique.size }, "seeded guild");
    return;
  }

  const channel = await channelFor(client, cfg);
  if (!channel)
    return void log.warn({ guild: cfg.guildId }, "alert channel unavailable");
  for (const [key, show] of unique) {
    try {
      await channel.send({ embeds: [showEmbed(show)] });
      ctx.store.markSeen(cfg.guildId, key);
    } catch (err) {
      log.warn({ guild: cfg.guildId, err }, "failed to post show");
      break;
    }
  }
}

async function digestGuild(
  client: Client,
  ctx: AppContext,
  cfg: GuildConfig,
  log: Logger,
): Promise<void> {
  if (!cfg.genres.length) return;
  const from = new Date();
  const shows = await searchAll(
    ctx.providers,
    {
      genres: cfg.genres,
      lat: cfg.lat,
      lng: cfg.lng,
      radiusKm: cfg.radiusKm,
      from,
      to: new Date(from.getTime() + 14 * DAY),
    },
    (p, err) => log.warn({ provider: p, err }, "provider failed"),
  );
  const channel = await channelFor(client, cfg);
  await channel?.send({
    embeds: [listEmbed(`This fortnight near ${cfg.place}`, shows)],
  });
}

export function startScheduler(
  client: Client,
  ctx: AppContext,
  log: Logger,
): void {
  const run = async () => {
    for (const cfg of ctx.store.allGuilds()) {
      await pollGuild(client, ctx, cfg, log).catch((err) =>
        log.error({ guild: cfg.guildId, err }, "poll failed"),
      );
    }
  };
  cron.schedule(
    `*/${ctx.config.POLL_INTERVAL_MINUTES} * * * *`,
    () => void run(),
  );

  // Weekly digest: fires daily at 09:00 server time for guilds whose digest_day is today.
  cron.schedule("0 9 * * *", () => {
    const today = new Date().getDay();
    for (const cfg of ctx.store
      .allGuilds()
      .filter((g) => g.digestDay === today)) {
      void digestGuild(client, ctx, cfg, log).catch((err) =>
        log.error({ guild: cfg.guildId, err }, "digest failed"),
      );
    }
  });
  void run();
}
