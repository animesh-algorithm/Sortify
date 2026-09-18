import { eq, desc, inArray } from "drizzle-orm";
import { currentUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { runs, publications } from "../../../db/schema";
import { failure } from "../../../lib/http";
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ user: null, runs: [], publications: [] });
    const history = await db()
      .select()
      .from(runs)
      .where(eq(runs.userId, user.id))
      .orderBy(desc(runs.created))
      .limit(10);
    const ops = history.length
      ? await db()
          .select()
          .from(publications)
          .where(
            inArray(
              publications.runId,
              history.map((r) => r.id),
            ),
          )
      : [];
    return Response.json(
      {
        user: { id: user.id, name: user.name },
        runs: history.map((r) => ({
          ...r,
          data: {
            sources: r.data.sources,
            tracks: r.data.tracks.map((t) => ({
              id: t.id,
              name: t.name,
              artists: t.artists,
              album: t.album,
              image: t.image,
              sources: t.sources,
            })),
            suggestions: r.data.suggestions,
            enriched: r.data.enriched,
          },
        })),
        publications: ops,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
