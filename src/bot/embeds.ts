import { EmbedBuilder } from "discord.js";
import type { Show } from "../types.js";

const ts = (d: Date) => Math.floor(d.getTime() / 1000);

export function showEmbed(show: Show): EmbedBuilder {
  const e = new EmbedBuilder()
    .setTitle(show.artists.slice(0, 3).join(", ").slice(0, 256))
    .setURL(show.url)
    .setColor(0xe8590c)
    .addFields(
      { name: "When", value: `<t:${ts(show.startsAt)}:F>`, inline: true },
      {
        name: "Where",
        value: [show.venue, show.city].filter(Boolean).join(", "),
        inline: true,
      },
    )
    .setFooter({ text: `via ${show.source}` });
  if (show.genres.length)
    e.addFields({ name: "Genres", value: show.genres.join(", ") });
  if (show.imageUrl) e.setThumbnail(show.imageUrl);
  return e;
}

/** Compact multi-show list for digests and /shows (Discord caps descriptions at 4096 chars). */
export function listEmbed(
  title: string,
  shows: Show[],
  limit = 15,
): EmbedBuilder {
  const lines = shows
    .slice(0, limit)
    .map(
      (s) =>
        `<t:${ts(s.startsAt)}:d> **[${s.artists[0]}](${s.url})** — ${s.venue}${s.city ? `, ${s.city}` : ""}`,
    );
  const more =
    shows.length > limit ? `\n…and ${shows.length - limit} more` : "";
  return new EmbedBuilder()
    .setTitle(title)
    .setColor(0xe8590c)
    .setDescription((lines.join("\n") || "No upcoming shows found.") + more);
}
