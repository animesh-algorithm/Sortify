import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { sameOrigin, requireUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { users } from "../../../../db/schema";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await requireUser();
    await db().delete(users).where(eq(users.id, u.id));
    (await cookies()).delete("sortify_session");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not disconnect" }, { status: 400 });
  }
}
