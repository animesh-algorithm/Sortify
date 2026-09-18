import "server-only";
import { cookies } from "next/headers";
import { eq, and, gt } from "drizzle-orm";
import { db } from "./db";
import { sessions, users } from "../db/schema";
import { digest } from "./security";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
export async function currentUser() {
  const token = (await cookies()).get("sortify_session")?.value;
  if (!token) return null;
  const [s] = await db()
    .select()
    .from(sessions)
    .where(
      and(eq(sessions.id, digest(token)), gt(sessions.expires, new Date())),
    );
  if (!s) return null;
  const [u] = await db().select().from(users).where(eq(users.id, s.userId));
  return u ?? null;
}
export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new Error("Reconnect Spotify");
  return u;
}
export function sameOrigin(req: Request) {
  const url = new URL(req.url);
  const expected =
    process.env.APP_URL ??
    (process.env.NODE_ENV === "production"
      ? url.origin
      : `${url.protocol}//${req.headers.get("host") ?? url.host}`);
  if (req.headers.get("origin") !== new URL(expected).origin)
    throw new Error("Invalid request origin");
}
