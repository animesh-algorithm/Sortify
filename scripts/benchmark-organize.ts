import { organize } from "../lib/organize";
import type { Track } from "../lib/model";
for (const n of [1000, 5000]) {
  const tracks: Track[] = Array.from({ length: n }, (_, i) => {
    const group = i % 16;
    const jitter = ((i * 17) % 100) / 1000;
    return { id: String(i).padStart(22, "0"), name: "Synthetic", artists: [], album: { id: "", name: "" }, sources: ["benchmark"],
      features: { energy: (group & 1 ? .85 : .05) + jitter, acousticness: (group & 2 ? .85 : .05) + jitter, danceability: (group & 4 ? .85 : .05) + jitter, valence: (group & 8 ? .85 : .05) + jitter, instrumentalness: .1, speechiness: .1, liveness: .2, tempo: 110, loudness: -7 } };
  });
  for (const algorithm of ["sortify-v1", "sortify-v2"]) {
    const start = performance.now();
    const result = organize(tracks, "groups", algorithm);
    console.info(JSON.stringify({ n, algorithm, milliseconds: Math.round(performance.now() - start), groups: result.suggestions.length }));
  }
}
