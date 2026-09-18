import "server-only";
import { Inngest } from "inngest";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { runs, publications } from "../db/schema";
import { importPage, sourcePath, mergeTracks, spotify, pages } from "./spotify";
import { enrich } from "./recco";
import { organize } from "./organize";
import { ProviderError } from "./request";
import { marker, reconcileCreation, nextAppend } from "./publication";
export const inngest = new Inngest({ id: "sortify" });
async function getRun(id: string) {
  const [r] = await db()
    .select()
    .from(runs)
    .where(and(eq(runs.id, id), eq(runs.cancelled, false)));
  if (!r) throw new Error("Run not found");
  return r;
}
async function alive(id: string) {
  const r = await getRun(id);
  if (r.cancelled || r.status === "cancelled") throw new Error("Run cancelled");
  return r;
}
export const organizationJob = inngest.createFunction(
  {
    id: "organize-library",
    retries: 3,
    concurrency: [{ limit: 1, key: "event.data.runId" }],
    onFailure: async ({ event }) => {
      const id = event.data.event.data.runId;
      await db()
        .update(runs)
        .set({
          status: "failed",
          error:
            "We could not finish organizing. Try again or reconnect Spotify.",
        })
        .where(and(eq(runs.id, id), eq(runs.cancelled, false)));
    },
  },
  { event: "sortify/organize" },
  async ({ event, step }) => {
    const id = event.data.runId as string;
    const initial = await step.run("load", async () => {
      const r = await alive(id);
      return {
        status: r.status,
        data: { sources: r.data.sources, importCursors: r.data.importCursors },
      };
    });
    if (
      !["queued", "importing", "enriching", "analyzing", "failed"].includes(
        initial.status,
      )
    )
      return;
    for (const source of initial.data.sources) {
      await step.run(`access-${source.id}`, async () => {
        const r = await alive(id);
        if (source.id !== "liked") {
          const p = await spotify(r.userId, `/playlists/${source.id}`);
          if (p.owner?.id !== r.userId && !p.collaborative)
            throw new Error("Source is no longer accessible");
        }
      });
      let path: string | null =
        initial.data.importCursors?.[source.id] ?? sourcePath(source.id);
      let index = 0;
      while (path) {
        const next: string | null = await step.run(
          `import-${source.id}-${index}`,
          async () => {
            const r = await alive(id);
            if (r.data.importedSources?.includes(source.id)) return null;
            const cursor = r.data.importCursors?.[source.id] ?? path!;
            if (r.data.importSeen?.[source.id]?.includes(cursor))
              throw new Error("Repeated pagination");
            await db()
              .update(runs)
              .set({ status: "importing", error: null })
              .where(and(eq(runs.id, id), eq(runs.cancelled, false)));
            const imported = await importPage(r.userId, source.id, cursor);
            await db()
              .update(runs)
              .set({
                data: {
                  ...r.data,
                  tracks: mergeTracks([...r.data.tracks, ...imported.tracks]),
                  skipped: r.data.skipped + imported.skipped,
                  importSeen: {
                    ...r.data.importSeen,
                    [source.id]: [
                      ...(r.data.importSeen?.[source.id] ?? []),
                      cursor,
                    ],
                  },
                  importCursors: {
                    ...r.data.importCursors,
                    [source.id]: imported.next,
                  },
                  importedSources: imported.next
                    ? r.data.importedSources
                    : [...(r.data.importedSources ?? []), source.id],
                },
              })
              .where(and(eq(runs.id, id), eq(runs.cancelled, false)));
            return imported.next;
          },
        );
        path = next;
        index++;
      }
    }
    const imported = await step.run("import-complete", async () => ({
      count: (await alive(id)).data.tracks.length,
    }));
    for (let start = 0; start < imported.count; start += 2) {
      await step.run(`enrich-${start}`, async () => {
        const r = await alive(id);
        if ((r.data.enrichedThrough ?? 0) > start) return;
        await db()
          .update(runs)
          .set({ status: "enriching" })
          .where(and(eq(runs.id, id), eq(runs.cancelled, false)));
        let matched: Awaited<ReturnType<typeof enrich>> = {};
        try {
          matched = await enrich(
            r.data.tracks.slice(start, start + 2).map((t) => t.id),
          );
        } catch (e) {
          console.warn("enrichment-provider-failure", {
            runId: id,
            error: e instanceof Error ? e.message : "unknown",
          });
          throw e;
        }
        await alive(id);
        const tracks = r.data.tracks.map((t) => ({
          ...t,
          features: matched[t.id] ?? t.features,
        }));
        await db()
          .update(runs)
          .set({
            data: {
              ...r.data,
              tracks,
              enriched: Math.min(start + 2, tracks.length),
              enrichedThrough: Math.min(start + 2, tracks.length),
            },
          })
          .where(and(eq(runs.id, id), eq(runs.cancelled, false)));
      });
    }
    await step.run("analyze", async () => {
      const r = await alive(id);
      if (
        ["ready", "publishing", "publish_failed", "complete"].includes(r.status)
      )
        return;
      await db()
        .update(runs)
        .set({ status: "analyzing" })
        .where(and(eq(runs.id, id), eq(runs.cancelled, false)));
      const result = organize(r.data.tracks, r.mode, r.data.algorithm);
      await alive(id);
      await db()
        .update(runs)
        .set({
          status: "ready",
          revision: r.revision + 1,
          data: { ...r.data, ...result },
        })
        .where(and(eq(runs.id, id), eq(runs.cancelled, false)));
      console.info("organization-complete", {
        runId: id,
        algorithm: r.data.algorithm,
        tracks: result.tracks.length,
        suggestions: result.suggestions.length,
        featureBacked: result.tracks.filter((t) => t.features).length,
        metadataOnly: result.tracks.filter((t) => !t.features).length,
        fallbackPolicy: "artist-album-source-then-library",
      });
    });
  },
);
async function publicationWrite(
  operationId: string,
  userId: string,
  path: string,
  body: unknown,
) {
  try {
    return await spotify(userId, path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof ProviderError && e.status >= 400 && e.status < 500)
      await db()
        .update(publications)
        .set({ uncertain: false })
        .where(eq(publications.id, operationId));
    throw e;
  }
}
export async function publishOperation(operationId: string) {
  const [op] = await db()
    .select()
    .from(publications)
    .where(eq(publications.id, operationId));
  if (!op || op.status === "complete") return true;
  const run = await alive(op.runId);
  // An operation is an immutable, explicitly authorized playlist snapshot.
  // Later review revisions must not invalidate previously imported playlists.
  let playlistId = op.playlistId;
  if (!playlistId) {
    if (op.uncertain) {
      const lists = await pages<{
        id: string;
        description: string;
        owner: { id: string };
        public: boolean;
      }>(run.userId, "/me/playlists?limit=50");
      playlistId = reconcileCreation(lists, run.userId, op.id);
    } else {
      await db()
        .update(publications)
        .set({ uncertain: true, status: "creating" })
        .where(eq(publications.id, op.id));
      const created = (await publicationWrite(
        op.id,
        run.userId,
        "/me/playlists",
        { name: op.name, public: false, description: marker(op.id) },
      )) as { id: string };
      if (!created.id) throw new Error("Uncertain playlist creation");
      playlistId = created.id;
    }
    await db()
      .update(publications)
      .set({ playlistId, uncertain: false, status: "adding" })
      .where(eq(publications.id, op.id));
    return false;
  }
  let offset = op.offset;
  if (offset < op.trackIds.length) {
    await alive(op.runId);
    const actual = await pages<{ item?: { id?: string } }>(
      run.userId,
      `/playlists/${playlistId}/items?limit=50`,
    );
    const [checkpoint] = await db()
      .select()
      .from(publications)
      .where(eq(publications.id, op.id));
    const check = nextAppend(
      actual.map((x) => x.item?.id ?? ""),
      op.trackIds,
      offset,
      checkpoint.uncertain,
    );
    if (check.applied) {
      offset = check.offset;
      await db()
        .update(publications)
        .set({ offset, uncertain: false })
        .where(eq(publications.id, op.id));
    } else {
      await db()
        .update(publications)
        .set({ uncertain: true, status: "adding" })
        .where(eq(publications.id, op.id));
      await publicationWrite(
        op.id,
        run.userId,
        `/playlists/${playlistId}/items`,
        {
          uris: op.trackIds
            .slice(offset, offset + 100)
            .map((id) => `spotify:track:${id}`),
        },
      );
      offset = Math.min(offset + 100, op.trackIds.length);
      await db()
        .update(publications)
        .set({ offset, uncertain: false })
        .where(eq(publications.id, op.id));
    }
  }
  if (offset < op.trackIds.length) return false;
  await db()
    .update(publications)
    .set({ status: "complete", uncertain: false })
    .where(eq(publications.id, op.id));
  console.info("publication-complete", { operationId: op.id, playlistId });
  return true;
}
export const publicationJob = inngest.createFunction(
  {
    id: "publish-approved",
    retries: 3,
    concurrency: [{ limit: 1, key: "event.data.runId" }],
    onFailure: async ({ event }) => {
      await db()
        .update(runs)
        .set({
          status: "publish_failed",
          error:
            "Publishing paused. Try again to safely resume your playlists.",
        })
        .where(eq(runs.id, event.data.event.data.runId));
    },
  },
  { event: "sortify/publish" },
  async ({ event, step }) => {
    const id = event.data.runId as string;
    const ops = await step.run("operations", () =>
      db().select().from(publications).where(eq(publications.runId, id)),
    );
    for (const op of ops) {
      let complete = false,
        index = 0;
      while (!complete) {
        complete = await step.run(`publish-${op.id}-${index}`, () =>
          publishOperation(op.id),
        );
        index++;
      }
    }
    await step.run("complete", () =>
      db()
        .update(runs)
        .set({ status: "ready", error: null })
        .where(eq(runs.id, id)),
    );
  },
);
