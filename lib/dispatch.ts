import "server-only";
import { and, eq } from "drizzle-orm";
import { runs } from "../db/schema";
import { db } from "./db";
import { inngest } from "./jobs";

type JobEvent = "sortify/organize" | "sortify/publish";
type Dispatch = { id?: string; name: JobEvent; data: { runId: string } };
export const DISPATCH_ERROR =
  "We could not start this job. Try again in a moment.";

export async function dispatchRun(
  runId: string,
  name: JobEvent,
  eventId?: string,
  dependencies = {
    send: (event: Dispatch): Promise<unknown> => inngest.send(event),
    fail: async (id: string, event: JobEvent) => {
      await db()
        .update(runs)
        .set({
          status: event === "sortify/organize" ? "failed" : "publish_failed",
          error: DISPATCH_ERROR,
        })
        .where(
          and(
            eq(runs.id, id),
            eq(runs.cancelled, false),
            eq(
              runs.status,
              event === "sortify/organize" ? "queued" : "publishing",
            ),
          ),
        );
    },
  },
) {
  try {
    await dependencies.send({
      ...(eventId ? { id: eventId } : {}),
      name,
      data: { runId },
    });
  } catch (error) {
    console.warn("job-dispatch-failed", {
      runId,
      event: name,
      reason: error instanceof Error ? error.name : "unknown",
    });
    // Preserve the saved selection/checkpoints, but release the active-run lock
    // and expose the existing Resume action instead of waiting indefinitely.
    await dependencies.fail(runId, name);
    throw new Error("Job dispatch failed");
  }
}
