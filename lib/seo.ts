/** Shared origin for canonicals, schema and crawl files, never a preview host. */
export function resolveSiteUrl(env: Record<string, string | undefined>) {
  const url = new URL(
    env.APP_URL ||
      (env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://sortifi.vercel.app"),
  );
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("APP_URL must be an HTTP(S) origin without credentials");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    url.protocol = "https:";
  return new URL(url.origin);
}
export const siteUrl = resolveSiteUrl(process.env);
export const homeTitle =
  "Sortify — Rediscover Your Spotify Library in Playlists";
export const homeDescription =
  "Rediscover forgotten favorites in your Spotify library. Sortify groups saved songs into playlists you can review and edit, without changing your Liked Songs.";
export const appTitle = "Open Sortify — Organize Your Saved Spotify Music";
export const appDescription =
  "Connect Spotify, choose Liked Songs or playlists, and organize your saved music. Review and edit each playlist before choosing what to add to Spotify.";
export function serializeSchema(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
