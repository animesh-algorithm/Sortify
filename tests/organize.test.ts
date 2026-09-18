import { test } from "node:test";
import assert from "node:assert/strict";
import { organize, normalize, kmeans, profiles, nearDuplicate } from "../lib/organize";
import { mapFeatures } from "../lib/features";
import { reconcileItems } from "../lib/publication";
import { encrypt, decrypt, equal, digest } from "../lib/security";
import type { Track, Features } from "../lib/model";
const features: Features = {
  acousticness: 0.5,
  danceability: 0.7,
  energy: 0.8,
  instrumentalness: 0.1,
  liveness: 0.2,
  speechiness: 0.1,
  valence: 0.8,
  tempo: 120,
  loudness: -7,
};
const track = (i: number, f: Features | undefined = features): Track => ({
  id: String(i).padStart(22, "0"),
  name: `Track ${i}`,
  artists: [
    { id: `artist-${Math.floor(i / 3)}`, name: `Artist ${Math.floor(i / 3)}` },
  ],
  album: { id: "album", name: "Album" },
  sources: ["liked"],
  features: f,
});
test("blended suggestions combine both lenses with coverage and no near duplicates", () => {
  const input = Array.from({ length: 140 }, (_, i) => track(i));
  const result = organize(input, "blend");
  assert.deepEqual(result, organize([...input].reverse(), "blend"));
  assert.equal(new Set(result.suggestions.flatMap(s => s.trackIds)).size, input.length);
  assert.ok(result.suggestions.some(s => s.name === "Upbeat"));
  assert.ok(result.suggestions.some(s => s.trackIds.length === input.length));
  assert.equal(new Set(result.suggestions.map(s => s.id)).size, result.suggestions.length);
  for (const [i, suggestion] of result.suggestions.entries())
    assert.ok(result.suggestions.slice(0, i).every(s => !nearDuplicate(suggestion.trackIds, s.trackIds)));
  const alternate = organize(input, "blend", "sortify-v2", 2);
  assert.deepEqual(alternate, organize([...input].reverse(), "blend", "sortify-v2", 2));
  assert.equal(new Set(alternate.suggestions.flatMap(s => s.trackIds)).size, input.length);
});
test("encryption authenticates ciphertext and hides tokens", () => {
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 5).toString("base64");
  const a = encrypt("secret-token"),
    b = encrypt("secret-token");
  assert.notEqual(a, b);
  assert.equal(decrypt(a), "secret-token");
  const changed = Buffer.from(a, "base64");
  changed[30] ^= 1;
  assert.throws(() => decrypt(changed.toString("base64")));
  assert.ok(equal("a", "a"));
  assert.ok(!equal("a", "aa"));
  assert.notEqual(digest("session"), digest("other"));
});
test("explicit mapping accepts reordered responses and preserves missing IDs", () => {
  const ids = [track(1).id, track(2).id, track(3).id];
  const m = mapFeatures(
    {
      content: [
        { href: `https://open.spotify.com/track/${ids[1]}`, ...features },
        {
          href: `https://open.spotify.com/track/${ids[0]}`,
          ...features,
          energy: 0.4,
        },
      ],
    },
    ids,
  );
  assert.equal(m.get(ids[0])?.energy, 0.4);
  assert.ok(!m.has(ids[2]));
  assert.throws(() =>
    mapFeatures(
      { content: [{ href: `https://evil.test/track/${ids[0]}`, ...features }] },
      ids,
    ),
  );
  assert.throws(() =>
    mapFeatures(
      {
        content: [
          {
            href: `https://open.spotify.com/track/${ids[0]}`,
            ...features,
            energy: 2,
          },
        ],
      },
      ids,
    ),
  );
  assert.throws(() =>
    mapFeatures(
      {
        content: [
          {
            href: `https://open.spotify.com/track/${ids[0]}`,
            ...features,
            tempo: 0,
          },
        ],
      },
      ids,
    ),
  );
});
test("small and constant collections yield one natural group with finite vectors", () => {
  for (const n of [1, 8, 40]) {
    const result = organize(
      Array.from({ length: n }, (_, i) => track(i)),
      "groups",
    );
    assert.equal(result.suggestions.length, 1);
    assert.equal(result.suggestions[0].trackIds.length, n);
    assert.ok(result.tracks.every((t) => t.vector!.every(Number.isFinite)));
  }
});
test("groups are deterministic under reordered input and split clear populations", () => {
  const library = Array.from({ length: 60 }, (_, i) =>
    track(i, {
      ...features,
      energy: i < 30 ? 0.1 : 0.95,
      danceability: i < 30 ? 0.1 : 0.9,
      valence: i < 30 ? 0.1 : 0.9,
      tempo: i < 30 ? 65 : 180,
    }),
  );
  const a = organize(library, "groups"),
    b = organize([...library].reverse(), "groups");
  assert.deepEqual(a, b);
  assert.equal(a.suggestions.length, 2);
  assert.ok(a.suggestions.every((s) => s.trackIds.length >= 10));
});
test("activity suggestions overlap, rank, and cap membership", () => {
  const result = organize(
    Array.from({ length: 140 }, (_, i) => track(i)),
    "activity",
    "sortify-v1",
  );
  assert.ok(result.suggestions.find((s) => s.name === "Upbeat"));
  assert.ok(result.suggestions.find((s) => s.name === "Workout"));
  assert.ok(
    result.suggestions
      .filter((s) => profiles.some((p) => p.name === s.name))
      .every((s) => s.trackIds.length <= 100),
  );
  assert.ok(
    result.suggestions
      .find((s) => s.name === "Upbeat")!
      .trackIds.some((id) =>
        result.suggestions
          .find((s) => s.name === "Workout")!
          .trackIds.includes(id),
      ),
  );
});
test("metadata-only collection preserves every track without mood claims or vectors", () => {
  const input = Array.from({ length: 17 }, (_, i) => ({
    ...track(i),
    features: undefined,
  }));
  for (const mode of ["groups", "activity"]) {
    const result = organize(input, mode);
    assert.equal(
      result.suggestions.flatMap((s) => s.trackIds).length,
      input.length,
    );
    assert.ok(result.suggestions.every((s) => s.name.startsWith("More")));
    assert.ok(result.tracks.every((t) => !t.vector && !t.features));
  }
});
test("tempo is logarithmic and dimensions robustly scaled", () => {
  const result = normalize([
    track(1, { ...features, tempo: 60 }),
    track(2, { ...features, tempo: 120 }),
    track(3, { ...features, tempo: 240 }),
  ]);
  assert.ok(result.every((t) => t.vector!.every((x) => x >= 0 && x <= 1)));
  assert.deepEqual(kmeans([[0], [0], [0]], 2).labels, [0, 0, 0]);
});
test("ambiguous append reconciles applied and unapplied batches without duplicates", () => {
  const expected = Array.from({ length: 220 }, (_, i) => String(i));
  assert.deepEqual(reconcileItems(expected.slice(0, 100), expected, 0), {
    offset: 100,
    applied: true,
  });
  assert.deepEqual(reconcileItems(expected.slice(0, 100), expected, 100), {
    offset: 100,
    applied: false,
  });
  assert.deepEqual(reconcileItems(expected, expected, 200), {
    offset: 220,
    applied: true,
  });
  assert.throws(() => reconcileItems(["wrong"], expected, 0));
  assert.throws(() => reconcileItems(expected.slice(0, 50), expected, 0));
});
test("uncertain creation requires one owned private marker and uncertain absent batches never repeat", async () => {
  const { marker, reconcileCreation, nextAppend } =
    await import("../lib/publication");
  const op = "op";
  const playlist = {
    id: "p",
    description: marker(op),
    owner: { id: "alice" },
    public: false,
  };
  assert.equal(reconcileCreation([playlist], "alice", op), "p");
  assert.throws(() => reconcileCreation([], "alice", op));
  assert.throws(() => reconcileCreation([playlist, playlist], "alice", op));
  assert.throws(() => reconcileCreation([playlist], "bob", op));
  assert.throws(() =>
    reconcileCreation([{ ...playlist, public: true }], "alice", op),
  );
  assert.throws(() => nextAppend([], ["a"], 0, true));
  assert.deepEqual(nextAppend(["a"], ["a"], 0, true), {
    offset: 1,
    applied: true,
  });
  assert.deepEqual(nextAppend([], ["a"], 0, false), {
    offset: 0,
    applied: false,
  });
});

test("early playlists include only completed checkpoints and leave final data untouched", async () => {
  const { playlistPreview } = await import("../lib/preview");
  const tracks = Array.from({ length: 60 }, (_, i) => track(i));
  const data = {
    tracks,
    sources: [],
    suggestions: [],
    skipped: 0,
    enriched: 39,
    enrichedThrough: 39,
    algorithm: "sortify-v1",
  };
  const before = structuredClone(data);
  const preview = playlistPreview(data, "groups");
  assert.equal(preview.checked, 25);
  assert.ok(preview.suggestions.length);
  const ids = new Set(tracks.slice(0, 25).map((t) => t.id));
  assert.ok(
    preview.suggestions.every((s) => s.trackIds.every((id) => ids.has(id))),
  );
  assert.deepEqual(data, before);
  assert.equal(
    playlistPreview({ ...data, enrichedThrough: 19 }, "groups").suggestions
      .length,
    0,
  );
  assert.equal(
    playlistPreview({ ...data, enrichedThrough: 50 }, "groups").checked,
    50,
  );
});
