import { Client, Events, GatewayIntentBits } from "discord.js";
import { pino } from "pino";
import { handleCommand } from "./bot/commands.js";
import type { AppContext } from "./bot/context.js";
import { loadConfig } from "./config.js";
import { Store } from "./db/index.js";
import { buildProviders } from "./providers/index.js";
import { startScheduler } from "./scheduler.js";

const config = loadConfig();
const log = pino({ level: config.LOG_LEVEL });
const ctx: AppContext = {
  config,
  store: new Store(config.DATABASE_PATH),
  providers: buildProviders(config),
};

if (!ctx.providers.length)
  log.warn("No providers configured; set TICKETMASTER_API_KEY to get results.");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  log.info({ user: c.user.tag, guilds: c.guilds.cache.size }, "ready");
  startScheduler(client, ctx, log);
});

client.on(Events.InteractionCreate, (i) => {
  if (!i.isChatInputCommand()) return;
  log.info(
    { command: i.commandName, guild: i.guildId, user: i.user.tag },
    "command received",
  );
  handleCommand(i, ctx).catch(async (err) => {
    log.error({ err, command: i.commandName }, "command failed");
    const msg = { content: "Something went wrong.", ephemeral: true };
    await (i.deferred || i.replied ? i.followUp(msg) : i.reply(msg)).catch(
      () => {},
    );
  });
});

const shutdown = () => {
  void client.destroy();
  ctx.store.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await client.login(config.DISCORD_TOKEN);
