import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateEdit,
  canPublish,
  importSelection,
  recluster,
  assertImportsUnchanged,
} from "../lib/workflow";
import { pages, parseTrack, mergeTracks } from "../lib/spotify";
import type { RunData } from "../lib/model";
const data: RunData = {
  sources: [],
  tracks: [
    {
      id: "a",
      name: "A",
      artists: [],
      album: { id: "x", name: "X" },
      sources: ["liked"],
    },
  ],
  suggestions: [{ id: "s", name: "S", trackIds: ["a"], selected: true }],
  skipped: 0,
  enriched: 0,
  algorithm: "v1",
};
test("individual import authorizes only requested playlists and blocks repeat imports", () => {
  const library = {
    ...data,
    suggestions: [
      ...data.suggestions,
      { id: "t", name: "T", trackIds: ["a"], selected: true },
    ],
  };
  assert.deepEqual(importSelection(library, ["s"], []), [data.suggestions[0]]);
  assert.equal(importSelection(library, ["s", "t"], []).length, 2);
  assert.throws(() => importSelection(library, ["s"], ["s"]));
  assert.throws(() => importSelection(library, ["missing"], []));
  assert.throws(() => importSelection(library, ["s", "s"], []));
  assert.throws(() => importSelection(library, [], []));
});
test("imported suggestions remain locked across later review revisions", () => {
  assertImportsUnchanged(
    data.suggestions,
    data.suggestions.map((s) => ({
      selected: s.selected,
      trackIds: s.trackIds,
      name: s.name,
      id: s.id,
    })),
    ["s"],
  );
  for (const patch of [
    { name: "Changed" },
    { selected: false },
    { trackIds: [] },
  ]) {
    assert.throws(() =>
      assertImportsUnchanged(
        data.suggestions,
        [{ ...data.suggestions[0], ...patch }],
        ["s"],
      ),
    );
  }
  assert.throws(() => assertImportsUnchanged(data.suggestions, [], ["s"]));
  assertImportsUnchanged(
    data.suggestions,
    [{ ...data.suggestions[0], name: "Changed" }],
    [],
  );
});
test("reclustering preserves imports, excludes imported tracks, and uses saved algorithm", () => {
  const library = {
    ...data,
    algorithm: "sortify-v1",
    tracks: [...data.tracks, { ...data.tracks[0], id: "b" }],
  };
  const result = recluster(library, "groups", 3, ["s"]);
  assert.deepEqual(result.suggestions[0], library.suggestions[0]);
  assert.deepEqual(
    result.suggestions.slice(1).flatMap((s) => s.trackIds),
    ["b"],
  );
  assert.ok(result.suggestions[1].id.endsWith(":review-4"));
  assert.deepEqual(result, recluster(library, "groups", 3, ["s"]));
  assert.throws(() =>
    recluster({ ...library, algorithm: "unknown" }, "groups", 3, []),
  );
});
test("editing invalidates exact revision approval and rejects foreign tracks", () => {
  const run = { status: "ready", revision: 2, approvedRevision: 2, data };
  assert.ok(canPublish(run, 2));
  const edit = validateEdit(run, 2, [{ ...data.suggestions[0], name: "New" }]);
  assert.equal(edit.approvedRevision, null);
  assert.equal(edit.revision, 3);
  assert.ok(!canPublish({ ...run, ...edit }, 3));
  assert.throws(() => validateEdit(run, 1, data.suggestions));
  assert.throws(() =>
    validateEdit(run, 2, [{ ...data.suggestions[0], trackIds: ["foreign"] }]),
  );
  assert.ok(!canPublish({ ...run, status: "publishing" }, 2));
});
test("pagination gathers every page and rejects provider redirects", async () => {
  const calls: string[] = [];
  const call = async (_user: string, path: string) => {
    calls.push(path);
    return path === "/me/tracks?limit=50"
      ? { items: [1], next: "https://api.spotify.com/v1/me/tracks?offset=1" }
      : { items: [2], next: null };
  };
  assert.deepEqual(
    await pages<number>("u", "/me/tracks?limit=50", call),
    [1, 2],
  );
  assert.equal(calls.length, 2);
  await assert.rejects(() =>
    pages("u", "/test", async () => ({
      items: [],
      next: "https://evil.test/v1/me",
    })),
  );
  await assert.rejects(() =>
    pages("u", "/test", async () => ({
      items: [],
      next: "https://api.spotify.com/v1/test",
    })),
  );
});
test("deduplication preserves membership and skips unsupported items", () => {
  const source = {
    id: "a",
    name: "A",
    type: "track",
    artists: [{ id: "ar", name: "Artist" }],
    album: { id: "al", name: "Album" },
  };
  const a = parseTrack(source, "liked")!,
    b = parseTrack(source, "playlist")!;
  assert.deepEqual(mergeTracks([a, b])[0].sources, ["liked", "playlist"]);
  assert.equal(parseTrack({ ...source, is_local: true }, "x"), null);
  assert.equal(parseTrack({ ...source, type: "episode" }, "x"), null);
  assert.equal(parseTrack({ ...source, is_playable: false }, "x"), null);
  assert.equal(parseTrack(null, "x"), null);
});
