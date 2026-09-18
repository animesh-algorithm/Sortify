import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { featureCache } from "../db/schema";
import { request, ProviderError } from "./request";
import { mapFeatures } from "./features";
import type { Features } from "./model";
// Two IDs were verified by the contract probe; deliberately keep this conservative.
export const RECCO_BATCH = 2;
export async function enrich(
  ids: string[],
): Promise<Record<string, Features | null>> {
  const result: Record<string, Features | null> = {},
    pending: string[] = [];
  for (const id of ids) {
    const [cache] = await db()
      .select()
      .from(featureCache)
      .where(eq(featureCache.id, id));
    if (cache && cache.expires.getTime() > Date.now())
      result[id] = cache.features;
    else pending.push(id);
  }
  for (let start = 0; start < pending.length; start += RECCO_BATCH) {
    const batch = pending.slice(start, start + RECCO_BATCH);
    let matched: Map<string, Features>;
    try {
      const r = await request(
        "https://api.reccobeats.com/v1/audio-features?ids=" + batch.join(","),
      );
      matched = mapFeatures(await r.json(), batch);
    } catch (e) {
      if (e instanceof ProviderError && e.status === 404) matched = new Map();
      else throw e;
    }
    for (const id of batch) {
      const f = matched.get(id) ?? null;
      result[id] = f;
      await db()
        .insert(featureCache)
        .values({
          id,
          features: f,
          expires: new Date(Date.now() + (f ? 30 * 86400 : 86400) * 1000),
        })
        .onConflictDoUpdate({
          target: featureCache.id,
          set: {
            features: f,
            expires: new Date(Date.now() + (f ? 30 * 86400 : 86400) * 1000),
          },
        });
    }
    console.info("feature-match", {
      requested: batch.length,
      matched: matched.size,
      mapping: "spotify-href",
      matchedIds: [...matched.keys()],
      missingIds: batch.filter((id) => !matched.has(id)),
    });
  }
  return result;
}
