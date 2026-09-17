import { env } from "cloudflare:workers";
import { decryptSecret, encryptSecret } from "./crypto";
import { getD1, nowIso } from "./db";

export const SPOTIFY_SCOPES = ["user-read-private", "user-library-read", "playlist-read-private", "playlist-read-collaborative", "playlist-modify-private"] as const;

type ConnectionRow = { user_id: string; spotify_user_id: string; display_name: string | null; access_token: string; refresh_token: string; expires_at: string; scopes: string };

function config() {
  const clientId = env.SPOTIFY_CLIENT_ID, clientSecret = env.SPOTIFY_CLIENT_SECRET, redirectUri = env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error("Spotify credentials are not configured");
  return { clientId, clientSecret, redirectUri };
}

export function spotifyAuthorizationUrl(state: string) {
  const { clientId, redirectUri } = config();
  const params = new URLSearchParams({ response_type: "code", client_id: clientId, scope: SPOTIFY_SCOPES.join(" "), redirect_uri: redirectUri, state, show_dialog: "true" });
  return `https://accounts.spotify.com/authorize?${params}`;
}

async function tokenRequest(body: URLSearchParams) {
  const { clientId, clientSecret } = config();
  const response = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(`Spotify token exchange failed (${response.status}): ${String(payload.error_description ?? payload.error ?? "unknown error")}`);
  return payload as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
}

export async function exchangeAuthorizationCode(code: string) {
  const { redirectUri } = config();
  return tokenRequest(new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }));
}

export async function storeSpotifyConnection(userId: string, token: { access_token: string; refresh_token?: string; expires_in: number; scope?: string }, profile: { id: string; display_name?: string | null }) {
  if (!token.refresh_token) throw new Error("Spotify did not return a refresh token");
  const db = getD1();
  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
  await db.prepare(`INSERT INTO spotify_connections (user_id, spotify_user_id, display_name, access_token, refresh_token, expires_at, scopes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET spotify_user_id=excluded.spotify_user_id, display_name=excluded.display_name, access_token=excluded.access_token, refresh_token=excluded.refresh_token, expires_at=excluded.expires_at, scopes=excluded.scopes, updated_at=CURRENT_TIMESTAMP`)
    .bind(userId, profile.id, profile.display_name ?? null, await encryptSecret(token.access_token), await encryptSecret(token.refresh_token), expiresAt, token.scope ?? SPOTIFY_SCOPES.join(" ")).run();
}

async function connection(userId: string) {
  return getD1().prepare("SELECT * FROM spotify_connections WHERE user_id = ?").bind(userId).first<ConnectionRow>();
}

async function accessToken(userId: string) {
  const row = await connection(userId); if (!row) throw new Error("Spotify is not connected");
  if (new Date(row.expires_at).getTime() > Date.now() + 60_000) return decryptSecret(row.access_token);
  try {
    const token = await tokenRequest(new URLSearchParams({ grant_type: "refresh_token", refresh_token: await decryptSecret(row.refresh_token) }));
    await getD1().prepare("UPDATE spotify_connections SET access_token=?, refresh_token=?, expires_at=?, scopes=?, updated_at=? WHERE user_id=?")
      .bind(await encryptSecret(token.access_token), token.refresh_token ? await encryptSecret(token.refresh_token) : row.refresh_token, new Date(Date.now() + token.expires_in * 1000).toISOString(), token.scope ?? row.scopes, nowIso(), userId).run();
    return token.access_token;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("invalid_grant")) await getD1().prepare("DELETE FROM spotify_connections WHERE user_id=?").bind(userId).run();
    throw error;
  }
}

export async function spotifyFetch<T>(userId: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.spotify.com/v1${path}`, { ...init, headers: { Authorization: `Bearer ${await accessToken(userId)}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (response.status === 429) throw new Error(`Spotify rate limit reached. Retry after ${response.headers.get("retry-after") ?? "a short delay"} seconds.`);
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
  if (!response.ok) throw new Error(`Spotify request failed (${response.status}): ${payload.error?.message ?? "unknown error"}`);
  return payload as T;
}

export async function getConnectionSummary(userId: string) {
  const row = await connection(userId); if (!row) return null;
  return { spotifyUserId: row.spotify_user_id, displayName: row.display_name, scopes: row.scopes.split(" "), expiresAt: row.expires_at };
}
