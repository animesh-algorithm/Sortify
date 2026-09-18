import { z } from "zod";
import type { Features } from "./model";
const unit = z.number().finite().min(0).max(1);
export const featureSchema = z.object({
  acousticness: unit,
  danceability: unit,
  energy: unit,
  instrumentalness: unit,
  liveness: unit,
  speechiness: unit,
  valence: unit,
  tempo: z.number().finite().positive().max(400),
  loudness: z.number().finite().min(-100).max(20),
});
export function mapFeatures(
  body: unknown,
  requested: string[],
): Map<string, Features> {
  const envelope = z
    .object({
      content: z.array(z.object({ href: z.string(), ...featureSchema.shape })),
    })
    .parse(body);
  const allowed = new Set(requested),
    out = new Map<string, Features>();
  for (const row of envelope.content) {
    const u = new URL(row.href);
    if (u.origin !== "https://open.spotify.com")
      throw new Error("Invalid feature mapping origin");
    const id = /^\/track\/([a-zA-Z0-9]{22})$/.exec(u.pathname)?.[1];
    if (!id || !allowed.has(id) || out.has(id))
      throw new Error("Invalid or duplicate feature mapping");
    out.set(id, featureSchema.parse(row));
  }
  return out;
}
