import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/pglite";
import { eq, and } from "drizzle-orm";
import { users, sessions, runs, publications } from "../db/schema";
import type { RunData } from "../lib/model";
test("fresh migration enforces user ownership, sessions, single active run, and idempotent publications", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      await readFile(
        new URL("../drizzle/0000_regular_scarlet_spider.sql", import.meta.url),
        "utf8",
      ),
    );
    const db = drizzle(pg);
    for (const id of ["alice", "bob"])
      await db
        .insert(users)
        .values({
          id,
          name: id,
          access: "encrypted",
          refresh: "encrypted",
          expires: new Date(),
        });
    const data: RunData = {
      sources: [],
      tracks: [],
      suggestions: [],
      skipped: 0,
      enriched: 0,
      algorithm: "v1",
    };
    await db
      .insert(runs)
      .values({
        id: "a",
        userId: "alice",
        mode: "groups",
        status: "queued",
        data,
      });
    await assert.rejects(() =>
      db
        .insert(runs)
        .values({
          id: "duplicate",
          userId: "alice",
          mode: "groups",
          status: "importing",
          data,
        }),
    );
    await db
      .insert(runs)
      .values({
        id: "b",
        userId: "bob",
        mode: "groups",
        status: "queued",
        data,
      });
    assert.equal(
      (
        await db
          .select()
          .from(runs)
          .where(and(eq(runs.id, "a"), eq(runs.userId, "bob")))
      ).length,
      0,
    );
    await db
      .insert(sessions)
      .values({ id: "hashed-session", userId: "alice", expires: new Date() });
    await db
      .insert(publications)
      .values({
        id: "p",
        runId: "a",
        suggestionId: "s",
        revision: 1,
        name: "Playlist",
        trackIds: ["x"],
      });
    await db
      .insert(publications)
      .values({
        id: "p2",
        runId: "a",
        suggestionId: "s",
        revision: 1,
        name: "Playlist",
        trackIds: ["x"],
      })
      .onConflictDoNothing();
    assert.equal((await db.select().from(publications)).length, 1);
    await db.delete(users).where(eq(users.id, "alice"));
    assert.equal((await db.select().from(sessions)).length, 0);
    assert.equal((await db.select().from(publications)).length, 0);
  } finally {
    await pg.close();
  }
});
