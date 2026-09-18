import { test } from "node:test";
import assert from "node:assert/strict";
import { profiles, featureCategories, profileScore, fitsProfile, clusterName, numberDuplicateNames, nearDuplicate, organize } from "../lib/organize";
import { playlistPreview } from "../lib/preview";
import type { Features, Track, RunData } from "../lib/model";
const base: Features = { energy: .5, acousticness: .5, danceability: .5, instrumentalness: .1, speechiness: .1, liveness: .2, valence: .5, tempo: 110, loudness: -7 };
const track = (i: number, features: Features): Track => ({ id: String(i).padStart(22, "0"), name: "Track", artists: [], album: { id: "", name: "" }, sources: ["liked"], features });

test("all 14 profiles accept targets, reject distant features and enforce inclusive gates", () => {
  assert.equal(profiles.length, 14);
  for (const p of profiles) {
    const target = { ...base, ...p.target };
    assert.equal(profileScore(target, p), 1, p.name);
    assert.ok(fitsProfile(target, p), p.name);
    const opposite = { ...target };
    for (const key of Object.keys(p.target) as (keyof Features)[]) opposite[key] = p.target[key]! >= .5 ? 0 : 1;
    assert.ok(!fitsProfile(opposite, p), p.name);
    for (const [key, value] of Object.entries(p.min ?? {})) {
      assert.ok(fitsProfile({ ...target, [key]: value }, p), `${p.name} min boundary`);
      assert.ok(!fitsProfile({ ...target, [key]: value - .00001 }, p));
    }
    for (const [key, value] of Object.entries(p.max ?? {})) {
      assert.ok(fitsProfile({ ...target, [key]: value }, p), `${p.name} max boundary`);
      assert.ok(!fitsProfile({ ...target, [key]: value + .00001 }, p));
    }
  }
  const p = { name: "Threshold", target: { energy: 0 }, weight: { energy: 1 } };
  assert.ok(fitsProfile({ ...base, energy: .24 }, p));
  assert.ok(!fitsProfile({ ...base, energy: .24001 }, p));
});
test("feature categories include every high-scoring song without caps", () => {
  assert.ok(featureCategories.some((category) => category.name === "Danceability"));
  const input = Array.from({ length: 140 }, (_, i) => track(i, { ...base, danceability: i < 120 ? .8 : .2 }));
  const danceability = organize(input, "activity").suggestions.find((suggestion) => suggestion.name === "Danceability");
  assert.equal(danceability?.trackIds.length, 120);
  assert.ok(danceability?.trackIds.every((id) => Number(id) < 120));
});
test("artist mode creates groups only for artists with more than three songs", () => {
  const input = Array.from({ length: 9 }, (_, i) => ({
    ...track(i, base),
    artists: [{ id: i < 4 ? "four" : i < 7 ? "three" : "two", name: i < 4 ? "Four" : i < 7 ? "Three" : "Two" }],
  }));
  const suggestions = organize(input, "artist").suggestions;
  assert.equal(suggestions.find((suggestion) => suggestion.name === "More by Four")?.trackIds.length, 4);
  assert.ok(!suggestions.some((suggestion) => suggestion.name === "More by Three"));
  assert.equal(suggestions.find((suggestion) => suggestion.name === "More from your library")?.trackIds.length, 5);
});
test("names follow raw-average thresholds and texture precedence", () => {
  const name = (f: Partial<Features>) => clusterName([{ ...base, ...f }]);
  assert.equal(name({ acousticness: .8, valence: .2, energy: .2, tempo: 80 }), "Acoustic · Reflective · Low key · Slow pace");
  assert.equal(name({ instrumentalness: .8, acousticness: .8, speechiness: .8 }), "Acoustic instrumental · Easy flow");
  assert.equal(name({ instrumentalness: .8, speechiness: .8 }), "Instrumental · Easy flow");
  assert.equal(name({ speechiness: .33, acousticness: .8 }), "Vocal & spoken · Easy flow");
  assert.equal(name({ instrumentalness: .65, acousticness: .70, speechiness: .329, energy: .68, valence: .65, tempo: 130, danceability: .65 }), "Easy flow");
  assert.equal(name({ energy: .35, valence: .35, tempo: 90 }), "Easy flow");
  assert.equal(name({ energy: .9, valence: .8, tempo: 160, danceability: .8 }), "Bright · High energy · Rhythmic · Fast pace");
  assert.equal(clusterName([{ ...base, energy: .1 }, { ...base, energy: .9 }]), "Easy flow");
  assert.deepEqual(numberDuplicateNames(["A", "B", "A"]), ["A 1", "B", "A 2"]);
});
test("near duplicate threshold is inclusive", () => {
  const ids = Array.from({ length: 100 }, (_, i) => String(i));
  assert.ok(nearDuplicate(ids, ids.slice(0, 85)));
  assert.ok(!nearDuplicate(ids, ids.slice(0, 84)));
});
test("v2 categories rank, cap, overlap, suppress duplicates and preserve all tracks", () => {
  const input = Array.from({ length: 240 }, (_, i) => track(i, { ...base, energy: i < 120 ? .75 : .95, danceability: .75, valence: i < 120 ? .8 : .4 }));
  const result = organize(input, "activity");
  assert.deepEqual(result, organize([...input].reverse(), "activity"));
  const upbeat = result.suggestions.find(s => s.name === "Upbeat")!;
  const workout = result.suggestions.find(s => s.name === "Workout")!;
  assert.ok(upbeat && workout);
  const overlapping = organize(Array.from({ length: 150 }, (_, i) => track(i, { ...base, energy: i < 60 ? .75 : .95, danceability: .75, valence: i < 60 || i >= 120 ? .8 : .4 })), "activity").suggestions;
  assert.ok(overlapping.find(s => s.name === "Upbeat")!.trackIds.some(id => overlapping.find(s => s.name === "Workout")!.trackIds.includes(id)));
  assert.equal(upbeat.trackIds.length, 100);
  assert.equal(upbeat.trackIds[0], input[0].id);
  assert.equal(new Set(result.suggestions.flatMap(s => s.trackIds)).size, input.length);
  const identical = Array.from({ length: 140 }, (_, i) => track(i, { ...base, energy: .8, danceability: .7, valence: .8 }));
  const names = organize(identical, "activity").suggestions.map(s => s.name);
  assert.ok(names.includes("Upbeat"));
  assert.ok(!names.includes("Workout"));
  assert.ok(organize(identical, "activity", "sortify-v1").suggestions.some(s => s.name === "Workout"));
});
test("v1 snapshots and preview dispatch remain stable; unknown algorithms fail", () => {
  const input = Array.from({ length: 25 }, (_, i) => track(i, base));
  assert.deepEqual(organize(input, "groups", "sortify-v1").suggestions, [{ id: "sortify-v1-0", name: "Easy flow", trackIds: input.map(t => t.id), selected: true }]);
  for (const algorithm of ["sortify-v1", "sortify-v2"]) {
    const data: RunData = { tracks: input, sources: [], suggestions: [], enriched: 25, skipped: 0, algorithm };
    assert.deepEqual(playlistPreview(data, "groups").suggestions, organize(input, "groups", algorithm).suggestions);
  }
  assert.throws(() => organize([], "groups", "unknown"), /Unsupported algorithm/);
});
test("v2 can discover more than eight clear populations", () => {
  const input = Array.from({ length: 320 }, (_, i) => {
    const group = Math.floor(i / 20);
    return track(i, { ...base, energy: (group & 1) ? .95 : .05, acousticness: (group & 2) ? .95 : .05, danceability: (group & 4) ? .95 : .05, valence: (group & 8) ? .95 : .05 });
  });
  const result = organize(input, "groups");
  assert.ok(result.suggestions.length > 8);
  assert.ok(result.suggestions.length <= 16);
  assert.ok(result.suggestions.every(s => s.trackIds.length >= 10));
  assert.deepEqual(result, organize([...input].reverse(), "groups"));
});
