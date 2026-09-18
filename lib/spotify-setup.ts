export function spotifySetupError(): string | null {
  if (
    !process.env.SPOTIFY_CLIENT_ID ||
    !process.env.SPOTIFY_CLIENT_SECRET ||
    !process.env.SPOTIFY_REDIRECT_URI
  )
    return "setup";
  try {
    const database = new URL(process.env.DATABASE_URL ?? "");
    if (
      !["postgres:", "postgresql:"].includes(database.protocol) ||
      database.hostname === "host"
    )
      return "database_setup";
  } catch {
    return "database_setup";
  }
  if (
    Buffer.from(process.env.TOKEN_ENCRYPTION_KEY ?? "", "base64").length !== 32
  )
    return "encryption_setup";
  return null;
}
