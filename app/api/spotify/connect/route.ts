import { getD1 } from "@/lib/db";
import { getViewer } from "@/lib/identity";
import { apiError, routeError } from "@/lib/http";
import { spotifyAuthorizationUrl } from "@/lib/spotify";

export async function GET(request: Request) {
  try {
    const viewer = getViewer(request); if (!viewer) return apiError("AUTH_REQUIRED", "Sign in to connect Spotify.", 401);
    const state = crypto.randomUUID();
    await getD1().prepare("INSERT INTO oauth_states (state,user_id,expires_at) VALUES (?,?,?)").bind(state, viewer.userId, new Date(Date.now() + 10 * 60_000).toISOString()).run();
    return Response.redirect(spotifyAuthorizationUrl(state), 302);
  } catch (error) { return routeError(error); }
}
