import { REST, Routes } from "discord.js";
import { loadConfig } from "../config.js";
import { commandData } from "./commands.js";

const config = loadConfig();
const rest = new REST().setToken(config.DISCORD_TOKEN);
await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), {
  body: commandData,
});
console.log(`Registered ${commandData.length} global commands.`);
