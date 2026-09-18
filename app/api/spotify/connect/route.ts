import { cookies } from "next/headers";
import { randomToken } from "../../../../lib/security";
import { cookieOptions } from "../../../../lib/auth";
import { scopes } from "../../../../lib/spotify";
import { spotifySetupError } from "../../../../lib/spotify-setup";
export async function GET() {
  const setupError = spotifySetupError();
  if (setupError)
    return Response.redirect(
      new URL(
        "/?error=" + setupError,
        process.env.APP_URL ?? "http://127.0.0.1:3000",
      ),
    );
  const state = randomToken();
  (await cookies()).set("sortify_oauth", state, {
    ...cookieOptions,
    maxAge: 600,
  });
  const query = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: scopes,
    state,
  });
  return Response.redirect("https://accounts.spotify.com/authorize?" + query);
}
