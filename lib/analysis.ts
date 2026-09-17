export type TrackForAnalysis = { id: string; name: string; albumName: string | null; artists: string[]; releaseDate: string | null; saved: boolean; playlistCount: number };
export type CandidateTag = { trackId: string; dimension: "artist" | "decade" | "soundtrack"; value: string; confidence: "high" | "medium"; score: number; provenance: string };

export function releaseDecade(releaseDate: string | null) {
  const year = Number(releaseDate?.slice(0, 4)); if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  return `${Math.floor(year / 10) * 10}s`;
}

export function deterministicTags(track: TrackForAnalysis): CandidateTag[] {
  const tags: CandidateTag[] = [];
  for (const artist of track.artists) if (artist.trim()) tags.push({ trackId: track.id, dimension: "artist", value: artist.trim(), confidence: "high", score: 100, provenance: "spotify.artist" });
  const decade = releaseDecade(track.releaseDate); if (decade) tags.push({ trackId: track.id, dimension: "decade", value: decade, confidence: "high", score: 98, provenance: "spotify.release_date" });
  const soundtrackText = `${track.name} ${track.albumName ?? ""}`;
  if (/\b(soundtrack|original motion picture|original score|film music|music from)\b/i.test(soundtrackText)) tags.push({ trackId: track.id, dimension: "soundtrack", value: "Soundtrack", confidence: "medium", score: 80, provenance: "title.keyword" });
  return tags;
}

export function jaccard(left: Iterable<string>, right: Iterable<string>) {
  const a = new Set(left), b = new Set(right), union = new Set([...a, ...b]); if (!union.size) return 0;
  let intersection = 0; for (const value of a) if (b.has(value)) intersection++;
  return intersection / union.size;
}

export function stratifiedSample<T extends { id: string; releaseDate: string | null; playlistCount: number }>(tracks: T[], size = 100): T[] {
  const scored = [...tracks].sort((a, b) => {
    const decadeA = releaseDecade(a.releaseDate) ?? "unknown", decadeB = releaseDecade(b.releaseDate) ?? "unknown";
    const hash = (value: string) => [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
    return (hash(`${decadeA}:${a.playlistCount}:${a.id}`) - hash(`${decadeB}:${b.playlistCount}:${b.id}`));
  });
  if (scored.length <= size) return scored;
  const result: T[] = []; const step = scored.length / size;
  for (let index = 0; index < size; index++) result.push(scored[Math.floor(index * step)]);
  return result;
}

export function usefulnessScore(input: { coverage: number; cohesion: number; confidence: number; novelty: number }) {
  return Math.round(input.coverage * .25 + input.cohesion * .3 + input.confidence * .3 + input.novelty * .15);
}

export function feasibilityDecision(input: { normalizationRate: number; usefulSuggestions: number; precisionPass: boolean; writeVerified: boolean; policyCompatible: boolean }) {
  if (!input.policyCompatible || input.normalizationRate < 99 || !input.writeVerified) return "STOP" as const;
  if (!input.precisionPass || input.usefulSuggestions < 2) return "REDUCE" as const;
  return "GO" as const;
}
