import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface GuildConfig {
  guildId: string;
  channelId: string;
  genres: string[];
  lat: number;
  lng: number;
  radiusKm: number;
  place: string;
  digestDay: number;
  seeded: boolean;
}

interface GuildRow {
  guild_id: string;
  channel_id: string;
  genres: string;
  lat: number;
  lng: number;
  radius_km: number;
  place: string;
  digest_day: number;
  seeded: number;
}

const toConfig = (r: GuildRow): GuildConfig => ({
  guildId: r.guild_id,
  channelId: r.channel_id,
  genres: JSON.parse(r.genres) as string[],
  lat: r.lat,
  lng: r.lng,
  radiusKm: r.radius_km,
  place: r.place,
  digestDay: r.digest_day,
  seeded: r.seeded === 1,
});

export class Store {
  private db: Database.Database;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate(): void {
    const dir = join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "migrations",
    );
    for (const file of readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      this.db.exec(readFileSync(join(dir, file), "utf8"));
    }
  }

  getGuild(guildId: string): GuildConfig | undefined {
    const row = this.db
      .prepare("SELECT * FROM guild_config WHERE guild_id = ?")
      .get(guildId) as GuildRow | undefined;
    return row && toConfig(row);
  }

  allGuilds(): GuildConfig[] {
    return (
      this.db.prepare("SELECT * FROM guild_config").all() as GuildRow[]
    ).map(toConfig);
  }

  upsertGuild(c: Omit<GuildConfig, "seeded">): void {
    this.db
      .prepare(
        `INSERT INTO guild_config (guild_id, channel_id, genres, lat, lng, radius_km, place, digest_day)
         VALUES (@guildId, @channelId, @genres, @lat, @lng, @radiusKm, @place, @digestDay)
         ON CONFLICT(guild_id) DO UPDATE SET
           channel_id=@channelId, genres=@genres, lat=@lat, lng=@lng,
           radius_km=@radiusKm, place=@place, digest_day=@digestDay`,
      )
      .run({ ...c, genres: JSON.stringify(c.genres) });
  }

  setGenres(guildId: string, genres: string[]): void {
    this.db
      .prepare("UPDATE guild_config SET genres = ? WHERE guild_id = ?")
      .run(JSON.stringify(genres), guildId);
  }

  setDigestDay(guildId: string, day: number): void {
    this.db
      .prepare("UPDATE guild_config SET digest_day = ? WHERE guild_id = ?")
      .run(day, guildId);
  }

  markSeeded(guildId: string): void {
    this.db
      .prepare("UPDATE guild_config SET seeded = 1 WHERE guild_id = ?")
      .run(guildId);
  }

  watchlist(guildId: string): string[] {
    return (
      this.db
        .prepare("SELECT artist FROM watchlist WHERE guild_id = ?")
        .all(guildId) as {
        artist: string;
      }[]
    ).map((r) => r.artist);
  }

  addWatch(guildId: string, artist: string): void {
    this.db
      .prepare(
        "INSERT OR IGNORE INTO watchlist (guild_id, artist) VALUES (?, ?)",
      )
      .run(guildId, artist);
  }

  removeWatch(guildId: string, artist: string): boolean {
    return (
      this.db
        .prepare(
          "DELETE FROM watchlist WHERE guild_id = ? AND artist = ? COLLATE NOCASE",
        )
        .run(guildId, artist).changes > 0
    );
  }

  hasSeen(guildId: string, key: string): boolean {
    return !!this.db
      .prepare("SELECT 1 FROM seen_shows WHERE guild_id = ? AND dedupe_key = ?")
      .get(guildId, key);
  }

  markSeen(guildId: string, key: string): void {
    this.db
      .prepare(
        "INSERT OR IGNORE INTO seen_shows (guild_id, dedupe_key, posted_at) VALUES (?, ?, ?)",
      )
      .run(guildId, key, Date.now());
  }

  close(): void {
    this.db.close();
  }
}
