import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { cookieOptions } from "../../../../lib/auth";
import { equal, randomToken, digest, encrypt } from "../../../../lib/security";
import { tokenExchange } from "../../../../lib/spotify";
import { db } from "../../../../lib/db";
import { users, sessions } from "../../../../db/schema";
import { spotifySetupError } from "../../../../lib/spotify-setup";
export async function GET(req: Request) {
  const url = new URL(req.url),
    jar = await cookies(),
    expected = jar.get("sortify_oauth")?.value;
  jar.delete("sortify_oauth");
  const base = process.env.APP_URL ?? url.origin;
  let stage = "state";
  try {
    const state = url.searchParams.get("state"),
      code = url.searchParams.get("code");
    if (!expected || !state || !equal(expected, state) || !code)
      throw new Error("Invalid OAuth state");
    const setupError = spotifySetupError();
    if (setupError) return Response.redirect(base + "/?error=" + setupError);
    stage = "token";
    const t = await tokenExchange(
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      }),
    );
    if (!t.refresh_token) throw new Error("Missing refresh token");
    stage = "profile";
    const r = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: "Bearer " + t.access_token },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error("Profile failed");
    const u = (await r.json()) as { id: string; display_name: string };
    if (!u.id) throw new Error("Invalid profile");
    stage = "session";
    await db().transaction(async (tx) => {
      await tx
        .insert(users)
        .values({
          id: u.id,
          name: u.display_name ?? "Music lover",
          access: encrypt(t.access_token),
          refresh: encrypt(t.refresh_token!),
          expires: new Date(Date.now() + t.expires_in * 1000),
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            name: u.display_name ?? "Music lover",
            access: encrypt(t.access_token),
            refresh: encrypt(t.refresh_token!),
            expires: new Date(Date.now() + t.expires_in * 1000),
          },
        });
      const old = jar.get("sortify_session")?.value;
      if (old) await tx.delete(sessions).where(eq(sessions.id, digest(old)));
      const token = randomToken();
      await tx.insert(sessions).values({
        id: digest(token),
        userId: u.id,
        expires: new Date(Date.now() + 7 * 86400000),
      });
      jar.set("sortify_session", token, {
        ...cookieOptions,
        maxAge: 7 * 86400,
      });
    });
    return Response.redirect(base);
  } catch (e) {
    console.warn("oauth-failed", {
      stage,
      reason: e instanceof Error ? e.name : "unknown",
    });
    return Response.redirect(base + "/?error=connect");
  }
}
