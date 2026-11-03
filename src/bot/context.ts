import type { Config } from "../config.js";
import type { Store } from "../db/index.js";
import type { ShowProvider } from "../types.js";

export interface AppContext {
  config: Config;
  store: Store;
  providers: ShowProvider[];
}
