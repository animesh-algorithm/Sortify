import { randomUUID } from "node:crypto";
import { z } from "zod";
import { sameOrigin, requireUser } from "../../../lib/auth";
import { sources } from "../../../lib/spotify";
import { db } from "../../../lib/db";
import { runs } from "../../../db/schema";
import { inngest } from "../../../lib/jobs";
import { ALGORITHM } from "../../../lib/model";
import { failure } from "../../../lib/http";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await requireUser(),
      input = z
        .object({
          sources: z.array(z.string()).min(1).max(100),
          mode: z.enum(["groups", "activity", "blend"]).default("blend"),
        })
        .parse(await req.json());
    const accessible = await sources(u.id),
      selected = accessible.filter((s) => input.sources.includes(s.id));
    if (selected.length !== new Set(input.sources).size)
      throw new Error("Invalid source");
    const id = randomUUID();
    await db()
      .insert(runs)
      .values({
        id,
        userId: u.id,
        mode: input.mode,
        status: "queued",
        data: {
          sources: selected,
          tracks: [],
          suggestions: [],
          skipped: 0,
          enriched: 0,
          algorithm: ALGORITHM,
        },
      });
    try {
      await inngest.send({
        id: `organization-${id}`,
        name: "sortify/organize",
        data: { runId: id },
      });
    } catch {
      /* A queued run can be dispatched again through Resume. */
    }
    return Response.json({ id }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
