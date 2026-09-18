import { and, eq } from "drizzle-orm";
import { requireUser } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";
import { runs } from "../../../../../db/schema";
import { failure } from "../../../../../lib/http";
import { playlistPreview } from "../../../../../lib/preview";

const cache = new Map<
  string,
  { checkpoint: number; result: ReturnType<typeof playlistPreview> }
>();

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const [run] = await db()
      .select()
      .from(runs)
      .where(and(eq(runs.id, id), eq(runs.userId, user.id)));
    if (!run) return Response.json({ error: "Not found" }, { status: 404 });
    if (run.cancelled || !["enriching", "analyzing"].includes(run.status)) {
      cache.delete(id);
      return Response.json(
        { checked: 0, suggestions: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const checked = Math.min(
      run.data.enrichedThrough ?? run.data.enriched,
      run.data.tracks.length,
    );
    const checkpoint = checked < 20 ? 0 : Math.floor(checked / 25) * 25 || 20;
    let entry = cache.get(id);
    if (!entry || entry.checkpoint !== checkpoint) {
      entry = { checkpoint, result: playlistPreview(run.data, run.mode) };
      if (cache.size >= 50) cache.delete(cache.keys().next().value!);
      cache.set(id, entry);
    }
    return Response.json(entry.result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
