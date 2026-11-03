import { describe, expect, it } from "vitest";
import { buildInviteUrl } from "../src/invite.js";

describe("buildInviteUrl", () => {
  it("includes both scopes and the minimal permissions", () => {
    const url = new URL(buildInviteUrl("123"));
    expect(url.origin + url.pathname).toBe(
      "https://discord.com/oauth2/authorize",
    );
    expect(url.searchParams.get("client_id")).toBe("123");
    expect(url.searchParams.get("scope")).toBe("bot applications.commands");
    expect(url.searchParams.get("permissions")).toBe("19456");
  });
});
