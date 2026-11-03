/** View Channel + Send Messages + Embed Links: all the bot needs. */
export const INVITE_PERMISSIONS = 1024n + 2048n + 16384n;

/** OAuth2 invite URL. The applications.commands scope is what makes slash commands appear. */
export function buildInviteUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "bot applications.commands",
    permissions: INVITE_PERMISSIONS.toString(),
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}
