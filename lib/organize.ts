import type { Track, Features, Suggestion } from "./model";
import { ALGORITHM } from "./model";
const units = [
  "acousticness",
  "danceability",
  "energy",
  "instrumentalness",
  "liveness",
  "speechiness",
  "valence",
] as const;
const quantile = (sorted: number[], q: number) =>
  sorted[Math.floor((sorted.length - 1) * q)] ?? 0;
const dist = (a: number[], b: number[]) =>
  Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
export function normalize(tracks: Track[]) {
  const backed = tracks.filter((t) => t.features);
  const tempo = backed
      .map((t) => Math.log(t.features!.tempo))
      .sort((a, b) => a - b),
    loud = backed.map((t) => t.features!.loudness).sort((a, b) => a - b);
  const scale = (v: number, s: number[]) => {
    const lo = quantile(s, 0.1),
      hi = quantile(s, 0.9);
    return hi - lo < 1e-8
      ? 0.5
      : Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  };
  return tracks.map((t) => ({
    ...t,
    vector: t.features
      ? [
          ...units.map((k) => t.features![k]),
          scale(Math.log(t.features.tempo), tempo),
          scale(t.features.loudness, loud),
        ]
      : undefined,
  }));
}
function mean(v: number[][]) {
  return v[0].map((_, i) => v.reduce((s, x) => s + x[i], 0) / v.length);
}
export function kmeans(v: number[][], k: number, seed = 711) {
  let state = seed;
  const rng = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const centers = [v[Math.floor(rng() * v.length)]];
  while (centers.length < k) {
    const weights = v.map((x) =>
      Math.min(...centers.map((c) => dist(x, c) ** 2)),
    );
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum < 1e-10) return { centers: [mean(v)], labels: v.map(() => 0) };
    let p = rng() * sum,
      index = 0;
    while (index < weights.length - 1 && (p -= weights[index]) > 0) index++;
    centers.push(v[index]);
  }
  let labels: number[] = v.map(() => -1);
  for (let iteration = 0; iteration < 60; iteration++) {
    const next = v.map((x) =>
      centers.reduce(
        (best, c, i) => (dist(x, c) < dist(x, centers[best]) ? i : best),
        0,
      ),
    );
    if (next.every((x, i) => x === labels[i])) break;
    labels = next;
    for (let i = 0; i < k; i++) {
      const members = v.filter((_, j) => labels[j] === i);
      if (members.length) centers[i] = mean(members);
    }
  }
  return { labels, centers };
}
export function silhouette(v: number[][], labels: number[], distances?: Map<number, Float64Array>) {
  const sample = v
    .map((_, i) => i)
    .filter((i) => i % Math.max(1, Math.ceil(v.length / 200)) === 0);
  return (
    sample.reduce((score, i) => {
      const own = v
        .map((_, j) => j)
        .filter((j) => labels[j] === labels[i] && j !== i);
      if (!own.length) return score;
      const distance = (j: number) => distances?.get(i)?.[j] ?? dist(v[i], v[j]);
      const a = own.reduce((s, j) => s + distance(j), 0) / own.length;
      const other = [...new Set(labels)].filter((x) => x !== labels[i]);
      const b = Math.min(
        ...other.map((label) => {
          const members = v.map((_, j) => j).filter((j) => labels[j] === label);
          return (
            members.reduce((s, j) => s + distance(j), 0) / members.length
          );
        }),
      );
      return score + (Number.isFinite(b) ? (b - a) / Math.max(a, b, 1e-10) : 0);
    }, 0) / sample.length
  );
}
function descriptor(f: Features[]) {
  const energy = f.reduce((s, x) => s + x.energy, 0) / f.length,
    dance = f.reduce((s, x) => s + x.danceability, 0) / f.length,
    instrument = f.reduce((s, x) => s + x.instrumentalness, 0) / f.length;
  return `${energy > 0.68 ? "High energy" : energy < 0.35 ? "Low key" : "Easy flow"}${instrument > 0.65 ? " · Instrumental" : dance > 0.65 ? " · Rhythmic" : ""}`;
}
export type Profile = {
  name: string;
  target: Partial<Features>;
  weight: Partial<Features>;
  min?: Partial<Features>;
  max?: Partial<Features>;
};
export const profiles: readonly Profile[] = [
  {
    name: "Chill",
    target: { energy: 0.2, acousticness: 0.7, valence: 0.45 },
    weight: { energy: 3, acousticness: 1, valence: 0.5 },
  },
  {
    name: "Upbeat",
    target: { energy: 0.75, danceability: 0.75, valence: 0.8 },
    weight: { energy: 1, danceability: 2, valence: 2 },
  },
  {
    name: "Workout",
    target: { energy: 0.9, danceability: 0.65 },
    weight: { energy: 3, danceability: 1 },
  },
  {
    name: "Instrumental Focus",
    target: { instrumentalness: 1, speechiness: 0, energy: 0.35 },
    weight: { instrumentalness: 4, speechiness: 2, energy: 0.5 },
  },
  { name: "Acoustic", target: { acousticness: .90, energy: .35 }, weight: { acousticness: 4, energy: 1 }, min: { acousticness: .70 } },
  { name: "Acoustic Instrumentals", target: { acousticness: .90, instrumentalness: .90, speechiness: .05 }, weight: { acousticness: 3, instrumentalness: 4, speechiness: 1 }, min: { acousticness: .70, instrumentalness: .65 } },
  { name: "Dance", target: { danceability: .90, energy: .70 }, weight: { danceability: 4, energy: 1 }, min: { danceability: .75 } },
  { name: "Mellow Instrumentals", target: { instrumentalness: .90, energy: .20, speechiness: .05 }, weight: { instrumentalness: 4, energy: 3, speechiness: 1 }, min: { instrumentalness: .65 }, max: { energy: .35 } },
  { name: "High-Energy Instrumentals", target: { instrumentalness: .90, energy: .85 }, weight: { instrumentalness: 4, energy: 3 }, min: { instrumentalness: .65, energy: .70 } },
  { name: "Bright & Mellow", target: { valence: .85, energy: .25 }, weight: { valence: 3, energy: 3 }, min: { valence: .70 }, max: { energy: .40 } },
  { name: "Dark & Intense", target: { valence: .20, energy: .85 }, weight: { valence: 3, energy: 3 }, min: { energy: .70 }, max: { valence: .35 } },
  { name: "Reflective", target: { valence: .20, energy: .25 }, weight: { valence: 3, energy: 3 }, max: { valence: .35, energy: .40 } },
  { name: "Rhythmic & Mellow", target: { danceability: .80, energy: .30 }, weight: { danceability: 3, energy: 3 }, min: { danceability: .65 }, max: { energy: .45 } },
  { name: "Vocal & Spoken", target: { speechiness: .65, instrumentalness: .05 }, weight: { speechiness: 4, instrumentalness: 2 }, min: { speechiness: .33 }, max: { instrumentalness: .35 } },
];

export const featureCategories: readonly {
  name: string;
  key: keyof Features;
  minimum: number;
}[] = [
  { name: "Danceability", key: "danceability", minimum: 0.75 },
  { name: "Energy", key: "energy", minimum: 0.75 },
  { name: "Acousticness", key: "acousticness", minimum: 0.75 },
  { name: "Instrumentalness", key: "instrumentalness", minimum: 0.65 },
  { name: "Liveness", key: "liveness", minimum: 0.7 },
  { name: "Speechiness", key: "speechiness", minimum: 0.33 },
  { name: "Valence", key: "valence", minimum: 0.75 },
];

export function profileScore(f: Features, p: Profile) {
  let total = 0, weight = 0;
  for (const key of Object.keys(p.target) as (keyof Features)[]) {
    const w = p.weight[key]!;
    total += w * Math.abs(f[key] - p.target[key]!);
    weight += w;
  }
  return 1 - total / weight;
}
export function fitsProfile(f: Features, p: Profile) {
  return Object.entries(p.min ?? {}).every(([key, value]) => f[key as keyof Features] >= value)
    && Object.entries(p.max ?? {}).every(([key, value]) => f[key as keyof Features] <= value)
    && profileScore(f, p) >= .76;
}
export function clusterName(features: Features[]) {
  const avg = (key: keyof Features) => features.reduce((s, f) => s + f[key], 0) / features.length;
  const instrument = avg("instrumentalness"), acoustic = avg("acousticness"), energy = avg("energy"), valence = avg("valence"), tempo = avg("tempo");
  const texture = instrument > .65 ? (acoustic > .70 ? "Acoustic instrumental" : "Instrumental")
    : avg("speechiness") >= .33 ? "Vocal & spoken" : acoustic > .70 ? "Acoustic" : "";
  return [texture, valence > .65 ? "Bright" : valence < .35 ? "Reflective" : "",
    energy > .68 ? "High energy" : energy < .35 ? "Low key" : "Easy flow",
    !texture && avg("danceability") > .65 ? "Rhythmic" : "",
    tempo < 90 ? "Slow pace" : tempo > 130 ? "Fast pace" : ""].filter(Boolean).join(" · ");
}
export function numberDuplicateNames(names: string[]) {
  const counts = new Map<string, number>();
  return names.map(name => {
    if (names.filter(n => n === name).length < 2) return name;
    const count = (counts.get(name) ?? 0) + 1;
    counts.set(name, count);
    return `${name} ${count}`;
  });
}
export function nearDuplicate(ids: string[], other: string[]) {
  const set = new Set(other), intersection = ids.filter(id => set.has(id)).length;
  return intersection / (ids.length + set.size - intersection) >= .85;
}
export function organize(input: Track[], mode: string, algorithm: string = ALGORITHM, variation = 0): { tracks: Track[]; suggestions: Suggestion[] } {
  if (algorithm !== "sortify-v1" && algorithm !== "sortify-v2") throw new Error(`Unsupported algorithm: ${algorithm}`);
  if (mode === "blend") {
    const groups = organize(input, "groups", algorithm, variation);
    const categories = organize(input, "activity", algorithm);
    const combined: Suggestion[] = [];
    // Natural groups provide coverage; curated categories add different lenses.
    const candidates = groups.suggestions.flatMap((group, i) => [
      group, ...(categories.suggestions[i] ? [categories.suggestions[i]] : []),
    ]).concat(categories.suggestions.slice(groups.suggestions.length));
    for (const suggestion of candidates) {
      if (combined.some(s => nearDuplicate(suggestion.trackIds, s.trackIds))) continue;
      combined.push({ ...suggestion, id: `${algorithm}-blend-${combined.length}` });
    }
    const covered = new Set(combined.flatMap(s => s.trackIds));
    const remainder = groups.tracks.filter(t => !covered.has(t.id));
    if (remainder.length) combined.push({
      id: `${algorithm}-blend-${combined.length}`,
      name: "More from your library",
      trackIds: remainder.map(t => t.id),
      selected: true,
    });
    const names = numberDuplicateNames(combined.map(s => s.name));
    return { tracks: groups.tracks, suggestions: combined.map((s, i) => ({ ...s, name: names[i] })) };
  }
  const legacy = algorithm === "sortify-v1";
  const tracks = normalize([...input].sort((a, b) => a.id.localeCompare(b.id))),
    backed = tracks.filter((t) => t.features),
    missing = tracks.filter((t) => !t.features);
  const suggestions: Suggestion[] = [];
  const add = (name: string, members: Track[]) => {
    if (members.length)
      suggestions.push({
        id: `${algorithm}-${suggestions.length}`,
        name,
        trackIds: members.map((t) => t.id),
        selected: true,
      });
  };
  if (mode === "artist") {
    const artists = new Map<string, Track[]>();
    for (const track of tracks) {
      const artist = track.artists[0];
      if (!artist) continue;
      artists.set(artist.id || artist.name, [...(artists.get(artist.id || artist.name) ?? []), track]);
    }
    const assigned = new Set<string>();
    for (const members of [...artists.values()].sort((a, b) =>
      b.length - a.length || (a[0].artists[0]?.name ?? "").localeCompare(b[0].artists[0]?.name ?? ""))) {
      // Artist playlists are useful only when there are more than three songs.
      if (members.length < 4) continue;
      add(`More by ${members[0].artists[0].name}`, members);
      members.forEach((track) => assigned.add(track.id));
    }
    add("More from your library", tracks.filter((track) => !assigned.has(track.id)));
  } else if (mode === "activity") {
    if (!legacy) {
      // A feature category is an inclusive rule: every song over its threshold
      // belongs, even if it also appears in another category.
      for (const category of featureCategories)
        add(
          category.name,
          backed.filter((track) => track.features![category.key] >= category.minimum),
        );
    }
    const featureCategoryCount = suggestions.length;
    for (const p of legacy ? profiles.slice(0, 4) : profiles) {
      const score = (t: Track) => profileScore(t.features!, p);
      const members = backed
          .filter((t) => legacy ? score(t) >= 0.76 : fitsProfile(t.features!, p))
          .sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
          .slice(0, 100);
      if (!legacy && suggestions.slice(featureCategoryCount).some(s => nearDuplicate(members.map(t => t.id), s.trackIds))) continue;
      add(p.name, members);
    }
  } else if (backed.length) {
    const v = backed.map((t) => t.vector!);
    // Cache only sampled rows, bounded to about 200 × n distances per run.
    const distances = legacy ? undefined : new Map<number, Float64Array>();
    if (distances && v.length >= 20) {
      for (let i = 0; i < v.length; i += Math.max(1, Math.ceil(v.length / 200))) {
        distances.set(i, Float64Array.from(v, x => dist(v[i], x)));
      }
    }
    let best = { labels: v.map(() => 0), centers: [mean(v)] },
      bestScore = 0.15;
    for (let k = 2; k <= Math.min(legacy ? 8 : 16, Math.floor(v.length / 10)); k++) {
      const candidate = kmeans(v, k, 711 + variation * 997);
      if (
        candidate.centers.length !== k ||
        Array.from(
          { length: k },
          (_, i) => candidate.labels.filter((x) => x === i).length,
        ).some((n) => n < 10)
      )
        continue;
      const score = silhouette(v, candidate.labels, distances);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    const names = legacy ? [] : numberDuplicateNames(best.centers.map((_, i) => clusterName(backed.filter((_, j) => best.labels[j] === i).map(t => t.features!))));
    best.centers.forEach((_, i) => {
      const members = backed.filter((_, j) => best.labels[j] === i);
      add(
        legacy ? descriptor(members.map((t) => t.features!)) +
          (best.centers.length > 1 ? ` ${i + 1}` : "") : names[i],
        members,
      );
    });
  }
  // Metadata relationships never produce audio or mood assertions.
  const unassigned =
    mode === "activity"
      ? tracks.filter(
          (t) => !suggestions.some((s) => s.trackIds.includes(t.id)),
        )
      : missing;
  const buckets = new Map<string, Track[]>();
  for (const t of unassigned) {
    const artist = t.artists[0];
    const key = artist?.id
      ? `artist:${artist.id}`
      : t.album.id
        ? `album:${t.album.id}`
        : `source:${t.sources[0]}`;
    buckets.set(key, [...(buckets.get(key) ?? []), t]);
  }
  const remainder: Track[] = [];
  for (const group of buckets.values()) {
    if (group.length >= 3)
      add(
        group[0].artists[0]?.name
          ? `More by ${group[0].artists[0].name}`
          : group[0].album.name,
        group,
      );
    else remainder.push(...group);
  }
  add("More from your library", remainder);
  return { tracks, suggestions };
}
