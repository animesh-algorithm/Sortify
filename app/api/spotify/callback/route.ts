import { getD1 } from "@/lib/db";
import { getViewer } from "@/lib/identity";
import { apiError, routeError } from "@/lib/http";
import { exchangeAuthorizationCode, storeSpotifyConnection } from "@/lib/spotify";

export async function GET(request: Request) {
  try {
    const viewer = getViewer(request); if (!viewer) return apiError("AUTH_REQUIRED", "Sign in before completing Spotify authorization.", 401);
    const url = new URL(request.url); const code = url.searchParams.get("code"); const state = url.searchParams.get("state");
    if (url.searchParams.get("error")) return Response.redirect(new URL(`/?error=${encodeURIComponent(url.searchParams.get("error")!)}`, url.origin), 302);
    if (!code || !state) return apiError("INVALID_INPUT", "Spotify callback is missing code or state.", 400);
    const db = getD1();
    const record = await db.prepare("SELECT user_id,expires_at FROM oauth_states WHERE state=?").bind(state).first<{ user_id: string; expires_at: string }>();
    await db.prepare("DELETE FROM oauth_states WHERE state=?").bind(state).run();
    if (!record || record.user_id !== viewer.userId || new Date(record.expires_at).getTime() < Date.now()) return apiError("CONFLICT", "This Spotify authorization request is invalid or expired.", 409);
    const token = await exchangeAuthorizationCode(code);
    const profileResponse = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!profileResponse.ok) throw new Error(`Spotify profile request failed (${profileResponse.status})`);
    const profile = await profileResponse.json() as { id: string; display_name?: string | null };
    await storeSpotifyConnection(viewer.userId, token, profile);
    return Response.redirect(new URL("/?connected=1", url.origin), 302);
  } catch (error) { return routeError(error); }
}
