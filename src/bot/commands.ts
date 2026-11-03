import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { GENRES, isGenre } from "../genres.js";
import { geocode } from "../providers/geocode.js";
import { searchAll } from "../providers/index.js";
import { listEmbed } from "./embeds.js";
import type { AppContext } from "./context.js";

const genreChoices = GENRES.map((g) => ({ name: g, value: g }));
const DAY = 86_400_000;

export const commandData = [
  new SlashCommandBuilder()
    .setName("roadie")
    .setDescription("Configure Roadie for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((s) =>
      s
        .setName("setup")
        .setDescription("Set the alert channel and search area")
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Where to post alerts")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("place")
            .setDescription('City or region, e.g. "Austin, TX"')
            .setRequired(true),
        )
        .addIntegerOption((o) =>
          o
            .setName("radius_km")
            .setDescription("Search radius (default 80)")
            .setMinValue(5)
            .setMaxValue(500),
        ),
    )
    .addSubcommandGroup((g) =>
      g
        .setName("genres")
        .setDescription("Manage tracked genres")
        .addSubcommand((s) =>
          s
            .setName("add")
            .setDescription("Track a genre")
            .addStringOption((o) =>
              o
                .setName("genre")
                .setDescription("Genre")
                .setRequired(true)
                .addChoices(...genreChoices),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("remove")
            .setDescription("Stop tracking a genre")
            .addStringOption((o) =>
              o
                .setName("genre")
                .setDescription("Genre")
                .setRequired(true)
                .addChoices(...genreChoices),
            ),
        )
        .addSubcommand((s) =>
          s.setName("list").setDescription("Show tracked genres"),
        ),
    )
    .addSubcommandGroup((g) =>
      g
        .setName("watch")
        .setDescription("Artist watchlist")
        .addSubcommand((s) =>
          s
            .setName("add")
            .setDescription("Watch an artist")
            .addStringOption((o) =>
              o
                .setName("artist")
                .setDescription("Artist name")
                .setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("remove")
            .setDescription("Unwatch an artist")
            .addStringOption((o) =>
              o
                .setName("artist")
                .setDescription("Artist name")
                .setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s.setName("list").setDescription("Show watched artists"),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("digest")
        .setDescription("Choose the weekday for the weekly digest")
        .addIntegerOption((o) =>
          o
            .setName("day")
            .setDescription("Day of week")
            .setRequired(true)
            .addChoices(
              ...[
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ].map((name, value) => ({ name, value })),
            ),
        ),
    ),
  new SlashCommandBuilder()
    .setName("shows")
    .setDescription("Search upcoming shows near this server")
    .setDMPermission(false)
    .addStringOption((o) =>
      o
        .setName("genre")
        .setDescription("Genre (default: server genres)")
        .addChoices(...genreChoices),
    )
    .addIntegerOption((o) =>
      o
        .setName("days")
        .setDescription("Look-ahead window (default 30)")
        .setMinValue(1)
        .setMaxValue(180),
    ),
].map((c) => c.toJSON());

export async function handleCommand(
  i: ChatInputCommandInteraction,
  ctx: AppContext,
): Promise<void> {
  const guildId = i.guildId;
  if (!guildId)
    return void (await i.reply({
      content: "Use this in a server.",
      ephemeral: true,
    }));
  if (i.commandName === "shows") return handleShows(i, ctx, guildId);

  const group = i.options.getSubcommandGroup(false);
  const sub = i.options.getSubcommand();
  const cfg = ctx.store.getGuild(guildId);

  if (sub === "setup" && !group) {
    await i.deferReply({ ephemeral: true });
    const place = await geocode(i.options.getString("place", true));
    if (!place)
      return void (await i.editReply(
        'Could not find that place. Try "City, Country".',
      ));
    const channel = i.options.getChannel("channel", true);
    ctx.store.upsertGuild({
      guildId,
      channelId: channel.id,
      genres: cfg?.genres ?? [],
      lat: place.lat,
      lng: place.lng,
      radiusKm: i.options.getInteger("radius_km") ?? cfg?.radiusKm ?? 80,
      place: place.name,
      digestDay: cfg?.digestDay ?? 1,
    });
    return void (await i.editReply(
      `Alerts will post in <#${channel.id}> for shows near **${place.name}**. Add genres with \`/roadie genres add\`.`,
    ));
  }

  if (!cfg)
    return void (await i.reply({
      content: "Run `/roadie setup` first.",
      ephemeral: true,
    }));

  if (group === "genres") {
    const genre = sub === "list" ? "" : i.options.getString("genre", true);
    const set = new Set(cfg.genres);
    if (sub === "add" && isGenre(genre)) set.add(genre);
    if (sub === "remove") set.delete(genre);
    if (sub !== "list") ctx.store.setGenres(guildId, [...set]);
    return void (await i.reply({
      content: `Tracked genres: ${[...set].join(", ") || "_none_"}`,
      ephemeral: true,
    }));
  }

  if (group === "watch") {
    if (sub === "add")
      ctx.store.addWatch(guildId, i.options.getString("artist", true).trim());
    if (sub === "remove") {
      const removed = ctx.store.removeWatch(
        guildId,
        i.options.getString("artist", true).trim(),
      );
      if (!removed)
        return void (await i.reply({
          content: "That artist is not on the watchlist.",
          ephemeral: true,
        }));
    }
    if (sub !== "list" && !ctx.config.BANDSINTOWN_APP_ID) {
      await i.reply({
        content:
          "Saved, but artist alerts need `BANDSINTOWN_APP_ID` configured by the bot owner.",
        ephemeral: true,
      });
      return;
    }
    return void (await i.reply({
      content: `Watchlist: ${ctx.store.watchlist(guildId).join(", ") || "_empty_"}`,
      ephemeral: true,
    }));
  }

  if (sub === "digest") {
    const day = i.options.getInteger("day", true);
    ctx.store.setDigestDay(guildId, day);
    return void (await i.reply({
      content: "Weekly digest day updated.",
      ephemeral: true,
    }));
  }
}

async function handleShows(
  i: ChatInputCommandInteraction,
  ctx: AppContext,
  guildId: string,
): Promise<void> {
  const cfg = ctx.store.getGuild(guildId);
  if (!cfg)
    return void (await i.reply({
      content: "Ask an admin to run `/roadie setup` first.",
      ephemeral: true,
    }));
  await i.deferReply();
  const genre = i.options.getString("genre");
  const days = i.options.getInteger("days") ?? 30;
  const from = new Date();
  const shows = await searchAll(ctx.providers, {
    genres: genre ? [genre] : cfg.genres,
    lat: cfg.lat,
    lng: cfg.lng,
    radiusKm: cfg.radiusKm,
    from,
    to: new Date(from.getTime() + days * DAY),
  });
  await i.editReply({
    embeds: [listEmbed(`Shows near ${cfg.place} — next ${days} days`, shows)],
  });
}
