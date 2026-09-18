import type { Suggestion, RunData } from "./model";
import { organize } from "./organize";
export function importSelection(
  data: RunData,
  suggestionIds: string[],
  importedIds: string[],
) {
  if (
    !suggestionIds.length ||
    new Set(suggestionIds).size !== suggestionIds.length
  )
    throw new Error("Choose playlists to import");
  return suggestionIds.map((id) => {
    const s = data.suggestions.find((s) => s.id === id);
    if (!s || !s.name.trim() || !s.trackIds.length || importedIds.includes(id))
      throw new Error("Playlist is empty, missing, or already imported");
    return s;
  });
}
export function recluster(
  data: RunData,
  mode: string,
  revision: number,
  importedIds: string[],
) {
  const retained = data.suggestions.filter((s) => importedIds.includes(s.id));
  const importedTracks = new Set(retained.flatMap((s) => s.trackIds));
  const fresh = organize(
    data.tracks.filter((t) => !importedTracks.has(t.id)),
    mode,
    data.algorithm,
    mode === "blend" ? revision + 1 : 0,
  ).suggestions.map((s) => ({ ...s, id: `${s.id}:review-${revision + 1}` }));
  return { ...data, suggestions: [...retained, ...fresh] };
}
export function validateEdit(
  run: { status: string; revision: number; data: RunData },
  revision: number,
  suggestions: Suggestion[],
) {
  if (!["ready", "complete"].includes(run.status) || run.revision !== revision)
    throw new Error("Revision changed or run is not editable");
  const ids = new Set(run.data.tracks.map((t) => t.id)),
    known = new Set(run.data.suggestions.map((s) => s.id));
  if (
    suggestions.length !== known.size ||
    new Set(suggestions.map((s) => s.id)).size !== known.size ||
    suggestions.some(
      (s) =>
        !known.has(s.id) ||
        !s.name.trim() ||
        s.name.length > 100 ||
        new Set(s.trackIds).size !== s.trackIds.length ||
        s.trackIds.some((t) => !ids.has(t)),
    )
  )
    throw new Error("Invalid suggestions");
  return {
    status: "ready",
    revision: run.revision + 1,
    approvedRevision: null,
    data: { ...run.data, suggestions },
  };
}
export function assertImportsUnchanged(
  before: Suggestion[],
  after: Suggestion[],
  importedIds: string[],
) {
  for (const id of importedIds) {
    const original = before.find((s) => s.id === id);
    const updated = after.find((s) => s.id === id);
    if (
      !original ||
      !updated ||
      original.name !== updated.name ||
      original.selected !== updated.selected ||
      JSON.stringify(original.trackIds) !== JSON.stringify(updated.trackIds)
    )
      throw new Error("Imported playlists cannot be edited");
  }
}
export function canPublish(
  run: { status: string; revision: number; approvedRevision: number | null },
  revision: number,
) {
  return (
    run.status === "ready" &&
    run.revision === revision &&
    run.approvedRevision === revision
  );
}
