import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  TICKETMASTER_API_KEY: z.string().optional(),
  BANDSINTOWN_APP_ID: z.string().optional(),
  ENABLE_SCRAPERS: bool,
  DATABASE_PATH: z.string().default("./data/roadie.db"),
  POLL_INTERVAL_MINUTES: z.coerce.number().int().min(5).default(30),
  LOG_LEVEL: z.string().default("info"),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
