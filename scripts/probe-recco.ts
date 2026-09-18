import { mapFeatures } from "../lib/features";
const ids = ["4uLU6hMCjMI75M1A2tKUQC", "0VjIjW4GlUZAMYd2vXMi3b"];
for (const requested of [ids, [...ids].reverse()]) {
  const r = await fetch(
    "https://api.reccobeats.com/v1/audio-features?ids=" + requested.join(","),
  );
  if (!r.ok) throw new Error(`Probe failed: ${r.status}`);
  const m = mapFeatures(await r.json(), requested);
  console.log({
    batchSize: requested.length,
    mapped: [...m.keys()],
    missing: requested.filter((id) => !m.has(id)),
  });
}
