import { organize } from "./organize";
import type { RunData } from "./model";

// Read-only snapshots: never write partial results into the approved revision.
export function playlistPreview(data: RunData, mode: string) {
  const checked = Math.min(
    data.enrichedThrough ?? data.enriched,
    data.tracks.length,
  );
  const count = checked < 20 ? 0 : Math.floor(checked / 25) * 25 || 20;
  return {
    checked: count,
    suggestions: count
      ? organize(data.tracks.slice(0, count), mode, data.algorithm).suggestions
      : [],
  };
}
